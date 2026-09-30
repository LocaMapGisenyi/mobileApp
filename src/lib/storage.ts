import { supabase } from './supabase';
import { NETWORK, withDeadline } from './network';
import { prepareImage } from './prepareImage';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export function getExtension(mimeType: string): 'jpg' | 'png' | 'webp' {
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  throw new Error(`Format non accepté : ${mimeType}`);
}
async function upload(uri: string, mimeType: string, userId: string, entity: string): Promise<{ key: string; publicUrl: string | null }> {
  getExtension(mimeType);
  if (!['properties', 'avatars', 'kyc'].includes(entity)) throw new Error('Destination de fichier invalide.');
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!user || user.id !== userId) throw new Error('Connectez-vous avant de téléverser un fichier.');
  // Expo replaces Content-Type with Blob.type, which can be empty or generic for
  // local iPhone files. Send raw bytes so the signed MIME header stays unchanged.
  let bytes = await withDeadline(async signal => {
    const response = await fetch(uri, { signal });
    if (!response.ok) throw new Error('Impossible de lire le fichier sélectionné.');
    return response.arrayBuffer();
  }, NETWORK.readTimeoutMs);
  if (!bytes.byteLength || bytes.byteLength > MAX_FILE_SIZE_BYTES) throw new Error('Sélectionnez une image de 10 Mo maximum.');
  const preparedUri=await withDeadline(()=>prepareImage(uri,entity==='kyc'),NETWORK.writeTimeoutMs);
  if(preparedUri!==uri)bytes=await withDeadline(async signal=>{
    const response=await fetch(preparedUri,{signal});
    if(!response.ok)throw new Error('Image préparée illisible.');
    return response.arrayBuffer();
  },NETWORK.readTimeoutMs);
  if (!bytes.byteLength || bytes.byteLength > MAX_FILE_SIZE_BYTES) throw new Error('Sélectionnez une image de 10 Mo maximum.');
  mimeType='image/jpeg'; const extension=getExtension(mimeType);
  const { data, error } = await supabase.functions.invoke<{ uploadUrl: string; key: string; headers: Record<string, string> }>('get-upload-url', {
    body: { mimeType, entity, extension, sizeBytes: bytes.byteLength },
  });
  if (error) throw error;
  if (!data?.uploadUrl || !data.key) throw new Error('Réponse de téléversement incomplète.');
  const headers: Record<string, string> = { ...data.headers, 'Content-Type': mimeType };
  // Browsers set Content-Length themselves; fetch forbids setting it manually.
  delete headers['Content-Length'];
  const uploadResponse = await withDeadline(signal => fetch(data.uploadUrl, { method: 'PUT', headers, body: bytes, signal }), NETWORK.uploadTimeoutMs);
  if (!uploadResponse.ok) throw new Error(`Téléversement refusé (${uploadResponse.status}).`);
  const { data: finalized, error: finalError } = await supabase.functions.invoke<{ key: string; publicUrl: string | null; verified: boolean }>('finalize-upload', { body: { key: data.key } });
  if (finalError) throw finalError;
  if (!finalized?.verified || !finalized.key) throw new Error('Le fichier n’a pas été vérifié.');
  return finalized;
}
export async function uploadPhoto(uri: string, mimeType: string, userId: string, entity: string): Promise<string> {
  if (entity === 'kyc') throw new Error('Les documents d’identité doivent rester privés.');
  const result = await upload(uri, mimeType, userId, entity);
  if (!result.publicUrl) throw new Error('URL publique manquante après vérification.');
  return result.publicUrl;
}
export async function uploadPrivateDocument(uri: string, mimeType: string, userId: string): Promise<string> {
  return (await upload(uri, mimeType, userId, 'kyc')).key;
}
export async function uploadPhotos(photos: { uri: string; mimeType: string }[], userId: string, entity: string): Promise<string[]> {
  const results: string[] = [];
  for (const photo of photos) results.push(await uploadPhoto(photo.uri, photo.mimeType, userId, entity));
  return results;
}
