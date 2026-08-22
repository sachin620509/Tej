import type { PublicProfile } from '@instaframe/contracts';
import { Check, LoaderCircle, UserCheck, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../lib/api';

type FollowRequest = { id: string; requester: PublicProfile; createdAt: string };

export function FollowRequests() {
  const [items, setItems] = useState<FollowRequest[]>();
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState('');
  useEffect(() => { api<{ items: FollowRequest[] }>('/api/follow-requests').then(data => setItems(data.items)).catch(cause => setError(cause instanceof ApiError ? cause.message : 'Could not load follow requests')); }, []);
  const act = async (item: FollowRequest, accept: boolean) => {
    setBusy(item.id); setError('');
    try {
      await api(`/api/follow-requests/${item.id}${accept ? '/accept' : ''}`, { method: accept ? 'POST' : 'DELETE' });
      setItems(current => current?.filter(value => value.id !== item.id));
    } catch (cause) { setError(cause instanceof ApiError ? cause.message : 'Request could not be updated'); }
    finally { setBusy(undefined); }
  };
  if (!items) return <div className="profile-state"><LoaderCircle className="spin"/></div>;
  return <div className="page"><header><p className="eyebrow">PRIVATE ACCOUNT</p><h1>Follow requests</h1><p>You decide who can view your private content.</p></header>{error && <p className="form-error">{error}</p>}<section className="request-list">{items.map(item => <article key={item.id}><Link className="chat-avatar" to={`/profile/${item.requester.username}`}>{item.requester.profilePhoto ? <img src={item.requester.profilePhoto} alt=""/> : item.requester.name[0]}</Link><div><Link to={`/profile/${item.requester.username}`}><b>{item.requester.name}{item.requester.verified ? ' ✓' : ''}</b></Link><small>@{item.requester.username} · {new Date(item.createdAt).toLocaleDateString()}</small></div><aside><button disabled={busy === item.id} onClick={() => void act(item, true)}><Check/> Accept</button><button disabled={busy === item.id} aria-label="Reject request" onClick={() => void act(item, false)}><X/></button></aside></article>)}{!items.length && <div className="profile-empty"><UserCheck/><h2>No follow requests</h2><p>New private-account requests will appear here.</p></div>}</section></div>;
}
