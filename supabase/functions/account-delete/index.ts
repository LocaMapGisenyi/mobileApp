import { authenticated, body, endpoint, HttpError, json } from '../_shared/http.ts';
import { removeUpload } from '../_shared/r2.ts';
Deno.serve(endpoint(async req => {
  const { user, admin } = await authenticated(req);
  const { confirmation } = await body(req);
  if (confirmation !== 'DELETE') throw new HttpError(400, 'Explicit DELETE confirmation required');
  const { data, error } = await admin.rpc('erase_account_data', { p_user_id: user.id });
  if (error?.code === '23514') throw new HttpError(409, 'Resolve pending and approved reservations before deleting the account');
  if (error || !data?.deleted) throw new HttpError(503, 'Unable to delete account');
  const objects: {key: string; entity: string}[] = data.objects ?? [];
  const cleanupPending = objects.length > 0;
  // Bound the response latency; the durable worker completes all remaining work
  // and repeats deletion after outstanding PUT URLs expire.
  await Promise.allSettled(objects.slice(0, 10).map(object => removeUpload(object.key, object.entity)));
  return json(req, { deleted: true, cleanupPending });
}));
