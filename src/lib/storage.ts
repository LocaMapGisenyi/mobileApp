import { supabase } from './supabase';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export function getExtension(mimeType: string): 'jpg' | 'png' | 'webp' {
  const map: Record<AllowedMimeType, 'jpg' | 'png' | 'webp'> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  const ext = map[mimeType as AllowedMimeType];
  if (!ext) {
    throw new Error(`Unsupported MIME type: ${mimeType}`);
  }
  return ext;
}

function assertAllowedMimeType(mimeType: string): asserts mimeType is AllowedMimeType {
  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType)) {
    throw new Error(
      `File type "${mimeType}" is not allowed. Accepted types: ${ALLOWED_MIME_TYPES.join(', ')}`
    );
  }
}

export async function uploadPhoto(
  uri: string,
  mimeType: string,
  userId: string,
  entity: string
): Promise<string> {
  assertAllowedMimeType(mimeType);

  const extension = getExtension(mimeType);

  const { data, error } = await supabase.functions.invoke<{
    uploadUrl: string;
    publicUrl: string;
  }>('get-upload-url', {
    body: { mimeType, userId, entity, extension },
  });

  if (error) {
    throw new Error(`Failed to get upload URL: ${error.message}`);
  }
  if (!data?.uploadUrl || !data?.publicUrl) {
    throw new Error('Edge Function returned an incomplete response (missing uploadUrl or publicUrl)');
  }

  const { uploadUrl, publicUrl } = data;

  const response = await fetch(uri);
  const blob = await response.blob();

  if (blob.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `File size ${(blob.size / 1024 / 1024).toFixed(2)} MB exceeds the 10 MB limit`
    );
  }

  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': mimeType },
    body: blob,
  });

  if (!uploadResponse.ok) {
    throw new Error(
      `Upload failed with status ${uploadResponse.status}: ${uploadResponse.statusText}`
    );
  }

  return publicUrl;
}

export async function uploadPhotos(
  uris: { uri: string; mimeType: string }[],
  userId: string,
  entity: string
): Promise<string[]> {
  const publicUrls: string[] = [];

  for (const { uri, mimeType } of uris) {
    const url = await uploadPhoto(uri, mimeType, userId, entity);
    publicUrls.push(url);
  }

  return publicUrls;
}
