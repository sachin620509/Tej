import type { AuthUser } from '@instaframe/contracts';
declare global { namespace Express { interface Request { user?: AuthUser } } }
export {};
