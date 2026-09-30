import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('../src/lib/prepareImage',()=>({prepareImage:async(uri:string)=>uri}));
const fake = vi.hoisted(() => ({ calls: [] as { name: string; options: any }[], finalized: { key: 'private/final-image.jpg', publicUrl: null as string | null, verified: true } }));
vi.mock('../src/lib/supabase', () => ({ supabase: {
  auth: { getUser: async () => ({ data: { user: { id: 'alice' } }, error: null }) },
  functions: { invoke: async (name: string, options: any) => { fake.calls.push({ name, options }); return { error: null, data: name === 'get-upload-url' ? { uploadUrl: 'https://upload.example/image', key: 'temporary/1', headers: { 'Content-Type': 'image/jpeg' } } : fake.finalized }; } },
} }));
beforeEach(() => { fake.calls = []; fake.finalized = { key: 'private/final-image.jpg', publicUrl: null, verified: true }; vi.unstubAllGlobals(); });
it('KYC retains the immutable private key returned after final verification', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: true, blob: async () => new Blob(['image']), arrayBuffer: async () => new TextEncoder().encode('image').buffer }).mockResolvedValueOnce({ ok: true }));
  const { uploadPrivateDocument } = await import('../src/lib/storage');
  expect(await uploadPrivateDocument('file:///photo.jpg', 'image/jpeg', 'alice')).toBe('private/final-image.jpg');
  expect(fake.calls[0].options.body).toMatchObject({ entity: 'kyc', sizeBytes: 5 });
  expect(fake.calls[1]).toEqual({ name: 'finalize-upload', options: { body: { key: 'temporary/1' } } });
});
it('an unreadable local file never receives an upload authorization', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
  const { uploadPrivateDocument } = await import('../src/lib/storage');
  await expect(uploadPrivateDocument('file:///missing.jpg', 'image/jpeg', 'alice')).rejects.toThrow();
  expect(fake.calls).toEqual([]);
});
it('a failed verification never exposes a public URL as uploaded media', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: true, blob: async () => new Blob(['image']), arrayBuffer: async () => new TextEncoder().encode('image').buffer }).mockResolvedValueOnce({ ok: true }));
  fake.finalized = { key: 'temporary/1', publicUrl: 'https://media.example/unverified.jpg', verified: false };
  const { uploadPhoto } = await import('../src/lib/storage');
  await expect(uploadPhoto('file:///photo.jpg', 'image/jpeg', 'alice', 'avatars')).rejects.toThrow();
});

it.each(['', 'application/octet-stream', 'image/jpg'])('uploads local photos despite a native response MIME of %j', async localMime => {
  const bytes = new Uint8Array([255, 216, 255, 224, 1, 2, 3]);
  let sentBytes: ArrayBuffer | undefined;
  const transport = vi.fn(async (_url: string, init?: RequestInit) => {
    if (!init?.method) return {
      ok: true,
      blob: async () => new Blob([bytes], { type: localMime }),
      arrayBuffer: async () => bytes.buffer,
    };
    // Expo SDK 57 overrides Content-Type with Blob.type, even if a signed header was provided.
    const wireType = init.body instanceof Blob ? init.body.type : new Headers(init.headers).get('Content-Type');
    if (wireType !== 'image/jpeg') return { ok: false, status: 403 };
    if (init.body instanceof ArrayBuffer) sentBytes = init.body;
    return { ok: true };
  });
  vi.stubGlobal('fetch', transport);
  const { uploadPrivateDocument } = await import('../src/lib/storage');

  await expect(uploadPrivateDocument('file:///photo.jpg', 'image/jpeg', 'alice')).resolves.toBe('private/final-image.jpg');
  expect(new Uint8Array(sentBytes!)).toEqual(bytes);
  expect(fake.calls[0].options.body).toMatchObject({ mimeType: 'image/jpeg', sizeBytes: bytes.byteLength });
  expect(fake.calls[1].name).toBe('finalize-upload');
});

it.each([0, 10 * 1024 * 1024 + 1])('does not authorize a local file of %i bytes', async size => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    blob: async () => new Blob([new Uint8Array(size)]),
    arrayBuffer: async () => new ArrayBuffer(size),
  }));
  const { uploadPrivateDocument } = await import('../src/lib/storage');

  await expect(uploadPrivateDocument('file:///photo.jpg', 'image/jpeg', 'alice')).rejects.toThrow('10 Mo');
  expect(fake.calls).toEqual([]);
});
