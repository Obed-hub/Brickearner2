
import React, { useEffect, useState, useRef } from 'react';
import { GlobalSettings } from '../types';
import { dataService } from '../services/firebase';
import { adLogic } from '../services/adLogic';
import { Megaphone, Play, Pickaxe, Zap, Trophy, Plus, Copy } from '../components/Icons';
import { useUser } from '../context/UserContext';
import { useToast } from '../context/ToastContext';
import { AdBanner } from '../components/AdBanner';

// Extend Window interface for Monetag SDK
declare global {
  interface Window {
    show_10210637: () => Promise<void>;
  }
}

export const Dashboard: React.FC = () => {
  const { user } = useUser();
  const { showToast } = useToast();
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMining, setIsMining] = useState(false);
  const [showAdModal, setShowAdModal] = useState(false);
  const [loadingAd, setLoadingAd] = useState(false);
  
  // Ad Watching State (for Energy Refill)
  const [timer, setTimer] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setError(null);
    const unsubscribeSettings = dataService.subscribeToSettings((updatedSettings) => {
        setSettings(updatedSettings);
    });
    return () => unsubscribeSettings();
  }, []);

  const handleMine = async () => {
      if (isMining || !user) return;
      
      // Client-side check for immediate feedback
      if ((user.energy || 0) < 10) {
          setShowAdModal(true);
          return;
      }

      setIsMining(true);
      try {
          await dataService.mine();
          // Haptic feedback if available
          if (navigator.vibrate) navigator.vibrate(50);
      } catch (e: any) {
          if (e.message === 'OUT_OF_ENERGY') {
              setShowAdModal(true);
          } else {
              showToast("Mining failed. Try again.", "error");
          }
      } finally {
          setTimeout(() => setIsMining(false), 300); // Visual delay
      }
  };

  const handleWatchAd = async () => {
      if (!settings?.adsEnabled) {
          showToast("Ad system is currently disabled.", "info");
          return;
      }

      // 1. Open the Ad Network Direct Link
      await adLogic.watchAd('REWARD');

      // 2. Start UI Timer
      setTimer(15); 
      showToast("Verifying Ad View...", "info");

      timerRef.current = setInterval(() => {
          setTimer(prev => {
              if (prev === null || prev <= 1) {
                  finishAd();
                  return null;
              }
              return prev - 1;
          });
      }, 1000);
  };

  const handleWatchMonetag = async () => {
      setLoadingAd(true);
      if (typeof window.show_10210637 === 'function') {
          try {
              // Trigger Monetag SDK
              await window.show_10210637(); 
              
              // Claim Reward
              await dataService.claimAdCoinReward();
              showToast("Ad watched! Reward added.", "success");
              if (navigator.vibrate) navigator.vibrate(100);
          } catch (e) {
              console.error(e);
              showToast("Ad failed or closed early.", "error");
          }
      } else {
          showToast("Ad system loading... Try again.", "info");
      }
      setLoadingAd(false);
  };

  const finishAd = async () => {
      if (timerRef.current) clearInterval(timerRef.current);
      setTimer(null);
      
      try {
        await dataService.refillEnergy();
        showToast("Energy Refilled!", "success");
        setShowAdModal(false);
      } catch (e) {
          console.error(e);
          showToast("Failed to verify ad.", "error");
      }
  };
  
  useEffect(() => {
      return () => {
          if (timerRef.current) clearInterval(timerRef.current);
      }
  }, []);

  // Calculate XP Progress
  const xp = user?.xp || 0;
  const level = user?.level || 1;
  const xpProgress = Math.min((xp % 100) / 100 * 100, 100); 

  const copyReferral = () => {
      if (user?.referralCode) {
          navigator.clipboard.writeText(user.referralCode);
          showToast("Code copied!", "success");
      }
  }

  return (
    <div className="space-y-6 pb-10 max-w-lg mx-auto">
      
      {settings?.announcement.enabled && (
        <div className="bg-gradient-to-r from-blue-600/20 to-primary/20 border border-primary/30 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
             <div className="p-2 bg-primary/20 rounded-lg">
                <Megaphone size={18} className="text-primary" />
             </div>
             <div>
                 <h4 className="font-bold text-sm text-primary mb-0.5">Announcement</h4>
                 <p className="text-xs text-gray-300">{settings.announcement.message}</p>
             </div>
        </div>
      )}

      {/* GAME STATS HEADER */}
      <div className="grid grid-cols-2 gap-4">
          <div className="bg-surface border border-surfaceLight rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <Trophy size={20} className="text-yellow-500" />
              </div>
              <div>
                  <p className="text-xs text-gray-400 font-bold uppercase">Level {level}</p>
                  <div className="w-full bg-gray-700 h-1.5 rounded-full mt-1 w-20">
                      <div className="bg-yellow-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${xpProgress}%` }}></div>
                  </div>
              </div>
          </div>
          <div className="bg-surface border border-surfaceLight rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Zap size={20} className="text-blue-500" />
              </div>
              <div>
                  <p className="text-xs text-gray-400 font-bold uppercase">Energy</p>
                  <p className="text-lg font-bold text-white leading-none">{user?.energy || 0}/100</p>
              </div>
          </div>
      </div>

      {/* REFERRAL QUICK ACCESS */}
      <div onClick={copyReferral} className="bg-surfaceLight/30 border border-white/5 rounded-xl p-3 flex justify-between items-center cursor-pointer active:scale-95 transition-transform">
          <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Your Invite Code:</span>
              <span className="font-mono font-bold text-primary tracking-wider">{user?.referralCode}</span>
          </div>
          <Copy size={16} className="text-gray-500" />
      </div>

      {/* AD BANNER (Extra Bonus) */}
      <AdBanner />

      {/* WATCH & EARN BUTTON */}
      <button 
        onClick={handleWatchMonetag}
        disabled={loadingAd}
        className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl shadow-lg shadow-green-500/20 flex items-center justify-center gap-3 active:scale-95 transition-all"
      >
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              {loadingAd ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Play size={20} fill="currentColor" />}
          </div>
          <div className="text-left">
              <h3 className="font-bold text-white leading-none">Watch Ad & Earn</h3>
              <p className="text-green-100 text-xs mt-1">Get +{settings?.coinsPerAd || 0.005} coins instantly</p>
          </div>
      </button>

      {/* MAIN MINING AREA */}
      <div className="relative py-10 flex flex-col items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-primary/5 rounded-full blur-3xl transform scale-150"></div>
          
          <button 
             onClick={handleMine}
             disabled={isMining}
             className={`relative z-10 w-48 h-48 rounded-full bg-gradient-to-b from-surfaceLight to-surface border-4 border-surfaceLight shadow-[0_0_50px_rgba(79,70,229,0.3)] flex items-center justify-center group active:scale-95 transition-all duration-100 ${isMining ? 'scale-95 border-primary/50' : ''}`}
          >
              <div className="absolute inset-2 rounded-full border border-white/5"></div>
              <div className="relative">
                 <Pickaxe size={64} className={`text-primary transition-transform duration-200 ${isMining ? 'rotate-[-45deg]' : ''}`} />
              </div>
              
              {isMining && (
                  <div className="absolute -top-10 text-green-400 font-bold text-xl animate-bounce">
                      +{(settings?.gamification?.clickReward || 0.0005)}
                  </div>
              )}
          </button>
          
          <p className="mt-8 text-gray-400 text-sm font-medium animate-pulse">
              Tap to Mine Crypto
          </p>
      </div>

      {/* ENERGY BAR FOOTER */}
      <div className="bg-surface border border-surfaceLight rounded-2xl p-6">
          <div className="flex justify-between items-end mb-2">
              <h3 className="text-white font-bold flex items-center gap-2">
                  <Zap className="text-blue-500" size={18} /> Mining Energy
              </h3>
              <span className="text-xs font-mono text-gray-400">
                  {user?.energy || 0}%
              </span>
          </div>
          <div className="w-full bg-gray-800 h-3 rounded-full overflow-hidden border border-white/5">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                    (user?.energy || 0) < 20 ? 'bg-red-500' : 'bg-gradient-to-r from-blue-500 to-cyan-400'
                }`}
                style={{ width: `${user?.energy || 0}%` }}
              ></div>
          </div>
          <p className="text-xs text-gray-500 mt-3">
              Consumes 10 Energy per click. Watch ads to refill instantly.
          </p>
      </div>

      {/* AD / REFILL MODAL */}
      {showAdModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
              <div className="bg-surface border border-surfaceLight rounded-3xl p-6 max-w-sm w-full shadow-2xl relative">
                  <button onClick={() => setShowAdModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                      <Plus className="rotate-45" size={24} />
                  </button>
                  
                  <div className="w-16 h-16 bg-blue-500/20 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Zap size={32} />
                  </div>
                  
                  <h2 className="text-xl font-bold text-center text-white mb-2">Out of Energy!</h2>
                  <p className="text-center text-gray-400 text-sm mb-6">
                      You need energy to keep mining. Watch a short video to refill your energy to 100%.
                  </p>
                  
                  {timer ? (
                      <div className="w-full bg-surfaceLight rounded-xl p-4 text-center">
                          <p className="text-primary font-bold animate-pulse mb-2">Verifying Ad... {timer}s</p>
                          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                              <div className="h-full bg-primary transition-all duration-1000 ease-linear" style={{ width: `${((15-timer)/15)*100}%` }}></div>
                          </div>
                      </div>
                  ) : (
                      <button 
                        onClick={handleWatchAd}
                        className="w-full py-3 bg-primary hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-primary/25 flex items-center justify-center gap-2"
                      >
                          <Play size={18} fill="currentColor" />
                          Watch Ad & Refill
                      </button>
                  )}
              </div>
          </div>
      )}

    </div>
  );
};
