import { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function Rewards() {
  const { user, setUser, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newVoucher, setNewVoucher] = useState('');

  // Persistent vouchers state
  const [vouchersList, setVouchersList] = useState([]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (refreshUser) {
      refreshUser();
    }
    // Load local vouchers list
    const stored = localStorage.getItem(`vouchers_${user._id}`);
    if (stored) {
      setVouchersList(JSON.parse(stored));
    }
  }, [user, navigate]);

  const handleRedeem = async (privilegeType, cost) => {
    setError('');
    setSuccess('');
    setNewVoucher('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/users/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ privilegeType })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to redeem privilege.');
      }

      setSuccess(`Voucher successfully redeemed! ${cost} points deducted.`);
      setNewVoucher(data.voucherCode);

      // Create new voucher item
      const newVoucherItem = {
        code: data.voucherCode,
        type: privilegeType,
        cost,
        date: new Date().toLocaleDateString()
      };

      const updatedList = [newVoucherItem, ...vouchersList];
      setVouchersList(updatedList);
      localStorage.setItem(`vouchers_${user._id}`, JSON.stringify(updatedList));

      // Update auth context profile
      const updatedUser = { ...user, rewardPoints: data.newPointsBalance };
      localStorage.setItem('bloodbridge_user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (err) {
      setError(err.message || 'Error executing redemption.');
    } finally {
      setLoading(false);
    }
  };

  const getNextBadgeProgress = () => {
    const points = user?.rewardPoints || 0;
    if (points < 10) return { next: 'Bronze', target: 10, needed: 10 - points, pct: (points / 10) * 100 };
    if (points < 35) return { next: 'Silver', target: 35, needed: 35 - points, pct: ((points - 10) / 25) * 100 };
    if (points < 75) return { next: 'Gold', target: 75, needed: 75 - points, pct: ((points - 35) / 40) * 100 };
    return { next: 'Max Tier', target: 75, needed: 0, pct: 100 };
  };

  const badgeProgress = getNextBadgeProgress();

  const getBadgeStyle = (badge) => {
    switch (badge?.toLowerCase()) {
      case 'gold':
        return 'text-amber-400 font-extrabold drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]';
      case 'silver':
        return 'text-slate-300 font-extrabold';
      case 'bronze':
        return 'text-orange-500 font-extrabold';
      default:
        return 'text-slate-500 font-bold';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 pt-28 pb-16 px-4 md:px-8">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Top Header */}
        <div className="text-center">
          <span className="px-3.5 py-1 bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold rounded-full uppercase tracking-wider">
            🎁 Lifesaver Rewards Store
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-red-400 via-rose-500 to-red-600 bg-clip-text text-transparent mt-3 mb-2">
            Redeem Medical Privileges
          </h1>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            Your voluntary blood donations earn honor points. Redeem them below for consultations, blood tests, and booking priority.
          </p>
        </div>

        {/* Top Row: Balance and Progress Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Balance Card */}
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl relative overflow-hidden flex flex-col justify-between shadow-xl">
            <div className="absolute right-4 top-4 text-6xl text-red-500/10 pointer-events-none font-black select-none">🩸</div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Your Balance</p>
              <h2 className="text-5xl font-black text-red-500 tracking-tight">{user?.rewardPoints || 0}</h2>
              <p className="text-xs text-slate-400 mt-1">Accumulated Honor Points</p>
            </div>
            
            <div className="border-t border-slate-800/80 pt-4 mt-6 flex justify-between items-center text-xs">
              <div>
                <p className="text-slate-500 font-bold uppercase">Badge Tier</p>
                <p className={`mt-0.5 uppercase ${getBadgeStyle(user?.badge)}`}>
                  {user?.badge === 'none' ? 'BRONZE ELIGIBLE' : user?.badge}
                </p>
              </div>
              <div className="text-right">
                <p className="text-slate-500 font-bold uppercase">Lives Saved</p>
                <p className="mt-0.5 font-bold text-slate-200">{user?.donationsCount || 0} Donations</p>
              </div>
            </div>
          </div>

          {/* Badge Progress Card */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl flex flex-col justify-between shadow-xl">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Badge Progress Tracker</p>
              <h3 className="text-lg font-bold text-slate-200">
                {badgeProgress.needed > 0 ? (
                  <span>Earn <strong className="text-red-400 font-extrabold">{badgeProgress.needed} more</strong> point(s) to achieve <strong className="text-amber-400 font-extrabold">{badgeProgress.next} Badge</strong></span>
                ) : (
                  <span>You have reached the maximum <strong className="text-amber-400 font-extrabold">Gold Badge</strong>! 👑</span>
                )}
              </h3>
              
              {/* Progress Bar */}
              <div className="w-full bg-slate-800 h-3 rounded-full mt-4 overflow-hidden relative">
                <div 
                  className="bg-gradient-to-r from-red-500 via-rose-500 to-amber-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${badgeProgress.pct}%` }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t border-slate-800/80 text-center text-[10px] text-slate-450 font-bold">
              <div>
                <p className="text-xs text-orange-500">10 Pts</p>
                <p className="mt-0.5">BRONZE BADGE</p>
              </div>
              <div>
                <p className="text-xs text-slate-300">35 Pts</p>
                <p className="mt-0.5">SILVER BADGE</p>
              </div>
              <div>
                <p className="text-xs text-amber-400">75 Pts</p>
                <p className="mt-0.5">GOLD BADGE</p>
              </div>
            </div>
          </div>
        </div>

        {/* Privilege Redemption Grid */}
        <div>
          <h3 className="text-2xl font-black text-slate-100 mb-6">Choose Privilege Vouchers</h3>
          
          {success && (
            <div className="mb-6 p-4 bg-emerald-500/20 border border-emerald-500/50 rounded-xl text-emerald-300 text-sm flex flex-col items-center justify-center text-center">
              <span>{success}</span>
              {newVoucher && (
                <div className="mt-2 font-mono font-bold bg-black/50 p-2.5 rounded-lg border border-emerald-500/30 text-sm tracking-widest select-all">
                  {newVoucher}
                </div>
              )}
            </div>
          )}
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300 text-sm">
              <span>⚠️ {error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Consultation */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col justify-between shadow-lg hover:border-white/20 transition">
              <div>
                <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded text-[9px] font-bold uppercase tracking-wider">Digital consultation</span>
                <h4 className="text-lg font-black text-slate-200 mt-2">Free Online Doctor Consultation</h4>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Get a free 20-minute online video/chat consultation with partner general physicians. Includes digital prescription.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800/80 flex justify-between items-center">
                <span className="text-red-400 font-black text-lg">15 Points</span>
                <button
                  onClick={() => handleRedeem('consultation', 15)}
                  disabled={loading || (user?.rewardPoints || 0) < 15}
                  className="py-2 px-4 bg-red-600 hover:bg-red-700 disabled:opacity-35 disabled:hover:bg-red-600 text-white text-xs font-semibold rounded-xl transition"
                >
                  Redeem Voucher
                </button>
              </div>
            </div>

            {/* Diagnostics */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col justify-between shadow-lg hover:border-white/20 transition">
              <div>
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[9px] font-bold uppercase tracking-wider">Lab diagnostics</span>
                <h4 className="text-lg font-black text-slate-200 mt-2">50% Off Diagnostic Blood Test</h4>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Redeem 50% discount voucher on essential health checks and pathologial blood profile tests at verified labs.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800/80 flex justify-between items-center">
                <span className="text-red-400 font-black text-lg">30 Points</span>
                <button
                  onClick={() => handleRedeem('test', 30)}
                  disabled={loading || (user?.rewardPoints || 0) < 30}
                  className="py-2 px-4 bg-red-600 hover:bg-red-700 disabled:opacity-35 disabled:hover:bg-red-600 text-white text-xs font-semibold rounded-xl transition"
                >
                  Redeem Voucher
                </button>
              </div>
            </div>

            {/* Priority Booking */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col justify-between shadow-lg hover:border-white/20 transition">
              <div>
                <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded text-[9px] font-bold uppercase tracking-wider">Priority Booking</span>
                <h4 className="text-lg font-black text-slate-200 mt-2">Priority Hospital Booking</h4>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Enables priority check-in and queue placement for non-emergency clinical bookings at partner network hospitals.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800/80 flex justify-between items-center">
                <span className="text-red-400 font-black text-lg">50 Points</span>
                <button
                  onClick={() => handleRedeem('booking', 50)}
                  disabled={loading || (user?.rewardPoints || 0) < 50}
                  className="py-2 px-4 bg-red-600 hover:bg-red-700 disabled:opacity-35 disabled:hover:bg-red-600 text-white text-xs font-semibold rounded-xl transition"
                >
                  Redeem Voucher
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Redeemed Vouchers List */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl">
          <h3 className="text-xl font-bold text-slate-200 mb-4 flex items-center gap-2">
            🎫 Your Active Voucher Coupons
          </h3>
          
          {vouchersList.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-4 text-center">No vouchers redeemed yet. Earn points by donating blood and redeem them!</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vouchersList.map((voucherItem, idx) => (
                <div key={idx} className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl flex justify-between items-center gap-4">
                  <div>
                    <h5 className="text-xs font-bold uppercase text-slate-350">
                      {voucherItem.type === 'consultation' ? '🩺 Doctor Consultation Voucher' : voucherItem.type === 'test' ? '🧪 Diagnostics 50% Off Lab Test' : '🏥 Priority Hospital Booking'}
                    </h5>
                    <p className="text-[10px] text-slate-500 mt-0.5">Redeemed on {voucherItem.date} for {voucherItem.cost} pts</p>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-1.5 font-mono font-bold bg-black/40 text-emerald-400 text-xs border border-emerald-500/20 rounded select-all tracking-wider">
                      {voucherItem.code}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default Rewards;
