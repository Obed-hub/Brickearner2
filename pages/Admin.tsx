
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { dataService, authService } from '../services/firebase';
import { Task, TaskType, WithdrawalRequest, User, GlobalSettings, AdminLog } from '../types';
import { useToast } from '../context/ToastContext';
import { 
  BarChart3, 
  User as UserIcon, 
  DollarSign, 
  Settings, 
  Plus, 
  Trash2, 
  Edit2, 
  CheckCircle, 
  XCircle, 
  Search,
  AlertTriangle,
  Megaphone,
  Gamepad2,
  ArrowLeft,
  LogOut,
  Link as LinkIcon,
  Image as ImageIcon,
  Activity,
  Ban,
  Unlock,
  Wifi,
  Copy,
  Trophy
} from '../components/Icons';

export const Admin: React.FC = () => {
  const { user, loading: userLoading } = useUser();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'TASKS' | 'USERS' | 'PAYOUTS' | 'SETTINGS' | 'ACTIVITY'>('OVERVIEW');
  
  // Data State
  const [stats, setStats] = useState({ totalUsers: 0, totalCoins: 0, pendingPayouts: 0 });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [settings, setSettings] = useState<GlobalSettings | null>(null);

  useEffect(() => {
    if (!userLoading) {
      if (!user) {
        navigate('/'); 
      } else {
        const isAdmin = 
            (user.email || '').toLowerCase() === 'joinsexcompany@gmail.com' || 
            user.uid === 'alyPvUmbaCT3Tu49IuG4sQedasG3';

        if (!isAdmin) {
             navigate('/');
        } else {
            const unsubTasks = dataService.subscribeToTasks(
              setTasks,
              (err) => console.error("Tasks subscription error:", err)
            );
            // REAL-TIME SETTINGS:
            // Subscribes to the 'globals/settings' document.
            // When ANY admin changes settings, this callback fires with the new data.
            // This ensures the SettingsTab (child) always has the latest source of truth.
            const unsubSettings = dataService.subscribeToSettings(setSettings);
            const unsubUsers = dataService.subscribeToAllUsers(setUsers);
            const unsubWithdrawals = dataService.subscribeToWithdrawals(setWithdrawals);
            const unsubLogs = dataService.subscribeToAdminLogs(setLogs);
            
            return () => {
                unsubTasks();
                unsubSettings();
                unsubUsers();
                unsubWithdrawals();
                unsubLogs();
            }
        }
      }
    }
  }, [user, userLoading, navigate]);

  useEffect(() => {
    const totalCoins = users.reduce((acc, curr) => acc + (curr.balance || 0), 0);
    const pending = withdrawals.filter(req => req.status === 'PENDING').length;
    setStats({
        totalUsers: users.length,
        totalCoins,
        pendingPayouts: pending
    });
  }, [users, withdrawals]);

  const handleLogout = async () => {
      try {
          await authService.logout();
          navigate('/login');
          showToast("Logged out successfully", "success");
      } catch (e) {
          showToast("Failed to logout", "error");
      }
  };

  if (userLoading || !user) return null;

  const renderContent = () => {
    switch (activeTab) {
        case 'OVERVIEW': return <OverviewTab stats={stats} />;
        case 'TASKS': return <TasksTab tasks={tasks} showToast={showToast} />;
        case 'USERS': return <UsersTab users={users} showToast={showToast} />;
        case 'PAYOUTS': return <PayoutsTab withdrawals={withdrawals} showToast={showToast} />;
        case 'SETTINGS': return <SettingsTab settings={settings} showToast={showToast} />;
        case 'ACTIVITY': return <ActivityTab logs={logs} />;
        default: return <OverviewTab stats={stats} />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background text-white selection:bg-primary selection:text-white overflow-hidden">
        {/* HEADER */}
        <header className="flex items-center justify-between px-4 py-3 bg-surface border-b border-surfaceLight shadow-sm z-20 shrink-0">
            <div className="flex items-center gap-3">
                 <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/10">
                    <span className="text-lg">🛡️</span>
                 </div>
                 <div>
                    <h1 className="font-bold text-base leading-none">Admin Panel</h1>
                    <p className="text-[10px] text-gray-500 font-mono tracking-wide uppercase mt-0.5">Super User Access</p>
                 </div>
            </div>
            
            <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-xs font-bold text-red-400 hover:text-red-300 transition-colors border border-red-500/20"
            >
                <LogOut size={14} />
                <span className="hidden sm:inline">Log Out</span>
            </button>
        </header>

        {/* MOBILE NAVIGATION TABS */}
        <div className="lg:hidden bg-surface/80 backdrop-blur-md border-b border-surfaceLight overflow-x-auto scrollbar-hide shrink-0 z-10">
            <div className="flex items-center p-2 gap-2 min-w-max">
                <MobileTab active={activeTab === 'OVERVIEW'} onClick={() => setActiveTab('OVERVIEW')} icon={<BarChart3 size={16} />} label="Overview" />
                <MobileTab active={activeTab === 'TASKS'} onClick={() => setActiveTab('TASKS')} icon={<Gamepad2 size={16} />} label="Tasks" />
                <MobileTab active={activeTab === 'USERS'} onClick={() => setActiveTab('USERS')} icon={<UserIcon size={16} />} label="Users" />
                <MobileTab active={activeTab === 'PAYOUTS'} onClick={() => setActiveTab('PAYOUTS')} icon={<DollarSign size={16} />} label="Payouts" badge={stats.pendingPayouts} />
                <MobileTab active={activeTab === 'ACTIVITY'} onClick={() => setActiveTab('ACTIVITY')} icon={<Activity size={16} />} label="Logs" />
                <MobileTab active={activeTab === 'SETTINGS'} onClick={() => setActiveTab('SETTINGS')} icon={<Settings size={16} />} label="Settings" />
            </div>
        </div>

        <div className="flex flex-1 overflow-hidden relative">
            {/* DESKTOP SIDEBAR */}
            <aside className="hidden lg:flex flex-col w-64 bg-surface border-r border-surfaceLight p-4 gap-2 shrink-0 z-10">
                <p className="px-4 text-xs font-bold text-gray-500 uppercase mb-2 mt-2">Management</p>
                <NavButton active={activeTab === 'OVERVIEW'} onClick={() => setActiveTab('OVERVIEW')} icon={<BarChart3 size={20} />} label="Overview" />
                <NavButton active={activeTab === 'TASKS'} onClick={() => setActiveTab('TASKS')} icon={<Gamepad2 size={20} />} label="Task Manager" />
                <NavButton active={activeTab === 'USERS'} onClick={() => setActiveTab('USERS')} icon={<UserIcon size={20} />} label="User Management" />
                <NavButton active={activeTab === 'PAYOUTS'} onClick={() => setActiveTab('PAYOUTS')} icon={<DollarSign size={20} />} label="Payouts" badge={stats.pendingPayouts} />
                <NavButton active={activeTab === 'ACTIVITY'} onClick={() => setActiveTab('ACTIVITY')} icon={<Activity size={20} />} label="Activity Log" />
                <NavButton active={activeTab === 'SETTINGS'} onClick={() => setActiveTab('SETTINGS')} icon={<Settings size={20} />} label="Global Settings" />
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 relative scroll-smooth bg-background">
                 <div className="max-w-6xl mx-auto pb-20 lg:pb-0">
                     <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold tracking-tight text-white">{activeTab.charAt(0) + activeTab.slice(1).toLowerCase().replace('_', ' ')}</h2>
                     </div>

                     <div className="animate-fade-in">
                        {renderContent()}
                     </div>
                 </div>
            </main>
        </div>
    </div>
  );
};

// --- SUB COMPONENTS ---

const NavButton = ({ active, onClick, icon, label, badge }: any) => (
  <button 
    onClick={onClick}
    className={`flex items-center justify-between w-full px-4 py-3 rounded-xl transition-all ${
        active 
        ? 'bg-primary text-white shadow-lg shadow-primary/20' 
        : 'text-gray-400 hover:bg-surfaceLight hover:text-white'
    }`}
  >
    <div className="flex items-center gap-3">
        {icon}
        <span className="font-medium text-sm">{label}</span>
    </div>
    {badge > 0 && (
        <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{badge}</span>
    )}
  </button>
);

const MobileTab = ({ active, onClick, icon, label, badge }: any) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all border ${
        active 
        ? 'bg-primary text-white border-primary shadow-lg shadow-primary/25' 
        : 'bg-surfaceLight/30 text-gray-400 border-transparent hover:bg-surfaceLight'
    }`}
  >
    {icon}
    <span>{label}</span>
    {badge > 0 && <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full min-w-[16px] text-center">{badge}</span>}
  </button>
);

const OverviewTab = ({ stats }: any) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
      <StatsCard title="Total Users" value={stats.totalUsers} icon={<UserIcon className="text-blue-400" />} />
      <StatsCard title="Total Coins Distributed" value={`₿ ${stats.totalCoins.toFixed(4)}`} icon={<DollarSign className="text-green-400" />} />
      <StatsCard title="Pending Payouts" value={stats.pendingPayouts} icon={<AlertTriangle className="text-orange-400" />} />
  </div>
);

const StatsCard = ({ title, value, icon }: any) => (
    <div className="bg-surface border border-surfaceLight p-5 md:p-6 rounded-2xl flex items-center gap-4 shadow-sm">
        <div className="w-12 h-12 bg-surfaceLight rounded-xl flex items-center justify-center shrink-0">
            {icon}
        </div>
        <div className="min-w-0">
            <p className="text-gray-400 text-xs md:text-sm truncate">{title}</p>
            <h3 className="text-xl md:text-2xl font-bold text-white truncate">{value}</h3>
        </div>
    </div>
  );

// --- TASKS TAB ---

const TasksTab = ({ tasks, showToast }: any) => {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Partial<Task>>({
        type: TaskType.GAME,
        isActive: true,
        reward: 0,
        currencyVal: 0,
        maxCompletions: 1,
        url: '',
        imageUrl: ''
    });
    const [uploading, setUploading] = useState(false);
    
    // File upload handler
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            
            // Basic validation
            if (file.size > 2 * 1024 * 1024) { // 2MB
                 showToast("File too large. Max 2MB.", "error");
                 return;
            }

            setUploading(true);
            try {
                const url = await dataService.uploadFile(file);
                setFormData(prev => ({ ...prev, imageUrl: url }));
                showToast("Image uploaded successfully!", "success");
            } catch (err) {
                console.error(err);
                if (window.confirm("Upload failed. Use default placeholder instead?")) {
                    setFormData(prev => ({ ...prev, imageUrl: 'https://picsum.photos/seed/error/200' }));
                }
            } finally {
                setUploading(false);
            }
        }
    };

    const handleToggleStatus = async (task: Task) => {
        try {
            const updatedTask = { ...task, isActive: !task.isActive };
            await dataService.saveTask(updatedTask);
            // No toast needed for this frequent action, UI update is immediate via real-time listener
        } catch (error) {
            console.error("Failed to toggle task status", error);
            showToast("Error updating task status", "error");
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setUploading(true);
        try {
            if (!formData.title || formData.reward === undefined) {
                showToast("Please fill in Title and Reward fields", "error");
                setUploading(false);
                return;
            }

            const finalImageUrl = formData.imageUrl || 'https://picsum.photos/seed/placeholder/200';
            const taskId = formData.id || dataService.generateId();

            const newTask = {
                id: taskId,
                title: formData.title,
                description: formData.description || '',
                reward: Number(formData.reward),
                currencyVal: formData.currencyVal || (Number(formData.reward) * 0.8), 
                imageUrl: finalImageUrl,
                type: (formData.type as TaskType) || TaskType.GAME,
                isActive: !!formData.isActive, 
                isMultiTask: !!formData.isMultiTask,
                url: formData.url || '',
                // Robust logic: Default to 1 unless it is multi-task (then user might want unlimited) OR explicitly set
                maxCompletions: Number(formData.maxCompletions) || (formData.isMultiTask ? 999999 : 1)
            };
            
            await dataService.saveTask(newTask as Task);
            setIsEditing(false);
            showToast(formData.id ? "Task updated!" : "Task created & saved to Database!", "success");
            setFormData({ type: TaskType.GAME, isActive: true, reward: 0, maxCompletions: 1, url: '', imageUrl: '' });
        } catch (error) {
            console.error("Failed to save task", error);
            showToast("Error saving task: " + (error as any).message, "error");
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        console.log("Attempting to delete task:", id);
        if (window.confirm('Are you sure you want to delete this task? This cannot be undone.')) {
            try {
                await dataService.deleteTask(id);
                showToast("Task deleted successfully", "success");
            } catch (err: any) {
                console.error("Delete failed:", err);
                showToast("Failed to delete task: " + (err.message || "Unknown error"), "error");
            }
        }
    };

    const handleDuplicate = async (e: React.MouseEvent, task: Task) => {
        e.stopPropagation();
        console.log("Attempting to duplicate task:", task.title);
        try {
            await dataService.duplicateTask(task);
            showToast("Task duplicated successfully!", "success");
        } catch (err: any) {
            console.error("Duplicate failed:", err);
            showToast("Failed to duplicate task: " + (err.message || "Unknown error"), "error");
        }
    };

    const openEdit = (task: Task) => {
        setFormData({...task});
        setIsEditing(true);
    };

    if (isEditing) {
        return (
            <div className="bg-surface border border-surfaceLight rounded-2xl p-4 md:p-6 max-w-2xl animate-fade-in">
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-surfaceLight rounded-lg text-gray-400">
                        <ArrowLeft size={20} />
                    </button>
                    <h3 className="text-xl font-bold">{formData.id ? 'Edit Task' : 'Create New Task'}</h3>
                </div>
                
                <form onSubmit={handleSave} className="space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs text-gray-400 font-medium">Task Title</label>
                            <input 
                                required 
                                placeholder="e.g. Play Goblin Miner"
                                value={formData.title || ''} 
                                onChange={e => setFormData({...formData, title: e.target.value})} 
                                className="w-full bg-background border border-surfaceLight rounded-lg p-3 text-sm focus:border-primary outline-none" 
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-gray-400 font-medium">Task Type</label>
                            <select 
                                value={formData.type} 
                                onChange={e => setFormData({...formData, type: e.target.value as TaskType})} 
                                className="w-full bg-background border border-surfaceLight rounded-lg p-3 text-sm text-white focus:border-primary outline-none"
                            >
                                {Object.values(TaskType).map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>
                    {/* ... (rest of form fields same as before) ... */}
                    <div className="space-y-1">
                        <label className="text-xs text-gray-400 font-medium">Description</label>
                        <textarea 
                            rows={2}
                            value={formData.description || ''} 
                            onChange={e => setFormData({...formData, description: e.target.value})} 
                            className="w-full bg-background border border-surfaceLight rounded-lg p-3 text-sm focus:border-primary outline-none" 
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs text-gray-400 font-medium">Coin Reward</label>
                            <input 
                                type="number" 
                                step="0.0001"
                                value={formData.reward} 
                                onChange={e => setFormData({...formData, reward: Number(e.target.value)})} 
                                className="w-full bg-background border border-surfaceLight rounded-lg p-3 text-sm focus:border-primary outline-none" 
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-gray-400 font-medium">Approx $ Value</label>
                            <input 
                                type="number" 
                                step="0.01"
                                value={formData.currencyVal} 
                                onChange={e => setFormData({...formData, currencyVal: Number(e.target.value)})} 
                                className="w-full bg-background border border-surfaceLight rounded-lg p-3 text-sm focus:border-primary outline-none" 
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-gray-400 font-medium">Task Image</label>
                         <div className="flex gap-4 items-center">
                            {formData.imageUrl && (
                                <img src={formData.imageUrl} alt="Preview" className="w-16 h-16 rounded-lg object-cover border border-surfaceLight" />
                            )}
                            <div className="relative flex-1">
                                <input 
                                    type="file" 
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-surfaceLight file:text-primary hover:file:bg-surfaceLight/80 cursor-pointer"
                                />
                                {uploading && <div className="text-xs text-primary mt-1">Uploading...</div>}
                            </div>
                         </div>
                    </div>
                     <div className="space-y-1">
                        <label className="text-xs text-gray-400 font-medium">Task Link (URL)</label>
                         <div className="relative flex-1">
                            <LinkIcon className="absolute left-3 top-3 text-gray-500" size={16} />
                            <input 
                                type="url"
                                placeholder="https://..."
                                value={formData.url || ''}
                                onChange={e => setFormData({...formData, url: e.target.value})}
                                className="w-full bg-background border border-surfaceLight rounded-lg py-3 pl-10 pr-3 text-sm focus:border-primary outline-none"
                            />
                         </div>
                    </div>
                     <div className="space-y-1">
                        <label className="text-xs text-gray-400 font-medium">Max Completions (per user)</label>
                         <input 
                            type="number"
                            min="1"
                            value={formData.maxCompletions || 1}
                            onChange={e => setFormData({...formData, maxCompletions: parseInt(e.target.value)})}
                            className="w-full bg-background border border-surfaceLight rounded-lg p-3 text-sm focus:border-primary outline-none"
                        />
                    </div>
                    <div className="flex gap-6 p-4 bg-surfaceLight/30 rounded-xl">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={!!formData.isMultiTask} 
                                onChange={e => setFormData({...formData, isMultiTask: e.target.checked})} 
                                className="w-5 h-5 rounded border-gray-600 text-primary focus:ring-primary" 
                            />
                            <span className="text-sm font-medium">Multi-Task</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={!!formData.isActive} 
                                onChange={e => setFormData({...formData, isActive: e.target.checked})} 
                                className="w-5 h-5 rounded border-gray-600 text-green-500 focus:ring-green-500" 
                            />
                            <span className="text-sm font-medium">Active</span>
                        </label>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-surfaceLight">
                        <button type="button" onClick={() => setIsEditing(false)} className="px-6 py-2 rounded-xl text-gray-400 hover:text-white font-bold">Cancel</button>
                        <button 
                            type="submit" 
                            disabled={uploading}
                            className="px-6 py-2 bg-primary hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center gap-2"
                        >
                            {uploading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                            Save Task
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <button onClick={() => { 
                setFormData({ type: TaskType.GAME, isActive: true, reward: 0, maxCompletions: 1, url: '', imageUrl: '' }); 
                setIsEditing(true); 
            }} className="w-full py-4 bg-surface border-2 border-dashed border-surfaceLight hover:border-primary/50 text-gray-400 hover:text-primary rounded-2xl flex items-center justify-center gap-2 font-bold transition-all">
                <Plus size={20} /> Create New Task
            </button>

            <div className="grid gap-4">
                {tasks.map((task: Task) => (
                    <div key={task.id} className="bg-surface border border-surfaceLight p-3 pr-4 rounded-xl flex items-center justify-between group hover:border-surfaceLight/80">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                            <img src={task.imageUrl} alt={task.title} className="w-12 h-12 rounded-lg object-cover bg-surfaceLight shrink-0" />
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-sm text-white truncate">{task.title}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-gray-400">{task.type}</span>
                                    <span className="text-xs text-primary font-bold">₿ {task.reward}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <label className="relative inline-flex items-center cursor-pointer" title={`Click to set task as ${task.isActive ? 'Inactive' : 'Active'}`}>
                                <input
                                    type="checkbox"
                                    checked={!!task.isActive}
                                    onChange={() => handleToggleStatus(task)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                            </label>
                            
                            <button onClick={(e) => handleDuplicate(e, task)} className="p-2 hover:bg-surfaceLight rounded-lg text-gray-400 hover:text-white" title="Duplicate Task">
                                <Copy size={18} />
                            </button>
                            
                            <button onClick={() => openEdit(task)} className="p-2 hover:bg-surfaceLight rounded-lg text-gray-400 hover:text-white" title="Edit Task">
                                <Edit2 size={18} />
                            </button>
                            
                            <button onClick={(e) => handleDelete(e, task.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-500" title="Delete Task">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};


// --- USERS TAB ---
const UsersTab = ({ users, showToast }: any) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [balanceEdit, setBalanceEdit] = useState('');

    const filteredUsers = useMemo(() => {
        const sorted = [...users].sort((a, b) => 
            new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime()
        );
        return sorted.filter((u: User) => 
            (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
            u.uid.includes(searchTerm)
        );
    }, [users, searchTerm]);

    const handleBan = async (uid: string, currentStatus: boolean) => {
        if(confirm(`Are you sure you want to ${currentStatus ? 'unban' : 'ban'} this user?`)) {
            try {
                await dataService.adminUpdateUser(uid, { isBanned: !currentStatus });
                showToast(`User ${currentStatus ? 'unbanned' : 'banned'}`, "success");
            } catch(e) { showToast("Action failed", "error"); }
        }
    }

    const handleSaveBalance = async () => {
        if (!editingUser) return;
        const newBal = parseFloat(balanceEdit);
        if (isNaN(newBal)) return;

        try {
            await dataService.adminUpdateUser(editingUser.uid, { balance: newBal });
            showToast("Balance updated", "success");
            setEditingUser(null);
        } catch(e) { showToast("Failed to update", "error"); }
    }

    return (
        <div className="space-y-4">
             <div className="flex items-center gap-4">
                 <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 text-gray-500" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search by email or UID..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-surface border border-surfaceLight rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-primary"
                    />
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-xl">
                    <Wifi size={16} className="text-green-500 animate-pulse" />
                    <span className="text-xs font-bold text-green-500 hidden sm:inline">Live Data</span>
                </div>
             </div>

            <div className="bg-surface border border-surfaceLight rounded-2xl overflow-hidden shadow-lg">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-surfaceLight/50 text-gray-400 font-medium border-b border-surfaceLight">
                            <tr>
                                <th className="p-4">User</th>
                                <th className="p-4">Joined</th>
                                <th className="p-4">Balance</th>
                                <th className="p-4">Referrals</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-surfaceLight">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-500">
                                        No users found.
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((u: User) => (
                                    <tr key={u.uid} className={`hover:bg-surfaceLight/20 transition-colors ${u.isBanned ? 'bg-red-500/5' : ''}`}>
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span className={`font-bold ${u.isBanned ? 'text-red-400 line-through' : 'text-white'}`}>
                                                        {u.email || 'No Email'}
                                                    </span>
                                                    {u.isBanned && <span className="text-[9px] bg-red-500 text-white px-1.5 rounded">BANNED</span>}
                                                </div>
                                                <span className="text-[10px] text-gray-500 font-mono">{u.uid}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-gray-400 text-xs whitespace-nowrap">
                                            {new Date(u.joinedAt).toLocaleString()}
                                        </td>
                                        <td className="p-4">
                                            {editingUser?.uid === u.uid ? (
                                                <div className="flex gap-2 items-center">
                                                    <input 
                                                        type="number" 
                                                        value={balanceEdit} 
                                                        onChange={e => setBalanceEdit(e.target.value)}
                                                        className="w-20 bg-background border border-surfaceLight rounded px-2 py-1 text-xs focus:border-primary outline-none"
                                                        autoFocus
                                                    />
                                                    <button onClick={handleSaveBalance} className="text-green-500 hover:scale-110 transition-transform"><CheckCircle size={16} /></button>
                                                    <button onClick={() => setEditingUser(null)} className="text-red-500 hover:scale-110 transition-transform"><XCircle size={16} /></button>
                                                </div>
                                            ) : (
                                                <span className="font-mono text-primary font-bold">₿ {(u.balance || 0).toFixed(5)}</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-gray-400 font-mono">{u.referralCount || 0}</td>
                                        <td className="p-4 text-right flex justify-end gap-2">
                                            <button 
                                                onClick={() => { setEditingUser(u); setBalanceEdit((u.balance || 0).toString()); }}
                                                className="p-1.5 bg-surfaceLight/50 hover:bg-surfaceLight rounded-lg text-gray-400 hover:text-white transition-colors" 
                                                title="Edit Balance"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button 
                                                onClick={() => handleBan(u.uid, !!u.isBanned)}
                                                className={`p-1.5 rounded-lg transition-colors ${u.isBanned ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-surfaceLight/50 text-gray-400 hover:bg-red-500/10 hover:text-red-500'}`} 
                                                title={u.isBanned ? "Unban User" : "Ban User"}
                                            >
                                                {u.isBanned ? <Unlock size={16} /> : <Ban size={16} />}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

// --- PAYOUTS TAB ---
const PayoutsTab = ({ withdrawals, showToast }: any) => {
    const handleAction = async (id: string, action: 'APPROVE' | 'REJECT') => {
        const reason = action === 'REJECT' ? prompt("Enter rejection reason:") : undefined;
        if (action === 'REJECT' && !reason) return;

        try {
            await dataService.processWithdrawal(id, action, reason || undefined);
            showToast(`Request ${action.toLowerCase()}d`, action === 'APPROVE' ? 'success' : 'info');
        } catch(e) { showToast("Action failed", "error"); }
    };

    return (
        <div className="bg-surface border border-surfaceLight rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-surfaceLight/50 text-gray-400 font-medium">
                        <tr>
                            <th className="p-4">User</th>
                            <th className="p-4">Amount</th>
                            <th className="p-4">Method</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-surfaceLight">
                        {withdrawals.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-500">No withdrawal requests found.</td></tr>
                        ) : (
                            withdrawals.map((w: WithdrawalRequest) => (
                                <tr key={w.id} className="hover:bg-surfaceLight/20">
                                    <td className="p-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-white">{w.userEmail || w.userId}</span>
                                            <span className="text-[10px] text-gray-500">{new Date(w.date).toLocaleString()}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 font-bold text-white">${w.amount.toFixed(2)}</td>
                                    <td className="p-4"><span className="bg-surfaceLight px-2 py-1 rounded text-xs">{w.method}</span></td>
                                    <td className="p-4">
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${
                                            w.status === 'APPROVED' ? 'border-green-500/30 text-green-500' :
                                            w.status === 'REJECTED' ? 'border-red-500/30 text-red-500' :
                                            'border-orange-500/30 text-orange-500'
                                        }`}>
                                            {w.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        {w.status === 'PENDING' && (
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleAction(w.id, 'APPROVE')} className="p-2 bg-green-500/10 text-green-500 rounded hover:bg-green-500/20"><CheckCircle size={16} /></button>
                                                <button onClick={() => handleAction(w.id, 'REJECT')} className="p-2 bg-red-500/10 text-red-500 rounded hover:bg-red-500/20"><XCircle size={16} /></button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

// --- SETTINGS TAB ---
const SettingsTab = ({ settings, showToast }: any) => {
    const [formData, setFormData] = useState<GlobalSettings | null>(null);

    // Sync local state when prop updates (real-time from parent)
    useEffect(() => {
        if (settings) {
            setFormData({
                ...settings,
                // Ensure nested object exists if adding new fields
                gamification: {
                    dailyBonusBase: 0.01,
                    xpPerClick: 10,
                    energyCostPerClick: 10,
                    clickReward: 0.0005,
                    ...settings.gamification
                }
            });
        }
    }, [settings]);

    const handleSave = async () => {
        if (!formData) return;
        try {
            await dataService.updateSettings(formData);
            showToast("Settings updated!", "success");
        } catch(e) { showToast("Failed to update settings", "error"); }
    };

    const handleSeed = async () => {
        if(window.confirm("Are you sure? This will add sample tasks and reset settings.")) {
            try {
                await dataService.seedDatabase();
                showToast("Database seeded successfully", "success");
            } catch (e: any) {
                console.error("Seed failed:", e);
                showToast("Seed failed: " + (e.message || "Unknown error"), "error");
            }
        }
    }

    if (!formData) return <div>Loading settings...</div>;

    return (
        <div className="max-w-2xl bg-surface border border-surfaceLight rounded-2xl p-6 space-y-8">
            <div>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Megaphone size={20} className="text-primary" /> Global Announcement
                </h3>
                <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={formData.announcement.enabled}
                            onChange={e => setFormData({...formData, announcement: {...formData.announcement, enabled: e.target.checked}})}
                            className="w-5 h-5 rounded border-gray-600 text-primary"
                        />
                        <span className="text-sm">Show Announcement Banner</span>
                    </label>
                    <textarea 
                        value={formData.announcement.message}
                        onChange={e => setFormData({...formData, announcement: {...formData.announcement, message: e.target.value}})}
                        className="w-full bg-background border border-surfaceLight rounded-xl p-3 text-sm focus:border-primary outline-none"
                        rows={3}
                        placeholder="Enter announcement message..."
                    />
                </div>
            </div>

            <div className="border-t border-surfaceLight pt-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <DollarSign size={20} className="text-green-500" /> Earning Rates
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                         <label className="text-xs text-gray-400 font-medium block mb-1">Referral Bonus (Coins)</label>
                         <input 
                            type="number"
                            step="0.001"
                            value={formData.referralBonus}
                            onChange={e => setFormData({...formData, referralBonus: parseFloat(e.target.value)})}
                            className="w-full bg-background border border-surfaceLight rounded-xl p-3 text-sm"
                         />
                    </div>
                    <div>
                         <label className="text-xs text-gray-400 font-medium block mb-1">Coins Per Ad View</label>
                         <input 
                            type="number"
                            step="0.0001"
                            value={formData.coinsPerAd}
                            onChange={e => setFormData({...formData, coinsPerAd: parseFloat(e.target.value)})}
                            className="w-full bg-background border border-surfaceLight rounded-xl p-3 text-sm"
                         />
                    </div>
                </div>
                <div className="mt-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={formData.adsEnabled}
                            onChange={e => setFormData({...formData, adsEnabled: e.target.checked})}
                            className="w-5 h-5 rounded border-gray-600 text-green-500"
                        />
                        <span className="text-sm">Enable Watch Ads Feature</span>
                    </label>
                </div>
            </div>

            <div className="border-t border-surfaceLight pt-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Trophy size={20} className="text-yellow-500" /> Gamification
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                         <label className="text-xs text-gray-400 font-medium block mb-1">Daily Bonus Base (Coins)</label>
                         <input 
                            type="number"
                            step="0.001"
                            value={formData.gamification?.dailyBonusBase}
                            onChange={e => setFormData({...formData, gamification: {...formData.gamification!, dailyBonusBase: parseFloat(e.target.value)}})}
                            className="w-full bg-background border border-surfaceLight rounded-xl p-3 text-sm"
                         />
                    </div>
                    <div>
                         <label className="text-xs text-gray-400 font-medium block mb-1">Mining Click Reward (Coins)</label>
                         <input 
                            type="number"
                            step="0.0001"
                            value={formData.gamification?.clickReward}
                            onChange={e => setFormData({...formData, gamification: {...formData.gamification!, clickReward: parseFloat(e.target.value)}})}
                            className="w-full bg-background border border-surfaceLight rounded-xl p-3 text-sm"
                         />
                    </div>
                    <div>
                         <label className="text-xs text-gray-400 font-medium block mb-1">Energy Cost Per Click</label>
                         <input 
                            type="number"
                            step="1"
                            value={formData.gamification?.energyCostPerClick}
                            onChange={e => setFormData({...formData, gamification: {...formData.gamification!, energyCostPerClick: parseFloat(e.target.value)}})}
                            className="w-full bg-background border border-surfaceLight rounded-xl p-3 text-sm"
                         />
                    </div>
                    <div>
                         <label className="text-xs text-gray-400 font-medium block mb-1">XP Gain Per Click</label>
                         <input 
                            type="number"
                            step="1"
                            value={formData.gamification?.xpPerClick}
                            onChange={e => setFormData({...formData, gamification: {...formData.gamification!, xpPerClick: parseFloat(e.target.value)}})}
                            className="w-full bg-background border border-surfaceLight rounded-xl p-3 text-sm"
                         />
                    </div>
                </div>
            </div>

             <div className="border-t border-surfaceLight pt-6">
                <h3 className="text-lg font-bold mb-4 text-red-500 flex items-center gap-2">
                    <AlertTriangle size={20} /> Danger Zone
                </h3>
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center justify-between">
                    <div>
                        <h4 className="font-bold text-sm text-red-400">Initialize Database</h4>
                        <p className="text-xs text-gray-400">Populate with sample tasks and default settings. Use only on fresh database.</p>
                    </div>
                    <button onClick={handleSeed} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors">
                        Seed Database
                    </button>
                </div>
            </div>

            <button onClick={handleSave} className="w-full py-3 bg-primary hover:bg-indigo-500 rounded-xl font-bold shadow-lg shadow-primary/20">
                Save Global Settings
            </button>
        </div>
    )
}

// --- ACTIVITY TAB ---
const ActivityTab = ({ logs }: any) => {
    return (
        <div className="space-y-4">
            {logs.length === 0 ? (
                <div className="text-center py-10 text-gray-500">No admin activity recorded.</div>
            ) : (
                <div className="relative border-l border-surfaceLight ml-4 space-y-6 pb-4">
                    {logs.map((log: AdminLog) => (
                        <div key={log.id} className="ml-6 relative">
                            <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-surface border border-primary"></div>
                            <div className="bg-surface border border-surfaceLight rounded-xl p-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className="text-xs text-primary font-bold uppercase tracking-wider">{log.action}</span>
                                        <p className="text-sm text-white mt-1">{log.details}</p>
                                    </div>
                                    <span className="text-[10px] text-gray-500">{new Date(log.timestamp).toLocaleString()}</span>
                                </div>
                                <div className="mt-2 text-[10px] text-gray-600 font-mono">
                                    By: {log.adminEmail}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
