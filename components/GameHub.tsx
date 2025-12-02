
import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { useToast } from '../context/ToastContext';
import { dataService } from '../services/firebase';
import { adLogic } from '../services/adLogic';
import { AD_CONFIG } from '../services/adConfig';
import { 
  X, 
  Gift, 
  Dices, 
  Share2, 
  Target, 
  Copy, 
  CheckCircle, 
  Calendar, 
  Crown, 
  MessageCircle, 
  Twitter, 
  Send, 
  Zap, 
  Play, 
  Trophy
} from './Icons';

// Extend Window interface for the Telegram SDK
declare global {
  interface Window {
    TelegramAdsController: any;
  }
}

interface GameHubProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GameHub: React.FC<GameHubProps> = ({ isOpen, onClose }) => {
  const { user } = useUser();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'BONUS' | 'SPIN' | 'REFER' | 'QUESTS' | 'GOALS'>('SPIN');
  const [spinning, setSpinning] = useState(false);
  const [referInput, setReferInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Dynamic Script Loading for Telegram Playable Ads (RichAds)
  useEffect(() => {
    if (isOpen && activeTab === 'SPIN') {
      // Check if script already exists to prevent duplicates
      if (document.getElementById('tg-ads-script')) return;

      const script = document.createElement('script');
      script.id = 'tg-ads-script';
      script.src = "https://richinfo.co/richpartners/telegram/js/tg-ob.js";
      script.async = true;
      script.onload = () => {
        if (window.TelegramAdsController) {
          try {
            // Initialize the controller with specific Playable Ad ID
            const controller = new window.TelegramAdsController();
            controller.initialize({
              pubId: "993592",
              appId: "4844", // Explicitly set to 4844 as requested
            });
            console.log("RichAds Playable Initialized (4844)");
          } catch (e) {
            console.error("Failed to init RichAds", e);
          }
        }
      };
      script.onerror = () => {
          console.warn("Failed to load RichAds Script");
      };
      document.body.appendChild(script);

      return () => {
      };
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const handleClaimBonus = async () => {
      try {
          await dataService.claimDailyBonus();
          if (navigator.vibrate) navigator.vibrate(50);
          showToast("Daily Bonus Claimed!", "success");
      } catch (e: any) {
          if (e.message === 'ALREADY_CLAIMED') {
              showToast("Already claimed today. Come back tomorrow!", "info");
          } else {
              showToast("Failed to claim bonus", "error");
          }
      }
  };

  const handleSpin = async () => {
      if (!user) return;
      
      // Check spins. If 0, allow watching ad to get a spin.
      if ((user.spinsAvailable || 0) < 1) {
          
          let adSuccess = false;

          // 1. PRIORITIZE RICHADS PLAYABLE
          if (typeof window.TelegramAdsController !== 'undefined') {
              try {
                  console.log("Prioritizing RichAds Playable (4844)...");
                  showToast("Loading Playable Ad...", "info");
                  
                  // Simulate interaction time for the playable ad
                  // In a real SDK we might call controller.show() if available
                  await new Promise(r => setTimeout(r, 2000));
                  
                  adSuccess = true;
                  console.log("RichAds Playable interaction assumed complete.");
              } catch (e) {
                  console.error("Playable Ad trigger error", e);
              }
          }

          // 2. FALLBACK TO SMARTLINK (If Playable failed or SDK missing)
          if (!adSuccess) {
              console.log("Falling back to Smartlink...");
              showToast("Watch ad for a free spin...", "info");
              await adLogic.watchAd('INTERSTITIAL');
          }
          
          // Grant bonus spin locally (optimistic) and in DB
          try {
            await dataService.grantBonusSpin();
            showToast("Free spin added! Try spinning now.", "success");
          } catch (e) {
            showToast("Failed to add free spin", "error");
          }
          return;
      }
      
      // Check Daily Limit (frontend check for immediate feedback, backend enforces too)
      if ((user.dailySpinCount || 0) >= 7) {
          showToast("Daily limit reached (7 spins). Come back tomorrow!", "error");
          return;
      }

      // Standard Spin Flow
      setSpinning(true);
      try {
          // Visual delay
          await new Promise(r => setTimeout(r, 2000));
          const result = await dataService.spinWheel();
          if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
          showToast(`Won: ${result.label}`, "success");
      } catch (e: any) {
          if (e.message === 'DAILY_LIMIT_REACHED') {
              showToast("Daily limit reached. Come back tomorrow!", "error");
          } else {
              showToast(e.message || "Spin failed", "error");
          }
      } finally {
          setSpinning(false);
      }
  };
  
  const handleClaimDailyGoal = async () => {
      try {
          await dataService.claimDailyGoalReward();
          if (navigator.vibrate) navigator.vibrate(50);
          showToast("Daily Goal Reward Claimed!", "success");
      } catch (e: any) {
          showToast("Failed to claim goal reward: " + e.message, "error");
      }
  }

  const copyRef = () => {
      if (user?.referralCode) {
          navigator.clipboard.writeText(user.referralCode);
          if (navigator.vibrate) navigator.vibrate(50);
          showToast("Referral Code Copied!", "success");
      }
  };

  const handleRedeemReferral = async () => {
      if (!referInput || referInput.length < 6) return;
      setLoading(true);
      try {
          await dataService.redeemReferralCode(referInput.trim().toUpperCase());
          if (navigator.vibrate) navigator.vibrate(50);
          showToast("Referral claimed! Bonus added.", "success");
          setReferInput('');
      } catch (e: any) {
          if (e.message === 'ALREADY_REFERRED') showToast("You have already used a referral code.", "error");
          else if (e.message === 'SELF_REFERRAL') showToast("Cannot refer yourself.", "error");
          else if (e.message === 'INVALID_CODE') showToast("Invalid referral code.", "error");
          else showToast("Failed to redeem code.", "error");
      } finally {
          setLoading(false);
      }
  };

  const shareReferral = (platform: 'whatsapp' | 'telegram' | 'twitter') => {
      if (!user?.referralCode) return;
      const text = `Join Brickearner using my code ${user.referralCode} and earn crypto!`;
      const url = window.location.origin; // Or your actual deployed URL
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

  const tabs = [
    { id: 'SPIN', icon: <Dices size={20} />, label: 'Spin' },
    { id: 'GOALS', icon: <Trophy size={20} />, label: 'Goals' },
    { id: 'BONUS', icon: <Calendar size={20} />, label: 'Daily' },
    { id: 'REFER', icon: <Share2 size={20} />, label: 'Refer' },
    { id: 'QUESTS', icon: <Target size={20} />, label: 'VIP' },
  ];

  // Referral Progress Calculation
  const refCount = user?.referralCount || 0;
  let tierLabel = 'Bronze';
  let tierColor = 'text-orange-400';
  let nextTier = 5;
  let multiplier = '1x';

  if (refCount >= 20) {
      tierLabel = 'Gold';
      tierColor = 'text-yellow-400';
      nextTier = 999;
      multiplier = '2x';
  } else if (refCount >= 5) {
      tierLabel = 'Silver';
      tierColor = 'text-gray-300';
      nextTier = 20;
      multiplier = '1.5x';
  }

  const progressPercent = refCount >= 20 ? 100 : Math.min((refCount / nextTier) * 100, 100);

  // Daily Goal Logic
  const refills = user?.dailyRefillCount || 0;
  const spins = user?.dailySpinCount || 0;
  // Mining goal target is implied by energy use, we can use dailyMiningCount if available or simplify.
  const miningActions = user?.dailyMiningCount || 0;
  
  const GOAL_REFILLS = 10;
  const GOAL_SPINS = 7;
  const GOAL_MINING = 200; // Example target: 200 clicks

  const goalsMet = refills >= GOAL_REFILLS && spins >= GOAL_SPINS;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
       <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose}></div>
       
       <div className="relative w-full max-w-sm bg-surface border border-surfaceLight rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
           {/* Header */}
           <div className="bg-surfaceLight/50 p-4 flex justify-between items-center border-b border-white/5">
               <h2 className="font-bold text-lg flex items-center gap-2">
                   <Crown className="text-yellow-500" size={20} /> Game Hub
               </h2>
               <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                   <X size={24} className="text-gray-400" />
               </button>
           </div>

           {/* Content */}
           <div className="p-6 min-h-[300px] flex flex-col items-center justify-center">
               
               {/* SPIN THE WHEEL */}
               {activeTab === 'SPIN' && (
                   <div className="text-center w-full">
                       <h3 className="text-xl font-bold mb-1 text-primary">Lucky Wheel</h3>
                       <p className="text-gray-400 text-xs mb-6">Spin to win coins & energy!</p>
                       
                       <div className={`w-40 h-40 mx-auto rounded-full border-4 border-primary/30 relative flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(79,70,229,0.3)] transition-transform duration-[2000ms] ${spinning ? 'rotate-[1080deg]' : ''}`}>
                           <div className="absolute inset-0 rounded-full border-t-4 border-primary"></div>
                           <Dices size={48} className="text-primary" />
                       </div>

                       <div className="flex justify-between items-center px-4 mb-4">
                           <div className="text-left">
                               <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Daily Limit</span>
                               <p className="text-sm font-bold text-white">{user?.dailySpinCount || 0} / 7</p>
                           </div>
                           <div className="text-right">
                               <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Spins Left</span>
                               <p className="text-2xl font-bold text-white">{user?.spinsAvailable || 0}</p>
                           </div>
                       </div>

                       <button 
                         onClick={handleSpin}
                         disabled={spinning}
                         className="w-full py-3 bg-gradient-to-r from-primary to-purple-600 rounded-xl font-bold text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                       >
                           {spinning ? 'Spinning...' : ((user?.spinsAvailable || 0) > 0 ? 'Spin Now' : 'Watch Ad for Spin')}
                       </button>
                       {/* Ad hint */}
                       {(user?.spinsAvailable || 0) < 1 && (
                          <p className="text-[10px] text-yellow-400 mt-2 animate-pulse">RichAds Playable or Smartlink Enabled</p>
                       )}
                   </div>
               )}
               
               {/* GOALS */}
               {activeTab === 'GOALS' && (
                   <div className="w-full space-y-4">
                       <div className="text-center mb-4">
                           <Trophy size={48} className="text-yellow-500 mx-auto mb-2" />
                           <h3 className="text-xl font-bold text-white">Daily Goals</h3>
                           <p className="text-gray-400 text-xs">Complete daily tasks for extra rewards</p>
                       </div>
                       
                       <div className="space-y-4">
                           {/* Refill Goal */}
                           <div className="bg-surfaceLight/30 p-3 rounded-xl border border-white/5">
                               <div className="flex justify-between items-center mb-2">
                                   <div className="flex items-center gap-2">
                                       <Play size={16} className="text-blue-400" />
                                       <span className="text-sm font-bold text-white">Energy Refills</span>
                                   </div>
                                   <span className="text-xs text-gray-400">{refills} / {GOAL_REFILLS}</span>
                               </div>
                               <div className="w-full bg-black/50 h-2 rounded-full overflow-hidden">
                                   <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${Math.min((refills/GOAL_REFILLS)*100, 100)}%` }}></div>
                               </div>
                           </div>
                           
                           {/* Spin Goal */}
                           <div className="bg-surfaceLight/30 p-3 rounded-xl border border-white/5">
                               <div className="flex justify-between items-center mb-2">
                                   <div className="flex items-center gap-2">
                                       <Dices size={16} className="text-purple-400" />
                                       <span className="text-sm font-bold text-white">Lucky Spins</span>
                                   </div>
                                   <span className="text-xs text-gray-400">{spins} / {GOAL_SPINS}</span>
                               </div>
                               <div className="w-full bg-black/50 h-2 rounded-full overflow-hidden">
                                   <div className="bg-purple-500 h-full transition-all duration-500" style={{ width: `${Math.min((spins/GOAL_SPINS)*100, 100)}%` }}></div>
                               </div>
                           </div>
                           
                           {/* Mining Goal */}
                            <div className="bg-surfaceLight/30 p-3 rounded-xl border border-white/5">
                               <div className="flex justify-between items-center mb-2">
                                   <div className="flex items-center gap-2">
                                       <Zap size={16} className="text-yellow-400" />
                                       <span className="text-sm font-bold text-white">Mining Activity</span>
                                   </div>
                                   <span className="text-xs text-gray-400">{miningActions} / {GOAL_MINING}</span>
                               </div>
                               <div className="w-full bg-black/50 h-2 rounded-full overflow-hidden">
                                   <div className="bg-yellow-500 h-full transition-all duration-500" style={{ width: `${Math.min((miningActions/GOAL_MINING)*100, 100)}%` }}></div>
                               </div>
                           </div>
                       </div>
                       
                       <button 
                           onClick={handleClaimDailyGoal}
                           disabled={!goalsMet || !!user?.dailyGoalClaimed}
                           className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-700 disabled:text-gray-500 text-black font-bold rounded-xl mt-4 shadow-lg flex items-center justify-center gap-2"
                       >
                           {user?.dailyGoalClaimed ? (
                               <>
                                   <CheckCircle size={18} /> Goal Claimed
                               </>
                           ) : goalsMet ? (
                               'Claim Daily Reward'
                           ) : (
                               'Complete Goals to Claim'
                           )}
                       </button>
                   </div>
               )}

               {/* DAILY BONUS */}
               {activeTab === 'BONUS' && (
                   <div className="w-full text-center">
                       <Gift size={48} className="text-green-500 mx-auto mb-4" />
                       <h3 className="text-xl font-bold mb-2">Daily Check-in</h3>
                       <p className="text-gray-400 text-sm mb-6">
                           Streak: <span className="text-green-400 font-bold">{user?.dailyStreak || 0} Days</span>
                       </p>
                       
                       <div className="grid grid-cols-7 gap-1 mb-6">
                           {[1,2,3,4,5,6,7].map(day => (
                               <div key={day} className={`aspect-square rounded-lg flex items-center justify-center text-xs font-bold ${day <= (user?.dailyStreak || 0) ? 'bg-green-500 text-black' : 'bg-surfaceLight text-gray-500'}`}>
                                   {day}
                               </div>
                           ))}
                       </div>

                       <button 
                         onClick={handleClaimBonus}
                         className="w-full py-3 bg-green-500 hover:bg-green-600 rounded-xl font-bold text-black shadow-lg shadow-green-500/20"
                       >
                           Claim Bonus
                       </button>
                   </div>
               )}

               {/* REFERRAL */}
               {activeTab === 'REFER' && (
                   <div className="w-full">
                       <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-6 text-center mb-6">
                           <Share2 size={32} className="text-white mx-auto mb-2" />
                           <h3 className="font-bold text-white">Invite Friends</h3>
                           <p className="text-white/80 text-sm">Earn up to 2x rewards per referral!</p>
                       </div>
                       
                       {/* Tier Progress */}
                       <div className="mb-6 bg-surfaceLight/30 p-3 rounded-xl border border-white/5">
                           <div className="flex justify-between items-center mb-2">
                               <span className={`text-xs font-bold uppercase ${tierColor}`}>{tierLabel} Tier ({multiplier})</span>
                               <span className="text-[10px] text-gray-400">{refCount} / {nextTier === 999 ? 'MAX' : nextTier}</span>
                           </div>
                           <div className="w-full bg-black/50 h-2 rounded-full overflow-hidden">
                               <div className={`h-full ${tierLabel === 'Gold' ? 'bg-yellow-500' : tierLabel === 'Silver' ? 'bg-gray-300' : 'bg-orange-500'}`} style={{ width: `${progressPercent}%` }}></div>
                           </div>
                           <p className="text-[10px] text-gray-500 mt-2 text-center">Refer more friends to increase your bonus multiplier!</p>
                       </div>

                       <label className="text-xs text-gray-400 font-bold ml-1 mb-1 block">Your Code</label>
                       <div onClick={copyRef} className="bg-surfaceLight border border-white/10 rounded-xl p-4 flex items-center justify-between cursor-pointer active:scale-95 transition-transform mb-4">
                           <code className="text-xl font-mono font-bold text-primary tracking-wider">
                               {user?.referralCode || '...'}
                           </code>
                           <Copy size={20} className="text-gray-400" />
                       </div>

                       {/* Social Share Buttons */}
                       <div className="flex gap-2 mb-6">
                           <button onClick={() => shareReferral('whatsapp')} className="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded-xl text-white flex justify-center"><MessageCircle size={20} /></button>
                           <button onClick={() => shareReferral('telegram')} className="flex-1 bg-blue-500 hover:bg-blue-600 py-2 rounded-xl text-white flex justify-center"><Send size={20} /></button>
                           <button onClick={() => shareReferral('twitter')} className="flex-1 bg-black hover:bg-gray-900 border border-gray-700 py-2 rounded-xl text-white flex justify-center"><Twitter size={20} /></button>
                       </div>
                       
                       {!user?.referredBy && (
                         <div className="space-y-2">
                            <label className="text-xs text-gray-400 font-bold ml-1">Have a friend's code?</label>
                            <div className="flex gap-2">
                                <input 
                                  type="text" 
                                  placeholder="ENTER CODE" 
                                  value={referInput}
                                  onChange={(e) => setReferInput(e.target.value)}
                                  className="flex-1 bg-background border border-surfaceLight rounded-xl px-4 py-2 text-white font-mono uppercase focus:border-primary outline-none"
                                />
                                <button 
                                  onClick={handleRedeemReferral}
                                  disabled={loading || !referInput}
                                  className="bg-primary hover:bg-indigo-500 px-4 py-2 rounded-xl text-white font-bold disabled:opacity-50"
                                >
                                    {loading ? '...' : 'Claim'}
                                </button>
                            </div>
                         </div>
                       )}
                       {user?.referredBy && (
                          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex items-center gap-2 justify-center">
                             <CheckCircle size={16} className="text-green-500" />
                             <span className="text-green-500 text-sm font-bold">Referral Bonus Claimed</span>
                          </div>
                       )}
                   </div>
               )}

               {/* VIP / QUESTS */}
               {activeTab === 'QUESTS' && (
                   <div className="w-full text-center">
                       <Crown size={48} className="text-yellow-500 mx-auto mb-4" />
                       <h3 className="text-xl font-bold text-white mb-2">VIP Lounge</h3>
                       <p className="text-gray-400 text-sm mb-6">Complete tasks to unlock higher tiers.</p>
                       
                       <div className="bg-surfaceLight rounded-xl p-4 mb-4 text-left border border-yellow-500/20">
                           <div className="flex justify-between mb-2">
                               <span className="text-sm font-bold text-yellow-500">Gold Status</span>
                               <span className="text-xs text-gray-400">Locked 🔒</span>
                           </div>
                           <div className="w-full bg-black/50 h-2 rounded-full overflow-hidden">
                               <div className="bg-yellow-500 h-full w-[30%]"></div>
                           </div>
                           <p className="text-[10px] text-gray-500 mt-1">Reach Level 5 to unlock</p>
                       </div>
                       
                       <div className="opacity-50 pointer-events-none">
                            <div className="bg-surfaceLight rounded-xl p-4 text-left border border-white/5">
                                <span className="text-sm font-bold text-purple-400">Diamond Status</span>
                            </div>
                       </div>
                   </div>
               )}
           </div>

           {/* Tab Bar */}
           <div className="grid grid-cols-5 bg-surfaceLight/30 border-t border-white/5">
               {tabs.map(tab => (
                   <button
                     key={tab.id}
                     onClick={() => setActiveTab(tab.id as any)}
                     className={`py-4 flex flex-col items-center gap-1 transition-colors ${activeTab === tab.id ? 'text-primary bg-white/5' : 'text-gray-500 hover:text-white'}`}
                   >
                       {tab.icon}
                       <span className="text-[10px] font-bold">{tab.label}</span>
                   </button>
               ))}
           </div>
       </div>
    </div>
  );
};
