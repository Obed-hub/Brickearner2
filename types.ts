
export enum TaskType {
  GAME = 'GAME',
  SURVEY = 'SURVEY',
  SIGNUP = 'SIGNUP',
  AD = 'AD'
}

export enum TaskStatus {
  AVAILABLE = 'AVAILABLE',
  STARTED = 'STARTED',
  COMPLETED = 'COMPLETED'
}

export interface Task {
  id: string;
  title: string;
  description: string;
  reward: number;
  currencyVal?: number; // Approximate dollar value
  type: TaskType;
  imageUrl: string;
  isMultiTask?: boolean;
  status?: TaskStatus; // For user specific context
  isActive?: boolean; // For admin control
  url?: string; // External link for the task
  maxCompletions?: number; // Limit number of times a user can do this
}

export interface User {
  uid: string;
  email: string;
  balance: number;
  referralCode: string;
  referredBy?: string;
  completedTaskIds: string[];
  isAdmin: boolean;
  isBanned?: boolean;
  joinedAt: string;
  referralCount: number;
  // Gamification Fields
  energy: number;      // Current energy (0-100)
  maxEnergy: number;   // Cap (e.g. 100)
  xp: number;          // Experience points
  level: number;       // Current user level
  miningPower: number; // Earning multiplier
  // New Hub Fields
  lastDailyBonus?: string; // ISO Date of last claim
  dailyStreak?: number;    // Current streak days
  spinsAvailable?: number; 
  // Daily Goals & Limits
  dailyRefillCount?: number;
  dailySpinCount?: number;
  dailyAdsWatched?: number;
  dailyMiningCount?: number;
  lastDailyGoalReset?: string; // ISO String
  dailyGoalClaimed?: boolean;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userEmail?: string; // Helper for admin view
  amount: number;
  method: 'PAYPAL' | 'CRYPTO' | 'GIFTCARD';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  date: string;
  rejectionReason?: string;
}

export interface GlobalSettings {
  adsEnabled: boolean;
  coinsPerAd: number;
  referralBonus: number;
  announcement: {
    enabled: boolean;
    message: string;
    type: 'info' | 'warning' | 'success';
  };
  gamification: {
    dailyBonusBase: number;
    xpPerClick: number;
    energyCostPerClick: number;
    clickReward: number;
  };
}

export interface AdminLog {
  id: string;
  adminEmail: string;
  action: string;
  details: string;
  timestamp: string;
}
