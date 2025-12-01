import React, { useState } from 'react';
import { useUser } from '../context/UserContext';
import { dataService } from '../services/firebase';
import { Clock } from '../components/Icons';
import { useToast } from '../context/ToastContext';

const PaymentMethod = ({ name, icon, selected, onClick }: any) => (
  <div 
    onClick={onClick}
    className={`relative p-4 rounded-2xl border cursor-pointer transition-all ${
        selected 
        ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(79,70,229,0.3)]' 
        : 'bg-surface border-surfaceLight hover:border-gray-600'
    }`}
  >
    <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-xl">
            {icon}
        </div>
        <span className="font-semibold text-white">{name}</span>
    </div>
    {selected && (
        <div className="absolute top-2 right-2 w-3 h-3 bg-primary rounded-full shadow-lg shadow-primary"></div>
    )}
  </div>
);

export const Cashout: React.FC = () => {
  const { user, refreshUser } = useUser();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'PAYPAL' | 'CRYPTO'>('PAYPAL');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);

    const val = parseFloat(amount);
    if (val <= 0) {
        showToast("Invalid withdrawal amount", "error");
        setLoading(false);
        return;
    }
    if (val > (user.balance || 0)) {
        showToast("Insufficient balance for this request", "error");
        setLoading(false);
        return;
    }

    try {
        await dataService.requestWithdrawal(val, method);
        showToast("Withdrawal requested successfully!", "success");
        setAmount('');
        refreshUser();
    } catch (err: any) {
        // Global error handler usually catches this, but local catch ensures loading state is reset
        showToast(err.message || "Failed to request withdrawal", "error");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center py-6">
        <p className="text-gray-400 mb-2">Available Balance</p>
        <h1 className="text-5xl font-bold text-white tracking-tight">
            ₿ {(user?.balance || 0).toFixed(5)}
        </h1>
        <p className="text-sm text-gray-500 mt-2">≈ ${(user?.balance || 0).toFixed(2)} USD</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <PaymentMethod 
            name="PayPal" 
            icon="🅿️" 
            selected={method === 'PAYPAL'} 
            onClick={() => setMethod('PAYPAL')} 
        />
        <PaymentMethod 
            name="Bitcoin" 
            icon="₿" 
            selected={method === 'CRYPTO'} 
            onClick={() => setMethod('CRYPTO')} 
        />
      </div>

      <form onSubmit={handleWithdraw} className="bg-surface border border-surfaceLight rounded-3xl p-6 space-y-6">
         <div>
            <label className="block text-sm text-gray-400 mb-2">Withdrawal Amount</label>
            <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <input 
                    type="number" 
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-background border border-surfaceLight rounded-xl py-4 pl-8 pr-4 text-white text-lg focus:outline-none focus:border-primary transition-colors"
                    placeholder="0.00"
                />
            </div>
         </div>

         <button 
            type="submit"
            disabled={loading || !amount}
            className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg shadow-primary/25 transition-all ${
                loading || !amount
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-primary hover:bg-indigo-500 text-white active:scale-95'
            }`}
         >
            {loading ? 'Processing...' : 'Withdraw Funds'}
         </button>
      </form>

      <div className="mt-8">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Clock size={18} className="text-gray-400" />
            Recent Transactions
        </h3>
        <div className="space-y-3">
             <div className="bg-surface/50 border border-surfaceLight rounded-xl p-4 flex justify-between items-center">
                 <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center">↓</div>
                     <div>
                         <p className="font-semibold text-sm">Reward: Goblin Miner</p>
                         <p className="text-xs text-gray-500">Today, 10:23 AM</p>
                     </div>
                 </div>
                 <span className="text-green-500 font-bold">+14.50</span>
             </div>
             {/* Mock placeholder */}
             <div className="bg-surface/50 border border-surfaceLight rounded-xl p-4 flex justify-between items-center opacity-60">
                 <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center">↑</div>
                     <div>
                         <p className="font-semibold text-sm">Withdrawal: PayPal</p>
                         <p className="text-xs text-gray-500">Yesterday</p>
                     </div>
                 </div>
                 <span className="text-white font-bold">-50.00</span>
             </div>
        </div>
      </div>
    </div>
  );
};