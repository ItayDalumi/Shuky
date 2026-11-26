import { createTimeoutFetch, isNetworkError, REQUEST_TIMEOUT_MS, TimeoutError, UPLOAD_TIMEOUT_MS } from '../net';

/** A fetch that never answers, but rejects when aborted (like the real one). */
function hangingFetch() {
  return jest.fn(
    (_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      }),
  );
}

describe('createTimeoutFetch', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('passes responses through', async () => {
    const ok = new Response('{}', { status: 200 });
    const f = createTimeoutFetch(jest.fn(async () => ok));
    await expect(f('https://x.supabase.co/rest/v1/rpc/nearby_listings')).resolves.toBe(ok);
  });

  it('gives up on a request that hangs', async () => {
    const f = createTimeoutFetch(hangingFetch());
    const p = f('https://x.supabase.co/rest/v1/rpc/nearby_listings', { method: 'POST' });
    jest.advanceTimersByTime(REQUEST_TIMEOUT_MS);
    await expect(p).rejects.toBeInstanceOf(TimeoutError);
  });

  it('gives photo uploads more time', async () => {
    const f = createTimeoutFetch(hangingFetch());
    const p = f('https://x.supabase.co/storage/v1/object/listing-photos/u/1.jpg', { method: 'POST' });
    let settled = false;
    p.catch(() => (settled = true));
    jest.advanceTimersByTime(REQUEST_TIMEOUT_MS + 1);
    await Promise.resolve();
    expect(settled).toBe(false);
    jest.advanceTimersByTime(UPLOAD_TIMEOUT_MS);
    await expect(p).rejects.toBeInstanceOf(TimeoutError);
  });

  it("still honors the caller's own abort", async () => {
    const f = createTimeoutFetch(hangingFetch());
    const caller = new AbortController();
    const p = f('https://x.supabase.co/rest/v1/x', { signal: caller.signal });
    caller.abort();
    await expect(p).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('isNetworkError', () => {
  it('recognizes offline and timeout errors', () => {
    expect(isNetworkError(new TypeError('Network request failed'))).toBe(true);
    expect(isNetworkError(new TypeError('Failed to fetch'))).toBe(true);
    expect(isNetworkError(new TimeoutError())).toBe(true);
    expect(isNetworkError({ message: 'TypeError: Load failed' })).toBe(true);
  });
  it('does not confuse server errors with being offline', () => {
    expect(isNetworkError({ message: 'permission denied for table profiles' })).toBe(false);
    expect(isNetworkError(new Error('JWT expired'))).toBe(false);
    expect(isNetworkError(undefined)).toBe(false);
  });
});
