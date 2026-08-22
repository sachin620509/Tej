import { Router } from 'express';
import { isValidObjectId } from 'mongoose';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { AppError } from '../middleware/error.js';
import { AccountDeletionJob, AdminAction } from '../models/index.js';
import { getCloudinaryUsage } from '../services/operationsMonitoring.js';

const operationalRoles = requireRole(['ADMIN', 'SUPER_ADMIN']);
const allowedStatuses = ['pending', 'processing', 'complete', 'failed'] as const;

export const mediaOperationsRouter = Router();
mediaOperationsRouter.use('/admin/media-cleanup', requireAuth, operationalRoles);
mediaOperationsRouter.use('/admin/media-usage',requireAuth,operationalRoles);

mediaOperationsRouter.get('/admin/media-usage',async(_req,res)=>{try{res.json({success:true,data:await getCloudinaryUsage()})}catch(error){throw new AppError(503,'MEDIA_USAGE_UNAVAILABLE',error instanceof Error?error.message:'Cloudinary usage is unavailable')}});

mediaOperationsRouter.get('/admin/media-cleanup', async (req, res) => {
  const requestedStatus = String(req.query.status ?? '').trim();
  if (requestedStatus && !allowedStatuses.includes(requestedStatus as (typeof allowedStatuses)[number])) {
    throw new AppError(400, 'INVALID_STATUS', 'Invalid media cleanup status');
  }
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
  const query = requestedStatus ? { status: requestedStatus } : {};
  const [items, counts] = await Promise.all([
    AccountDeletionJob.find(query)
      .select('userId status attempts nextAttemptAt lockedAt completedAt lastError mediaAssets mediaPublicIds createdAt updatedAt')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
    AccountDeletionJob.aggregate<{ _id: string; count: number }>([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);
  res.json({
    success: true,
    data: {
      counts: Object.fromEntries(allowedStatuses.map((status) => [status, counts.find((row) => row._id === status)?.count ?? 0])),
      items: items.map((job) => ({
        _id: job._id,
        userId: job.userId,
        status: job.status,
        attempts: job.attempts,
        assetCount: job.mediaAssets?.length || job.mediaPublicIds?.length || 0,
        nextAttemptAt: job.nextAttemptAt,
        lockedAt: job.lockedAt,
        completedAt: job.completedAt,
        lastError: job.lastError,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      })),
    },
  });
});

mediaOperationsRouter.post('/admin/media-cleanup/:id/retry', async (req, res) => {
  if (!isValidObjectId(req.params.id)) throw new AppError(400, 'INVALID_JOB', 'Invalid media cleanup job');
  const job = await AccountDeletionJob.findById(req.params.id);
  if (!job) throw new AppError(404, 'JOB_NOT_FOUND', 'Media cleanup job not found');
  if (job.status === 'complete') throw new AppError(409, 'JOB_COMPLETE', 'Completed cleanup jobs cannot be retried');
  const before = { status: job.status, attempts: job.attempts, lastError: job.lastError };
  job.status = 'pending';
  job.attempts = 0;
  job.nextAttemptAt = new Date();
  job.lockedAt = undefined;
  job.lastError = undefined;
  await job.save();
  await AdminAction.create({
    actor: req.user!.id,
    action: 'media_cleanup_retry',
    targetType: 'account_deletion_job',
    targetId: String(job._id),
    reason: 'Authorized manual retry of failed media cleanup',
    before,
    after: { status: job.status, attempts: job.attempts },
  });
  res.json({ success: true, data: { status: job.status, nextAttemptAt: job.nextAttemptAt } });
});
