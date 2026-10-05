import pino from 'pino';
import { randomUUID } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';

const context = new AsyncLocalStorage();
export const withScanContext = (scanId, action) => context.run({ ...context.getStore(), scanId }, action);
export const logger = pino({ level: process.env.LOG_LEVEL || 'info', mixin: () => context.getStore() || {}, redact: ['password', 'token', 'apiKey', 'headers', 'req.headers'] });
export function requestLogging(req, res, next) {
  req.requestId = randomUUID();
  req.log = logger.child({ requestId: req.requestId });
  res.set('X-Request-Id', req.requestId);
  const start = Date.now();
  res.on('finish', () => req.log.info({ method: req.method, path: req.path, status: res.statusCode, workspaceId: req.workspaceId, durationMs: Date.now() - start }, 'request completed'));
  context.run({ requestId: req.requestId }, next);
}
