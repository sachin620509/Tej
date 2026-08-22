import type { RequestHandler } from 'express';

function clean(value: unknown): void {
  if (!value || typeof value !== 'object') return;
  for (const key of Object.keys(value)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete (value as Record<string, unknown>)[key];
      continue;
    }
    clean((value as Record<string, unknown>)[key]);
  }
}

// Express 5 exposes req.query as a getter. Sanitize mutable payloads without
// assigning to framework-owned request properties.
export const sanitizeRequest: RequestHandler = (req, _res, next) => {
  clean(req.body);
  clean(req.params);
  next();
};
