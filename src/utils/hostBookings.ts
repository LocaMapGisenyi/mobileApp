export function kigaliDate(now = new Date()): string {
  return now.toLocaleDateString('en-CA', { timeZone: 'Africa/Kigali' });
}

// Supabase's completion RPC uses CURRENT_DATE in its UTC database session.
// Daily host views still use Kigali dates; avoid offering completion two hours early.
export function canCompleteBooking(status: string, endDate: string, now = new Date()): boolean {
  return status === 'approved' && endDate <= now.toISOString().slice(0, 10);
}

// A ref closes the gap between a press and React's next disabled-button render.
export async function runBookingDecision(lock: { current: boolean }, command: () => Promise<void>, onBusy?: (busy: boolean) => void): Promise<boolean> {
  if (lock.current) return false;
  lock.current = true;
  try { onBusy?.(true); await command(); return true; }
  finally { lock.current = false; onBusy?.(false); }
}
