import { authenticated, endpoint, HttpError, json } from '../_shared/http.ts';
Deno.serve(endpoint(async req => {
  const { user, admin } = await authenticated(req);
  const { data, error } = await admin.rpc('export_account_data', { p_user_id: user.id });
  if (error) throw new HttpError(503, 'Unable to export account data');
  return json(req, { exportedAt: new Date().toISOString(), user: { id: user.id, email: user.email, phone: user.phone, createdAt: user.created_at, metadata: user.user_metadata }, data });
}));
