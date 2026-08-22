import type { PostDto, PublicProfile, ReelDto } from '@instaframe/contracts';
import { Clock3, Hash, LoaderCircle, MapPin, MessageCircle, Search as SearchIcon, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api';

type Tab = 'people' | 'reels' | 'posts' | 'hashtags' | 'creators' | 'businesses';
type Person = PublicProfile & { location?: string; businessName?: string; businessCategory?: string };
type Results = { users: Person[]; posts: PostDto[]; reels: ReelDto[]; hashtags: { name: string; count: number }[]; creators: Person[]; businesses: Person[]; suggestions: string[] };
type Recent = { id: string; query: string; type: string };
const tabs: Tab[] = ['people', 'reels', 'posts', 'hashtags', 'creators', 'businesses'];
const empty: Results = { users: [], posts: [], reels: [], hashtags: [], creators: [], businesses: [], suggestions: [] };

export function Search() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') ?? '');
  const [tab, setTab] = useState<Tab>('people');
  const [results, setResults] = useState<Results>(empty);
  const [recent, setRecent] = useState<Recent[]>([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState<string>();
  const [error, setError] = useState('');
  const refreshRecent = () => api<{ items: Recent[] }>('/api/search/recent').then(data => setRecent(data.items)).catch(() => undefined);
  useEffect(() => { void refreshRecent(); }, []);
  useEffect(() => {
    if (query.trim().length < 2) { setResults(empty); return; }
    const timer = setTimeout(() => {
      setLoading(true); setError(''); setParams({ q: query }, { replace: true });
      api<Results>(`/api/search?q=${encodeURIComponent(query)}&type=${tab}`).then(data => { setResults(data); void refreshRecent(); }).catch(cause => setError(cause instanceof ApiError ? cause.message : 'Search unavailable')).finally(() => setLoading(false));
    }, 350);
    return () => clearTimeout(timer);
  }, [query, tab, setParams]);
  const people = tab === 'creators' ? results.creators : tab === 'businesses' ? results.businesses : results.users;
  const message = async (person: Person) => {
    setStarting(person.id); setError('');
    try {
      const conversation = await api<{ id: string }>('/api/conversations', { method: 'POST', body: JSON.stringify({ type: 'direct', memberIds: [person.id] }) });
      navigate(`/messages?id=${conversation.id}`);
    } catch (cause) { setError(cause instanceof ApiError ? cause.message : 'Could not start conversation'); }
    finally { setStarting(undefined); }
  };
  return <div className="search-page"><header><p className="eyebrow">FIND PEOPLE & CONTENT</p><div className="search-title"><h1>Search</h1><Link to="/discover">Photo Scan</Link></div><label><SearchIcon/><input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Username, name, profession or public city"/>{query && <button onClick={() => setQuery('')}><X/></button>}</label><p className="search-privacy"><MapPin/> Area search uses only the city/location members chose to show publicly.</p><div className="search-tabs">{tabs.map(value => <button className={tab === value ? 'active' : ''} key={value} onClick={() => setTab(value)}>{value}</button>)}</div></header>{loading && <LoaderCircle className="spin search-loader"/>}{error && <p className="form-error">{error}</p>}{query.length < 2 && recent.length > 0 && <section className="recent-searches"><div><h2>Recent</h2><button onClick={() => void api('/api/search/recent', { method: 'DELETE' }).then(() => setRecent([]))}>Clear all</button></div>{recent.map(item => <button key={item.id} onClick={() => setQuery(item.query)}><Clock3/>{item.query}</button>)}</section>}{results.suggestions.length > 0 && <div className="search-suggestions">{results.suggestions.map(value => <button key={value} onClick={() => setQuery(value)}>{value}</button>)}</div>}{['people', 'creators', 'businesses'].includes(tab) && people.length > 0 && <section className="search-section"><h2>{tab}</h2><div className="people-results">{people.map(person => <article key={person.id}><Link to={`/profile/${person.username}`}><span className="chat-avatar">{person.profilePhoto ? <img src={person.profilePhoto} alt=""/> : person.name[0]}</span><span><b>{person.businessName ?? person.name}{person.verified ? ' ✓' : ''}</b><small>@{person.username} · {person.businessCategory ?? person.accountType ?? 'member'}{person.location ? ` · ${person.location}` : ''}</small></span></Link><button disabled={starting === person.id} onClick={() => void message(person)}><MessageCircle/> {starting === person.id ? 'Opening…' : 'Message'}</button></article>)}</div></section>}{tab === 'hashtags' && results.hashtags.length > 0 && <section className="search-section"><h2><Hash/> Hashtags</h2><div className="hashtag-results">{results.hashtags.map(tag => <button key={tag.name} onClick={() => setQuery(`#${tag.name}`)}><Hash/><span><b>{tag.name}</b><small>{tag.count} public uses</small></span></button>)}</div></section>}{tab === 'posts' && <ContentGrid items={results.posts}/>} {tab === 'reels' && <ContentGrid items={results.reels}/>} {query.length >= 2 && !loading && !(people.length || results.posts.length || results.reels.length || results.hashtags.length) && <div className="profile-empty"><SearchIcon/><h2>No safe public results</h2><p>Try another spelling, username, profession, category or public city.</p></div>}</div>;
}

function ContentGrid({ items }: { items: (PostDto | ReelDto)[] }) {
  return <section className="search-section"><div className="explore-grid">{items.map(item => { const media = 'video' in item ? item.video : item.media[0]; return <Link to={`/profile/${item.author.username}`} key={item.id}>{media?.resourceType === 'video' ? <video src={media.secureUrl} muted controls playsInline preload="metadata"/> : <img src={media?.secureUrl} alt={item.caption} loading="lazy"/>}<span>@{item.author.username}</span></Link>; })}</div></section>;
}
