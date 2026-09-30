import { expect, it } from 'vitest';
import { parseContentSections } from '../src/lib/guideContent';
it('keeps all lines in a paragraph and recognizes explicit guide callouts', () => {
  expect(parseContentSections('First line\nSecond line\n\n[INFO] Bring identification')).toEqual([
    { type: 'paragraph', content: 'First line Second line' },
    { type: 'info', content: 'Bring identification' },
  ]);
});
