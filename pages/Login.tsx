
import React, { useState } from 'react';
import { authService } from '../services/firebase';
import { useUser } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { Gift } from '../components/Icons';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState(''); // New state for referral code
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const { refreshUser } = useUser();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isRegistering) {
        // Pass referral code to register function
        await authService.register(email, password, referralCode);
        showToast("Account created successfully!", "success");
      } else {
        await authService.login(email, password);
        showToast("Welcome back!", "success");
      }
      
      // Navigate immediately - UserContext will handle state
      navigate('/');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        showToast("Invalid email or password.", "error");
      } else if (err.code === 'auth/email-already-in-use') {
        showToast("Email already exists. Switching to Login mode...", "info");
        setIsRegistering(false);
      } else if (err.code === 'auth/weak-password') {
        showToast("Password should be at least 6 characters.", "error");
      } else if (err.code === 'auth/user-not-found') {
          showToast("Account not found. Please sign up.", "error");
      } else {
        showToast((isRegistering ? "Registration failed: " : "Login failed: ") + err.message, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/10 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="w-full max-w-md bg-surface border border-surfaceLight rounded-3xl p-8 shadow-2xl relative z-10">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent mb-2">Brickearner</h1>
                <p className="text-gray-400">
                  {isRegistering ? "Create a new account" : "Welcome back, earner"}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Email Address</label>
                    <input 
                        type="email" 
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-background border border-surfaceLight rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                        placeholder="you@example.com"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
                    <input 
                        type="password" 
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-background border border-surfaceLight rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                        placeholder="••••••••"
                        minLength={6}
                    />
                </div>

                {/* Referral Code Input - Only visible during registration */}
                {isRegistering && (
                    <div className="animate-fade-in">
                        <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-2">
                            Referral Code <span className="text-gray-500 text-xs">(Optional)</span>
                        </label>
                        <div className="relative">
                            <input 
                                type="text" 
                                value={referralCode}
                                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                                className="w-full bg-background border border-surfaceLight rounded-xl px-4 py-3 pl-10 text-white placeholder-gray-600 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition-all uppercase tracking-widest font-mono"
                                placeholder="CODE123"
                                maxLength={8}
                            />
                            <Gift className="absolute left-3 top-3.5 text-green-500" size={18} />
                        </div>
                        <p className="text-[10px] text-green-500/80 mt-1 ml-1">Enter a code to get a sign-up bonus!</p>
                    </div>
                )}
                
                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-primary hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-primary/25 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Processing...' : (isRegistering ? 'Create Account' : 'Log In')}
                </button>
            </form>

            <div className="mt-6 text-center">
                <p className="text-sm text-gray-400">
                    {isRegistering ? "Already have an account?" : "Don't have an account?"}
                    <button 
                        onClick={() => { setIsRegistering(!isRegistering); setReferralCode(''); }}
                        className="ml-2 text-primary font-bold hover:underline"
                    >
                        {isRegistering ? "Log In" : "Sign Up"}
                    </button>
                </p>
            </div>
            
            <div className="mt-8 text-center text-xs text-gray-600">
                <p>Protected by Firebase Authentication</p>
            </div>
        </div>
    </div>
  );
};
