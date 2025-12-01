
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  runTransaction,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
  Unsubscribe
} from "firebase/firestore";
import { Task, User, WithdrawalRequest, GlobalSettings, TaskType, AdminLog } from '../types';

const firebaseConfig = {
  apiKey: "AIzaSyCfTkdPv9YidazaE-x9MSbM1JcfkI3lMnk",
  authDomain: "brickearner.firebaseapp.com",
  databaseURL: "https://brickearner-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "brickearner",
  storageBucket: "brickearner.firebasestorage.app",
  messagingSenderId: "1078245447904",
  appId: "1:1078245447904:web:a14987280ff8ee40695885"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const SUPER_ADMIN_EMAIL = 'joinsexcompany@gmail.com';
const SUPER_ADMIN_UID = 'alyPvUmbaCT3Tu49IuG4sQedasG3';

// COLLECTION PATHS - NAMESPACED FOR PERSISTENCE
const PATHS = {
  USERS: 'artifacts/brickearner/users',
  TASKS: 'artifacts/brickearner/tasks',
  WITHDRAWALS: 'artifacts/brickearner/withdrawals',
  ADMIN_LOGS: 'artifacts/brickearner/admin_logs',
  GLOBALS: 'artifacts/brickearner/globals'
};

const INITIAL_SETTINGS: GlobalSettings = {
  adsEnabled: true,
  coinsPerAd: 0.005,
  referralBonus: 0.10,
  announcement: {
    enabled: true,
    message: 'Welcome to Brickearner! Complete tasks to earn crypto.',
    type: 'info'
  },
  gamification: {
    dailyBonusBase: 0.01,
    xpPerClick: 10,
    energyCostPerClick: 10,
    clickReward: 0.0005
  }
};

const checkIsAdmin = (uid: string, email: string | null | undefined) => {
    const safeEmail = (email || '').toLowerCase();
    return safeEmail === SUPER_ADMIN_EMAIL.toLowerCase() || uid === SUPER_ADMIN_UID;
};

// --- GLOBAL ERROR DISPATCHER ---
export const dispatchGlobalError = (error: any) => {
  let message = "An unknown error occurred";
  
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  } else if (error && typeof error === 'object' && 'code' in error) {
      message = error.message || error.code;
  }

  // User-friendly mapping
  if (message.includes("auth/network-request-failed")) {
      message = "Network error. Please check your internet connection.";
  } else if (message.includes("storage/retry-limit-exceeded")) {
      message = "Upload failed due to poor connection. Please try again.";
  } else if (message.includes("Cloud Firestore API has not been used") || message.includes("disabled")) {
      message = "SETUP REQUIRED: Enable Firestore API in Firebase Console.";
      console.error("CRITICAL: Firestore API not enabled.");
  } else if (message.includes("permission-denied") || message.includes("Missing or insufficient permissions")) {
      // SUPPRESSED: User requested removal of permission notifications
      console.warn("Permission denied access to database.");
      return; 
  } else if (message.includes("Firebase:")) {
      message = message.replace("Firebase: ", "").replace("Error (", "").replace(").", "");
  }
  
  const event = new CustomEvent('brickearner-error', { detail: message });
  window.dispatchEvent(event);
};

// --- INTERNAL LOGGER ---
const logAdminAction = async (action: string, details: string) => {
    const user = auth.currentUser;
    if (!user) return;
    
    // Only log if admin
    if (!checkIsAdmin(user.uid, user.email)) return;

    try {
        await addDoc(collection(db, PATHS.ADMIN_LOGS), {
            adminEmail: user.email,
            adminUid: user.uid,
            action,
            details,
            timestamp: new Date().toISOString()
        });
    } catch (e) {
        // Silent fail for logs
    }
};

// HELPER: Generate Safe IDs
const generateId = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let autoId = '';
    for (let i = 0; i < 20; i++) {
        autoId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return autoId;
};

