import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response('Unauthorized', { status: 401 });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return new Response('Unauthorized', { status: 401 });

    const { mimeType, entity, extension } = await req.json();

    const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
    if (!ALLOWED_MIME.includes(mimeType)) {
      return new Response(JSON.stringify({ error: 'Type MIME non supporté' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const ext = extension || (mimeType === 'image/jpeg' ? 'jpg' : mimeType === 'image/png' ? 'png' : 'webp');
    const uuid = crypto.randomUUID();
    const key = `${user.id}/${entity}/${uuid}.${ext}`;

    const accountId = Deno.env.get('R2_ACCOUNT_ID')!;
    const accessKeyId = Deno.env.get('R2_ACCESS_KEY_ID')!;
    const secretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY')!;
    const bucketName = Deno.env.get('R2_BUCKET_NAME')!;

    const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
    const region = 'auto';
    const service = 's3';

    const now = new Date();
    const iso = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const dateStr = iso.substring(0, 8);
    const datetimeStr = iso.substring(0, 15) + 'Z';

    const expiresIn = 300;

    const credentialScope = `${dateStr}/${region}/${service}/aws4_request`;
    const credential = `${accessKeyId}/${credentialScope}`;
    const host = `${accountId}.r2.cloudflarestorage.com`;
    const signedHeaders = 'host';

    const queryParams = new URLSearchParams({
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': credential,
      'X-Amz-Date': datetimeStr,
      'X-Amz-Expires': String(expiresIn),
      'X-Amz-SignedHeaders': signedHeaders,
    });

    const canonicalRequest = [
      'PUT',
      `/${bucketName}/${key}`,
      queryParams.toString(),
      `host:${host}\n`,
      signedHeaders,
      'UNSIGNED-PAYLOAD',
    ].join('\n');

    const stringToSign = [
      'AWS4-HMAC-SHA256',
      datetimeStr,
      credentialScope,
      await sha256hex(canonicalRequest),
    ].join('\n');

    const signingKey = await getSigningKey(secretAccessKey, dateStr, region, service);
    const signature = await hmacHex(signingKey, stringToSign);

    queryParams.set('X-Amz-Signature', signature);

    const uploadUrl = `${endpoint}/${bucketName}/${key}?${queryParams.toString()}`;
    const publicUrl = `${Deno.env.get('R2_PUBLIC_URL') || `${endpoint}/${bucketName}`}/${key}`;

    return new Response(
      JSON.stringify({ uploadUrl, publicUrl, key }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('get-upload-url error:', err);
    return new Response(
      JSON.stringify({ error: 'Erreur interne du serveur' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});

async function sha256hex(message: string): Promise<string> {
  const data = new TextEncoder().encode(message);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hmacSha256(key: ArrayBuffer | Uint8Array, message: string): Promise<ArrayBuffer> {
  const raw = key instanceof Uint8Array ? key.buffer : key;
  const k = await crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', k, new TextEncoder().encode(message));
}

async function hmacHex(key: ArrayBuffer, message: string): Promise<string> {
  const buf = await hmacSha256(key, message);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getSigningKey(secret: string, date: string, region: string, service: string): Promise<ArrayBuffer> {
  const kDate = await hmacSha256(new TextEncoder().encode(`AWS4${secret}`), date);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  return hmacSha256(kService, 'aws4_request');
}
