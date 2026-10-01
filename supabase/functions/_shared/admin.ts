import { createClient } from 'npm:@supabase/supabase-js@2.104.0';
import { adminClient, body, HttpError, requiredEnv } from './http.ts';
import { boundedFetch } from './bounded-fetch.ts';
import { bucket, GetObjectCommand, getSignedUrl, storage } from './r2.ts';

export type AdminRole = 'owner' | 'moderator' | 'support' | 'editor';
export const ADMIN_RESOURCES = ['users','hosts','properties','bookings','tickets','reports','faq_items','guides','guide_categories','articles','courses','course_steps','legal_documents','errors','limits','cleanup','audit','members'] as const;
type Resource = typeof ADMIN_RESOURCES[number];
type Action = 'session' | 'overview' | 'list' | 'detail' | 'mutate' | 'document';
export type AdminRequest = {action:Action;resource?:Resource;id?:string;search?:string;status?:string;page?:number;payload?:Record<string,unknown>;expectedVersion?:string;requestId?:string};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const roles: AdminRole[]=['owner','moderator','support','editor'];
const editorial: Resource[]=['faq_items','guides','guide_categories','articles','courses','course_steps','legal_documents'];

export function validateAdminRequest(value:Record<string,unknown>):AdminRequest {
 const fail=()=>{throw new HttpError(400,'Requête administrative invalide.');};
 if(Object.keys(value).some(k=>!['action','resource','id','search','status','page','payload','expectedVersion','requestId'].includes(k)))fail();
 if(!['session','overview','list','detail','mutate','document'].includes(String(value.action)))fail();
 const action=value.action as Action;
 if(['list','detail','mutate'].includes(action) && !ADMIN_RESOURCES.includes(value.resource as Resource))fail();
 if(value.resource!==undefined&&!ADMIN_RESOURCES.includes(value.resource as Resource))fail();
 for(const key of ['id','requestId'])if(value[key]!==undefined&&(typeof value[key]!=='string'||!uuid.test(value[key] as string)))fail();
 if(['detail','document'].includes(action)&&!value.id)fail();
 if(value.search!==undefined&&(typeof value.search!=='string'||value.search.length>120))fail();
 if(value.status!==undefined&&(typeof value.status!=='string'||value.status.length>32))fail();
 if(value.page!==undefined&&(!Number.isInteger(value.page)||(value.page as number)<1||(value.page as number)>10000))fail();
 if(value.expectedVersion!==undefined&&(typeof value.expectedVersion!=='string'||value.expectedVersion.length<1||value.expectedVersion.length>128))fail();
 if(value.payload!==undefined&&(!value.payload||typeof value.payload!=='object'||Array.isArray(value.payload)))fail();
 const payload=value.payload as Record<string,unknown>|undefined;
 if(action==='mutate'&&(!value.requestId||!payload||typeof payload.operation!=='string'||(value.id&&!value.expectedVersion)))fail();
 if(action==='document') {
  if(!payload||Object.keys(payload).some(k=>k!=='key')||typeof payload.key!=='string'||!new RegExp(`^${value.id}/kyc/[a-zA-Z0-9._-]{1,160}$`,'i').test(payload.key))fail();
 }
 return value as AdminRequest;
}

// This is called only AFTER GoTrue validates the bearer via getUser(). Decode
// the exact same bearer; never trust user_metadata or browser supplied AAL.
export function verifiedAssurance(token:string,verifiedUserId:string):'aal1'|'aal2' {
 try {
  const segment=token.split('.')[1];
  const claims=JSON.parse(atob(segment.replace(/-/g,'+').replace(/_/g,'/')));
  if(claims.sub!==verifiedUserId||!['aal1','aal2'].includes(claims.aal)||typeof claims.exp!=='number'||claims.exp<=Date.now()/1000)throw new Error();
  return claims.aal;
 }catch{throw new HttpError(401,'Session invalide ou expirée.');}
}

export function adminPermission(role:AdminRole,resource:string,write=false):boolean {
 if(role==='owner')return true;
 if(!write&&['overview','session'].includes(resource))return true;
 if(role==='moderator')return ['hosts','properties','reports'].includes(resource)||(!write&&['users','bookings'].includes(resource));
 if(role==='support')return ['tickets','reports'].includes(resource)||(!write&&['users','bookings','properties'].includes(resource));
 return role==='editor'&&editorial.includes(resource as Resource);
}

