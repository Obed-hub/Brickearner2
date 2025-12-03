
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { auth, db, dataService, dispatchGlobalError } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

interface UserContextType {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>; 
  logout: () => void;
}

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  refreshUser: async () => {},
  logout: () => {}
});

export const useUser = () => useContext(UserContext);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Define the consistent path for users (must match firebase.ts)
  const USERS_COLLECTION = 'artifacts/brickearner/users';

  useEffect(() => {
    // Listen to Auth State Changes
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Run Admin Sync in background
        dataService.syncUserAdminStatus(firebaseUser.uid, firebaseUser.email || '').catch(console.error);

        // Listen to User Document Changes
        const userRef = doc(db, USERS_COLLECTION, firebaseUser.uid);
        const unsubscribeDoc = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            
            // --- SELF-HEALING: Generate Referral Code if missing ---
            let currentReferralCode = data.referralCode;
            if (!currentReferralCode) {
                currentReferralCode = Math.random().toString(36).substr(2, 6).toUpperCase();
                // Update DB asynchronously
                setDoc(userRef, { referralCode: currentReferralCode }, { merge: true }).catch(err => console.error("Ref code gen error", err));
            }

            // Sanitize data and provide defaults for Game Stats
            const sanitizedUser: User = {
                uid: data.uid || firebaseUser.uid,
                email: data.email || firebaseUser.email || '',
                balance: typeof data.balance === 'number' ? data.balance : 0,
                referralCode: currentReferralCode,
                completedTaskIds: data.completedTaskIds || [],
                isAdmin: !!data.isAdmin,
                isBanned: !!data.isBanned,
                joinedAt: data.joinedAt || new Date().toISOString(),
                referralCount: data.referralCount || 0,
                // Gamification Defaults
                energy: typeof data.energy === 'number' ? data.energy : 100,
                maxEnergy: typeof data.maxEnergy === 'number' ? data.maxEnergy : 100,
                xp: typeof data.xp === 'number' ? data.xp : 0,
                level: typeof data.level === 'number' ? data.level : 1,
                miningPower: typeof data.miningPower === 'number' ? data.miningPower : 1,
                ...data 
            } as User;
            setUser(sanitizedUser);
          } else {
            // Auto-recover missing user
            const newUser: User = {
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                balance: 0,
                referralCode: Math.random().toString(36).substr(2, 6).toUpperCase(),
                completedTaskIds: [],
                isAdmin: false, 
                isBanned: false,
                joinedAt: new Date().toISOString(),
                referralCount: 0,
                energy: 100,
                maxEnergy: 100,
                xp: 0,
                level: 1,
                miningPower: 1
            };
            
            setDoc(doc(db, USERS_COLLECTION, firebaseUser.uid), newUser).catch((err) => {
                console.error("Error auto-creating user doc:", err);
                dispatchGlobalError(err);
            });
          }
          setLoading(false);
        }, (error) => {
            console.error("Firestore snapshot error:", error);
            setLoading(false);
            dispatchGlobalError(error);
        });
        
        return () => unsubscribeDoc();
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const refreshUser = async () => {
    if (auth.currentUser) {
        const u = await dataService.getUser(auth.currentUser.uid);
        if (u) setUser(u);
    }
  };

  const logout = async () => {
    await auth.signOut();
  };

  return (
    <UserContext.Provider value={{ user, loading, refreshUser, logout }}>
      {children}
    </UserContext.Provider>
  );
};
