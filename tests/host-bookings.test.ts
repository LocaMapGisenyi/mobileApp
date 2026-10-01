import { beforeEach, describe, expect, it, vi } from 'vitest';
const { query, from } = vi.hoisted(() => {
  const query: Record<string, any> = {};
  for (const method of ['select', 'eq', 'gt', 'lte', 'or', 'order', 'range']) query[method] = vi.fn(() => query);
  query.then = (resolve: (value: unknown) => void) => resolve({ data: [], error: null });
  query.maybeSingle = vi.fn(async () => ({ data: null, error: null }));
  return { query, from: vi.fn(() => query) };
});
vi.mock('../src/lib/supabase', () => ({ supabase: { from } }));
import { getHostBookings, getHostBookingDetail } from '../src/services/booking.service';
import { canCompleteBooking, kigaliDate, runBookingDecision } from '../src/utils/hostBookings';

describe('host booking views', () => {
  beforeEach(() => vi.clearAllMocks());
  it('uses Kigali day across the UTC midnight boundary', () => {
    expect(kigaliDate(new Date('2026-09-30T22:05:00Z'))).toBe('2026-10-01');
  });
  it('waits for the server completion date at the Kigali midnight boundary', () => {
    expect(canCompleteBooking('approved', '2026-10-01', new Date('2026-09-30T22:05:00Z'))).toBe(false);
    expect(canCompleteBooking('approved', '2026-10-01', new Date('2026-10-01T00:05:00Z'))).toBe(true);
    expect(canCompleteBooking('pending', '2026-10-01', new Date('2026-10-01T00:05:00Z'))).toBe(false);
  });
  it('always scopes the paginated query to the current host', async () => {
    await getHostBookings('host-id', 'requests', { offset: 30, limit: 30 }, '2026-10-01');
    expect(query.eq).toHaveBeenCalledWith('host_id', 'host-id');
    expect(query.eq).toHaveBeenCalledWith('status', 'pending');
    expect(query.range).toHaveBeenCalledWith(30, 59);
  });
  it('filters current stays before pagination and excludes departure day', async () => {
    await getHostBookings('host', 'current', undefined, '2026-10-01');
    expect(query.eq).toHaveBeenCalledWith('status', 'approved');
    expect(query.lte).toHaveBeenCalledWith('start_date', '2026-10-01');
    expect(query.gt).toHaveBeenCalledWith('end_date', '2026-10-01');
  });
  it('includes ended approved stays in history even before manual completion', async () => {
    await getHostBookings('host', 'history', undefined, '2026-10-01');
    expect(query.or).toHaveBeenCalledWith('status.in.(rejected,cancelled,completed),and(status.eq.approved,end_date.lte.2026-10-01)');
  });
  it.each([['arrivals', 'start_date'], ['departures', 'end_date']] as const)('selects %s on the business date', async (filter, field) => {
    await getHostBookings('host', filter, undefined, '2026-10-01');
    expect(query.eq).toHaveBeenCalledWith(field, '2026-10-01');
    expect(query.eq).toHaveBeenCalledWith('status', 'approved');
  });
  it('cannot open another host’s decision detail through an ID', async () => {
    expect(await getHostBookingDetail('booking', 'host')).toBeNull();
    expect(query.eq).toHaveBeenCalledWith('host_id', 'host');
    expect(query.eq).toHaveBeenCalledWith('id', 'booking');
  });
});
describe('booking decision lock', () => {
  it('allows one command at a time and unlocks after a failure', async () => {
    const lock = { current: false };
    let reject!: (error: Error) => void;
    const command = vi.fn(() => new Promise<void>((_, no) => { reject = no; }));
    const first = runBookingDecision(lock, command);
    expect(await runBookingDecision(lock, command)).toBe(false);
    expect(command).toHaveBeenCalledTimes(1);
    reject(new Error('offline'));
    await expect(first).rejects.toThrow('offline');
    expect(lock.current).toBe(false);
    expect(await runBookingDecision(lock, async () => undefined)).toBe(true);
  });
  it('releases the visual busy state even when navigation invalidates the result', async () => {
    const lock = { current: false };
    const states: boolean[] = [];
    let generation = 1;
    const initial = generation;
    let finish!: () => void;
    const result = runBookingDecision(lock, async () => {
      await new Promise<void>(resolve => { finish = resolve; });
      if (initial !== generation) return;
      throw new Error('A stale result must not be applied');
    }, value => states.push(value));
    generation++;
    finish();
    await result;
    expect(states).toEqual([true, false]);
    expect(lock.current).toBe(false);
  });
});
