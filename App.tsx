import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Earn } from './pages/Earn';
import { Cashout } from './pages/Cashout';
import { Admin } from './pages/Admin';
import { Login } from './pages/Login';
import { UserProvider, useUser } from './context/UserContext';
import { ToastProvider } from './context/ToastContext';

// Protected Route Wrapper
interface ProtectedRouteProps {
  children?: React.ReactNode;
  requireAdmin?: boolean;
}

const AccessDeniedHandler = () => {
  useEffect(() => {
    // Alert removed in favor of UI component, but kept for logic flow if needed
    // alert('Access denied');
  }, []);
  
  return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
          <div className="bg-surface border border-surfaceLight p-8 rounded-3xl max-w-md w-full">
               <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mx-auto mb-4 text-2xl">
                   🚫
               </div>
               <h1 className="text-xl font-bold text-white mb-2">Access Denied</h1>
               <p className="text-gray-400 mb-6">You do not have permission to view this page.</p>
               <a href="/" className="inline-block bg-surfaceLight hover:bg-surfaceLight/80 text-white font-bold py-3 px-6 rounded-xl transition-colors">
                   Return Home
               </a>
          </div>
      </div>
  );
};

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

// Extracted Profile View
const ProfileView = () => {
  const { user, logout } = useUser();
  return (
    <div className="max-w-md mx-auto space-y-4">
        <h1 className="text-2xl font-bold mb-4">Profile</h1>
        
        <div className="bg-surface border border-surfaceLight rounded-2xl p-6 text-center">
            <div className="w-20 h-20 bg-primary/20 rounded-full mx-auto flex items-center justify-center text-3xl mb-4">
            👤
            </div>
            <h2 className="text-xl font-bold mb-1">{user?.email}</h2>
            <p className="text-gray-400 text-sm mb-4">UID: {user?.uid}</p>
            <div className="bg-surfaceLight/50 p-3 rounded-xl mb-6">
                <p className="text-xs text-gray-400 mb-1">Referral Code</p>
                <code className="text-lg font-mono font-bold text-primary">{user?.referralCode}</code>
            </div>
            <button onClick={logout} className="px-6 py-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors w-full font-bold">
            Log Out
            </button>
        </div>
    </div>
  );
}

export default App;