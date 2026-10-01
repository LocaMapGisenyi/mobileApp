import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

// An isolated PostgreSQL engine. Only Supabase's auth helpers and unavailable
// extensions are replaced; real PostgreSQL grants, RLS, triggers and RPCs run.
const db = new PGlite();
await db.exec(`
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
  CREATE SCHEMA auth;
  CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb DEFAULT '{}');
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
    $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  CREATE FUNCTION public.uuid_generate_v4() RETURNS uuid LANGUAGE sql AS $$ SELECT gen_random_uuid() $$;
  GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
  CREATE PUBLICATION supabase_realtime;
`);
const files = (await readdir(new URL('../migrations/', import.meta.url))).filter(f => f.endsWith('.sql')).sort();
for (const file of files) {
  if (process.argv.includes('--baseline') && file !== '001_init.sql') continue;
  const sql = (await readFile(new URL(`../migrations/${file}`, import.meta.url), 'utf8'))
    .replace(/^CREATE EXTENSION IF NOT EXISTS[^;]+;/gm, '');
  await db.exec(sql);
}
const ids = {
  host: '00000000-0000-4000-8000-000000000001',
  guest: '00000000-0000-4000-8000-000000000002',
  stranger: '00000000-0000-4000-8000-000000000003',
  host2: '00000000-0000-4000-8000-000000000004',
};
for (const [name, id] of Object.entries(ids)) {
  await db.query('INSERT INTO auth.users(id,email) VALUES ($1,$2)', [id, `${name}@example.invalid`]);
}
const property = '10000000-0000-4000-8000-000000000001';
await db.query(`UPDATE profiles SET is_host=true,kyc_status='VERIFIED' WHERE id IN ($1,$2)`, [ids.host, ids.host2]);
await db.query(`INSERT INTO properties(id,owner_id,title,status,price_per_month,max_guests,description,address,latitude,longitude) VALUES ($1,$2,'Test home','ACTIVE',300000,4,'An example home for local testing','Gisenyi sample street',-1.7,29.25)`, [property, ids.host]);
await db.query(`INSERT INTO property_images(property_id,url) VALUES($1,'https://example.invalid/test.jpg')`, [property]);
async function as(name) {
  await db.exec('RESET ROLE');
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [ids[name] || '']);
  await db.exec(`SET ROLE ${name === 'anon' ? 'anon' : 'authenticated'}`);
}
let checks = 0;
async function check(name, test) {
  await test(); checks++; console.log(`PASS ${name}`);
}
async function denied(sql, params = []) {
  await assert.rejects(() => db.query(sql, params));
}
await as('stranger');
await check('private profiles are not readable across accounts', async () => {
  const { rows } = await db.query('SELECT email FROM profiles WHERE id=$1', [ids.guest]);
  assert.equal(rows.length, 0);
});
if (process.argv.includes('--baseline')) throw new Error('Baseline unexpectedly passed privacy regression');
await check('safe profile projection excludes contact fields', async () => {
  const { rows } = await db.query('SELECT * FROM public_profiles WHERE id=$1', [ids.host]);
  assert.equal(rows.length, 1); assert.equal('email' in rows[0], false); assert.equal('phone_number' in rows[0], false);
});
await check('public profile view cannot be used to elevate verification', () => denied(`UPDATE public_profiles SET kyc_status='VERIFIED' WHERE id=$1`, [ids.stranger]));
await check('cannot self verify or grant host role', () => denied(`UPDATE profiles SET kyc_status='VERIFIED',is_host=true WHERE id=$1`, [ids.stranger]));
await check('cannot mint referral credits', () => denied('INSERT INTO referral_credits(user_id,amount) VALUES($1,999999)', [ids.stranger]));
await check('cannot spoof payout verification', () => denied(`INSERT INTO payout_accounts(user_id,type,account_number,account_name,is_verified) VALUES($1,'MTN_MOMO','123','Fake',true)`, [ids.stranger]));
await check('cannot publish own unmoderated property', () => denied(`INSERT INTO properties(owner_id,title,status,price_per_month) VALUES($1,'Fake','ACTIVE',1)`, [ids.stranger]));
await check('cannot create a booking with client supplied price/host', () => denied(`INSERT INTO bookings(property_id,guest_id,host_id,start_date,end_date,total_price) VALUES($1,$2,$2,CURRENT_DATE+2,CURRENT_DATE+32,0)`, [property, ids.stranger]));
await as('guest');
const { rows: [conversation] } = await db.query('SELECT * FROM get_or_create_conversation($1,$2)', [ids.host, property]);
await check('conversation creation is idempotent', async () => {
  const { rows: [again] } = await db.query('SELECT * FROM get_or_create_conversation($1,$2)', [ids.host, property]);
  assert.equal(again.id, conversation.id);
});
await db.query(`INSERT INTO messages(conversation_id,sender_id,content) VALUES($1,$2,'Hello')`, [conversation.id, ids.guest]);
await as('stranger');
await check('stranger cannot join conversation', () => denied('INSERT INTO conversation_participants(conversation_id,user_id) VALUES($1,$2)', [conversation.id, ids.stranger]));
await check('stranger cannot read messages', async () => assert.equal((await db.query('SELECT * FROM messages WHERE conversation_id=$1', [conversation.id])).rows.length, 0));
await check('stranger cannot mark messages read', () => denied('SELECT mark_conversation_read($1)', [conversation.id]));
await as('host');
await check('message trigger increments recipient unread count and sends notification', async () => {
  assert.equal((await db.query('SELECT unread_count FROM conversation_participants WHERE conversation_id=$1 AND user_id=$2', [conversation.id, ids.host])).rows[0].unread_count, 1);
  assert.equal((await db.query(`SELECT count(*)::int AS count FROM notifications WHERE type='message'`)).rows[0].count, 1);
});
await db.query('SELECT mark_conversation_read($1)', [conversation.id]);
await check('read RPC updates receipt', async () => assert.equal((await db.query('SELECT is_read FROM messages WHERE conversation_id=$1', [conversation.id])).rows[0].is_read, true));
await as('guest');
const { rows: [booking] } = await db.query(`SELECT * FROM create_booking($1,CURRENT_DATE+2,CURRENT_DATE+32,2,'Test')`, [property]);
await check('server derives booking host and monthly price', async () => { assert.equal(booking.host_id, ids.host); assert.equal(Number(booking.total_price), 300000); });
await check('rejects invalid dates', () => denied(`SELECT create_booking($1,CURRENT_DATE+32,CURRENT_DATE+2,1,NULL)`, [property]));
await check('rejects oversized party', () => denied(`SELECT create_booking($1,CURRENT_DATE+40,CURRENT_DATE+70,99,NULL)`, [property]));
await check('cannot submit fake verified review', () => denied(`INSERT INTO reviews(property_id,author_id,booking_id,rating,is_verified) VALUES($1,$2,$3,5,true)`, [property, ids.guest, booking.id]));
await as('stranger');
const { rows: [overlap] } = await db.query(`SELECT * FROM create_booking($1,CURRENT_DATE+3,CURRENT_DATE+33,1,NULL)`, [property]);
await check('unrelated host cannot approve booking', async () => { await as('host2'); await denied(`SELECT update_booking_status($1,'approved')`, [booking.id]); });
await as('host');
await db.query(`SELECT update_booking_status($1,'approved')`, [booking.id]);
await check('approval rejects overlapping reservation', () => denied(`SELECT update_booking_status($1,'approved')`, [overlap.id]));
await check('host cannot overwrite booked calendar day', () => denied(`UPDATE calendar_days SET status='available',reservation_id=NULL WHERE property_id=$1`, [property]));
await check('host cannot mutate reservation total', () => denied(`UPDATE bookings SET total_price=1 WHERE id=$1`, [booking.id]));
await as('guest');
await db.query(`INSERT INTO favorites(user_id,property_id) VALUES($1,$2)`, [ids.guest, property]);
await as('stranger');
await check('favorites isolated between users', async () => assert.equal((await db.query('SELECT * FROM favorites')).rows.length, 0));
await check('private KYC submission rejects unowned keys', () => denied(`SELECT submit_host_application('Fake',ARRAY['somebody/kyc/fake.jpg'],'{}')`));
await check('cannot invoke administrative erasure RPC', () => denied('SELECT erase_account_data($1)', [ids.guest]));
await as('anon');
await check('anonymous sees no private profiles', async () => assert.equal((await db.query('SELECT * FROM profiles')).rows.length, 0));
await check('anonymous cannot call booking RPC', () => denied(`SELECT create_booking($1,CURRENT_DATE+2,CURRENT_DATE+32,1,NULL)`, [property]));
await as('host');
await db.query(`INSERT INTO calendar_days(property_id,date,price_override,min_nights) VALUES($1,CURRENT_DATE+40,15000,30)`, [property]);
await as('guest');
await check('server quote includes daily overrides', async () => {
  const { rows: [quote] } = await db.query(`SELECT * FROM create_booking($1,CURRENT_DATE+40,CURRENT_DATE+70,1,NULL)`, [property]);
  assert.equal(Number(quote.total_price), 305000);
});
await check('quote RPC is read only and matches authoritative amount', async () => {
  const before = (await db.query('SELECT count(*)::int AS count FROM bookings')).rows[0].count;
  const { rows: [result] } = await db.query('SELECT quote_booking($1,CURRENT_DATE+40,CURRENT_DATE+70,1) AS quote', [property]);
  assert.equal(Number(result.quote.total_price), 305000);
  assert.equal((await db.query('SELECT count(*)::int AS count FROM bookings')).rows[0].count, before);
});
await check('creation rejects a stale expected quote', () => denied(`SELECT create_booking($1,CURRENT_DATE+40,CURRENT_DATE+70,1,NULL,300000)`, [property]));
await as('host');
await db.query(`UPDATE calendar_days SET min_nights=45 WHERE property_id=$1 AND date=CURRENT_DATE+40`, [property]);
await as('guest');
await check('server enforces calendar minimum stay', () => denied(`SELECT create_booking($1,CURRENT_DATE+40,CURRENT_DATE+70,1,NULL)`, [property]));
await db.exec('RESET ROLE');
await db.query("SELECT set_config('request.jwt.claim.sub','',false)");
const completed = '20000000-0000-4000-8000-000000000001';
await db.query(`INSERT INTO bookings(id,property_id,guest_id,host_id,start_date,end_date,status,total_price) VALUES($1,$2,$3,$4,CURRENT_DATE-60,CURRENT_DATE-30,'completed',300000)`, [completed, property, ids.guest, ids.host]);
await as('guest');
await check('completed guest review receives server verification', async () => {
  const { rows: [review] } = await db.query(`INSERT INTO reviews(property_id,author_id,booking_id,rating,is_verified) VALUES($1,$2,$3,4,false) RETURNING *`, [property, ids.guest, completed]);
  assert.equal(review.is_verified, true);
});
await check('same stay cannot be reviewed twice', () => denied(`INSERT INTO reviews(property_id,author_id,booking_id,rating) VALUES($1,$2,$3,5)`, [property, ids.guest, completed]));
await db.exec('RESET ROLE');
await db.query("SELECT set_config('request.jwt.claim.sub','',false)");
await db.exec('SET ROLE service_role');
await check('deletion blocks active reservations', () => denied('SELECT erase_account_data($1)', [ids.guest]));
await check('account export contains only requested private profile', async () => {
  const { rows: [result] } = await db.query('SELECT export_account_data($1) AS data', [ids.guest]);
  assert.equal(result.data.profile.email, 'guest@example.invalid');
  assert.equal(result.data.profile.id, ids.guest);
});
await db.exec('RESET ROLE');
const disposable = '00000000-0000-4000-8000-000000000005';
await db.query(`INSERT INTO auth.users(id,email) VALUES($1,'delete@example.invalid')`, [disposable]);
await db.query(`INSERT INTO upload_objects(user_id,key,entity,mime_type,size_bytes) VALUES($1,$2,'kyc','image/jpeg',100)`, [disposable, `${disposable}/kyc/test.jpg`]);
await db.exec('SET ROLE service_role');
await check('account erasure removes auth identity and queues private media cleanup', async () => {
  assert.equal((await db.query('SELECT erase_account_data($1) AS result', [disposable])).rows[0].result.deleted, true);
  assert.equal((await db.query('SELECT key FROM storage_deletion_queue WHERE key=$1', [`${disposable}/kyc/test.jpg`])).rows.length, 1);
  await db.exec('RESET ROLE');
  assert.equal((await db.query('SELECT * FROM auth.users WHERE id=$1', [disposable])).rows.length, 0);
  assert.equal((await db.query('SELECT * FROM profiles WHERE id=$1', [disposable])).rows.length, 0);
});
await as('host');
await check('editing active property resubmits moderation', async () => {
  const { rows: [changed] } = await db.query(`UPDATE properties SET description='Changed description for moderation' WHERE id=$1 RETURNING status`, [property]);
  assert.equal(changed.status, 'PENDING_REVIEW');
});
await check('unsupported cohost permissions are rejected', () => denied(`SELECT invite_cohost('host2@example.invalid',ARRAY[$1::uuid],'{"messages":true}','PERCENTAGE',10)`, [property]));
const { rows: [invite] } = await db.query(`SELECT * FROM invite_cohost('host2@example.invalid',ARRAY[$1::uuid],'{"calendar":true,"reviews":true}','PERCENTAGE',10)`, [property]);
await as('host2');
await check('pending cohost cannot modify calendar', () => denied(`INSERT INTO calendar_days(property_id,date,status) VALUES($1,CURRENT_DATE+90,'blocked')`, [property]));
await db.query('SELECT respond_cohost_invitation($1,true)', [invite.id]);
await check('accepted cohost can block an unreserved day', async () => {
  await db.query(`INSERT INTO calendar_days(property_id,date,status) VALUES($1,CURRENT_DATE+90,'blocked')`, [property]);
});
await check('calendar delegation cannot change prices', () => denied(`UPDATE calendar_days SET price_override=1 WHERE property_id=$1 AND date=CURRENT_DATE+90`, [property]));
await as('host');
await db.query(`SELECT set_cohost_permissions($1,'{"calendar":true,"reviews":false}')`, [invite.id]);
await as('host2');
await check('permission amendment requires renewed consent', async () => {
  assert.equal((await db.query(`SELECT cohost_has_permission($1,'calendar') AS allowed`, [property])).rows[0].allowed, false);
});
await as('stranger');
await check('outsider cannot accept another cohost invitation', () => denied('SELECT respond_cohost_invitation($1,true)', [invite.id]));
await db.exec('RESET ROLE');
await db.query("SELECT set_config('request.jwt.claim.sub','',false)");
const document = '30000000-0000-4000-8000-000000000001';
await db.query(`INSERT INTO legal_documents(id,slug,title,version,content,category) VALUES($1,'terms','Terms','v1','Current terms','cgu')`, [document]);
await as('guest');
await check('consent rejects a stale document version', () => denied(`SELECT record_consent($1,'v0')`, [document]));
await db.query(`SELECT record_consent($1,'v1')`, [document]);
await db.query(`SELECT record_consent($1,'v1')`, [document]);
await check('consent records are immutable and idempotent', async () => {
  assert.equal((await db.query(`SELECT * FROM consent_records WHERE document_id=$1`, [document])).rows.length, 1);
  await denied(`UPDATE consent_records SET version='spoof' WHERE document_id=$1`, [document]);
});
const { rows: [ticket] } = await db.query(`INSERT INTO support_tickets(user_id,subject,description) VALUES($1,'Example support','Need some help') RETURNING *`, [ids.guest]);
await check('users cannot impersonate support staff', () => denied(`INSERT INTO support_ticket_messages(ticket_id,sender_id,content,is_support) VALUES($1,$2,'Fake support',true)`, [ticket.id, ids.guest]));
await db.exec('RESET ROLE');
const { rows: [reply] } = await db.query(`INSERT INTO support_ticket_messages(ticket_id,content,is_support) VALUES($1,'Official support reply',true) RETURNING *`, [ticket.id]);
await as('stranger');
await check('stranger cannot rate a private support conversation', () => denied('SELECT rate_support_message($1,$2,1)', [ticket.id,reply.id]));
await as('guest');
await check('ticket owner can rate an actual support reply', async () => { await db.query('SELECT rate_support_message($1,$2,1)', [ticket.id,reply.id]); });
await as('host');
const { rows: [referral] } = await db.query('SELECT * FROM get_or_create_referral_code()');
await check('referral code issuance is idempotent', async () => assert.equal((await db.query('SELECT * FROM get_or_create_referral_code()')).rows[0].code,referral.code));
await as('stranger');
const { rows: [entry] } = await db.query('SELECT * FROM redeem_referral_code($1)', [referral.code]);
await check('referral credits cannot be self-awarded', () => denied(`SELECT award_referral_credit($1,10000,'Test bonus')`, [entry.id]));
await db.exec('RESET ROLE');
await db.exec('SET ROLE service_role');
await check('unqualified referral cannot receive a credit', () => denied(`SELECT award_referral_credit($1,10000,'Test bonus')`, [entry.id]));
await db.exec('RESET ROLE');
await db.exec("DELETE FROM public.request_counters WHERE name='messages_user_minute'; UPDATE public.runtime_limits SET max_units=1 WHERE name='messages_user_minute'");
await as('guest');
await check('cannot edit operational limits or read error events', async () => {
  await denied("UPDATE public.runtime_limits SET max_units=999999");
  await denied('SELECT * FROM public.app_error_events');
  await denied("SELECT public.consume_limit('messages_user_minute',NULL,1)");
});
await check('second message above the configured quota is rejected with HTTP-compatible 429', async () => {
  await db.query('INSERT INTO messages(conversation_id,sender_id,content) VALUES($1,$2,$3)', [conversation.id,ids.guest,'Quota first']);
  await assert.rejects(() => db.query('INSERT INTO messages(conversation_id,sender_id,content) VALUES($1,$2,$3)', [conversation.id,ids.guest,'Quota second']), error => error.code === 'PT429');
});
await db.exec('RESET ROLE');
await check('global upload byte budget rejects a single request above its ceiling', () => assert.rejects(() => db.query("SELECT public.consume_limit('upload_bytes_global_day',NULL,1073741825)"), error => error.code==='PT429'));
await db.query("UPDATE public.properties SET status='ACTIVE' WHERE id=$1",[property]);
await as('guest');
await check('identical pending reservation returns the same booking', async () => {
  const sql="SELECT * FROM create_booking($1,CURRENT_DATE+800,CURRENT_DATE+830,1,'Idempotent reservation')";
  const first=(await db.query(sql,[property])).rows[0];
  const second=(await db.query(sql,[property])).rows[0];
  assert.equal(first.id,second.id);
});
await as('host');
const incompleteDraft = (await db.query("INSERT INTO properties(owner_id,title,status,price_per_month) VALUES($1,'Unfinished host draft','DRAFT',0) RETURNING id", [ids.host])).rows[0].id;
await check('host can archive an unfinished draft without inventing a rent', async () => {
  const row = (await db.query("UPDATE properties SET status='ARCHIVED' WHERE id=$1 RETURNING status,price_per_month", [incompleteDraft])).rows[0];
  assert.equal(row.status, 'ARCHIVED'); assert.equal(Number(row.price_per_month), 0);
});
await db.exec('RESET ROLE');
await check('zero-rent archived draft cannot become a published or submitted listing', async () => {
  for (const status of ['ACTIVE', 'PENDING_REVIEW']) {
    await assert.rejects(() => db.query('UPDATE properties SET status=$1 WHERE id=$2', [status, incompleteDraft]), error => error.code === '23514');
  }
});
await as('stranger');
await check('archived incomplete draft remains private to its owner', async () => {
  assert.equal((await db.query('SELECT id FROM properties WHERE id=$1', [incompleteDraft])).rows.length, 0);
});
console.log(`${checks} security checks passed. PGlite does not exercise parallel connections, GoTrue, R2, Edge or hosted Realtime.`);
await db.exec('RESET ROLE');
const before=(await db.query('SELECT (SELECT count(*)::int FROM profiles) profiles,(SELECT count(*)::int FROM messages) messages,(SELECT count(*)::int FROM bookings) bookings')).rows[0];
const snapshot=await db.dumpDataDir();
await db.close();
const restored=new PGlite({loadDataDir:snapshot});
const after=(await restored.query('SELECT (SELECT count(*)::int FROM profiles) profiles,(SELECT count(*)::int FROM messages) messages,(SELECT count(*)::int FROM bookings) bookings')).rows[0];
assert.deepEqual(after,before);
await restored.exec("SET ROLE anon; SELECT set_config('request.jwt.claim.sub','',false)");
assert.equal((await restored.query('SELECT * FROM profiles')).rows.length,0);
await restored.close();
console.log('PASS isolated snapshot restore: fixture row counts and profile RLS preserved. This is not a hosted Supabase or R2 restore.');
