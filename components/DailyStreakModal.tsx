
import React, { useState } from 'react';
import { useUser } from '../context/UserContext';
import { dataService } from '../services/firebase';
import { useToast } from '../context/ToastContext';
import { Gift, CheckCircle, X, Calendar } from './Icons';

interface DailyStreakModalProps {
  onClose: () => void;
}

export const DailyStreakModal: React.FC<DailyStreakModalProps> = ({ onClose }) => {
  const { user } = useUser();
  const { showToast } = useToast();
  const [claiming, setClaiming] = useState(false);

  if (!user) return null;

  // Calculate Streak Visuals
  // If user hasn't claimed today, the streak count in DB is from yesterday (or broken).
  // We assume the backend handles the logic, here we just visualize the "Next" step.
  const currentStreak = user.dailyStreak || 0;
  // If 7 days reached, it loops or stays at 7 depending on logic. Let's visualize 1-7.
  const displayDay = (currentStreak % 7) + 1; 

  const handleClaim = async () => {
    setClaiming(true);
    try {
      await dataService.claimDailyBonus();
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      showToast("Daily Reward Claimed!", "success");
      // Close modal after a short delay to let them see the success state
      setTimeout(onClose, 1500);
    } catch (e: any) {
      if (e.message === 'ALREADY_CLAIMED') {
        showToast("Already claimed for today.", "info");
        onClose();
      } else {
        showToast("Failed to claim.", "error");
        setClaiming(false);
      }
    }
  };

  const days = [1, 2, 3, 4, 5, 6, 7];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-surface border border-surfaceLight rounded-3xl p-1 max-w-sm w-full shadow-2xl relative overflow-hidden">
        
        {/* Decorative Background */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-green-500/20 to-transparent pointer-events-none"></div>

        <div className="bg-surface relative rounded-[20px] p-6 text-center">
            <button 
                onClick={onClose} 
                className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
            >
                <X size={24} />
            </button>

            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/30 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                <Calendar size={32} className="text-green-500" />
            </div>

            <h2 className="text-2xl font-bold text-white mb-1">Daily Login Streak</h2>
            <p className="text-gray-400 text-sm mb-6">
                Keep your streak alive to earn more! <br/>
                Current Streak: <span className="text-green-400 font-bold">{user.dailyStreak || 0} Days</span>
            </p>

            {/* Streak Grid */}
            <div className="grid grid-cols-4 gap-3 mb-8">
                {days.map((day) => {
                    const isCompleted = day < displayDay;
                    const isCurrent = day === displayDay;
                    
                    return (
                        <div 
                            key={day} 
                            className={`relative aspect-square rounded-xl flex flex-col items-center justify-center border transition-all ${
                                isCurrent 
                                    ? 'bg-green-500 text-black border-green-400 shadow-lg shadow-green-500/20 scale-105 z-10' 
                                    : isCompleted
                                    ? 'bg-surfaceLight/50 text-green-500 border-green-500/30'
                                    : 'bg-surfaceLight/20 text-gray-600 border-white/5'
                            } ${day === 7 ? 'col-span-2 aspect-auto flex-row gap-3' : ''}`}
                        >
                            {isCompleted ? (
                                <CheckCircle size={day === 7 ? 24 : 20} />
                            ) : (
                                <>
                                    <span className={`font-bold ${day === 7 ? 'text-lg' : 'text-sm'}`}>
                                        Day {day}
                                    </span>
                                    {day === 7 && <Gift size={20} />}
                                </>
                            )}
                            
                            {isCurrent && (
                                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-bounce">
                                    Today
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <button 
                onClick={handleClaim}
                disabled={claiming}
                className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:brightness-110 text-white rounded-xl font-bold text-lg shadow-xl shadow-green-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
                {claiming ? 'Claiming...' : 'Claim Daily Reward'}
            </button>
        </div>
      </div>
    </div>
  );
};
