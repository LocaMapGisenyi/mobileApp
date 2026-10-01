const FIELD_CLEARANCE = 16;

/** Scroll just enough to keep the focused field inside the resized form viewport. */
export function focusedFieldOffset(
  offset: number,
  viewportTop: number,
  viewportHeight: number,
  fieldTop: number,
  fieldHeight: number,
): number {
  if (![offset, viewportTop, viewportHeight, fieldTop, fieldHeight].every(Number.isFinite) || viewportHeight <= 0) return offset;
  const top = viewportTop + FIELD_CLEARANCE;
  const bottom = viewportTop + viewportHeight - FIELD_CLEARANCE;
  if (fieldTop < top || fieldHeight > bottom - top) return Math.max(0, offset + fieldTop - top);
  if (fieldTop + fieldHeight > bottom) return Math.max(0, offset + fieldTop + fieldHeight - bottom);
  return offset;
}
