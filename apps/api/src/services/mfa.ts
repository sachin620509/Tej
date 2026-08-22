import crypto from 'node:crypto';
import { generateSecret, generateURI, verify } from 'otplib';
import { env } from '../config/env.js';

function key() {
  const value = Buffer.from(env.ADMIN_MFA_ENCRYPTION_KEY, 'base64');
  if (value.length !== 32) throw new Error('ADMIN_MFA_ENCRYPTION_KEY must be a base64-encoded 32-byte key');
  return value;
}
export function encryptMfaSecret(secret: string) {
  const iv = crypto.randomBytes(12), cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64url')).join('.');
}
export function decryptMfaSecret(value: string) {
  const [ivRaw, tagRaw, encryptedRaw] = value.split('.');
  if (!ivRaw || !tagRaw || !encryptedRaw) throw new Error('Invalid encrypted MFA secret');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(ivRaw, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(encryptedRaw, 'base64url')), decipher.final()]).toString('utf8');
}
export function newMfaSetup(email: string) { const secret=generateSecret();return {secret,uri:generateURI({issuer:'InstaFrame',label:email,secret})} }
export async function verifyMfaCode(encryptedSecret: string, code: string) { return (await verify({secret:decryptMfaSecret(encryptedSecret),token:code})).valid }
export function recoveryCodeHash(code:string){return crypto.createHmac('sha256',key()).update(code.replace(/[^A-Z0-9]/gi,'').toUpperCase()).digest('hex')}
export function generateRecoveryCodes(count=10){const codes=Array.from({length:count},()=>{const raw=crypto.randomBytes(8).toString('hex').toUpperCase();return `${raw.slice(0,4)}-${raw.slice(4,8)}-${raw.slice(8,12)}-${raw.slice(12)}`});return {codes,hashes:codes.map(recoveryCodeHash)}}
