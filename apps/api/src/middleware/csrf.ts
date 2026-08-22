import type { RequestHandler } from 'express';
import { env } from '../config/env.js';
import { AppError } from './error.js';

export function isTrustedMutationOrigin(origin: string | undefined, trustedOrigin: string) {
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(trustedOrigin).origin;
  } catch {
    return false;
  }
}

export const requireTrustedWebOrigin: RequestHandler = (req, _res, next) => {
  const mobileTokenRequest = req.header('x-instaframe-client') === 'mobile' && typeof req.body?.refreshToken === 'string';
  if (mobileTokenRequest) return next();
  const origin=req.header('origin');
  if (![env.CLIENT_URL,env.ADMIN_URL].filter((value):value is string=>Boolean(value)).some(value=>isTrustedMutationOrigin(origin,value))) {
    return next(new AppError(403, 'CSRF_ORIGIN_REJECTED', 'Request origin is not allowed'));
  }
  return next();
};
