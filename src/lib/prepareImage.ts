export const IMAGE_POLICY = {
  publicMaxEdge: 1920,
  documentMaxEdge: 2560,
  publicQuality: 0.82,
  documentQuality: 0.92,
} as const;
export function targetSize(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0)
    throw new Error('Image illisible.');
  const ratio = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}
export async function prepareImage(uri: string, document = false): Promise<string> {
  const { ImageManipulator, SaveFormat } = await import('expo-image-manipulator');
  const context = ImageManipulator.manipulate(uri);
  let image = await context.renderAsync();
  try {
    const size = targetSize(
      image.width,
      image.height,
      document ? IMAGE_POLICY.documentMaxEdge : IMAGE_POLICY.publicMaxEdge,
    );
    if (size.width !== image.width || size.height !== image.height) {
      image.release();
      context.resize(size);
      image = await context.renderAsync();
    }
    return (
      await image.saveAsync({
        format: SaveFormat.JPEG,
        compress: document ? IMAGE_POLICY.documentQuality : IMAGE_POLICY.publicQuality,
      })
    ).uri;
  } finally {
    image.release();
    context.release();
  }
}
