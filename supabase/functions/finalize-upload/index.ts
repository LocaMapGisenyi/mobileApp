import { authenticated, body, endpoint, HttpError, json } from '../_shared/http.ts';
import { bucket, CopyObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, publicUrl, storage } from '../_shared/r2.ts';
import { validImageSignature } from '../_shared/upload-validation.ts';

Deno.serve(endpoint(async req => {
  const { user, admin } = await authenticated(req);
  const { key } = await body(req);
  if (typeof key !== 'string' || key.length > 200) throw new HttpError(400, 'Invalid upload key');
  const { data: upload, error } = await admin.from('upload_objects').select('id,entity,size_bytes,mime_type,verified_at').eq('key', key).eq('user_id', user.id).maybeSingle();
  if (error) throw new HttpError(503, 'Upload service unavailable');
  if (!upload) throw new HttpError(404, 'Upload unavailable');
  const url = publicUrl(upload.entity, key);
  if (upload.verified_at) return json(req, { key, publicUrl: url, verified: true });
  const claim = new Date().toISOString();
  const expiredClaim = new Date(Date.now() - 120_000).toISOString();
  const { data: claimed, error: claimError } = await admin.from('upload_objects').update({ finalizing_at: claim })
    .eq('id', upload.id).is('verified_at', null).or(`finalizing_at.is.null,finalizing_at.lt.${expiredClaim}`).select('id').maybeSingle();
  if (claimError || !claimed) throw new HttpError(409, 'Upload verification already in progress; retry shortly');
  try {
  const client = storage(); const Bucket = bucket(upload.entity); const temporaryKey = `pending/${key}`;
  let head;
  try { head = await client.send(new HeadObjectCommand({ Bucket, Key: temporaryKey })); }
  catch { throw new HttpError(409, 'Upload must complete before verification'); }
  if (head.ContentLength !== upload.size_bytes || head.ContentType !== upload.mime_type || !head.ETag) {
    await client.send(new DeleteObjectCommand({ Bucket, Key: temporaryKey }));
    throw new HttpError(400, 'Uploaded file size or type does not match');
  }
  const preview = await client.send(new GetObjectCommand({ Bucket, Key: temporaryKey, Range: 'bytes=0-15', IfMatch: head.ETag }));
  const bytes = await preview.Body?.transformToByteArray();
  if (!bytes || !validImageSignature(bytes, upload.mime_type)) {
    await client.send(new DeleteObjectCommand({ Bucket, Key: temporaryKey }));
    throw new HttpError(400, 'File is not a supported image');
  }
  await client.send(new CopyObjectCommand({
    Bucket, Key: key, CopySource: `${Bucket}/${temporaryKey.split('/').map(encodeURIComponent).join('/')}`,
    CopySourceIfMatch: head.ETag, MetadataDirective: 'REPLACE', ContentType: upload.mime_type,
    CacheControl: upload.entity === 'kyc' ? 'private, no-store' : 'public, max-age=31536000, immutable',
  }));
  const { error: saveError } = await admin.from('upload_objects').update({ verified_at: new Date().toISOString() }).eq('id', upload.id).is('verified_at', null);
  if (saveError) throw new HttpError(503, 'Unable to finalize upload; retry verification');
  await client.send(new DeleteObjectCommand({ Bucket, Key: temporaryKey }));
  return json(req, { key, publicUrl: url, verified: true });
  } finally {
    await admin.from('upload_objects').update({ finalizing_at: null }).eq('id', upload.id).eq('finalizing_at', claim);
  }
}));
