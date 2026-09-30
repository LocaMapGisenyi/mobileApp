import {
  assertDenied, assertFixture, assertOwnedBooking, requestJson, validateSmokeInputs, validateTarget,
} from './core.mjs';

function ensure(condition, message) { if (!condition) throw new Error(message); }
function successful(response) {
  ensure(response.ok, `API request failed (HTTP ${response.status})`);
  return response.data;
}
function row(response) {
  const data = successful(response);
  const result = Array.isArray(data) && data.length === 1 ? data[0] : data;
  ensure(result && typeof result === 'object' && !Array.isArray(result), 'Expected one API row');
  return result;
}
function rows(response) {
  const data = successful(response);
  ensure(Array.isArray(data), 'Expected API row array');
  return data;
}

export async function executeSmoke(env, requestedRef, { appUrl = '', run = false, now = new Date(), fetchImpl = fetch, log = console.log } = {}) {
  const config = validateSmokeInputs(env, validateTarget(env, requestedRef, appUrl), now);
  if (run !== true) {
    log(`PREFLIGHT ${config.ref} / ${config.runId}: local inputs valid. No network requests. Add --run to execute hosted checks.`);
    return { mode: 'preflight', passed: 0, failed: 0, createdBookingIds: [] };
  }
  const sessions = {};
  const created = new Set();
  let passed = 0, failed = 0, currentStep = 'initialization';
  const api = (role, path, options) => requestJson(config, sessions[role], path, options, fetchImpl);
  const rpc = (role, name, body) => api(role, `/rest/v1/rpc/${name}`, { method: 'POST', body });
  const check = async (name, work) => {
    currentStep = name;
    const result = await work();
    passed++;
    log(`PASS ${name}`);
    return result;
  };
  log(`HOSTED ${config.ref} / ${config.runId}: dedicated fixture ${config.propertyId}`);
  try {
    for (const role of ['host', 'guest', 'stranger']) {
      await check(`${role} identity matches dedicated account`, async () => {
        const account = config.accounts[role];
        const data = successful(await requestJson(config, config.anonKey, '/auth/v1/token?grant_type=password', {
          method: 'POST', body: { email: account.email, password: account.password },
        }, fetchImpl));
        ensure(data?.user?.id === account.id && data.user.email?.toLowerCase() === account.email && typeof data.access_token === 'string' && data.access_token.length > 0,
          'Authenticated identity does not match the dedicated account');
        sessions[role] = data.access_token;
      });
    }
    await check('tagged active fixture belongs to the dedicated host', async () => {
      const properties = rows(await api('host', `/rest/v1/properties?id=eq.${config.propertyId}&select=id,owner_id,title,status,currency,min_duration_months,max_guests`));
      ensure(properties.length === 1, 'Fixture missing');
      assertFixture(properties[0], config);
    });
    await check('each account can read its own private profile', async () => {
      for (const role of ['host', 'guest', 'stranger']) {
        const result = rows(await api(role, `/rest/v1/profiles?id=eq.${config.accounts[role].id}&select=id,email`));
        ensure(result.length === 1 && result[0].id === config.accounts[role].id, 'Own profile missing');
      }
    });
    await check('private profiles are hidden across accounts', async () => {
      for (const [reader, owner] of [['guest', 'host'], ['stranger', 'guest']]) {
        ensure(rows(await api(reader, `/rest/v1/profiles?id=eq.${config.accounts[owner].id}&select=id,email`)).length === 0, 'Private profile leaked');
      }
    });
    await check('public host profile excludes email and phone', async () => {
      const result = rows(await api('stranger', `/rest/v1/public_profiles?id=eq.${config.accounts.host.id}&select=*`));
      ensure(result.length === 1 && result[0].id === config.accounts.host.id && !('email' in result[0]) && !('phone_number' in result[0]), 'Public profile leaked private fields');
    });

    const conversation = await check('conversation creation is idempotent', async () => {
      const params = { p_other_user_id: config.accounts.host.id, p_property_id: config.propertyId };
      const first = row(await rpc('guest', 'get_or_create_conversation', params));
      const again = row(await rpc('guest', 'get_or_create_conversation', params));
      ensure(first.id && first.id === again.id && first.property_id === config.propertyId, 'Conversation mismatch');
      return first;
    });
    await check('conversation has exactly the two fixture participants and no old messages', async () => {
      const participants = rows(await api('guest', `/rest/v1/conversation_participants?conversation_id=eq.${conversation.id}&select=user_id`));
      const expected = new Set([config.accounts.host.id, config.accounts.guest.id]);
      ensure(participants.length === 2 && participants.every(participant => expected.delete(participant.user_id)) && expected.size === 0, 'Unexpected participants');
      ensure(rows(await api('guest', `/rest/v1/messages?conversation_id=eq.${conversation.id}&select=id&limit=1`)).length === 0, 'Use a fresh tagged fixture per run');
    });
    const message = await check('guest sends a tagged message', async () => {
      const result = row(await api('guest', '/rest/v1/messages', {
        method: 'POST', prefer: 'return=representation',
        body: { conversation_id: conversation.id, sender_id: config.accounts.guest.id, content: `[${config.runId}] guest message` },
      }));
      ensure(result.id && result.sender_id === config.accounts.guest.id && result.conversation_id === conversation.id && result.is_read === false, 'Message mismatch');
      return result;
    });
    await check('host unread count increments', async () => {
      const result = rows(await api('host', `/rest/v1/conversation_participants?conversation_id=eq.${conversation.id}&user_id=eq.${config.accounts.host.id}&select=user_id,unread_count`));
      ensure(result.length === 1 && result[0].unread_count === 1, 'Unread count mismatch');
    });
    await check('stranger cannot read the conversation or messages', async () => {
      ensure(rows(await api('stranger', `/rest/v1/conversations?id=eq.${conversation.id}&select=id`)).length === 0, 'Conversation leaked');
      ensure(rows(await api('stranger', `/rest/v1/messages?conversation_id=eq.${conversation.id}&select=id`)).length === 0, 'Messages leaked');
    });
    await check('stranger cannot join the conversation', async () => {
      assertDenied(await api('stranger', '/rest/v1/conversation_participants', {
        method: 'POST', body: { conversation_id: conversation.id, user_id: config.accounts.stranger.id },
      }));
    });
    await check('stranger cannot mark the conversation read', async () => {
      assertDenied(await rpc('stranger', 'mark_conversation_read', { p_conversation_id: conversation.id }));
    });
    await check('host read receipt updates the guest message', async () => {
      successful(await rpc('host', 'mark_conversation_read', { p_conversation_id: conversation.id }));
      const result = rows(await api('guest', `/rest/v1/messages?id=eq.${message.id}&select=id,is_read`));
      ensure(result.length === 1 && result[0].id === message.id && result[0].is_read === true, 'Read receipt missing');
    });

    const bookingParams = { p_property_id: config.propertyId, p_start_date: config.startDate, p_end_date: config.endDate, p_guest_count: 1 };
    const quote = await check('authoritative booking quote is valid', async () => {
      const result = row(await rpc('guest', 'quote_booking', bookingParams));
      ensure(Number(result.total_price) > 0 && result.currency === 'RWF' && result.days === config.days, 'Quote mismatch');
      return result;
    });
    for (const label of ['booking-a', 'booking-b']) {
      // Distinct requests overlap by 29+ days; identical requests are now deduplicated.
      const shift = value => new Date(Date.parse(value+'T00:00:00Z')+86400000).toISOString().slice(0,10);
      const requested = label==='booking-b' ? {...bookingParams,p_start_date:shift(config.startDate),p_end_date:shift(config.endDate)} : bookingParams;
      const priceQuote = label==='booking-a' ? quote : row(await rpc('guest','quote_booking',requested));
      await check(`server derives ${label} host and price`, async () => {
        const result = row(await rpc('guest', 'create_booking', {
          ...requested, p_message: `[${config.runId}] ${label}`, p_expected_total: Number(priceQuote.total_price),
        }));
        // Validate response ownership and UUID shape before recording/logging the ID.
        assertOwnedBooking(result, config, new Set([result.id]));
        created.add(result.id);
        ensure(result.status === 'pending' && Number(result.total_price) === Number(priceQuote.total_price) && result.currency === priceQuote.currency,
          'Booking price or status mismatch');
        log(`FIXTURE booking ${result.id}`);
      });
    }
    const [firstId, secondId] = [...created];
    ensure(created.size === 2, 'Expected two distinct test bookings');
    await check('stranger cannot read guest bookings', async () => {
      ensure(rows(await api('stranger', `/rest/v1/bookings?id=in.(${firstId},${secondId})&select=id`)).length === 0, 'Booking leaked');
    });
    await check('stranger cannot approve the guest booking', async () => {
      assertDenied(await rpc('stranger', 'update_booking_status', { p_booking_id: firstId, p_status: 'approved' }));
    });
    await check('guest cannot approve their own booking', async () => {
      assertDenied(await rpc('guest', 'update_booking_status', { p_booking_id: firstId, p_status: 'approved' }));
    });
    await check('concurrent overlapping approvals produce one success and one availability conflict', async () => {
      // Separate HTTP requests reach PostgREST concurrently; this exercises hosted locking.
      const settled = await Promise.allSettled([firstId, secondId].map(id => rpc('host', 'update_booking_status', { p_booking_id: id, p_status: 'approved' })));
      ensure(settled.every(result => result.status === 'fulfilled'), 'Approval request failed; both requests settled before cancellation');
      const results = settled.map(result => result.value);
      ensure(results.filter(result => result.ok && row(result).status === 'approved').length === 1, 'Expected one successful approval');
      // PostgREST versions map 23P01 to either a generic 400 or conflict 409.
      ensure(results.filter(result => !result.ok && [400, 409].includes(result.status) && result.data?.code === '23P01').length === 1, 'Expected one availability conflict');
      const authoritative = rows(await api('host', `/rest/v1/bookings?id=in.(${firstId},${secondId})&select=id,status`));
      ensure(authoritative.length === 2 && authoritative.filter(booking => booking.status === 'approved').length === 1 &&
        authoritative.filter(booking => booking.status === 'pending').length === 1, 'Stored booking states disagree with approval results');
    });
  } catch {
    failed++;
    log(`FAIL ${currentStep} (response bodies withheld; inspect the fixture and hosted schema)`);
  } finally {
    // Never delete accounts, properties, messages or arbitrary rows. Cancellation is scoped
    // to IDs returned by this process, with fresh ownership and run-marker verification.
    for (const id of created) {
      try {
        await check(`cancel owned test booking ${id}`, async () => {
          const result = rows(await api('guest', `/rest/v1/bookings?id=eq.${id}&select=id,property_id,host_id,guest_id,message,status`));
          ensure(result.length === 1, 'Created booking unavailable for cancellation');
          const booking = result[0];
          assertOwnedBooking(booking, config, created);
          ensure(['pending', 'approved', 'cancelled'].includes(booking.status), 'Unexpected booking status');
          if (booking.status !== 'cancelled') {
            const cancelled = row(await rpc('guest', 'update_booking_status', { p_booking_id: id, p_status: 'cancelled' }));
            assertOwnedBooking(cancelled, config, created);
            ensure(cancelled.status === 'cancelled', 'Cancellation did not persist');
          }
        });
      } catch {
        failed++;
        log(`FAIL cancellation refused or failed for created booking ${id}; operator review required`);
      }
    }
    if (created.size > 0) {
      try {
        await check('cancelled test bookings release their calendar days', async () => {
          ensure(rows(await api('host', `/rest/v1/calendar_days?property_id=eq.${config.propertyId}&reservation_id=in.(${[...created].join(',')})&select=id`)).length === 0, 'Calendar still reserved');
        });
      } catch {
        failed++;
        log('FAIL calendar release after test cancellation; operator review required');
      }
    }
    for (const role of Object.keys(sessions)) delete sessions[role];
  }
  log(`${failed === 0 ? 'PASS' : 'FAIL'} hosted smoke: ${passed} checks passed, ${failed} failed. Tagged messages, conversations and cancelled bookings remain for inspection.`);
  return { mode: 'hosted', passed, failed, createdBookingIds: [...created] };
}
