import { S3Client, DeleteObjectCommand } from 'npm:@aws-sdk/client-s3@3.1000.0';
import { requiredEnv, HttpError } from './http.ts';
import { EDGE_TIMEOUT_MS } from './bounded-fetch.ts';
export { PutObjectCommand, HeadObjectCommand, GetObjectCommand, CopyObjectCommand, DeleteObjectCommand } from 'npm:@aws-sdk/client-s3@3.1000.0';
export { getSignedUrl } from 'npm:@aws-sdk/s3-request-presigner@3.1000.0';

export function storage() {
  const account = requiredEnv('R2_ACCOUNT_ID');
  if (!/^[a-f0-9]{32}$/.test(account)) throw new HttpError(503, 'Storage configuration unavailable');
  return new S3Client({
    endpoint: `https://${account}.r2.cloudflarestorage.com`, region: 'auto',
    credentials: { accessKeyId: requiredEnv('R2_ACCESS_KEY_ID'), secretAccessKey: requiredEnv('R2_SECRET_ACCESS_KEY') },
    requestChecksumCalculation: 'WHEN_REQUIRED', responseChecksumValidation: 'WHEN_REQUIRED',
    maxAttempts: 2,
    requestHandler: { requestTimeout: EDGE_TIMEOUT_MS, throwOnRequestTimeout: true },
    defaultUserAgentProvider: async () => [['locamap', '1.0']],
  });
}
export function bucket(entity: string) {
  const publicBucket = requiredEnv('R2_BUCKET_NAME');
  if (entity !== 'kyc') return publicBucket;
  const privateBucket = requiredEnv('R2_PRIVATE_BUCKET_NAME');
  if (privateBucket === publicBucket) throw new HttpError(503, 'Private storage must use a separate bucket');
  return privateBucket;
}
export function publicUrl(entity: string, key: string): string | null {
  if (entity === 'kyc') return null;
  const base = new URL(requiredEnv('R2_PUBLIC_URL'));
  if (base.protocol !== 'https:') throw new HttpError(503, 'Public storage HTTPS URL required');
  return `${base.href.replace(/\/$/, '')}/${key.split('/').map(encodeURIComponent).join('/')}`;
}
export async function removeUpload(key: string, entity: string) {
  const client = storage();
  await Promise.all([key, `pending/${key}`].map(Key => client.send(new DeleteObjectCommand({ Bucket: bucket(entity), Key }))));
}
