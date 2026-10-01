import { createAdminHandler, signAdminDocument, validateAdminRequest, verifiedAssurance, type AdminDependencies } from './admin.ts';
import { HttpError } from './http.ts';

const actor = '00000000-0000-4000-8000-000000000001';
const host = '00000000-0000-4000-8000-000000000002';
const assert = (value: unknown, message: string) => { if (!value) throw new Error(message); };
const jwt = (claims: Record<string, unknown>) => `header.${btoa(JSON.stringify(claims))}.verified-by-test-boundary`;
const token = jwt({ sub: actor, aal: 'aal2', exp: Math.floor(Date.now()/1000)+300 });
function request(input: unknown, origin = 'https://admin.example.invalid', authorization = token) {
 return new Request('https://project.example.invalid/functions/v1/admin-api', { method: 'POST',headers:{origin,authorization:`Bearer ${authorization}`,'content-type':'application/json'},body:JSON.stringify(input) });
}
function fixture(options: {role?:string;token?:string;rpcError?:boolean} = {}) {
 const calls: {name:string;args:Record<string,unknown>}[]=[];
 const deps: AdminDependencies = {
  authenticate: async () => ({user:{id:actor,email:'owner@example.invalid'},token:options.token ?? token}),
  rpc: async (name,args) => {calls.push({name,args});if(options.rpcError) throw new Error('private database URL secret');return name==='admin_query' && args.p_resource==='session' ? {role:options.role??'owner'} : name==='admin_document' ? {key:`${host}/kyc/file.jpg`,entity:'kyc'} : {rows:[],total:0,page:1,pageSize:25};},
  signDocument: async key => `https://private.example.invalid/${key}?X-Amz-Expires=60`,
  allowedOrigins: () => ['https://admin.example.invalid'],
 };
 return {handler:createAdminHandler(deps),calls};
}
Deno.test('admin rejects unexpected actions, UUIDs, pagination, fields and oversized filters',()=>{
 for(const input of [{action:'sql'},{action:'detail',resource:'users',id:'bad'},{action:'list',resource:'users',page:0},{action:'list',resource:'auth.users'},{action:'list',resource:'users',search:'x'.repeat(121)},{action:'mutate',resource:'users',id:host,payload:{operation:'suspend'}},{action:'overview',actorId:actor}]) {
  let rejected=false;try{validateAdminRequest(input as Record<string,unknown>);}catch{rejected=true;}assert(rejected,`accepted ${JSON.stringify(input)}`);
 }
});
Deno.test('assurance binds verified identity, AAL and expiration',()=>{
 assert(verifiedAssurance(token,actor)==='aal2','AAL2 rejected');
 for(const claims of [{sub:host,aal:'aal2',exp:Date.now()/1000+100},{sub:actor,aal:'aal2',exp:1},{sub:actor,aal:'aal3',exp:Date.now()/1000+100}]) {
  let denied=false;try{verifiedAssurance(jwt(claims),actor);}catch{denied=true;}assert(denied,'untrusted claims accepted');
 }
});
Deno.test('AAL1 receives membership session only and no privileged query',async()=>{
 const {handler,calls}=fixture({token:jwt({sub:actor,aal:'aal1',exp:Date.now()/1000+300})});
 const session=await handler(request({action:'session'}));assert(session.status===200,'session denied');assert((await session.json()).mfaRequired===true,'MFA missing');
 const denied=await handler(request({action:'list',resource:'users'}));assert(denied.status===403,'AAL1 data accepted');assert(calls.every(c=>c.name==='consume_limit'||c.args.p_resource==='session'),'privileged RPC called');
});
Deno.test('origin denied before authentication or RPC including preflight',async()=>{
 const {handler,calls}=fixture();assert((await handler(request({action:'overview'},'https://attacker.invalid'))).status===403,'bad origin accepted');
 const preflight=await handler(new Request('https://test.invalid',{method:'OPTIONS',headers:{origin:'https://attacker.invalid'}}));assert(preflight.status===403,'bad preflight accepted');assert(calls.length===0,'database called');
});
Deno.test('limited operator cannot query membership or document',async()=>{
 const {handler,calls}=fixture({role:'support'});
 assert((await handler(request({action:'list',resource:'members'}))).status===403,'support read members');
 assert((await handler(request({action:'document',id:host,payload:{key:`${host}/kyc/file.jpg`}}))).status===403,'support read KYC');
 assert(!calls.some(c=>c.name==='admin_document'),'document authorized');
});
Deno.test('document is authorized and logged before exact 60 second signing, response no-store',async()=>{
 const {handler,calls}=fixture();const response=await handler(request({action:'document',id:host,payload:{key:`${host}/kyc/file.jpg`}}));
 const data=await response.json();assert(response.status===200,'document failed');assert(data.expiresIn===60,'expiry changed');assert(data.url.includes('X-Amz-Expires=60'),'incorrect signed URL');assert(response.headers.get('cache-control')==='no-store','caching enabled');assert(calls.some(c=>c.name==='admin_document'&&c.args.p_host_id===host&&c.args.p_actor===actor),'exact ownership check omitted');
});
Deno.test('arbitrary keys, mismatched returned keys and unavailable RPC never sign',async()=>{
 const {handler}=fixture();assert((await handler(request({action:'document',id:host,payload:{key:'other/kyc/secret.jpg'}}))).status===400,'arbitrary key accepted');
 const {handler:failed}=fixture({rpcError:true});const response=await failed(request({action:'overview'}));assert(response.status===503,'unavailable not surfaced');assert(!(await response.text()).includes('secret'),'sensitive detail leaked');
});
Deno.test('mutations forward only server verified actor and the original request identity',async()=>{
 const {handler,calls}=fixture();const requestId=crypto.randomUUID();const response=await handler(request({action:'mutate',resource:'users',id:host,requestId,expectedVersion:'opaque',payload:{operation:'suspend',note:'Fixture reason'}}));
 assert(response.status===200,'mutation failed');const call=calls.find(c=>c.name==='admin_mutate');assert(call?.args.p_actor===actor&&call.args.p_request_id===requestId,'identity changed');
});
Deno.test('anonymous and revoked members are denied without signing or data access',async()=>{
 for(const mode of ['anonymous','revoked']){
  let signed=false;let dataRead=false;
  const handler=createAdminHandler({allowedOrigins:()=>['https://admin.example.invalid'],authenticate:async()=>{if(mode==='anonymous')throw new HttpError(401,'Authentication required');return {user:{id:actor},token};},rpc:async(name,args)=>{if(name==='admin_query'&&args.p_resource==='session')throw new HttpError(403,'Access revoked');dataRead=true;return {};},signDocument:async()=>{signed=true;return '';}});
  const response=await handler(request({action:'document',id:host,payload:{key:`${host}/kyc/file.jpg`}}));assert(response.status===(mode==='anonymous'?401:403),'access allowed');assert(!signed&&!dataRead,'data accessed');
 }
});
Deno.test('database mismatch, document audit failure and quota fail closed before signing',async()=>{
 for(const mode of ['mismatch','audit','quota']){
  let signed=false;
  const handler=createAdminHandler({allowedOrigins:()=>['https://admin.example.invalid'],authenticate:async()=>({user:{id:actor},token}),rpc:async(name,args)=>{if(name==='admin_query')return {role:'owner'};if(name==='consume_limit'&&mode==='quota'&&args.p_name==='admin_documents_user_minute')throw new HttpError(429,'Quota');if(name==='admin_document'){if(mode==='audit')throw new HttpError(503,'Audit unavailable');return {key:`${actor}/kyc/other.jpg`,entity:'kyc'};}return null;},signDocument:async()=>{signed=true;return '';}});
  const response=await handler(request({action:'document',id:host,payload:{key:`${host}/kyc/file.jpg`}}));assert(response.status===(mode==='audit'?503:mode==='quota'?429:403),'unexpected failure status');assert(!signed,'signed before authorization');
 }
});
Deno.test('real R2 signing uses the private bucket, exact final key, 60 seconds and no-store',async()=>{
 const names=['R2_ACCOUNT_ID','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY','R2_BUCKET_NAME','R2_PRIVATE_BUCKET_NAME'];const previous=names.map(n=>Deno.env.get(n));
 try {
  Deno.env.set('R2_ACCOUNT_ID','a'.repeat(32));Deno.env.set('R2_ACCESS_KEY_ID','fixture-key');Deno.env.set('R2_SECRET_ACCESS_KEY','fixture-secret');Deno.env.set('R2_BUCKET_NAME','fixture-public');Deno.env.set('R2_PRIVATE_BUCKET_NAME','fixture-private');
  const key=`${host}/kyc/file.jpg`;const signed=new URL(await signAdminDocument(key));assert((signed.hostname.startsWith('fixture-private.')&&signed.pathname===`/${key}`)||signed.pathname===`/fixture-private/${key}`,'wrong bucket or key');assert(signed.searchParams.get('X-Amz-Expires')==='60','wrong expiry');assert(signed.searchParams.get('response-cache-control')==='no-store','cache policy missing');
  Deno.env.set('R2_PRIVATE_BUCKET_NAME','fixture-public');let denied=false;try{await signAdminDocument(key);}catch{denied=true;}assert(denied,'public bucket accepted for private documents');
 }finally{names.forEach((n,i)=>{if(previous[i]===undefined)Deno.env.delete(n);else Deno.env.set(n,previous[i]!);});}
});
