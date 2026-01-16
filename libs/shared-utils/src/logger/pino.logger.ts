import { pino } from 'pino';
import type { Logger, LoggerOptions } from 'pino';
import { Writable } from 'node:stream';

export type CreateLoggerOptions = {
  serviceName: string;
  level?: string;
  pretty?: boolean;
};

const formatPrettyLine = (payload: Record<string, unknown>) => {
  const time = typeof payload.time === 'string' ? payload.time : '';
  const level = typeof payload.level === 'string' ? payload.level : '';
  const service = typeof payload.service === 'string' ? payload.service : '';
  const msg = typeof payload.msg === 'string' ? payload.msg : '';
  const pid = typeof payload.pid === 'number' ? payload.pid : '';
  const hostname =
    typeof payload.hostname === 'string' ? payload.hostname : '';

  const {
    time: _time,
    level: _level,
    msg: _msg,
    service: _service,
    pid: _pid,
    hostname: _hostname,
    ...rest
  } = payload;
  const extraKeys = Object.keys(rest);
  const extra =
    extraKeys.length > 0 ? ` ${JSON.stringify(rest, null, 2)}` : '';

  return `[${time}] ${level} ${service} pid=${pid} host=${hostname} ${msg}${extra}\n`;
};

const createPrettyDestination = () =>
  new Writable({
    write(chunk, _encoding, callback) {
      const raw = chunk.toString().trim();
      if (raw.length === 0) {
        callback();
        return;
      }

      const parsed = JSON.parse(raw) as Record<string, unknown>;
      process.stdout.write(formatPrettyLine(parsed));
      callback();
    },
  });

const buildLoggerOptions = (
  options: CreateLoggerOptions,
): LoggerOptions => ({
  level: options.level ?? 'info',
  base: { service: options.serviceName },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export const createLogger = (options: CreateLoggerOptions): Logger => {
  const loggerOptions = buildLoggerOptions(options);

  if (options.pretty) {
    return pino(loggerOptions, createPrettyDestination());
  }

  return pino(loggerOptions);
};
