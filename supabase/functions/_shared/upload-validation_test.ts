import { validImageSignature, validateUpload } from './upload-validation.ts';
function assert(value: boolean, message: string) { if (!value) throw new Error(message); }
function rejects(value: Record<string, unknown>) {
  let rejected = false; try { validateUpload(value); } catch { rejected = true; }
  assert(rejected, 'Expected rejected upload');
}
Deno.test('upload validation rejects path injection, forged extension and oversized image', () => {
  rejects({ mimeType: 'image/jpeg', entity: '../kyc', sizeBytes: 10 });
  rejects({ mimeType: 'image/jpeg', entity: 'kyc', sizeBytes: 10, extension: 'html' });
  rejects({ mimeType: 'text/html', entity: 'properties', sizeBytes: 10 });
  rejects({ mimeType: 'image/jpeg', entity: 'avatars', sizeBytes: 10 * 1024 * 1024 + 1 });
  rejects({ mimeType: 'image/jpeg', entity: 'avatars', sizeBytes: -1 });
  rejects({ mimeType: 'image/jpeg', entity: 'avatars', sizeBytes: '100' });
});
Deno.test('upload accepts private KYC only within known image contract', () => {
  const value = validateUpload({ mimeType: 'image/png', entity: 'kyc', sizeBytes: 128 });
  assert(value.extension === 'png' && value.entity === 'kyc', 'Image contract differs');
});
Deno.test('image signatures reject HTML renamed as JPEG', () => {
  assert(!validImageSignature(new TextEncoder().encode('<html>unsafe</html>'), 'image/jpeg'), 'HTML accepted');
  assert(validImageSignature(new Uint8Array([255,216,255]), 'image/jpeg'), 'JPEG signature rejected');
  assert(validImageSignature(new Uint8Array([137,80,78,71,13,10,26,10]), 'image/png'), 'PNG signature rejected');
  assert(!validImageSignature(new Uint8Array([137,80]), 'image/png'), 'Truncated image accepted');
});
