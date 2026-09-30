import { createClient } from 'npm:@supabase/supabase-js@2.104.0';
import { boundedFetch } from '../_shared/bounded-fetch.ts';
// Gateway JWT verification stays enabled. A monitoring service uses the public anon key.
Deno.serve(async req => {
  if (!['GET','HEAD','POST'].includes(req.method)) return new Response(null,{status:405});
  let healthy=false;
  try {
    const client=createClient(Deno.env.get('SUPABASE_URL')??'',Deno.env.get('SUPABASE_ANON_KEY')??'',{auth:{persistSession:false},global:{fetch:boundedFetch}});
    const {error}=await client.from('properties').select('id').limit(1);
    healthy=!error;
  } catch { /* Return only availability, never configuration or database errors. */ }
  return new Response(req.method==='HEAD'?null:JSON.stringify({status:healthy?'ok':'unavailable'}),{status:healthy?200:503,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
});
