export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as const;
export type ImageMime = keyof typeof extensions;
export type UploadEntity = 'properties' | 'avatars' | 'kyc';
export function validateUpload(value: Record<string, unknown>) {
  if (!Object.hasOwn(extensions, String(value.mimeType))) throw new Error('Unsupported image type');
  if (!['properties', 'avatars', 'kyc'].includes(String(value.entity))) throw new Error('Invalid upload entity');
  if (!Number.isInteger(value.sizeBytes) || Number(value.sizeBytes) < 1 || Number(value.sizeBytes) > MAX_IMAGE_BYTES) throw new Error('Image must be between 1 byte and 10 MB');
  const mimeType = value.mimeType as ImageMime;
  const extension = extensions[mimeType];
  if (value.extension !== undefined && value.extension !== extension) throw new Error('Extension does not match image type');
  return { mimeType, extension, entity: value.entity as UploadEntity, sizeBytes: Number(value.sizeBytes) };
}
export function validImageSignature(bytes: Uint8Array, mime: string): boolean {
  if (mime === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === 'image/png') return [137,80,78,71,13,10,26,10].every((v,i) => bytes[i] === v);
  if (mime === 'image/webp') return bytes.length >= 12 && new TextDecoder().decode(bytes.slice(0,4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8,12)) === 'WEBP';
  return false;
}