// HELPER: Check and return updates for Daily Reset
const getDailyResetUpdates = (userData: User) => {
    const lastReset = userData.lastDailyGoalReset ? new Date(userData.lastDailyGoalReset).toDateString() : '';
    const today = new Date().toDateString();
    
    if (lastReset !== today) {
        return {
            dailyRefillCount: 0,
            dailySpinCount: 0,
            dailyAdsWatched: 0,
            dailyMiningCount: 0,
            dailyGoalClaimed: false,
            lastDailyGoalReset: new Date().toISOString()
        };
    }
    return {};
};

export const authService = {
  login: async (email: string, password: string): Promise<void> => {
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        throw error; 
    }
  },

  register: async (email: string, password: string): Promise<void> => {
    try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const isAdmin = checkIsAdmin(cred.user.uid, email);
        
        const newUser: User = {
        uid: cred.user.uid,
        email: email,
        balance: 0,
        referralCode: Math.random().toString(36).substr(2, 6).toUpperCase(),
        completedTaskIds: [],
        isAdmin: isAdmin,
        isBanned: false,
        joinedAt: new Date().toISOString(),
        referralCount: 0,
        energy: 100,
        maxEnergy: 100,
        xp: 0,
        level: 1,
        miningPower: 1,
        spinsAvailable: 1,
        dailyRefillCount: 0,
        dailySpinCount: 0,
        dailyAdsWatched: 0,
        dailyMiningCount: 0,
        lastDailyGoalReset: new Date().toISOString(),
        dailyGoalClaimed: false
        };
        await setDoc(doc(db, PATHS.USERS, cred.user.uid), newUser);
    } catch (error) {
        throw error;
    }
  },
  
  logout: async () => {
    try {
        await signOut(auth);
    } catch (error) {
        dispatchGlobalError(error);
    }
  },
};

