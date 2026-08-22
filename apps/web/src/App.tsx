import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { Shell } from './components/Shell';
import { AccountRecovery } from './pages/AccountRecovery';
import { Admin } from './pages/Admin';
import { AdminRecoveryLogin } from './pages/AdminRecoveryLogin';
import { AuthPage } from './pages/Auth';
import { Calls } from './pages/Calls';
import { CreatePost } from './pages/CreatePost';
import { Discover } from './pages/Discover';
import { DiscoverySettings } from './pages/DiscoverySettings';
import { Explore } from './pages/Explore';
import { FollowRequests } from './pages/FollowRequests';
import { Home } from './pages/Home';
import { MediaOperations } from './pages/MediaOperations';
import { MfaSetup } from './pages/MfaSetup';
import { Messages } from './pages/Messages';
import { MessageRequests } from './pages/MessageRequests';
import { Groups } from './pages/Groups';
import { Notifications } from './pages/Notifications';
import { Profile } from './pages/Profile';
import { Reels } from './pages/Reels';
import { Search } from './pages/Search';
import { Scan } from './pages/Scan';
import { AIStudio } from './pages/AIStudio';
import { AIAdmin } from './pages/AIAdmin';
import { Settings } from './pages/Settings';
import { Stories } from './pages/Stories';
import { Legal } from './pages/Legal';

const legal = ['privacy', 'terms', 'community-guidelines', 'copyright', 'data-policy'];

export function App() {
  return <Routes>
    <Route path="/login" element={<AuthPage mode="login"/>}/>
    <Route path="/register" element={<AuthPage mode="register"/>}/>
    <Route path="/forgot-password" element={<AccountRecovery mode="forgot"/>}/>
    <Route path="/reset-password" element={<AccountRecovery mode="reset"/>}/>
    <Route path="/verify-email" element={<AccountRecovery mode="verify"/>}/>
    <Route path="/admin/recovery-login" element={<AdminRecoveryLogin/>}/>
    {legal.map((path) => <Route key={path} path={`/${path}`} element={<Legal kind={path as 'privacy'|'terms'|'community-guidelines'|'copyright'|'data-policy'}/>}/>)}
    <Route path="/*" element={<ProtectedRoute><Shell><Routes>
      <Route path="/" element={<Home/>}/>
      <Route path="/create" element={<CreatePost/>}/>
      <Route path="/stories" element={<Stories/>}/>
      <Route path="/discover" element={<Discover/>}/>
      <Route path="/scan" element={<Scan/>}/>
      <Route path="/ai-studio" element={<AIStudio/>}/>
      <Route path="/admin/ai" element={<AIAdmin/>}/>
      <Route path="/explore" element={<Explore/>}/>
      <Route path="/reels" element={<Reels/>}/>
      <Route path="/search" element={<Search/>}/>
      <Route path="/messages" element={<Messages/>}/>
      <Route path="/message-requests" element={<MessageRequests/>}/>
      <Route path="/follow-requests" element={<FollowRequests/>}/>
      <Route path="/groups" element={<Groups/>}/>
      <Route path="/calls" element={<Calls/>}/>
      <Route path="/notifications" element={<Notifications/>}/>
      <Route path="/settings" element={<Settings/>}/>
      <Route path="/admin" element={<Admin/>}/>
      <Route path="/admin/mfa-setup" element={<MfaSetup/>}/>
      <Route path="/admin/media-operations" element={<MediaOperations/>}/>
      <Route path="/admin/discovery-settings" element={<DiscoverySettings/>}/>
      <Route path="/profile/:username" element={<Profile/>}/>
      <Route path="*" element={<Navigate to="/"/>}/>
    </Routes></Shell></ProtectedRoute>}/>
  </Routes>;
}
