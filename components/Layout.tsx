
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Gamepad2, Wallet, User as UserIcon, Menu as MenuIcon, Bell, Plus, Settings } from './Icons';
import { useUser } from '../context/UserContext';
import { GameHub } from './GameHub';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [isHubOpen, setIsHubOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  // STRICT ACCESS CHECK: Only specific email or UID shows the button
  const isSuperAdmin = 
    user?.email?.toLowerCase() === 'joinsexcompany@gmail.com' || 
    user?.uid === 'alyPvUmbaCT3Tu49IuG4sQedasG3';

  return (
    <div className="min-h-screen bg-background text-white pb-20 md:pb-0 font-sans selection:bg-primary selection:text-white overflow-x-hidden">
      {/* Top Navbar */}
      <nav className="sticky top-0 z-50 bg-surface/90 backdrop-blur-md border-b border-surfaceLight px-4 py-3 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3">
          <button className="md:hidden text-gray-400 hover:text-white" onClick={() => setIsHubOpen(true)}>
            <MenuIcon size={24} />
          </button>
          <div className="flex flex-col">
            <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent cursor-pointer" onClick={() => navigate('/')}>
              Brickearner
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
           {/* Balance Chip */}
           {user && (
            <div className="flex items-center bg-gray-900 rounded-full pr-4 pl-1 py-1 border border-surfaceLight shadow-inner cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate('/cashout')}>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center mr-2 shadow-lg shadow-teal-500/20">
                <span className="font-bold text-xs text-black">₿</span>
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Earnings</span>
                <span className="text-sm font-bold text-white">
                  {(user.balance || 0).toFixed(5)}
                </span>
              </div>
            </div>
           )}

          <button className="relative p-2 rounded-full hover:bg-surfaceLight transition-colors">
            <Bell size={20} className="text-gray-400" />
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-surface"></span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto md:flex">
        {/* Desktop Sidebar (Hidden on mobile) */}
        <aside className="hidden md:flex flex-col w-64 h-[calc(100vh-64px)] fixed left-0 top-16 bg-surface border-r border-surfaceLight p-4">
          <div className="space-y-2">
            <SidebarItem icon={<Home size={20} />} label="Dashboard" active={isActive('/')} onClick={() => navigate('/')} />
            <SidebarItem icon={<Gamepad2 size={20} />} label="Earn" active={isActive('/earn')} onClick={() => navigate('/earn')} />
            
            {/* Game Hub Button for Desktop */}
            <button 
                onClick={() => setIsHubOpen(true)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-200 text-yellow-400 hover:bg-surfaceLight hover:text-yellow-300 font-bold"
            >
                <Plus size={20} />
                <span>Bonus Hub</span>
            </button>

            <SidebarItem icon={<Wallet size={20} />} label="Cashout" active={isActive('/cashout')} onClick={() => navigate('/cashout')} />
            <SidebarItem icon={<UserIcon size={20} />} label="Profile" active={isActive('/profile')} onClick={() => navigate('/profile')} />
            
            {/* ADMIN BUTTON - STRICT CHECK */}
            {isSuperAdmin && (
              <div className="mt-4 pt-4 border-t border-surfaceLight">
                <p className="px-4 text-xs font-bold text-gray-500 uppercase mb-2">Management</p>
                <SidebarItem 
                    icon={<Settings size={20} />} 
                    label="Admin Panel" 
                    active={isActive('/admin')} 
                    onClick={() => navigate('/admin')} 
                />
              </div>
            )}
          </div>
        </aside>

        {/* Content Area */}
        <div className="flex-1 md:ml-64 p-4 md:p-6 lg:p-8 animate-fade-in">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation - FIXED with Grid */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur-lg border-t border-surfaceLight px-0 py-2 grid grid-cols-5 items-center z-50 pb-safe">
        <MobileNavItem icon={<Home size={24} />} label="Home" active={isActive('/')} onClick={() => navigate('/')} />
        <MobileNavItem icon={<Gamepad2 size={24} />} label="Earn" active={isActive('/earn')} onClick={() => navigate('/earn')} />
        
        {/* Empty div for the FAB's space */}
        <div></div> 
        
        <MobileNavItem icon={<Wallet size={24} />} label="Cashout" active={isActive('/cashout')} onClick={() => navigate('/cashout')} />
        
        {/* Conditionally render Admin or Profile based on status */}
        {isSuperAdmin ? (
            <MobileNavItem 
                icon={<Settings size={24} className="text-red-500" />} 
                label="Admin" 
                active={isActive('/admin')} 
                onClick={() => navigate('/admin')} 
            />
        ) : (
            <MobileNavItem icon={<UserIcon size={24} />} label="Profile" active={isActive('/profile')} onClick={() => navigate('/profile')} />
        )}
      </div>
      
      {/* Mobile Floating Action Button (Center) - NOW OPENS GAME HUB */}
      <div className="md:hidden fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
         <button 
           onClick={() => setIsHubOpen(true)}
           className="w-14 h-14 bg-gradient-to-tr from-primary to-purple-500 hover:brightness-110 rounded-full flex items-center justify-center shadow-lg shadow-primary/40 border-4 border-background transition-transform active:scale-95 animate-bounce-subtle"
         >
           <Plus size={28} className="text-white" />
         </button>
      </div>

      <GameHub isOpen={isHubOpen} onClose={() => setIsHubOpen(false)} />

      <style>{`
        .pb-safe { padding-bottom: env(safe-area-inset-bottom); }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out forwards;
        }
        .animate-bounce-subtle {
            animation: bounce-subtle 3s infinite;
        }
        @keyframes bounce-subtle {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
};

const SidebarItem = ({ icon, label, active, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-200 ${
      active 
      ? 'bg-primary/10 text-primary font-medium' 
      : 'text-gray-400 hover:bg-surfaceLight hover:text-white'
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

const MobileNavItem = ({ icon, label, active, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center gap-1 transition-colors w-full ${
      active ? 'text-primary' : 'text-gray-500'
    }`}
  >
    {icon}
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);
