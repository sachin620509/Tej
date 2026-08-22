import { Bell, CircleDashed, Clapperboard, Compass, House, LogOut, MessageCircle, Plus, Search, Settings, ShieldCheck, Sparkles, UserCheck, UserRound, UsersRound } from 'lucide-react';
import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const baseLinks = [
  ['/', House, 'Home'], ['/stories', CircleDashed, 'Stories'], ['/explore', Compass, 'Explore'], ['/reels', Clapperboard, 'Reels'],
  ['/messages', MessageCircle, 'Messages'], ['/message-requests', UserCheck, 'Message requests'], ['/follow-requests', UserCheck, 'Follow requests'], ['/groups', UsersRound, 'Groups'], ['/notifications', Bell, 'Notifications'], ['/create', Plus, 'Create'],
  ['/discover', Sparkles, 'Discover'], ['/ai-studio', Sparkles, 'AI Studio'],
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const links = [...baseLinks, [`/profile/${encodeURIComponent(user?.username ?? '')}`, UserRound, 'Profile'] as const, ['/settings', Settings, 'Settings'] as const];
  const initials = user?.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase() || 'IF';
  return <div className="shell">
    <aside>
      <NavLink to="/" className="brand"><span>IF</span><b>InstaFrame</b></NavLink>
      <nav>
        {links.map(([to, Icon, label]) => <NavLink key={to} to={to} end={to === '/'}><Icon size={21}/><span>{label}</span></NavLink>)}
        {user?.role !== 'USER' && <NavLink to="/admin"><ShieldCheck size={21}/><span>Admin</span></NavLink>}
        {user?.role !== 'USER' && !user?.mfaVerified && <NavLink to="/admin/mfa-setup"><ShieldCheck size={21}/><span>Enable MFA</span></NavLink>}
        {user && ['ADMIN', 'SUPER_ADMIN'].includes(user.role) && <NavLink to="/admin/media-operations"><ShieldCheck size={21}/><span>Media ops</span></NavLink>}
        {user && ['ADMIN', 'SUPER_ADMIN'].includes(user.role) && <NavLink to="/admin/discovery-settings"><ShieldCheck size={21}/><span>Scan settings</span></NavLink>}
        {user && ['ADMIN', 'SUPER_ADMIN'].includes(user.role) && <NavLink to="/admin/ai"><ShieldCheck size={21}/><span>AI operations</span></NavLink>}
      </nav>
      <div className="account"><div className="avatar">{initials}</div><div><b>{user?.name}</b><small>@{user?.username}</small></div><button className="logout" onClick={() => void logout()} aria-label="Sign out"><LogOut/></button></div>
    </aside>
    <main>{children}</main>
    <div className="mobile-top"><NavLink to="/" className="mobile-brand">InstaFrame</NavLink><span><NavLink to="/search" aria-label="Search"><Search/></NavLink><NavLink to="/notifications" aria-label="Notifications"><Bell/></NavLink></span></div>
    <nav className="bottom-nav">{[links[0]!, links[2]!, links.find(item => item[0] === '/create')!, links[3]!, links.find(item => item[0].startsWith('/profile/'))!].map(([to, Icon, label]) => <NavLink key={to} to={to} end={to === '/'}><Icon/><small>{label}</small></NavLink>)}</nav>
  </div>;
}
