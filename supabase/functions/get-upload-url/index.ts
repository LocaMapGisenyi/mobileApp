import { authenticated, body, endpoint, HttpError, json } from '../_shared/http.ts';
import { bucket, getSignedUrl, publicUrl, PutObjectCommand, storage } from '../_shared/r2.ts';
import { validateUpload } from '../_shared/upload-validation.ts';

Deno.serve(endpoint(async req => {
  const { user, admin } = await authenticated(req);
  let input;
  try { input = validateUpload(await body(req)); }
  catch (error) { throw new HttpError(400, error instanceof Error ? error.message : 'Invalid upload'); }
  const { mimeType, entity, sizeBytes, extension } = input;
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count, error: limitError } = await admin.from('upload_objects').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', since);
  if (limitError) throw new HttpError(503, 'Upload service unavailable');
  if ((count ?? 0) >= 40) throw new HttpError(429, 'Upload limit reached; try again later');
  const key = `${user.id}/${entity}/${crypto.randomUUID()}.${extension}`;
  const command = new PutObjectCommand({ Bucket: bucket(entity), Key: `pending/${key}`, ContentType: mimeType, ContentLength: sizeBytes });
  const uploadUrl = await getSignedUrl(storage(), command, {
    expiresIn: 300, signableHeaders: new Set(['content-type', 'content-length']),
  });
  const url = publicUrl(entity, key);
  const { error } = await admin.from('upload_objects').insert({ user_id: user.id, key, entity, mime_type: mimeType, size_bytes: sizeBytes });
  if (error?.code === '54000' || error?.code === 'PT429') throw new HttpError(429, 'Limite de fichiers atteinte. Réessayez plus tard.');
  if (error) throw new HttpError(503, 'Upload service unavailable');
  return json(req, { uploadUrl, publicUrl: url, key, headers: { 'Content-Type': mimeType, 'Content-Length': String(sizeBytes) }, expiresIn: 300 });
}));
