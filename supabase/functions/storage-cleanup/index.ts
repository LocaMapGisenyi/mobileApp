import { adminClient, endpoint, HttpError, json } from '../_shared/http.ts';
import { authorizeStorageCleanup } from '../_shared/cleanup-auth.ts';
import { removeUpload } from '../_shared/r2.ts';

// The gateway still verifies the service-role bearer JWT. The trusted scheduler
// must additionally supply STORAGE_CLEANUP_SECRET in X-Cleanup-Token.
Deno.serve(endpoint(async req => {
  authorizeStorageCleanup(req);
  const admin = adminClient();
  const {error:retentionError}=await admin.rpc('prune_operational_data');
  if(retentionError)throw new HttpError(503,'Operational cleanup unavailable');
  const cutoff = new Date(Date.now() - 600_000).toISOString();
  const { data: queue, error } = await admin.from('storage_deletion_queue').select('key,entity').is('deleted_at', null).lt('queued_at', cutoff).limit(100);
  if (error) throw new HttpError(503, 'Cleanup queue unavailable');
  let deleted = 0; let failed = 0;
  for (const item of queue ?? []) {
    try {
      await removeUpload(item.key, item.entity);
      const { error: markError } = await admin.from('storage_deletion_queue').update({ deleted_at: new Date().toISOString() }).eq('key', item.key);
      if (markError) throw markError;
      deleted++;
    } catch { failed++; }
  }
  const stale = new Date(Date.now() - 86400_000).toISOString();
  const { data: abandoned, error: staleError } = await admin.from('upload_objects').select('id,key,entity').is('verified_at', null).lt('created_at', stale).limit(100);
  if (staleError) throw new HttpError(503, 'Upload cleanup unavailable');
  for (const item of abandoned ?? []) {
    const claim = new Date().toISOString();
    try {
      const expiredClaim = new Date(Date.now() - 120_000).toISOString();
      const { data: claimed } = await admin.from('upload_objects').update({ finalizing_at: claim }).eq('id', item.id)
        .is('verified_at', null).or(`finalizing_at.is.null,finalizing_at.lt.${expiredClaim}`).select('id').maybeSingle();
      if (!claimed) continue;
      await removeUpload(item.key, item.entity);
      const { error: removeError } = await admin.from('upload_objects').delete().eq('id', item.id).is('verified_at', null).eq('finalizing_at', claim);
      if (removeError) throw removeError;
    } catch { failed++; }
  }
  return json(req, { deleted, failed }, failed ? 503 : 200);
}));
