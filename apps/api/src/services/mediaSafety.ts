import { env } from '../config/env.js';
import { AppError } from '../middleware/error.js';
import { MediaSafetyRecord } from '../models/index.js';

export type MediaSafetyStatus = 'pending' | 'approved' | 'rejected';
export function mediaPublishDecision(statuses: Array<MediaSafetyStatus | undefined>, enforced: boolean) {
  if (statuses.includes('rejected')) return 'rejected' as const;
  if (enforced && statuses.some((status) => status !== 'approved')) return 'pending' as const;
  return 'allowed' as const;
}
export async function assertMediaPublishable(publicIds: string[]) {
  const records = await MediaSafetyRecord.find({ publicId: { $in: publicIds } }).select('publicId status').lean();
  const byId = new Map(records.map((record) => [record.publicId, record.status as MediaSafetyStatus]));
  const decision = mediaPublishDecision(publicIds.map((id) => byId.get(id)), env.MEDIA_SAFETY_ENFORCED);
  if (decision === 'rejected') throw new AppError(400, 'MEDIA_REJECTED', 'One or more media files failed safety checks');
  if (decision === 'pending') throw new AppError(409, 'MEDIA_SCAN_PENDING', 'Media safety checks are still processing');
}
