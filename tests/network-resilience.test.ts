import { afterEach, expect, it, vi } from 'vitest';
import { resilientFetch, setNetworkErrorObserver, withDeadline } from '../src/lib/network';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  setNetworkErrorObserver(undefined);
});
it('retries only temporary read failures and returns the eventual response', async () => {
  const transport = vi
    .fn()
    .mockResolvedValueOnce(new Response('', { status: 503 }))
    .mockResolvedValueOnce(new Response('ok'));
  const result = await resilientFetch('https://example.invalid/read', undefined, {
    fetchImpl: transport,
    wait: async () => {},
    random: () => 0,
  });
  expect(await result.text()).toBe('ok');
  expect(transport).toHaveBeenCalledTimes(2);
});
it.each(['POST', 'PATCH', 'DELETE'])(
  'does not repeat a %s that may already have committed',
  async method => {
    const transport = vi.fn().mockResolvedValue(new Response('', { status: 503 }));
    await resilientFetch('https://example.invalid/write', { method }, { fetchImpl: transport });
    expect(transport).toHaveBeenCalledTimes(1);
  },
);
it('does not retry a permission denial', async () => {
  const transport = vi.fn().mockResolvedValue(new Response('', { status: 403 }));
  expect(
    (await resilientFetch('https://example.invalid/read', undefined, { fetchImpl: transport }))
      .status,
  ).toBe(403);
  expect(transport).toHaveBeenCalledTimes(1);
});
it('bounds retries and respects Retry-After without an unbounded sleep', async () => {
  const transport = vi
    .fn()
    .mockImplementation(() =>
      Promise.resolve(new Response('', { status: 429, headers: { 'Retry-After': '3600' } })),
    );
  const wait = vi.fn(async () => {});
  expect(
    (
      await resilientFetch('https://example.invalid/read', undefined, {
        fetchImpl: transport,
        wait,
      })
    ).status,
  ).toBe(429);
  expect(transport).toHaveBeenCalledTimes(1);
  expect(wait).not.toHaveBeenCalled();
});
it('aborts a timed out operation even if the transport ignores abort', async () => {
  vi.useFakeTimers();
  let signal: AbortSignal | undefined;
  const result = withDeadline(s => {
    signal = s;
    return new Promise(() => {});
  }, 25);
  const assertion = expect(result).rejects.toMatchObject({ name: 'NetworkTimeoutError' });
  await vi.advanceTimersByTimeAsync(26);
  await assertion;
  expect(signal?.aborted).toBe(true);
});
it('does not retry cancellation by the caller', async () => {
  const controller = new AbortController();
  controller.abort();
  const transport = vi.fn();
  await expect(
    resilientFetch(
      'https://example.invalid',
      { signal: controller.signal },
      { fetchImpl: transport },
    ),
  ).rejects.toMatchObject({ name: 'AbortError' });
  expect(transport).not.toHaveBeenCalled();
});
it('reports a final server failure once without request data and excludes the reporting endpoint', async () => {
  const observer = vi.fn();
  setNetworkErrorObserver(observer);
  const transport = vi.fn(async () => new Response('', { status: 503 }));
  await resilientFetch('https://example.invalid/rest/v1/profiles?private=secret', undefined, {
    fetchImpl: transport,
    wait: async () => {},
  });
  expect(observer).toHaveBeenCalledTimes(1);
  expect(observer.mock.calls[0]).toHaveLength(1);
  expect(observer.mock.calls[0][0].message).not.toContain('secret');
  observer.mockClear();
  await resilientFetch(
    'https://example.invalid/functions/v1/report-client-error',
    { method: 'POST' },
    { fetchImpl: transport },
  );
  expect(observer).not.toHaveBeenCalled();
});
it('never lets diagnostic failure break a network response', async () => {
  setNetworkErrorObserver(() => {
    throw new Error('Reporter failed');
  });
  const transport = vi.fn(async () => new Response('', { status: 503 }));
  expect(
    (
      await resilientFetch(
        'https://example.invalid/write',
        { method: 'POST' },
        { fetchImpl: transport },
      )
    ).status,
  ).toBe(503);
});
