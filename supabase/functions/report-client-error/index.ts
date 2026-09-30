import { authenticated, body, endpoint, HttpError, json } from '../_shared/http.ts';
Deno.serve(endpoint(async req => {
  const { user,admin } = await authenticated(req);
  const input=await body(req);
  const kinds=['render','unhandled','network','startup'];
  const codes=['TypeError','RangeError','ReferenceError','NetworkTimeoutError','Error','UnknownError'];
  if (!kinds.includes(String(input.kind)) || !codes.includes(String(input.code)) ||
      !/^[A-Za-z][A-Za-z0-9_]{0,59}$/.test(String(input.route)) ||
      !/^[0-9A-Za-z._-]{1,32}$/.test(String(input.version)) ||
      !['ios','android','web','unknown'].includes(String(input.platform))) throw new HttpError(400,'Invalid diagnostic');
  for (const [p_name,p_actor] of [['errors_user_hour',user.id],['errors_global_day',null]] as const) {
    const {error}=await admin.rpc('consume_limit',{p_name,p_actor,p_units:1});
    if(error) throw new HttpError(error.code==='PT429'?429:503,'Diagnostic unavailable');
  }
  // Do not accept messages, stacks, URLs, contact details or arbitrary metadata.
  const {error}=await admin.from('app_error_events').insert({user_id:user.id,kind:input.kind,code:input.code,route:input.route,version:input.version,platform:input.platform});
  if(error) throw new HttpError(503,'Diagnostic unavailable');
  return json(req,{recorded:true});
}));
