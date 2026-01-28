import { getCorrelationId } from '../../../../libs/shared-utils/src';
import { getEnv } from '../config/env';

type RequestOptions = {
  timeoutMs?: number;
  headers?: Record<string, string>;
};

type HttpMethod = 'GET' | 'POST' | 'HEAD' | 'PUT' | 'PATCH' | 'DELETE';

const defaultTimeoutMs = 2000;
const proxyHeaders = ['content-type', 'x-correlation-id'] as const;
const maxRetries = 2;
const baseRetryDelayMs = 100;
const bulkheadLimit = 50;

let usersServiceInFlight = 0;

export class BulkheadRejectedError extends Error {
  code = 'BULKHEAD_REJECTED';

  constructor() {
    super('Bulkhead rejected request');
  }
}

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

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

const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const getUsersServiceBaseUrl = () => {
  const env = getEnv();
  return env.USERS_SERVICE_URL.replace(/\/$/, '');
};

const isUsersServiceUrl = (url: string) =>
  url.startsWith(getUsersServiceBaseUrl());

const acquireBulkhead = () => {
  if (usersServiceInFlight >= bulkheadLimit) {
    throw new BulkheadRejectedError();
  }

  usersServiceInFlight += 1;
};

const releaseBulkhead = () => {
  if (usersServiceInFlight > 0) {
    usersServiceInFlight -= 1;
  }
};

const isRetryableError = (error: unknown) => {
  if (error instanceof BulkheadRejectedError) {
    return false;
  }

  if (error instanceof HttpError) {
    return error.status >= 500;
  }

  return true;
};

const getBackoffDelay = (attempt: number) => {
  const baseDelay = baseRetryDelayMs * 2 ** attempt;
  const jitter = Math.floor(Math.random() * baseRetryDelayMs);
  return baseDelay + jitter;
};

const withRetries = async <T>(
  method: HttpMethod,
  execute: () => Promise<T>,
) => {
  const isIdempotent = method === 'GET' || method === 'HEAD';
  const attempts = isIdempotent ? maxRetries + 1 : 1;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await execute();
    } catch (error) {
      const shouldRetry =
        isIdempotent && attempt < attempts - 1 && isRetryableError(error);
      if (!shouldRetry) {
        throw error;
      }

      await sleep(getBackoffDelay(attempt));
    }
  }

  throw new Error('Retry exhausted');
};

const performFetch = async (
  method: HttpMethod,
  url: string,
  body?: unknown,
  options?: RequestOptions,
) => {
  const timeoutMs = options?.timeoutMs ?? defaultTimeoutMs;
  const controller = createAbortController(timeoutMs);
  const headers = buildHeaders(options?.headers);
  const requestHeaders =
    body === undefined ? headers : ensureJsonContentType(headers);
  const payload = body === undefined ? undefined : JSON.stringify(body);

  try {
    return await fetch(url, {
      method,
      headers: requestHeaders,
      body: payload,
      signal: controller.signal,
    });
  } finally {
    controller.clear();
  }
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
  method: HttpMethod,
  url: string,
  body?: unknown,
  options?: RequestOptions,
): Promise<T> => {
  return withRetries(method, async () => {
    const shouldApplyBulkhead = isUsersServiceUrl(url);
    if (shouldApplyBulkhead) {
      acquireBulkhead();
    }

    try {
      const response = await performFetch(method, url, body, options);

      if (!response.ok) {
        const text = await response.text();
        throw new HttpError(
          response.status,
          `Request failed: ${response.status} ${response.statusText} ${text}`.trim(),
        );
      }

      return (await parseResponseBody(response)) as T;
    } finally {
      if (shouldApplyBulkhead) {
        releaseBulkhead();
      }
    }
  });
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

export const head = async (
  url: string,
  options?: RequestOptions,
): Promise<void> => request<void>('HEAD', url, undefined, options);

export type RawResponse<T> = {
  status: number;
  headers: Record<string, string>;
  body: T;
};

const requestRaw = async <T>(
  method: HttpMethod,
  url: string,
  body?: unknown,
  options?: RequestOptions,
): Promise<RawResponse<T>> => {
  const isIdempotent = method === 'GET' || method === 'HEAD';
  const attempts = isIdempotent ? maxRetries + 1 : 1;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const shouldApplyBulkhead = isUsersServiceUrl(url);
    if (shouldApplyBulkhead) {
      acquireBulkhead();
    }

    try {
      const response = await performFetch(method, url, body, options);
      const responseBody = await parseResponseBody(response);
      const responseHeaders = buildProxyHeaders(response.headers);
      const result = {
        status: response.status,
        headers: responseHeaders,
        body: responseBody as T,
      };

      if (response.status >= 500 && isIdempotent && attempt < attempts - 1) {
        await sleep(getBackoffDelay(attempt));
        continue;
      }

      return result;
    } catch (error) {
      const shouldRetry =
        isIdempotent && attempt < attempts - 1 && isRetryableError(error);
      if (!shouldRetry) {
        throw error;
      }

      await sleep(getBackoffDelay(attempt));
    } finally {
      if (shouldApplyBulkhead) {
        releaseBulkhead();
      }
    }
  }

  throw new Error('Retry exhausted');
};

export const postRaw = async <T, TBody>(
  url: string,
  body: TBody,
  options?: RequestOptions,
): Promise<RawResponse<T>> => requestRaw<T>('POST', url, body, options);
