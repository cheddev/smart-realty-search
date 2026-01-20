import { AsyncLocalStorage } from 'node:async_hooks';

const correlationStorage = new AsyncLocalStorage<{ correlationId: string }>();

export const runWithCorrelationId = <T>(
  correlationId: string,
  fn: () => T,
): T => correlationStorage.run({ correlationId }, fn);

export const getCorrelationId = () =>
  correlationStorage.getStore()?.correlationId;
