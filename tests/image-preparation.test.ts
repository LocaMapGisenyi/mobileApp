import { expect, it, vi } from 'vitest';
const native = vi.hoisted(() => ({
  resize: vi.fn(),
  save: vi.fn().mockResolvedValue({ uri: 'file:///prepared.jpg' }),
  release: vi.fn(),
}));
vi.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg' },
  ImageManipulator: {
    manipulate: () => ({
      resize: native.resize,
      release: native.release,
      renderAsync: async () => ({
        width: 4000,
        height: 3000,
        saveAsync: native.save,
        release: native.release,
      }),
    }),
  },
}));
import { prepareImage, targetSize } from '../src/lib/prepareImage';
it('preserves aspect ratio and never enlarges a small image', () => {
  expect(targetSize(4000, 3000, 1920)).toEqual({ width: 1920, height: 1440 });
  expect(targetSize(100, 200, 1920)).toEqual({ width: 100, height: 200 });
  expect(() => targetSize(0, 200, 1920)).toThrow();
});
it('uses a larger size and higher JPEG quality for legible identity documents', async () => {
  await prepareImage('file:///identity.jpg', true);
  expect(native.resize).toHaveBeenCalledWith({ width: 2560, height: 1920 });
  expect(native.save).toHaveBeenCalledWith({ format: 'jpeg', compress: 0.92 });
});
