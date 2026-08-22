import { z } from 'zod';
import { usernameSchema } from './profile.js';
export const credentialsSchema=z.object({email:z.email(),password:z.string().min(10).max(128),mfaCode:z.string().trim().regex(/^(\d{6}|[A-Fa-f0-9]{4}(?:-[A-Fa-f0-9]{4}){3})$/).optional()});
export const registrationSchema=credentialsSchema.extend({name:z.string().trim().min(2).max(80).refine(value=>!/[<>]/.test(value),'HTML is not allowed'),username:usernameSchema});
export const forgotPasswordSchema=z.object({email:z.email()}).strict();
export const resetPasswordSchema=z.object({token:z.string().min(40).max(200),password:z.string().min(10).max(128)}).strict();
export const verifyEmailSchema=z.object({token:z.string().min(40).max(200)}).strict();
export const mfaCodeSchema=z.object({code:z.string().regex(/^\d{6}$/)}).strict();
