
import React, { useEffect, useState, useMemo } from 'react';
import { Search, AlertTriangle, Globe, Info, ChevronRight } from '../components/Icons';
import { TaskCard } from '../components/TaskCard';
import { Task, TaskType } from '../types';
import { dataService } from '../services/firebase';
import { useUser } from '../context/UserContext';
import { AdBanner } from '../components/AdBanner';

interface OfferWallCardProps {
    task: Task;
}

const OfferWallCard: React.FC<OfferWallCardProps> = ({ task }) => {
  const colors = ['bg-pink-500', 'bg-blue-500', 'bg-purple-500', 'bg-orange-500', 'bg-green-500', 'bg-indigo-500', 'bg-red-500', 'bg-teal-500'];
  const colorIndex = task.title.length % colors.length;
  const color = colors[colorIndex];

  return (
    <div 
        onClick={() => task.url && window.open(task.url, '_blank')}
        className="bg-surface hover:bg-surfaceLight border border-surfaceLight rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all hover:-translate-y-1"
    >
        <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center text-white font-bold text-xl shadow-lg`}>
        {task.title.charAt(0)}
        </div>
        <div className="text-center">
        <h3 className="font-bold text-white text-sm truncate w-full">{task.title}</h3>
        <span className="text-xs text-secondary font-medium bg-secondary/10 px-2 py-0.5 rounded-full">
            +{task.reward} Coins
        </span>
        </div>
    </div>
  );
};

export const Earn: React.FC = () => {
  const { user } = useUser();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    setError(null);
    const unsubscribeTasks = dataService.subscribeToTasks(
      (updatedTasks) => {
        setTasks(updatedTasks);
        setError(null);
      },
      (err) => {
        console.warn("Task fetch error", err);
        if (err.message.includes("permission-denied") || err.message.includes("Missing or insufficient permissions")) {
            setError("PERMISSION DENIED: Please update Firestore Rules.");
        }
      }
    );
    return () => unsubscribeTasks();
  }, []);

  const { offerWalls, premiumTasks, availableTasks } = useMemo(() => {
    const activeTasks = tasks.filter(t => t.isActive === true);
    const userEligibleTasks = activeTasks.filter(t => {
        if (!user) return true;
        const completions = (user.completedTaskIds || []).filter(id => id === t.id).length;
        const limit = (t.maxCompletions && t.maxCompletions > 1) 
                      ? t.maxCompletions 
                      : (t.isMultiTask ? 999999 : 1);
        return completions < limit;
    });

    const offerWalls = userEligibleTasks.filter(t => t.type === TaskType.SURVEY || t.type === TaskType.SIGNUP);
    const premium = userEligibleTasks.filter(t => t.reward >= 5 && t.type !== TaskType.SURVEY && t.type !== TaskType.SIGNUP);
    const available = userEligibleTasks.filter(t => t.reward < 5 && t.type !== TaskType.SURVEY && t.type !== TaskType.SIGNUP);

    return { offerWalls, premiumTasks: premium, availableTasks: available };
  }, [tasks, user]);

  return (
    <div className="space-y-8 pb-10">
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-30 py-2 border-b border-white/5 pb-4">
         <h1 className="text-2xl font-bold mb-4">Earning Hub</h1>
         <div className="relative">
            <input 
              type="text" 
              placeholder="Search tasks, offer walls..." 
              className="w-full bg-surface border border-surfaceLight rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50"
            />
            <Search className="absolute left-3 top-3.5 text-gray-500" size={18} />
         </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-xl flex items-center gap-3">
            <AlertTriangle className="text-red-500 shrink-0" size={24} />
            <div>
                <h3 className="text-red-500 font-bold">Task Access Blocked</h3>
                <p className="text-gray-400 text-xs mt-1">Check Firestore Security Rules.</p>
            </div>
        </div>
      )}

      {/* INSTRUCTIONS TOGGLE */}
      <div className="bg-surface border border-surfaceLight rounded-xl p-4 cursor-pointer hover:bg-surfaceLight/30 transition-colors" onClick={() => setShowInstructions(!showInstructions)}>
          <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <Info size={18} className="text-primary" />
                  </div>
                  <span className="font-bold text-white text-sm">How to Earn</span>
              </div>
              <ChevronRight size={18} className={`text-gray-400 transition-transform duration-200 ${showInstructions ? 'rotate-90' : ''}`} />
          </div>
          {showInstructions && (
              <div className="mt-4 pt-4 border-t border-surfaceLight text-sm text-gray-400 space-y-2 animate-fade-in">
                  <p>1. Select a partner offer or featured task below.</p>
                  <p>2. Complete the specific requirements (e.g., Reach Level 10).</p>
                  <p>3. Wait for verification. Some offers are instant.</p>
                  <p>4. Rewards are automatically credited to your balance.</p>
              </div>
          )}
      </div>

      {/* PARTNER SPOTLIGHT (RICHADS BANNER REPLACEMENT) */}
      <section className="bg-surface border border-surfaceLight rounded-2xl overflow-hidden shadow-lg shadow-black/20">
          <div className="p-4 border-b border-surfaceLight flex justify-between items-center bg-gradient-to-r from-indigo-900/50 to-purple-900/20">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                 <Globe className="text-indigo-400" /> Partner Spotlight
              </h2>
              <span className="text-xs bg-indigo-500 text-white px-2 py-1 rounded font-bold shadow-sm">Featured</span>
          </div>
          <div className="w-full bg-surfaceLight/20 p-4 flex justify-center min-h-[250px]">
              {/* Using AdBanner to render RichAds Embedded Banner */}
              <AdBanner className="w-full !my-0 !bg-transparent" />
          </div>
      </section>

      {/* FEATURED OFFERS */}
      <section>
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
             <span>Featured Offers</span>
             <span className="text-xs text-secondary bg-secondary/10 px-2 py-0.5 rounded-full font-bold ml-auto">Hot</span>
          </h2>
          
          {offerWalls.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {offerWalls.map(task => (
                    <OfferWallCard key={task.id} task={task} />
                ))}
            </div>
          ) : (
            <div className="w-full text-center py-8 bg-surface/30 rounded-2xl border border-dashed border-surfaceLight">
                <p className="text-gray-500 text-sm">Check the partner spotlight above for more.</p>
            </div>
          )}
      </section>

      {/* PREMIUM TASKS */}
      <section>
        <div className="flex justify-between items-center mb-4 px-1">
            <h2 className="text-lg font-bold text-white">Premium Tasks</h2>
        </div>
        
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
             {premiumTasks.length > 0 ? (
                 premiumTasks.map(task => (
                    <TaskCard key={task.id} task={task} variant="compact" />
                 ))
             ) : (
                <div className="w-full text-center py-6 bg-surface/30 rounded-2xl border border-dashed border-surfaceLight min-w-[300px]">
                    <p className="text-gray-500 text-sm">No premium tasks available right now.</p>
                </div>
             )}
        </div>
      </section>

      {/* STANDARD TASKS */}
      <section>
        <div className="flex justify-between items-center mb-4 px-1">
             <h2 className="text-lg font-bold text-white">All Tasks</h2>
        </div>

        <div className="space-y-4">
             {availableTasks.length > 0 ? (
                 availableTasks.map(task => (
                    <TaskCard key={task.id} task={task} />
                 ))
             ) : (
                <div className="w-full text-center py-10 bg-surface/30 rounded-2xl border border-dashed border-surfaceLight">
                    <p className="text-gray-500 text-sm">No active tasks currently.</p>
                </div>
             )}
        </div>
      </section>
    </div>
  );
};