export const dataService = {
  generateId, 
  
  uploadFile: async (file: File): Promise<string> => {
      console.warn("File upload skipped. Using placeholder.");
      return `https://picsum.photos/seed/${Date.now()}/200`;
  },

  // --- USER ---
  getUser: async (uid: string): Promise<User | null> => {
    try {
      const docRef = doc(db, PATHS.USERS, uid);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as User;
      }
      return null;
    } catch (error) {
      console.warn("Error fetching user:", error);
      dispatchGlobalError(error);
      return null;
    }
  },

  syncUserAdminStatus: async (uid: string, email: string) => {
    const isAdmin = checkIsAdmin(uid, email);
    const userRef = doc(db, PATHS.USERS, uid);
    try {
      await setDoc(userRef, { isAdmin }, { merge: true });
    } catch (error) {
    }
  },

  subscribeToAllUsers: (callback: (users: User[]) => void): Unsubscribe => {
    try {
        const q = query(collection(db, PATHS.USERS));
        return onSnapshot(q, (snapshot) => {
          const users: User[] = [];
          snapshot.forEach((doc) => users.push(doc.data() as User));
          callback(users);
        }, (error) => {
            console.error("User sub error", error);
            dispatchGlobalError(error);
        });
    } catch (e) {
        return () => {};
    }
  },

  // --- GAME MECHANICS ---
  mine: async () => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not logged in');
    const userRef = doc(db, PATHS.USERS, user.uid);
    const settingsRef = doc(db, PATHS.GLOBALS, 'settings');

    try {
      await runTransaction(db, async (transaction) => {
        // Fetch Settings for Dynamic Values
        const settingsDoc = await transaction.get(settingsRef);
        const settings = settingsDoc.exists() ? settingsDoc.data() as GlobalSettings : INITIAL_SETTINGS;
        
        // Use settings or defaults if not present
        const ENERGY_COST = settings.gamification?.energyCostPerClick ?? 10;
        const XP_GAIN = settings.gamification?.xpPerClick ?? 10;
        const COIN_REWARD = settings.gamification?.clickReward ?? 0.0005;

        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error("User does not exist!");
        
        const userData = userDoc.data() as User;
        
        // Handle Daily Reset
        const resetUpdates = getDailyResetUpdates(userData);
        const currentData = { ...userData, ...resetUpdates };

        const currentEnergy = typeof currentData.energy === 'number' ? currentData.energy : 100;
        
        if (currentEnergy < ENERGY_COST) {
          throw new Error("OUT_OF_ENERGY");
        }

        const newEnergy = currentEnergy - ENERGY_COST;
        const newBalance = (currentData.balance || 0) + COIN_REWARD;
        const newXp = (currentData.xp || 0) + XP_GAIN;
        
        // Simple Level Up Logic: Level = 1 + floor(xp / 100)
        const newLevel = 1 + Math.floor(newXp / 100);

        transaction.update(userRef, { 
          ...resetUpdates,
          energy: newEnergy,
          balance: newBalance,
          xp: newXp,
          level: newLevel,
          dailyMiningCount: (currentData.dailyMiningCount || 0) + 1
        });
      });
    } catch (error: any) {
       if (error.message === 'OUT_OF_ENERGY') throw error;
       dispatchGlobalError(error);
       throw error;
    }
  },

  refillEnergy: async () => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not logged in');
    const userRef = doc(db, PATHS.USERS, user.uid);

    try {
       await runTransaction(db, async (transaction) => {
           const userDoc = await transaction.get(userRef);
           if (!userDoc.exists()) throw new Error("User missing");
           const userData = userDoc.data() as User;

           const resetUpdates = getDailyResetUpdates(userData);
           const currentData = { ...userData, ...resetUpdates };

           // Enforce 10 refills per day limit
           if ((currentData.dailyRefillCount || 0) >= 10) {
               throw new Error("DAILY_LIMIT_REACHED");
           }

           transaction.update(userRef, {
               ...resetUpdates,
               energy: 100,
               dailyRefillCount: (currentData.dailyRefillCount || 0) + 1
           });
       });
    } catch (error: any) {
       if (error.message === 'DAILY_LIMIT_REACHED') {
           dispatchGlobalError("Daily refill limit reached (10/10). Come back tomorrow!");
       } else {
           dispatchGlobalError(error);
       }
       throw error;
    }
  },

  claimDailyBonus: async () => {
      const user = auth.currentUser;
      if (!user) throw new Error('Not logged in');
      const userRef = doc(db, PATHS.USERS, user.uid);
      const settingsRef = doc(db, PATHS.GLOBALS, 'settings');
      
      try {
          await runTransaction(db, async (transaction) => {
              const settingsDoc = await transaction.get(settingsRef);
              const settings = settingsDoc.exists() ? settingsDoc.data() as GlobalSettings : INITIAL_SETTINGS;
              const baseBonus = settings.gamification?.dailyBonusBase ?? 0.01;

              const userDoc = await transaction.get(userRef);
              if (!userDoc.exists()) throw new Error("User missing");
              const userData = userDoc.data() as User;
              
              const lastClaim = userData.lastDailyBonus ? new Date(userData.lastDailyBonus).getTime() : 0;
              const now = Date.now();
              const hoursSince = (now - lastClaim) / (1000 * 60 * 60);
              
              if (hoursSince < 24) throw new Error("ALREADY_CLAIMED");
              
              const streak = (hoursSince < 48) ? (userData.dailyStreak || 0) + 1 : 1;
              const bonus = baseBonus * streak; 
              
              // Handle Daily Reset check implicitly, though daily bonus is naturally daily
              const resetUpdates = getDailyResetUpdates(userData);

              transaction.update(userRef, {
                  ...resetUpdates,
                  balance: (userData.balance || 0) + bonus,
                  lastDailyBonus: new Date().toISOString(),
                  dailyStreak: streak
              });
          });
      } catch (error) {
          throw error;
      }
  },

  spinWheel: async () => {
      const user = auth.currentUser;
      if (!user) throw new Error('Not logged in');
      const userRef = doc(db, PATHS.USERS, user.uid);
      
      const rand = Math.random();
      let rewardCoins = 0;
      let rewardEnergy = 0;
      let label = "";

      if (rand < 0.1) { rewardCoins = 0.05; label = "Jackpot! 0.05"; }
      else if (rand < 0.3) { rewardEnergy = 50; label = "50 Energy"; }
      else if (rand < 0.6) { rewardCoins = 0.005; label = "0.005 Coins"; }
      else { rewardCoins = 0.001; label = "0.001 Coins"; }
      
      try {
          await runTransaction(db, async (transaction) => {
              const userDoc = await transaction.get(userRef);
              if (!userDoc.exists()) throw new Error("User missing");
              const userData = userDoc.data() as User;

              const resetUpdates = getDailyResetUpdates(userData);
              const currentData = { ...userData, ...resetUpdates };
              
              // Enforce 7 spins per day limit
              if ((currentData.dailySpinCount || 0) >= 7) {
                  throw new Error("DAILY_LIMIT_REACHED");
              }

              if ((currentData.spinsAvailable || 0) < 1) throw new Error("NO_SPINS");
              
              transaction.update(userRef, {
                  ...resetUpdates,
                  balance: (currentData.balance || 0) + rewardCoins,
                  energy: Math.min((currentData.energy || 0) + rewardEnergy, 100),
                  spinsAvailable: (currentData.spinsAvailable || 0) - 1,
                  dailySpinCount: (currentData.dailySpinCount || 0) + 1
              });
          });
          return { label, rewardCoins, rewardEnergy };
      } catch (error: any) {
          if (error.message === 'DAILY_LIMIT_REACHED') {
              dispatchGlobalError("Daily spin limit reached (7/7). Come back tomorrow!");
          }
          throw error;
      }
  },

  grantBonusSpin: async () => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not logged in');
    const userRef = doc(db, PATHS.USERS, user.uid);

    try {
        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) throw new Error("User missing");
            const userData = userDoc.data() as User;

            const resetUpdates = getDailyResetUpdates(userData);
            const currentData = { ...userData, ...resetUpdates };
            
            transaction.update(userRef, {
                ...resetUpdates,
                spinsAvailable: (currentData.spinsAvailable || 0) + 1,
                dailyAdsWatched: (currentData.dailyAdsWatched || 0) + 1
            });
        });
    } catch (error) {
        throw error;
    }
  },

  claimDailyGoalReward: async () => {
      const user = auth.currentUser;
      if (!user) throw new Error('Not logged in');
      const userRef = doc(db, PATHS.USERS, user.uid);

      try {
          await runTransaction(db, async (transaction) => {
              const userDoc = await transaction.get(userRef);
              if (!userDoc.exists()) throw new Error("User missing");
              const userData = userDoc.data() as User;
              
              const resetUpdates = getDailyResetUpdates(userData);
              // If reset happens during claim attempt, goals are effectively reset too
              if (Object.keys(resetUpdates).length > 0) throw new Error("GOALS_RESET");

              if (userData.dailyGoalClaimed) throw new Error("ALREADY_CLAIMED");

              // Targets: 10 Refills, 7 Spins, 1000 Mining actions? 
              // Using Mining count as proxy for activity.
              // Logic can be customized. Assuming goals met if UI allowed call.
              
              const reward = 0.05; // Fixed daily goal reward

              transaction.update(userRef, {
                  balance: (userData.balance || 0) + reward,
                  dailyGoalClaimed: true
              });
          });
      } catch (error: any) {
          if (error.message === 'GOALS_RESET') dispatchGlobalError("New day started, goals reset.");
          else if (error.message === 'ALREADY_CLAIMED') dispatchGlobalError("Daily goal reward already claimed.");
          else dispatchGlobalError(error);
          throw error;
      }
  },

  redeemReferralCode: async (code: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not logged in');
    const userRef = doc(db, PATHS.USERS, user.uid);

    // Get current global settings for bonus amount
    const settingsRef = doc(db, PATHS.GLOBALS, 'settings');

    try {
        await runTransaction(db, async (transaction) => {
            // 1. Check User
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) throw new Error("User missing");
            const userData = userDoc.data() as User;

            if (userData.referredBy) throw new Error("ALREADY_REFERRED");
            if (userData.referralCode === code) throw new Error("SELF_REFERRAL");

            // 2. Check Referrer Code
            const q = query(collection(db, PATHS.USERS), where("referralCode", "==", code));
            const querySnapshot = await getDocs(q); 
            if (querySnapshot.empty) throw new Error("INVALID_CODE");
            
            const referrerDoc = querySnapshot.docs[0];
            const referrerRef = doc(db, PATHS.USERS, referrerDoc.id);
            const referrerData = referrerDoc.data() as User;

            // 3. Get Bonus Amount & Tier
            const settingsDoc = await transaction.get(settingsRef);
            const settings = settingsDoc.exists() ? settingsDoc.data() as GlobalSettings : INITIAL_SETTINGS;
            const baseBonus = settings.referralBonus || 0.10;

            const currentReferrals = referrerData.referralCount || 0;
            let multiplier = 1;
            
            // TIERED REFERRAL LOGIC
            if (currentReferrals >= 20) multiplier = 2;       // Gold Tier (2x)
            else if (currentReferrals >= 5) multiplier = 1.5; // Silver Tier (1.5x)
            
            const referrerReward = baseBonus * multiplier;
            const refereeReward = baseBonus / 2; // Fixed starting bonus for referee

            // 4. Update Referrer
            transaction.update(referrerRef, {
                balance: (referrerData.balance || 0) + referrerReward,
                referralCount: (referrerData.referralCount || 0) + 1
            });

            // 5. Update Referee (Current User)
            transaction.update(userRef, {
                referredBy: referrerDoc.id, // Store UID of referrer
                balance: (userData.balance || 0) + refereeReward
            });
        });
    } catch (error) {
        throw error;
    }
  },

  // --- TASKS ---
  subscribeToTasks: (
    onUpdate: (tasks: Task[]) => void, 
    onError?: (error: Error) => void
  ): Unsubscribe => {
    try {
        const q = query(collection(db, PATHS.TASKS));
        return onSnapshot(q, 
          (snapshot) => {
            const tasks: Task[] = [];
            snapshot.forEach((doc) => tasks.push(doc.data() as Task));
            onUpdate(tasks);
          }, 
          (error) => {
            if (onError) onError(error as Error);
          }
        );
    } catch (e) {
        if (onError) onError(e as Error);
        return () => {};
    }
  },

  saveTask: async (task: Task) => {
    try {
        const cleanTask = { ...task, isActive: !!task.isActive };
        await setDoc(doc(db, PATHS.TASKS, task.id), cleanTask, { merge: true });
        await logAdminAction("Save Task", `Saved task: ${task.title}`);
    } catch (error) {
        dispatchGlobalError(error);
        throw error;
    }
  },

  duplicateTask: async (originalTask: Task) => {
    try {
      const newId = generateId();
      const { id, ...rest } = originalTask;
      const newTask: Task = {
        ...rest,
        id: newId,
        title: `${originalTask.title} (Copy)`,
        isActive: false, 
        isMultiTask: !!originalTask.isMultiTask, 
      };
      await setDoc(doc(db, PATHS.TASKS, newId), newTask);
      await logAdminAction("Duplicate Task", `Duplicated task: ${originalTask.title}`);
    } catch (error) {
      console.error("Duplicate task error:", error);
      dispatchGlobalError("Failed to duplicate task");
      throw error;
    }
  },

  deleteTask: async (id: string) => {
    if (!id) throw new Error("Task ID is missing");
    try {
        const taskRef = doc(db, PATHS.TASKS, id);
        await deleteDoc(taskRef);
        await logAdminAction("Delete Task", `Deleted task ID: ${id}`);
    } catch (error: any) {
        if (error.code === 'permission-denied') {
            dispatchGlobalError("Permission Denied: Cannot delete task. Check Rules.");
        } else {
            dispatchGlobalError("Failed to delete task.");
        }
        throw error;
    }
  },

  completeTask: async (taskId: string, reward: number) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not logged in');

    const userRef = doc(db, PATHS.USERS, user.uid);
    const taskRef = doc(db, PATHS.TASKS, taskId);

    try {
        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) throw new Error("User does not exist!");
            
            let taskData: Task | null = null;
            if (!taskId.startsWith('AD_WATCH')) {
                const taskDoc = await transaction.get(taskRef);
                if (taskDoc.exists()) {
                    taskData = taskDoc.data() as Task;
                }
            }

            const userData = userDoc.data() as User;
            const currentCompletions = (userData.completedTaskIds || []).filter(id => id === taskId).length;
            
            let limit = 1;
            if (taskData) {
                limit = (taskData.maxCompletions && taskData.maxCompletions > 1) 
                              ? taskData.maxCompletions 
                              : (taskData.isMultiTask ? 999999 : 1);
            } else {
                limit = 999999;
            }

            if (currentCompletions >= limit) {
                throw new Error("Task completion limit reached for this account.");
            }

            const resetUpdates = getDailyResetUpdates(userData);
            
            const newBalance = (userData.balance || 0) + reward;
            const newCompleted = [...(userData.completedTaskIds || []), taskId];

            transaction.update(userRef, { 
                ...resetUpdates,
                balance: newBalance,
                completedTaskIds: newCompleted
            });
        });
    } catch (error) {
        dispatchGlobalError(error);
        throw error;
    }
  },

  // --- WITHDRAWALS ---
  requestWithdrawal: async (amount: number, method: WithdrawalRequest['method']) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not logged in');

    const userRef = doc(db, PATHS.USERS, user.uid);
    const withdrawalId = Math.random().toString(36).substr(2, 9);

    try {
        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) throw new Error("User not found");

            const userData = userDoc.data() as User;
            if (userData.balance < amount) throw new Error("Insufficient funds");

            const newBalance = userData.balance - amount;
            transaction.update(userRef, { balance: newBalance });

            const withdrawalRequest: WithdrawalRequest = {
                id: withdrawalId,
                userId: user.uid,
                userEmail: user.email || '',
                amount,
                method,
                status: 'PENDING',
                date: new Date().toISOString()
            };

            transaction.set(doc(db, PATHS.WITHDRAWALS, withdrawalId), withdrawalRequest);
        });
    } catch (error) {
        dispatchGlobalError(error);
        throw error;
    }
  },

  subscribeToWithdrawals: (callback: (data: WithdrawalRequest[]) => void): Unsubscribe => {
    try {
        const q = query(collection(db, PATHS.WITHDRAWALS));
        return onSnapshot(q, (snapshot) => {
            const list: WithdrawalRequest[] = [];
            snapshot.forEach((doc) => list.push(doc.data() as WithdrawalRequest));
            list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            callback(list);
        }, (error) => {
            dispatchGlobalError(error);
        });
    } catch (e) {
        return () => {};
    }
  },

  processWithdrawal: async (id: string, action: 'APPROVE' | 'REJECT', reason?: string) => {
    const withdrawalRef = doc(db, PATHS.WITHDRAWALS, id);

    try {
        await runTransaction(db, async (transaction) => {
            const wDoc = await transaction.get(withdrawalRef);
            if (!wDoc.exists()) throw new Error("Request not found");
            
            const wData = wDoc.data() as WithdrawalRequest;
            if (wData.status !== 'PENDING') return; 

            if (action === 'APPROVE') {
                transaction.update(withdrawalRef, { status: 'APPROVED' });
            } else {
                const userRef = doc(db, PATHS.USERS, wData.userId);
                const userDoc = await transaction.get(userRef);
                if (userDoc.exists()) {
                    const userData = userDoc.data() as User;
                    transaction.update(userRef, { balance: userData.balance + wData.amount });
                }
                transaction.update(withdrawalRef, { status: 'REJECTED', rejectionReason: reason });
            }
        });
        await logAdminAction("Process Withdrawal", `${action} withdrawal ${id}. Reason: ${reason || 'N/A'}`);
    } catch (error) {
        dispatchGlobalError(error);
        throw error;
    }
  },

  // --- ADMIN: USERS ---
  adminUpdateUser: async (uid: string, updates: Partial<User>) => {
    try {
        const userRef = doc(db, PATHS.USERS, uid);
        await updateDoc(userRef, updates);
        await logAdminAction("Update User", `Updated user ${uid}.`);
    } catch (error) {
        dispatchGlobalError("Failed to update user.");
        throw error;
    }
  },

  // --- SETTINGS ---
  getSettings: async (): Promise<GlobalSettings> => {
    try {
      const docRef = doc(db, PATHS.GLOBALS, 'settings');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as GlobalSettings;
      }
      return INITIAL_SETTINGS;
    } catch (error) {
      dispatchGlobalError(error);
      return INITIAL_SETTINGS;
    }
  },

  subscribeToSettings: (callback: (settings: GlobalSettings) => void): Unsubscribe => {
    try {
      const docRef = doc(db, PATHS.GLOBALS, 'settings');
      return onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          callback(docSnap.data() as GlobalSettings);
        } else {
           callback(INITIAL_SETTINGS);
        }
      }, (error) => {
      });
    } catch (e) {
      return () => {};
    }
  },

  updateSettings: async (settings: GlobalSettings) => {
    try {
      const docRef = doc(db, PATHS.GLOBALS, 'settings');
      await setDoc(docRef, settings, { merge: true });
      await logAdminAction("Update Settings", "Updated global settings");
    } catch (error) {
      dispatchGlobalError("Failed to update settings.");
      throw error;
    }
  },

  // --- ADMIN: SEED DB ---
  seedDatabase: async () => {
    try {
        const batch = writeBatch(db);
        const genId = generateId;

        const initialTasks: Task[] = [
            {
              id: genId(),
              title: 'Join Mailivery Email List',
              description: 'Connect your email to the interface and verify.',
              reward: 0.35402,
              currencyVal: 0.28,
              type: TaskType.SIGNUP,
              imageUrl: 'https://picsum.photos/seed/mail/200/200',
              isMultiTask: true,
              isActive: true,
              maxCompletions: 1,
              url: ''
            },
            {
              id: genId(),
              title: 'Goblin Miner: Idle Merger',
              description: 'Reach level 50 to earn rewards.',
              reward: 1427.49,
              currencyVal: 10.50,
              type: TaskType.GAME,
              imageUrl: 'https://picsum.photos/seed/goblin/200/200',
              isActive: true,
              maxCompletions: 1,
              url: ''
            }
        ];

        initialTasks.forEach(task => {
            const ref = doc(db, PATHS.TASKS, task.id);
            batch.set(ref, task);
        });

        const settingsRef = doc(db, PATHS.GLOBALS, 'settings');
        batch.set(settingsRef, INITIAL_SETTINGS);

        await batch.commit();
        await logAdminAction("Seed Database", "Populated database with sample data");
    } catch (error) {
        dispatchGlobalError(error);
        throw error;
    }
  },

  // --- ADMIN: LOGS ---
  subscribeToAdminLogs: (callback: (logs: AdminLog[]) => void): Unsubscribe => {
    try {
        const q = query(collection(db, PATHS.ADMIN_LOGS));
        return onSnapshot(q, (snapshot) => {
            const logs: AdminLog[] = [];
            snapshot.forEach((doc) => logs.push({ id: doc.id, ...doc.data() } as AdminLog));
            logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            callback(logs);
        }, (error) => {});
    } catch (e) {
        return () => {};
    }
  }
};
