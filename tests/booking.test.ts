import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('../src/lib/supabase', () => ({ supabase: { rpc, from: () => {
  const query = { insert: () => query, update: () => query, select: () => query, eq: () => query, single: async () => ({ data: { id: 'unchecked' }, error: null }) };
  return query;
} } }));
import { createBooking, updateBookingStatus } from '../src/services/booking.service';

describe('authoritative booking commands', () => {
  beforeEach(() => rpc.mockReset());
  it('sends dates and property to the server without trusting a client price or host', async () => {
    rpc.mockResolvedValue({ data: { id: 'created' }, error: null });
    await createBooking({ property_id: 'property', guest_id: 'spoofed', host_id: 'spoofed', start_date: '2026-10-01', end_date: '2026-11-01', guest_count: 2, total_price: 1, currency: 'USD' });
    expect(rpc).toHaveBeenCalledWith('create_booking', { p_property_id: 'property', p_start_date: '2026-10-01', p_end_date: '2026-11-01', p_guest_count: 2, p_message: null });
  });
  it('uses the checked status transition and propagates rejected requests', async () => {
    rpc.mockResolvedValue({ data: null, error: new Error('Dates already booked') });
    await expect(updateBookingStatus('booking', 'approved')).rejects.toThrow('Dates already booked');
    expect(rpc).toHaveBeenCalledWith('update_booking_status', { p_booking_id: 'booking', p_status: 'approved' });
  });
});