export type AdminDependencies = {
 authenticate:(request:Request)=>Promise<{user:{id:string;email?:string};token:string}>;
 rpc:(name:string,args:Record<string,unknown>)=>Promise<unknown>;
 signDocument:(key:string)=>Promise<string>;
 allowedOrigins:()=>string[];
};
function rpcError(error:{code?:string}):HttpError {
 switch(error.code){
 case '42501':return new HttpError(403,'Accès refusé ou compte suspendu.');
 case 'P0002':return new HttpError(404,'Dossier introuvable.');
 case 'PT409':case '23505':return new HttpError(409,'Décision impossible dans cet état. Rechargez le dossier et vérifiez les accès actifs.');
 case 'PT429':return new HttpError(429,'Limite atteinte. Réessayez plus tard.');
 case '22023':case '22P02':case '23502':case '23503':case '23514':return new HttpError(400,'Vérifiez les champs, le motif et les prérequis de cette action.');
 default:return new HttpError(503,'Service temporairement indisponible.');
 }
}

export function createAdminHandler(deps:AdminDependencies):(req:Request)=>Promise<Response> {
 return async req=>{
  const origin=req.headers.get('origin');
  const allowed=!origin||deps.allowedOrigins().includes(origin);
  const headers:Record<string,string>={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Vary':'Origin','Access-Control-Allow-Headers':'authorization, apikey, x-client-info, content-type','Access-Control-Allow-Methods':'POST, OPTIONS',...(origin&&allowed?{'Access-Control-Allow-Origin':origin}:{})};
  const response=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
  if(!allowed)return response({error:'Origine non autorisée.'},403);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(req.method!=='POST')return response({error:'Méthode non autorisée.'},405);
  try {
   const input=validateAdminRequest(await body(req));
   const {user,token}=await deps.authenticate(req);
   const assurance=verifiedAssurance(token,user.id);
   const membership=await deps.rpc('admin_query',{p_actor:user.id,p_resource:'session',p_id:null,p_search:'',p_status:'',p_page:1}) as {role:AdminRole};
   if(!membership||!roles.includes(membership.role))throw new HttpError(403,'Accès administrateur refusé.');
   for(const [name,actor] of [['edge_user_minute',user.id],['edge_global_minute',null],['admin_user_minute',user.id],['admin_global_minute',null]] as const)await deps.rpc('consume_limit',{p_name:name,p_actor:actor,p_units:1});
   if(input.action==='session')return response({user:{id:user.id,email:user.email??null},role:membership.role,mfaRequired:assurance!=='aal2'});
   if(assurance!=='aal2')throw new HttpError(403,'Validation en deux étapes requise.');
   const resource=input.action==='document'?'hosts':input.action==='overview'?'overview':input.resource!;
   if(!adminPermission(membership.role,resource,input.action==='mutate'))throw new HttpError(403,'Permission insuffisante.');
   if(input.action==='document'){
    await deps.rpc('consume_limit',{p_name:'admin_documents_user_minute',p_actor:user.id,p_units:1});
    const document=await deps.rpc('admin_document',{p_actor:user.id,p_host_id:input.id,p_key:input.payload!.key}) as {key:string;entity:string};
    if(!document||document.entity!=='kyc'||document.key!==input.payload!.key)throw new HttpError(403,'Justificatif indisponible.');
    const url=await deps.signDocument(document.key);
    return response({url,expiresIn:60});
   }
   if(input.action==='mutate')return response(await deps.rpc('admin_mutate',{p_actor:user.id,p_resource:resource,p_id:input.id??null,p_payload:input.payload,p_expected_version:input.expectedVersion??null,p_request_id:input.requestId}));
   return response(await deps.rpc('admin_query',{p_actor:user.id,p_resource:resource,p_id:input.action==='detail'?input.id:null,p_search:input.search??'',p_status:input.status??'',p_page:input.page??1}));
  }catch(error){
   // Neither raw DB/network errors nor signed URLs are logged or returned.
   const safe=error instanceof HttpError?error:new HttpError(503,'Service temporairement indisponible.');
   return response({error:safe.message},safe.status);
  }
 };
}

export async function signAdminDocument(key:string):Promise<string> {
 return await getSignedUrl(storage(),new GetObjectCommand({Bucket:bucket('kyc'),Key:key,ResponseCacheControl:'no-store',ResponseContentDisposition:'inline'}),{expiresIn:60});
}

export const adminHandler=createAdminHandler({
 authenticate:async req=>{
  const authorization=req.headers.get('Authorization');
  if(!authorization?.startsWith('Bearer '))throw new HttpError(401,'Authentification requise.');
  const token=authorization.slice(7);
  const client=createClient(requiredEnv('SUPABASE_URL'),requiredEnv('SUPABASE_ANON_KEY'),{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:boundedFetch,headers:{Authorization:authorization}}});
  const {data:{user},error}=await client.auth.getUser(token);
  if(error||!user)throw new HttpError(401,'Authentification requise.');
  return {user,token};
 },
 rpc:async(name,args)=>{
  const {data,error}=await adminClient().rpc(name,args);
  if(error)throw rpcError(error);
  return data;
 },
 signDocument:signAdminDocument,
 allowedOrigins:()=>(Deno.env.get('ADMIN_ALLOWED_ORIGINS')??'').split(',').map(v=>v.trim()).filter(Boolean),
});
