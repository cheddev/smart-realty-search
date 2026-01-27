import { getCorrelationId } from '../../../../libs/shared-utils/src';

type RequestOptions = {
  timeoutMs?: number;
  headers?: Record<string, string>;
};

const defaultTimeoutMs = 2000;
const proxyHeaders = ['content-type', 'x-correlation-id'] as const;

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

const parseResponseBody = async (response: Response) => {
  if (response.status === 204) {
    return undefined;
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
};

const buildProxyHeaders = (headers: Headers) => {
  const correlationId = getCorrelationId();
  const result: Record<string, string> = {};

  proxyHeaders.forEach((header) => {
    const value = headers.get(header);
    if (value) {
      result[header] = value;
    }
  });

  if (!result['x-correlation-id'] && correlationId) {
    result['x-correlation-id'] = correlationId;
  }

  return result;
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

    return (await parseResponseBody(response)) as T;
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

export type RawResponse<T> = {
  status: number;
  headers: Record<string, string>;
  body: T;
};

const requestRaw = async <T>(
  method: 'GET' | 'POST',
  url: string,
  body?: unknown,
  options?: RequestOptions,
): Promise<RawResponse<T>> => {
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

    const responseBody = await parseResponseBody(response);
    const responseHeaders = buildProxyHeaders(response.headers);

    return {
      status: response.status,
      headers: responseHeaders,
      body: responseBody as T,
    };
  } finally {
    controller.clear();
  }
};

export const postRaw = async <T, TBody>(
  url: string,
  body: TBody,
  options?: RequestOptions,
): Promise<RawResponse<T>> => requestRaw<T>('POST', url, body, options);
