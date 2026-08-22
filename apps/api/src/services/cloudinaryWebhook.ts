import { createHash, timingSafeEqual } from 'node:crypto';
export const CLOUDINARY_WEBHOOK_TOLERANCE_SECONDS = 2 * 60 * 60;
export function createCloudinaryNotificationSignature(body: Buffer | string, timestamp: number, secret: string) {
  return createHash('sha256').update(`${body.toString()}${timestamp}${secret}`).digest('hex');
}
export function verifyCloudinaryNotification(input: { body: Buffer; timestamp?: string; signature?: string; secret: string; nowSeconds?: number }) {
  const timestamp = Number(input.timestamp);
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (!input.secret || !input.signature || !Number.isInteger(timestamp) || Math.abs(now - timestamp) > CLOUDINARY_WEBHOOK_TOLERANCE_SECONDS) return false;
  const expected = createCloudinaryNotificationSignature(input.body, timestamp, input.secret);
  const provided = input.signature.toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(provided)) return false;
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(provided, 'hex'));
}
