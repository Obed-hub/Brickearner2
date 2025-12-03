
import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Earn } from './pages/Earn';
import { Cashout } from './pages/Cashout';
import { Admin } from './pages/Admin';
import { Login } from './pages/Login';
import { UserProvider, useUser } from './context/UserContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { User as UserIcon, LogOut, Copy, MessageCircle, Twitter, Send, User } from './components/Icons';

// Protected Route Wrapper
interface ProtectedRouteProps {
  children?: React.ReactNode;
  requireAdmin?: boolean;
}

// Component to show unauthorized admin details for debugging
const UnauthorizedAdmin = () => {
    const { user } = useUser();
    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="bg-surface border border-red-500/30 p-8 rounded-3xl max-w-md w-full text-center">
                <h2 className="text-red-500 font-bold text-xl mb-4">Unauthorized Admin Access</h2>
                <div className="bg-black/30 p-4 rounded-xl mb-4 text-left font-mono text-xs text-gray-300 break-all">
                    <p className="mb-2"><span className="text-gray-500">Email:</span> {user?.email}</p>
                    <p><span className="text-gray-500">UID:</span> {user?.uid}</p>
                </div>
                <p className="text-gray-400 text-sm mb-6">This account is not listed as a Super Admin in the system.</p>
                <a href="/" className="bg-surfaceLight px-6 py-2 rounded-lg text-white font-bold">Back to Home</a>
            </div>
        </div>
    )
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireAdmin = false }) => {
  const { user, loading } = useUser();
  
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background text-primary">Loading...</div>;
  
  if (!user) return <Navigate to="/login" replace />;

  if (requireAdmin) {
    // Strict check for admin access (Email OR UID)
    const email = user.email?.toLowerCase().trim() || '';
    const uid = user.uid;

    const isAdminEmail = email === 'joinsexcompany@gmail.com';
    const isAdminUid = uid === 'alyPvUmbaCT3Tu49IuG4sQedasG3';

    if (!isAdminEmail && !isAdminUid) {
        return <UnauthorizedAdmin />;
    }
    // Admin does not use the standard Layout with user sidebar
    return <>{children}</>;
  }

  return <Layout>{children}</Layout>;
};

// Extracted Profile View with Sharing Features
const ProfileView = () => {
  const { user, logout } = useUser();
  const { showToast } = useToast();

  const handleCopy = () => {
      if (user?.referralCode) {
          navigator.clipboard.writeText(user.referralCode);
          if (navigator.vibrate) navigator.vibrate(50);
          showToast("Referral code copied to clipboard!", "success");
      }
  };

  const handleShare = (platform: 'whatsapp' | 'telegram' | 'twitter') => {
      if (!user?.referralCode) return;
      
      const text = `Join Brickearner using my code ${user.referralCode} and earn crypto!`;
      const url = window.location.origin;
      let link = '';

      switch(platform) {
          case 'whatsapp':
              link = `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`;
              break;
          case 'telegram':
              link = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
              break;
          case 'twitter':
              link = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
              break;
      }
      window.open(link, '_blank');
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-2xl font-bold mb-4">User Profile</h1>
        
        <div className="bg-surface border border-surfaceLight rounded-3xl p-6 text-center shadow-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-primary/20 to-purple-500/20"></div>
            
            <div className="relative z-10">
                <div className="w-24 h-24 bg-surface border-4 border-surfaceLight rounded-full mx-auto flex items-center justify-center text-4xl mb-4 shadow-xl">
                    👤
                </div>
                <h2 className="text-xl font-bold mb-1 text-white">{user?.email}</h2>
                <p className="text-gray-500 text-xs font-mono mb-6">UID: {user?.uid}</p>
                
                {/* Stats Row */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-surfaceLight/50 rounded-2xl p-3 border border-white/5">
                        <p className="text-xs text-gray-400 font-bold uppercase">Referrals</p>
                        <p className="text-xl font-bold text-white flex items-center justify-center gap-2">
                            <User size={16} className="text-blue-400" />
                            {user?.referralCount || 0}
                        </p>
                    </div>
                    <div className="bg-surfaceLight/50 rounded-2xl p-3 border border-white/5">
                        <p className="text-xs text-gray-400 font-bold uppercase">Level</p>
                        <p className="text-xl font-bold text-white flex items-center justify-center gap-2">
                            <span className="text-yellow-500">★</span>
                            {user?.level || 1}
                        </p>
                    </div>
                </div>
                
                {/* Referral Section */}
                <div className="bg-surfaceLight/30 border border-white/5 p-4 rounded-2xl mb-6">
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">Your Referral Code</p>
                    
                    <div 
                        onClick={handleCopy}
                        className="bg-black/40 border border-white/10 rounded-xl p-3 flex items-center justify-between cursor-pointer active:scale-95 transition-all group hover:border-primary/50"
                    >
                        <code className="text-xl font-mono font-bold text-primary tracking-widest pl-2">
                            {user?.referralCode || '...'}
                        </code>
                        <div className="p-2 bg-white/5 rounded-lg group-hover:bg-white/10">
                            <Copy size={18} className="text-gray-400 group-hover:text-white" />
                        </div>
                    </div>
                    
                    <div className="mt-4 flex gap-2 justify-center">
                        <button onClick={() => handleShare('whatsapp')} className="p-3 bg-green-600/20 hover:bg-green-600 text-green-500 hover:text-white rounded-xl transition-all">
                            <MessageCircle size={20} />
                        </button>
                        <button onClick={() => handleShare('telegram')} className="p-3 bg-blue-500/20 hover:bg-blue-500 text-blue-500 hover:text-white rounded-xl transition-all">
                            <Send size={20} />
                        </button>
                        <button onClick={() => handleShare('twitter')} className="p-3 bg-white/10 hover:bg-black text-gray-400 hover:text-white rounded-xl transition-all">
                            <Twitter size={20} />
                        </button>
                    </div>
                </div>

                <button onClick={logout} className="w-full px-6 py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl hover:bg-red-500 hover:text-white transition-all font-bold flex items-center justify-center gap-2">
                    <LogOut size={18} />
                    Log Out
                </button>
            </div>
        </div>
    </div>
  );
}

const App: React.FC = () => {
  return (
    <ToastProvider>
        <UserProvider>
        <HashRouter>
            <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/earn" element={<ProtectedRoute><Earn /></ProtectedRoute>} />
            <Route path="/cashout" element={<ProtectedRoute><Cashout /></ProtectedRoute>} />
            
            <Route path="/profile" element={
                <ProtectedRoute>
                <ProfileView />
                </ProtectedRoute>
            } />

            {/* Admin Route - Separate Layout/UI within the page component */}
            <Route path="/admin" element={<ProtectedRoute requireAdmin={true}><Admin /></ProtectedRoute>} />
            
            <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </HashRouter>
        </UserProvider>
    </ToastProvider>
  );
};

export default App;
