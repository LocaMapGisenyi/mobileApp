import { timingSafeEqual } from 'node:crypto';
import { HttpError, requiredEnv } from './http.ts';

export function authorizeStorageCleanup(req: Request): void {
  const secret = requiredEnv('STORAGE_CLEANUP_SECRET');
  if (secret.trim().length < 32) throw new HttpError(503, 'Service configuration unavailable');
  const supplied = req.headers.get('X-Cleanup-Token');
  if (!supplied) throw new HttpError(401, 'Service authorization required');
  const encoder = new TextEncoder();
  const expected = encoder.encode(secret);
  const received = encoder.encode(supplied);
  if (received.byteLength !== expected.byteLength || !timingSafeEqual(received, expected)) {
    throw new HttpError(401, 'Service authorization required');
  }
}
