import { getCorrelationId } from '../../../../libs/shared-utils/src';

type RequestOptions = {
  timeoutMs?: number;
  headers?: Record<string, string>;
};

const defaultTimeoutMs = 2000;

const createAbortController = (timeoutMs: number) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeout),
  };
};

const buildHeaders = (headers?: Record<string, string>) => {
  const correlationId = getCorrelationId();
  const baseHeaders = headers ?? {};
  const withCorrelation =
    correlationId && !baseHeaders['x-correlation-id']
      ? { ...baseHeaders, 'x-correlation-id': correlationId }
      : { ...baseHeaders };

  return withCorrelation;
};

const ensureJsonContentType = (headers: Record<string, string>) => {
  const hasContentType = Object.keys(headers).some(
    (key) => key.toLowerCase() === 'content-type',
  );

  if (hasContentType) {
    return headers;
  }

  return { ...headers, 'content-type': 'application/json' };
};

const request = async <T>(
  method: 'GET' | 'POST',
  url: string,
  body?: unknown,
  options?: RequestOptions,
): Promise<T> => {
  const timeoutMs = options?.timeoutMs ?? defaultTimeoutMs;
  const controller = createAbortController(timeoutMs);
  const headers = buildHeaders(options?.headers);
  const requestHeaders =
    body === undefined ? headers : ensureJsonContentType(headers);
  const payload = body === undefined ? undefined : JSON.stringify(body);

  try {
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: payload,
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Request failed: ${response.status} ${response.statusText} ${text}`.trim(),
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      return (await response.json()) as T;
    }

    return (await response.text()) as T;
  } finally {
    controller.clear();
  }
};

export const get = async <T>(
  url: string,
  options?: RequestOptions,
): Promise<T> => request<T>('GET', url, undefined, options);

export const post = async <T, TBody>(
  url: string,
  body: TBody,
  options?: RequestOptions,
): Promise<T> => request<T>('POST', url, body, options);
