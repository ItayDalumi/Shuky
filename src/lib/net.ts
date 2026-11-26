/**
 * fetch with a timeout, used for every Supabase request. Without it a request on a weak
 * connection can hang forever and leave a spinner on screen. Photo uploads get longer.
 */
export const REQUEST_TIMEOUT_MS = 20_000;
export const UPLOAD_TIMEOUT_MS = 90_000;

export class TimeoutError extends Error {
  constructor() {
    super('Request timed out');
    this.name = 'TimeoutError';
  }
}

function isUpload(input: RequestInfo | URL, init?: RequestInit): boolean {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const method = (init?.method ?? (typeof input === 'object' && 'method' in input ? input.method : 'GET')).toUpperCase();
  return url.includes('/storage/v1/object/') && (method === 'POST' || method === 'PUT');
}

export function createTimeoutFetch(baseFetch: typeof fetch = fetch) {
  return async function timeoutFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const ms = isUpload(input, init) ? UPLOAD_TIMEOUT_MS : REQUEST_TIMEOUT_MS;
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, ms);
    // Keep honoring the caller's own abort signal.
    const outer = init?.signal;
    const onAbort = () => controller.abort();
    if (outer) {
      if (outer.aborted) controller.abort();
      else outer.addEventListener('abort', onAbort);
    }
    try {
      return await baseFetch(input, { ...init, signal: controller.signal });
    } catch (e) {
      if (timedOut) throw new TimeoutError();
      throw e;
    } finally {
      clearTimeout(timer);
      outer?.removeEventListener('abort', onAbort);
    }
  };
}

/** True for errors that mean "couldn't reach the server" (offline, DNS, timeout). */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof TimeoutError) return true;
  const message =
    error instanceof Error
      ? `${error.name} ${error.message}`
      : error && typeof error === 'object' && 'message' in error
        ? String((error as { message: unknown }).message)
        : '';
  return /network request failed|failed to fetch|network ?error|load failed|timed out|timeout|AuthRetryableFetchError|ENOTFOUND|ECONNREFUSED/i.test(
    message,
  );
}
