import { expect, it } from 'vitest';
import { focusedFieldOffset } from '../src/utils/formVisibility';

it('reveals the last field when the keyboard leaves only a short form viewport', () => {
  const next = focusedFieldOffset(0, 130, 240, 430, 52);
  expect(430 + 52 - next).toBeLessThanOrEqual(130 + 240 - 16);
  expect(next).toBe(128);
});
it('keeps a visible field stable instead of jumping on every keystroke', () => {
  expect(focusedFieldOffset(180, 130, 240, 180, 52)).toBe(180);
});
it('scrolls back up when returning to an earlier field', () => {
  const next = focusedFieldOffset(250, 130, 240, 70, 52);
  expect(next).toBe(174);
  expect(70 + 250 - next).toBe(146);
});
it('never scrolls above the beginning and waits for a measurable viewport', () => {
  expect(focusedFieldOffset(0, 130, 240, 120, 52)).toBe(0);
  expect(focusedFieldOffset(50, 130, 0, 500, 52)).toBe(50);
});
it('prioritizes the beginning of a field on very short landscape viewports', () => {
  expect(focusedFieldOffset(100, 130, 60, 180, 52)).toBe(134);
});
