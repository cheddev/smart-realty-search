import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { runWithCorrelationId } from './correlation-id';

const headerName = 'x-correlation-id';

export const correlationMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const incoming = req.header(headerName);
  const correlationId =
    typeof incoming === 'string' && incoming.length > 0
      ? incoming
      : randomUUID();

  res.setHeader(headerName, correlationId);
  runWithCorrelationId(correlationId, () => next());
};
