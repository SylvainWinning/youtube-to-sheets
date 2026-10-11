export const REQUEST_POLICY = {
  maxAttempts: 4,
  attemptTimeoutMs: 5_000,
  totalTimeoutMs: 15_000,
  baseDelayMs: 1_000,
  maxDelayMs: 5_000,
} as const;

export const LOAD_TIMEOUT_MS = 20_000;
export const LOAD_MAX_ATTEMPTS = 24;
export type RequestPolicy = { [K in keyof typeof REQUEST_POLICY]: number };

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw signal.reason ?? new DOMException('Requête annulée', 'AbortError');
}

export function createAbortScope(parent: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController();
  const abort = () => controller.abort(parent?.reason ?? new DOMException('Requête annulée', 'AbortError'));
  const timer = setTimeout(() => controller.abort(new DOMException('Délai de chargement dépassé', 'TimeoutError')), timeoutMs);
  parent?.addEventListener('abort', abort, { once: true });
  if (parent?.aborted) abort();
  return {
    signal: controller.signal,
    abort: (reason: DOMException) => controller.abort(reason),
    dispose() {
      clearTimeout(timer);
      parent?.removeEventListener('abort', abort);
    },
  };
}

/** Also settles when a test double or transport ignores AbortSignal. Late results are discarded. */
export function runAbortable<T>(operation: () => Promise<T>, signal: AbortSignal): Promise<T> {
  throwIfAborted(signal);
  return new Promise((resolve, reject) => {
    const cleanup = () => signal.removeEventListener('abort', abort);
    const abort = () => { cleanup(); reject(signal.reason); };
    signal.addEventListener('abort', abort, { once: true });
    Promise.resolve().then(() => {
      throwIfAborted(signal);
      return operation();
    }).then(value => {
      cleanup();
      if (signal.aborted) reject(signal.reason);
      else resolve(value);
    }, error => { cleanup(); reject(error); });
  });
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  throwIfAborted(signal);
  return new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); signal.removeEventListener('abort', abort); reject(signal.reason); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, ms);
    signal.addEventListener('abort', abort, { once: true });
  });
}

export function parseRetryAfter(value: string | null, now = Date.now()): number | null {
  if (value === null || !value.trim()) return null;
  const input = value.trim();
  if (/^\d+$/.test(input)) {
    const ms = Number(input) * 1_000;
    return Number.isSafeInteger(ms) ? ms : Infinity;
  }
  // Accept HTTP date forms, never Date.parse's permissive numeric/ISO shortcuts.
  const day = '(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)';
  const month = '(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)';
  const imf = new RegExp(`^${day}, \\d{2} ${month} \\d{4} \\d{2}:\\d{2}:\\d{2} GMT$`);
  let normalized = input;
  if (!imf.test(input)) {
    const rfc850 = input.match(new RegExp(`^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), (\\d{2})-(${month})-(\\d{2}) (\\d{2}:\\d{2}:\\d{2}) GMT$`));
    const asctime = input.match(new RegExp(`^(${day}) (${month}) ([ \\d]\\d) (\\d{2}:\\d{2}:\\d{2}) (\\d{4})$`));
    if (rfc850) {
      const currentYear = new Date(now).getUTCFullYear();
      let year = Math.floor(currentYear / 100) * 100 + Number(rfc850[4]);
      if (year > currentYear + 50) year -= 100;
      normalized = `${rfc850[1].slice(0, 3)}, ${rfc850[2]} ${rfc850[3]} ${year} ${rfc850[5]} GMT`;
    } else if (asctime) {
      normalized = `${asctime[1]}, ${asctime[3].trim().padStart(2, '0')} ${asctime[2]} ${asctime[5]} ${asctime[4]} GMT`;
    } else return null;
  }
  const date = Date.parse(normalized);
  if (Number.isFinite(date) && new Date(date).toUTCString() !== normalized) return null;
  return Number.isFinite(date) ? Math.max(0, date - now) : null;
}

class HttpError extends Error {
  constructor(public status: number, public retryAfter: string | null) {
    super(`HTTP ${status}`);
  }
}

interface RequestOptions {
  signal?: AbortSignal;
  policy?: RequestPolicy;
  onAttempt?: () => void;
  onResponse?: (response: Response) => void;
  init?: RequestInit;
}

export async function fetchJsonWithRetry<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const policy = options.policy ?? REQUEST_POLICY;
  const scope = createAbortScope(options.signal, policy.totalTimeoutMs);
  const deadline = performance.now() + policy.totalTimeoutMs;
  try {
    for (let attempt = 0; attempt < policy.maxAttempts; attempt++) {
      throwIfAborted(scope.signal);
      const remaining = deadline - performance.now();
      if (remaining <= 0) throw new DOMException('Délai de chargement dépassé', 'TimeoutError');
      options.onAttempt?.();
      const request = createAbortScope(scope.signal, Math.min(policy.attemptTimeoutMs, remaining));
      let delay: number;
      try {
        return await runAbortable(async () => {
          const response = await fetch(url, { ...options.init, signal: request.signal });
          throwIfAborted(request.signal);
          if (!response.ok) {
            void response.body?.cancel().catch(() => {});
            throw new HttpError(response.status, response.headers.get('Retry-After'));
          }
          options.onResponse?.(response);
          return await response.json() as T;
        }, request.signal);
      } catch (error) {
        throwIfAborted(scope.signal);
        const retryable = !(error instanceof HttpError) || error.status === 429 || error.status >= 500;
        if (!retryable || attempt + 1 >= policy.maxAttempts) throw error;
        const backoff = Math.min(policy.baseDelayMs * 2 ** attempt, policy.maxDelayMs);
        delay = error instanceof HttpError ? parseRetryAfter(error.retryAfter) ?? backoff : backoff;
      } finally {
        request.dispose();
      }
      // Never retry earlier than a valid server delay, or wait beyond this operation's budget.
      if (delay >= deadline - performance.now()) throw new DOMException('Délai de reprise supérieur au budget disponible', 'TimeoutError');
      await sleep(delay, scope.signal);
    }
    throw new Error('Nombre maximal de tentatives atteint');
  } finally {
    scope.dispose();
  }
}
