import { AlertTriangle, ArrowLeft, CheckCircle2, LoaderCircle, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api, ApiError } from '../lib/api';

type CleanupJob = {
  _id: string;
  userId: string;
  status: 'pending' | 'processing' | 'complete' | 'failed';
  attempts: number;
  assetCount: number;
  nextAttemptAt?: string;
  completedAt?: string;
  lastError?: string;
  createdAt: string;
};
type CleanupData = {
  counts: Record<CleanupJob['status'], number>;
  items: CleanupJob[];
};
type UsageMetric={used:number;limit:number;percent:number};
type MediaUsage={checkedAt:string;plan?:string;credits:UsageMetric;storage:UsageMetric;bandwidth:UsageMetric;transformations:UsageMetric};

export function MediaOperations() {
  const { user } = useAuth();
  const [data, setData] = useState<CleanupData>();
  const [usage,setUsage]=useState<MediaUsage>();
  const [error, setError] = useState('');
  const [retrying, setRetrying] = useState('');
  const allowed = user && ['ADMIN', 'SUPER_ADMIN'].includes(user.role);
  const load = useCallback(async () => {
    if (!allowed) return;
    try {
      setData(await api<CleanupData>('/api/admin/media-cleanup'));
      try{setUsage(await api<MediaUsage>('/api/admin/media-usage'))}catch{setUsage(undefined)}
      setError('');
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Cleanup operations unavailable');
    }
  }, [allowed]);
  useEffect(() => { void load(); }, [load]);
  const retry = async (id: string) => {
    setRetrying(id);
    try {
      await api(`/api/admin/media-cleanup/${id}/retry`, { method: 'POST' });
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Retry failed');
    } finally {
      setRetrying('');
    }
  };
  if (!allowed) return <div className="profile-state"><AlertTriangle/><h1>Administrator access required</h1><p>Media operations are restricted and audited.</p></div>;
  return <div className="admin-page">
    <header><div><Link to="/admin"><ArrowLeft/> Platform control</Link><p className="eyebrow">MEDIA OPERATIONS</p><h1>Cleanup queue</h1><p>Monitor account-deletion media cleanup without exposing storage identifiers.</p></div><button onClick={() => void load()}><RefreshCw/> Refresh</button></header>
    {error && <p className="form-error">{error}</p>}
    {!data ? <div className="profile-state"><LoaderCircle className="spin"/></div> : <>
      <section className="stat-grid">{(['pending', 'processing', 'failed', 'complete'] as const).map(status => <article key={status}><span><small>{status}</small><b>{data.counts[status].toLocaleString()}</b></span></article>)}</section>
      {usage&&<section className="admin-card"><h2>Cloudinary usage {usage.plan&&<small>· {usage.plan}</small>}</h2><div className="stat-grid">{(['credits','storage','bandwidth','transformations'] as const).map(key=><article key={key}><span><small>{key}</small><b>{usage[key].percent.toLocaleString()}%</b><small>{usage[key].used.toLocaleString()} of {usage[key].limit.toLocaleString()}</small></span></article>)}</div><small>Checked {new Date(usage.checkedAt).toLocaleString()} · Provider limits are not assumed unlimited.</small></section>}
      <section className="admin-card"><h2>Recent cleanup jobs</h2>{data.items.map(job => <article className="report-row" key={job._id}><div><b>{job.assetCount} media assets · {job.status}</b><small>Queued {new Date(job.createdAt).toLocaleString()} · {job.attempts} attempts</small>{job.lastError && <p className="form-error">{job.lastError}</p>}{job.completedAt && <p><CheckCircle2/> Completed {new Date(job.completedAt).toLocaleString()}</p>}</div><div>{job.status !== 'complete' && <button disabled={retrying === job._id} onClick={() => void retry(job._id)}>{retrying === job._id ? 'Retrying…' : 'Retry now'}</button>}</div></article>)}{!data.items.length && <div className="profile-empty"><CheckCircle2/><h2>No cleanup jobs</h2></div>}</section>
    </>}
  </div>;
}
