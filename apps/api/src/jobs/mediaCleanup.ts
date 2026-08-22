import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';
import { AccountDeletionJob } from '../models/index.js';
import { sendOperationalAlert } from '../services/operationsMonitoring.js';

export type DeletionAsset = { publicId: string; resourceType: 'image' | 'video' };
export type DeleteResult = { deleted?: Record<string, string> };
export type MediaDeletionProvider = {
  remove(publicIds: string[], resourceType: 'image' | 'video'): Promise<DeleteResult>;
};

const chunks = <T>(items: T[], size: number) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size),
  );

export async function deleteAssets(provider: MediaDeletionProvider, assets: DeletionAsset[]) {
  const failed: DeletionAsset[] = [];
  for (const resourceType of ['image', 'video'] as const) {
    const group = assets.filter((asset) => asset.resourceType === resourceType);
    for (const batch of chunks(group, 100)) {
      try {
        const result = await provider.remove(batch.map((asset) => asset.publicId), resourceType);
        for (const asset of batch) {
          const status = result.deleted?.[asset.publicId];
          if (status !== 'deleted' && status !== 'not_found') failed.push(asset);
        }
      } catch {
        failed.push(...batch);
      }
    }
  }
  return failed;
}

async function deleteLegacy(provider: MediaDeletionProvider, publicIds: string[]) {
  let failed = 0;
  for (const batch of chunks(publicIds, 100)) {
    const outcomes = await Promise.allSettled([
      provider.remove(batch, 'image'),
      provider.remove(batch, 'video'),
    ]);
    if (outcomes.every((result) => result.status === 'rejected')) failed += batch.length;
  }
  return failed;
}

const provider: MediaDeletionProvider = {
  remove: async (publicIds, resourceType) =>
    cloudinary.api.delete_resources(publicIds, {
      resource_type: resourceType,
      type: 'upload',
      invalidate: true,
    }) as Promise<DeleteResult>,
};

export async function processNextMediaCleanup(
  customProvider: MediaDeletionProvider = provider,
): Promise<boolean | null> {
  const now = new Date();
  const stale = new Date(now.getTime() - 10 * 60_000);
  const job = await AccountDeletionJob.findOneAndUpdate(
    {
      $or: [
        { status: 'pending', nextAttemptAt: { $lte: now } },
        { status: 'failed', attempts: { $lt: env.MEDIA_CLEANUP_MAX_ATTEMPTS }, nextAttemptAt: { $lte: now } },
        { status: 'processing', lockedAt: { $lt: stale } },
      ],
    },
    { $set: { status: 'processing', lockedAt: now } },
    { new: true, sort: { nextAttemptAt: 1, createdAt: 1 } },
  );
  if (!job) return null;

  try {
    const exact: DeletionAsset[] = job.mediaAssets.map((asset) => ({
      publicId: asset.publicId,
      resourceType: asset.resourceType,
    }));
    let remaining: DeletionAsset[] = [];
    let legacyFailures = 0;
    if (exact.length) remaining = await deleteAssets(customProvider, exact);
    else if (job.mediaPublicIds.length) legacyFailures = await deleteLegacy(customProvider, job.mediaPublicIds);

    job.mediaAssets.splice(0, job.mediaAssets.length, ...remaining);
    if (remaining.length || legacyFailures) {
      throw new Error(`${remaining.length + legacyFailures} media assets could not be deleted`);
    }

    job.status = 'complete';
    job.completedAt = new Date();
    job.lockedAt = undefined;
    job.lastError = undefined;
    job.mediaPublicIds.splice(0);
    await job.save();
    return true;
  } catch (error) {
    job.attempts += 1;
    job.status = 'failed';
    job.lockedAt = undefined;
    job.lastError = (error instanceof Error ? error.message : 'Media cleanup failed').slice(0, 1000);
    if (job.attempts < env.MEDIA_CLEANUP_MAX_ATTEMPTS) {
      const delay = Math.min(6 * 60 * 60_000, 30_000 * 2 ** Math.max(0, job.attempts - 1));
      job.nextAttemptAt = new Date(Date.now() + delay);
    }
    await job.save();
    if(job.attempts>=env.MEDIA_CLEANUP_ALERT_AFTER_ATTEMPTS&&job.lastAlertedAttempt!==job.attempts){const delivered=await sendOperationalAlert({type:'media_cleanup_repeated_failure',severity:job.attempts>=env.MEDIA_CLEANUP_MAX_ATTEMPTS?'critical':'warning',jobId:String(job._id),attempts:job.attempts,failedAssetCount:job.mediaAssets.length||job.mediaPublicIds.length,occurredAt:new Date().toISOString()});if(delivered){job.lastAlertedAttempt=job.attempts;job.lastAlertedAt=new Date();await job.save()}}
    return false;
  }
}

export function startMediaCleanupWorker() {
  if (!env.CLOUDINARY_API_SECRET) return () => {};
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  let busy = false;
  const tick = async () => {
    if (busy) return;
    busy = true;
    try {
      for (let processed = 0; processed < 20; processed += 1) {
        if ((await processNextMediaCleanup()) === null) break;
      }
    } finally {
      busy = false;
    }
  };
  void tick();
  const timer = setInterval(() => void tick(), env.MEDIA_CLEANUP_INTERVAL_MS);
  timer.unref();
  return () => clearInterval(timer);
}
