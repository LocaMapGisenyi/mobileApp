import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({ StyleSheet: { create: (styles: unknown) => styles }, Platform: { OS: 'web', select: (options: any) => options.web ?? options.default } }));
vi.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: vi.fn() }));
vi.mock('react-native-paper', () => ({ Text: 'Text' }));
vi.mock('react-native-reanimated', () => ({ default: {}, FadeInDown: {}, FadeIn: {}, useSharedValue: vi.fn(), withTiming: vi.fn(), useAnimatedStyle: vi.fn(), Easing: {} }));
vi.mock('@expo/vector-icons', () => ({ MaterialIcons: 'Icon' }));
vi.mock('../src/services/api', () => ({ hostService: {} }));
vi.mock('../src/store/user', () => ({ useUserStore: vi.fn() }));
vi.mock('@react-navigation/native', () => ({ useFocusEffect: vi.fn(), useIsFocused: vi.fn() }));
import * as calendar from '../src/screens/HostCalendarScreen';

it('normalizes incomplete calendar listing types through the picker presentation helper', () => {
  expect(calendar.getCalendarListingType(null, 'Type non précisé')).toEqual({ label: 'Type non précisé', initial: 'T' });
  expect(calendar.getCalendarListingType(undefined, 'Type not specified')).toEqual({ label: 'Type not specified', initial: 'T' });
  expect(calendar.getCalendarListingType('  ', 'Aina haijabainishwa')).toEqual({ label: 'Aina haijabainishwa', initial: 'A' });
  expect(calendar.getCalendarListingType('house', 'Type not specified')).toEqual({ label: 'house', initial: 'H' });
  expect(calendar.getCalendarListingType('apartment', 'Type non précisé', { apartment: 'Appartement' })).toEqual({ label: 'Appartement', initial: 'A' });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const blocked = [{ date: '2026-10-10', status: 'blocked' as const }];
const booked = [{ date: '2026-10-10', status: 'booked' as const }];
function fixture() {
  let state: any;
  const api = { getCalendar: vi.fn().mockResolvedValue(blocked), bulkUpdateCalendar: vi.fn().mockResolvedValue(undefined) };
  const session = calendar.createCalendarSession(value => { state = value; }, api);
  return { session, api, state: () => state };
}

describe('calendar request lifecycle', () => {
  it('keeps a failed read unavailable until a successful retry', async () => {
    const f = fixture();
    f.api.getCalendar.mockRejectedValueOnce(new Error('Calendar offline'));
    await f.session.load('account:A:2026-10', 'A', '2026-10');
    expect(f.state()).toMatchObject({ ready: false, loading: false, error: 'Calendar offline' });
    expect(await f.session.save('account:A:2026-10', 'A', '2026-10', { dates: ['2026-10-10'], status: 'available' })).toBe(false);
    await f.session.load('account:A:2026-10', 'A', '2026-10');
    expect(f.state()).toMatchObject({ ready: true, error: null, dayMap: { '2026-10-10': blocked[0] } });
  });

  it('does not replace the current listing with a late previous listing response', async () => {
    const f = fixture();
    const late = deferred<typeof blocked>();
    f.api.getCalendar.mockReturnValueOnce(late.promise).mockResolvedValueOnce(booked);
    const previous = f.session.load('account:A:2026-10', 'A', '2026-10');
    await f.session.load('account:B:2026-10', 'B', '2026-10');
    late.resolve(blocked);
    await previous;
    expect(f.state()).toMatchObject({ scope: 'account:B:2026-10', dayMap: { '2026-10-10': booked[0] } });
  });

  it('uses the server calendar after saving, rather than guessing the saved state', async () => {
    const f = fixture();
    await f.session.load('account:A:2026-10', 'A', '2026-10');
    f.api.getCalendar.mockResolvedValueOnce(booked);
    expect(await f.session.save('account:A:2026-10', 'A', '2026-10', { dates: ['2026-10-10'], status: 'available' })).toBe(true);
    expect(f.state()).toMatchObject({ ready: true, saving: false, dayMap: { '2026-10-10': booked[0] } });
  });

  it('does not apply an old account save to a newer calendar', async () => {
    const f = fixture();
    await f.session.load('old:A:2026-10', 'A', '2026-10');
    const mutation = deferred<void>();
    f.api.bulkUpdateCalendar.mockReturnValueOnce(mutation.promise);
    const save = f.session.save('old:A:2026-10', 'A', '2026-10', { dates: ['2026-10-10'], status: 'available' });
    f.api.getCalendar.mockResolvedValueOnce(booked);
    await f.session.load('new:B:2026-11', 'B', '2026-11');
    mutation.resolve();
    expect(await save).toBe(false);
    expect(f.state()).toMatchObject({ scope: 'new:B:2026-11', saving: false, dayMap: { '2026-10-10': booked[0] } });
  });

  it('blocks editing after an uncertain save result and retains its error', async () => {
    const f = fixture();
    await f.session.load('account:A:2026-10', 'A', '2026-10');
    f.api.bulkUpdateCalendar.mockRejectedValueOnce(new Error('Permission changed'));
    expect(await f.session.save('account:A:2026-10', 'A', '2026-10', { dates: ['2026-10-10'], status: 'available' })).toBe(false);
    expect(f.state()).toMatchObject({ ready: false, saving: false, error: 'Permission changed' });
  });

  it('requires a retry if the server reread fails after the write succeeds', async () => {
    const f = fixture();
    await f.session.load('account:A:2026-10', 'A', '2026-10');
    f.api.getCalendar.mockRejectedValueOnce(new Error('Read connection lost'));
    expect(await f.session.save('account:A:2026-10', 'A', '2026-10', { dates: ['2026-10-10'], status: 'available' })).toBe(false);
    expect(f.state()).toMatchObject({ ready: false, saving: false, error: 'Read connection lost' });
    f.api.getCalendar.mockResolvedValueOnce(booked);
    await f.session.load('account:A:2026-10', 'A', '2026-10');
    expect(f.state()).toMatchObject({ ready: true, error: null, dayMap: { '2026-10-10': booked[0] } });
  });

  it('ignores a pending read after the screen is invalidated', async () => {
    const f = fixture();
    const late = deferred<typeof blocked>();
    f.api.getCalendar.mockReturnValueOnce(late.promise);
    const read = f.session.load('account:A:2026-10', 'A', '2026-10');
    f.session.invalidate();
    const snapshot = f.state();
    late.resolve(blocked);
    await read;
    expect(f.state()).toBe(snapshot);
  });
});

describe('calendar focus refresh', () => {
  const listing = (id: string) => ({ id, title: id, type: null, canSetPricing: true });
  it('rereads listings on refocus and ignores the preceding focus response', async () => {
    let state: any;
    const older = deferred<ReturnType<typeof listing>[]>();
    const service = { getHostListings: vi.fn().mockReturnValueOnce(older.promise).mockResolvedValueOnce([listing('new')]) };
    const session = calendar.createCalendarFocusSession(next => { state = next; }, { invalidate: vi.fn() }, service);
    const first = session.load({ userId: 'host', preferredId: 'old' });
    session.invalidate();
    await session.load({ userId: 'host', preferredId: 'old' });
    older.resolve([listing('old')]);
    await first;
    expect(service.getHostListings).toHaveBeenCalledTimes(2);
    expect(state).toMatchObject({ loading: false, selectedListing: { id: 'new' }, listings: [listing('new')] });
  });
  it('preserves the selected eligible listing, or falls back when it is no longer offered', async () => {
    let state: any;
    const service = { getHostListings: vi.fn().mockResolvedValue([listing('A'), listing('B')]) };
    const session = calendar.createCalendarFocusSession(next => { state = next; }, { invalidate: vi.fn() }, service);
    await session.load({ userId: 'host', preferredId: 'B', requestedId: 'A' });
    expect(state.selectedListing.id).toBe('B');
    service.getHostListings.mockResolvedValueOnce([listing('A')]);
    session.invalidate();
    await session.load({ userId: 'host', preferredId: 'B', requestedId: 'A' });
    expect(state.selectedListing.id).toBe('A');
    service.getHostListings.mockResolvedValueOnce([]);
    session.invalidate();
    await session.load({ userId: 'host', preferredId: 'A' });
    expect(state).toMatchObject({ listings: [], selectedListing: null, loading: false, error: null });
  });
  it('invalidates old calendar responses across blur/refocus while retaining the displayed month', async () => {
    const f = fixture();
    const older = deferred<typeof blocked>();
    f.api.getCalendar.mockReturnValueOnce(older.promise).mockResolvedValueOnce(booked);
    const focus = calendar.createCalendarFocusSession(() => {}, f.session,
      { getHostListings: vi.fn().mockResolvedValue([listing('A')]) });
    await focus.load({ userId: 'host', preferredId: 'A' });
    const first = f.session.load('host:A:2027-01', 'A', '2027-01');
    focus.invalidate();
    await focus.load({ userId: 'host', preferredId: 'A' });
    await f.session.load('host:A:2027-01', 'A', '2027-01');
    older.resolve(blocked);
    await first;
    expect(f.state()).toMatchObject({ scope: 'host:A:2027-01', dayMap: { '2026-10-10': booked[0] } });
    expect(f.api.getCalendar.mock.calls.map(call => call[1])).toEqual(['2027-01', '2027-01']);
  });
  it('does not let a save started before blur replace the refreshed calendar', async () => {
    const f = fixture();
    const mutation = deferred<void>();
    const focus = calendar.createCalendarFocusSession(() => {}, f.session,
      { getHostListings: vi.fn().mockResolvedValue([listing('A')]) });
    await focus.load({ userId: 'host', preferredId: 'A' });
    await f.session.load('host:A:2027-01', 'A', '2027-01');
    f.api.bulkUpdateCalendar.mockReturnValueOnce(mutation.promise);
    const save = f.session.save('host:A:2027-01', 'A', '2027-01', { dates: ['2027-01-10'], status: 'blocked' });
    focus.invalidate();
    await focus.load({ userId: 'host', preferredId: 'A' });
    f.api.getCalendar.mockResolvedValueOnce(booked);
    await f.session.load('host:A:2027-01', 'A', '2027-01');
    mutation.resolve();
    expect(await save).toBe(false);
    expect(f.state()).toMatchObject({ ready: true, saving: false, dayMap: { '2026-10-10': booked[0] } });
    expect(f.api.getCalendar).toHaveBeenCalledTimes(2);
  });
});
