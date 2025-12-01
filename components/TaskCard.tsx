
import React, { useState, useEffect, useRef } from 'react';
import { Task, TaskType } from '../types';
import { CheckCircle, ChevronRight, Clock, XCircle } from './Icons';
import { dataService } from '../services/firebase';
import { useUser } from '../context/UserContext';
import { useToast } from '../context/ToastContext';

interface TaskCardProps {
  task: Task;
  variant?: 'compact' | 'full';
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, variant = 'full' }) => {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Track verification status independently of state to handle unmounts correctly
  const isVerifying = useRef(false);
  
  const { showToast } = useToast();
  
  // Calculate completions safely
  const completions = (user?.completedTaskIds || []).filter(id => id === task.id).length;
  
  // Robust limit logic matches backend
  const limit = (task.maxCompletions && task.maxCompletions > 1) 
                ? task.maxCompletions 
                : (task.isMultiTask ? 999999 : 1);
                
  const isCompleted = completions >= limit;
  const isUnlimited = limit >= 9999;

  // Cleanup timer on unmount and notify if verification was interrupted
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      
      // If the component unmounts while verification is still active, the user navigated away.
      if (isVerifying.current) {
          // Use setTimeout to ensure the toast service is still accessible during the transition
          setTimeout(() => {
              showToast(`Task '${task.title}' failed: You left the page too early.`, 'error');
          }, 0);
      }
    };
  }, [task.title, showToast]);

  const handleStart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loading || isCompleted || timer !== null) return;
    
    // 1. Open URL immediately
    if (task.url) {
        window.open(task.url, '_blank');
    } else {
        showToast("Task started...", "info");
    }

    // 2. Start Verification Timer (20 seconds)
    setLoading(true);
    setTimer(20); 
    isVerifying.current = true;
    
    timerRef.current = setInterval(() => {
        setTimer((prev) => {
            if (prev === null) return null;
            
            if (prev <= 1) {
                // Timer Finished naturally
                if (timerRef.current) clearInterval(timerRef.current);
                timerRef.current = null;
                completeTaskProcess(); // Process completion
                return null;
            }
            return prev - 1;
        });
    }, 1000);
  };

  const completeTaskProcess = async () => {
    // Mark verification as finished so unmount cleanup doesn't trigger error
    isVerifying.current = false;
    
    try {
        await dataService.completeTask(task.id, task.reward);
        showToast(`Task verified! You earned ₿ ${task.reward}`, 'success');
        if (navigator.vibrate) navigator.vibrate(100); // Haptic feedback
    } catch (err: any) {
        console.error("Task failed", err);
        showToast(err.message || "Task verification failed", 'error');
    } finally {
        setTimer(null);
        setLoading(false);
    }
  };

  const handleCancel = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
      }
      isVerifying.current = false;
      setTimer(null);
      setLoading(false);
      showToast("Task cancelled.", "info");
  }

  const isGame = task.type === TaskType.GAME;
  const isSurvey = task.type === TaskType.SURVEY;

  // Visual Styles based on type
  const typeColor = isGame ? 'text-green-400 bg-green-400/10' : 
                   isSurvey ? 'text-blue-400 bg-blue-400/10' : 
                   'text-purple-400 bg-purple-400/10';

  // Badge Component
  const MaxBadge = () => (
    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-surfaceLight border border-surfaceLight text-gray-400 shadow-sm">
        {isUnlimited ? 'Unlimited' : `Max: ${limit}`}
    </span>
  );

  // Helper to render the button content with limit tracking and timer
  const renderButtonContent = () => {
      if (loading && timer === null) {
          return <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>;
      }
      
      // If timer is running, show countdown explicitly
      if (timer !== null) {
          return <span className="text-xs font-bold font-mono animate-pulse">{timer}s</span>;
      }
      
      // If allow multiple completions, show the counter
      if (limit > 1 && !isUnlimited) {
          return (
             <div className="flex items-center gap-2 text-xs font-bold">
                 <span>{completions} / {limit}</span>
                 <ChevronRight size={16} />
             </div>
          );
      }
      
      return <ChevronRight className="text-white ml-0.5" size={20} />;
  };

  if (variant === 'compact') {
    return (
      <div className="group relative bg-surface border border-surfaceLight rounded-2xl p-3 min-w-[160px] w-[160px] flex-shrink-0 hover:border-primary/50 transition-all cursor-pointer overflow-hidden">
        <div className="relative z-10">
            <div className="relative">
                <img src={task.imageUrl} alt={task.title} className="w-full h-32 object-cover rounded-xl mb-3 shadow-md" />
                <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border border-white/10 backdrop-blur-md ${typeColor}`}>
                        {task.type}
                    </span>
                </div>
                {/* Max Badge Overlay for Compact */}
                {(limit > 1) && (
                    <div className="absolute top-2 right-2">
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-black/60 text-white backdrop-blur-md border border-white/10">
                            {isUnlimited ? '∞' : `${completions}/${limit}`}
                        </span>
                    </div>
                )}
            </div>
            
            <h3 className="font-semibold text-white text-sm truncate">{task.title}</h3>
            
            <div className="mt-2 flex items-center justify-between">
                <span className="text-primary font-bold text-sm">+{task.reward}</span>
                {timer !== null ? (
                     <span className="text-accent text-xs font-bold animate-pulse">{timer}s left</span>
                ) : (
                    <span className="text-gray-500 text-xs">~${task.currencyVal}</span>
                )}
            </div>
            
            {/* Overlay for Timer in Compact Mode */}
            {timer !== null && (
                <div 
                    onClick={(e) => { e.stopPropagation(); }} 
                    className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20 backdrop-blur-sm"
                >
                    <Clock className="text-accent mb-1 animate-spin-slow" size={24} />
                    <span className="text-white font-bold text-lg">{timer}s</span>
                    <button 
                        onClick={handleCancel}
                        className="mt-2 text-[10px] text-red-400 border border-red-400/30 px-2 py-1 rounded hover:bg-red-400/10"
                    >
                        Cancel
                    </button>
                </div>
            )}
            
            {/* Click handler for card */}
            {!timer && !isCompleted && (
                <div className="absolute inset-0 z-0" onClick={handleStart}></div>
            )}
        </div>
      </div>
    );
  }

  // Full List Variant
  return (
    <div className="relative bg-surface hover:bg-surfaceLight border border-surfaceLight rounded-3xl p-4 flex gap-4 items-center transition-all group overflow-hidden">
       {/* Background accent */}
       <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors"></div>

       <div className="relative w-20 h-20 flex-shrink-0">
         <img src={task.imageUrl} alt={task.title} className="w-full h-full object-cover rounded-2xl shadow-lg group-hover:scale-105 transition-transform duration-300" />
         {isCompleted && (
             <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center">
                 <CheckCircle className="text-secondary" size={24} />
             </div>
         )}
       </div>

       <div className="flex-1 min-w-0 z-10">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${typeColor}`}>
                {task.type}
            </span>
            {/* Show Counter Badge in Title area */}
            {(limit > 1) && <MaxBadge />}
          </div>
          <h3 className="font-bold text-white text-base truncate">{task.title}</h3>
          <p className="text-gray-400 text-xs truncate mt-0.5">{task.description}</p>
          
          <div className="mt-2 flex items-center gap-3">
             <span className="text-blue-400 font-bold text-sm flex items-center gap-1">
                ₿ {task.reward}
             </span>
             {timer !== null && (
                 <span className="text-accent text-xs bg-accent/10 px-2 py-0.5 rounded-full animate-pulse border border-accent/20 flex items-center gap-1">
                    <Clock size={10} /> Verify in progress...
                 </span>
             )}
          </div>
       </div>

       <div className="z-10 flex flex-col items-end gap-1">
            {isCompleted ? (
                <button disabled className="px-4 py-2 bg-secondary/20 text-secondary rounded-xl font-medium text-sm border border-secondary/20 flex items-center gap-2">
                    <CheckCircle size={16} />
                    Done
                </button>
            ) : (
                <>
                {timer !== null ? (
                    <button 
                        onClick={handleCancel}
                        className="w-16 py-2 bg-surfaceLight border border-surfaceLight hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-500 rounded-xl flex flex-col items-center justify-center group/cancel transition-colors"
                        title="Cancel"
                    >
                         <span className="text-accent font-bold text-sm group-hover/cancel:hidden">{timer}s</span>
                         <XCircle size={18} className="hidden group-hover/cancel:block" />
                    </button>
                ) : (
                    <button 
                      onClick={handleStart}
                      disabled={loading}
                      className={`h-10 px-3 rounded-full bg-primary hover:bg-indigo-500 flex items-center justify-center transition-colors shadow-lg shadow-primary/30 active:scale-95 ${limit > 1 && !isUnlimited ? 'min-w-[80px]' : 'w-10'}`}
                    >
                        {renderButtonContent()}
                    </button>
                )}
                </>
            )}
       </div>
    </div>
  );
};
