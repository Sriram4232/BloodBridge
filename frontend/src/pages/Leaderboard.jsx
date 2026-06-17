import { useState, useEffect } from 'react';
import { API_URL } from '../context/AuthContext';

function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/users/leaderboard`);
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard details.');
      }
      const data = await response.json();
      setLeaderboard(data);
      setError('');
    } catch (err) {
      setError(err.message || 'Error loading leaderboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const getBadgeStyle = (badge) => {
    switch (badge?.toLowerCase()) {
      case 'gold':
        return 'bg-amber-400/20 text-amber-300 border border-amber-400/30 shadow-[0_0_10px_rgba(251,191,36,0.2)]';
      case 'silver':
        return 'bg-slate-350/20 text-slate-300 border border-slate-300/30';
      case 'bronze':
        return 'bg-orange-600/20 text-orange-400 border border-orange-500/30';
      default:
        return 'bg-slate-800 text-slate-500 border border-slate-700/50';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 pt-28 pb-16 px-4 md:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <span className="px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold rounded-full uppercase tracking-wider">
            🏆 Global Recognition
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-red-400 via-pink-500 to-red-600 bg-clip-text text-transparent mt-3 mb-4">
            BloodBridge Honor Leaderboard
          </h1>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            Honoring our top active donors. Every point represents emergency responses, saved lives, and volunteer coordination.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col justify-center items-center py-20 gap-4 bg-white/5 border border-white/10 rounded-2xl">
            <svg className="animate-spin h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-slate-400 text-sm">Loading Honor Roll...</p>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center text-red-400 max-w-xl mx-auto my-10">
            <p className="font-semibold mb-2">Error Loading Leaderboard</p>
            <p className="text-xs">{error}</p>
            <button onClick={fetchLeaderboard} className="mt-4 py-2 px-4 bg-red-500 hover:bg-red-600 rounded-xl text-white text-xs font-semibold transition">
              Retry
            </button>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/30 border border-slate-800/80 rounded-2xl">
            <div className="text-5xl mb-4">👑</div>
            <p className="text-lg font-bold text-slate-300">No Donors Listed Yet</p>
            <p className="text-slate-500 text-sm mt-1">Be the first to donate and claim rank #1!</p>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-4 px-6 text-center w-16">Rank</th>
                    <th className="py-4 px-6">Donor Name</th>
                    <th className="py-4 px-6">City</th>
                    <th className="py-4 px-6 text-center">Donations</th>
                    <th className="py-4 px-6 text-center">Badges</th>
                    <th className="py-4 px-6 text-right">Reward Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-sm">
                  {leaderboard.map((donor, idx) => {
                    const isTop3 = idx < 3;
                    const rankMedal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;
                    
                    return (
                      <tr key={donor._id} className={`hover:bg-white/2 transition duration-150 ${isTop3 ? 'bg-gradient-to-r from-red-500/5 to-transparent' : ''}`}>
                        <td className="py-4 px-6 text-center font-bold text-base">
                          {rankMedal ? (
                            <span className="text-2xl">{rankMedal}</span>
                          ) : (
                            <span className="text-slate-500 font-bold">#{idx + 1}</span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-200">{donor.name}</span>
                            {donor.isEmergencyHero && (
                              <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-full animate-pulse">
                                🚨 Hero
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-slate-450 font-medium">
                          {donor.cityName || 'Uppalaguptam'}
                        </td>
                        <td className="py-4 px-6 text-center text-slate-300 font-semibold">
                          {donor.donationsCount || 0}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${getBadgeStyle(donor.badge)}`}>
                            {donor.badge === 'none' ? 'None' : donor.badge}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right font-black text-red-500 text-base">
                          {donor.rewardPoints || 0} pts
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Leaderboard;
