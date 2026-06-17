import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import homeBg from '../assets/home_bg.mp4';
import { API_URL } from '../context/AuthContext';

function Home() {
  const [criticalRequests, setCriticalRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCriticalRequests = async () => {
      try {
        const response = await fetch(`${API_URL}/api/requests`);
        if (response.ok) {
          const data = await response.json();
          // Filter to only get Pending requests with Critical urgency
          const critical = data.filter(req => req.urgency === 'Critical' && req.status === 'Pending');
          setCriticalRequests(critical);
        }
      } catch (err) {
        console.error('Failed to fetch emergency requests:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCriticalRequests();
  }, []);

  return (
    <div className="relative min-h-screen text-white flex flex-col items-center justify-center pt-24 px-4 md:px-8 pb-16">
      {/* Background Video */}
      <video 
        autoPlay 
        loop 
        muted 
        playsInline 
        className="fixed inset-0 w-full h-full object-cover z-0 pointer-events-none"
      >
        <source src={homeBg} type="video/mp4" />
      </video>
      
      {/* Dark tint overlay */}
      <div className="fixed inset-0 bg-black/60 z-0"></div>

      {/* Main Grid Content */}
      <div className="relative z-10 max-w-7xl w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center my-auto">
        
        {/* Left Side: Hero Info */}
        <div className="lg:col-span-7 text-left space-y-6">
          <span className="px-3.5 py-1 bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold rounded-full uppercase tracking-wider">
            Saves Lives Together
          </span>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight leading-none bg-gradient-to-r from-red-400 via-rose-500 to-red-600 bg-clip-text text-transparent">
            Welcome to BloodBridge
          </h1>
          <p className="text-slate-300 text-lg md:text-xl font-medium max-w-2xl leading-relaxed">
            Connecting donors to patients in real time. Register to donate and save lives, or submit a request to get quick assistance when in need.
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <Link 
              to="/blood-request" 
              className="py-3.5 px-6 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold rounded-xl shadow-lg transition duration-200 hover:-translate-y-0.5"
            >
              Find Matches / Request Blood
            </Link>
            <Link 
              to="/login" 
              className="py-3.5 px-6 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold rounded-xl transition duration-200 hover:-translate-y-0.5"
            >
              Donate / Join Network
            </Link>
          </div>
        </div>

        {/* Right Side: Critical Emergencies Widget */}
        <div className="lg:col-span-5 w-full">
          <div className="backdrop-blur-xl bg-white/5 border border-white/15 rounded-2xl p-6 shadow-2xl flex flex-col max-h-[70vh]">
            
            <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-4">
              <h2 className="text-lg font-black text-rose-400 flex items-center gap-2">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                Live Emergency Alerts
              </h2>
              <span className="text-xs font-semibold px-2 py-0.5 bg-red-500/20 text-red-300 border border-red-500/20 rounded-md">
                {criticalRequests.length} Active
              </span>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <svg className="animate-spin h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <p className="text-xs text-slate-400">Syncing live alerts...</p>
              </div>
            ) : criticalRequests.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <div className="text-4xl">🕊️</div>
                <p className="font-bold text-slate-200">No Critical Requests</p>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  All quiet on the emergency front. Thank you to our donors for keeping the community safe!
                </p>
              </div>
            ) : (
              <div className="overflow-y-auto space-y-4 pr-1 scrollbar-thin">
                {criticalRequests.map(req => (
                  <div 
                    key={req._id}
                    className="p-4 bg-red-950/20 border border-red-500/25 hover:border-red-500/40 rounded-xl relative overflow-hidden transition-all duration-300 shadow-[0_4px_12px_rgba(239,68,68,0.08)] flex justify-between gap-4"
                  >
                    <div className="space-y-2">
                      <div>
                        <h4 className="font-bold text-slate-100 text-sm leading-snug">{req.patientName}</h4>
                        <p className="text-[11px] text-slate-400 flex items-center gap-1">
                          <span>{req.hospitalName}</span>
                          <span>•</span>
                          <span>{req.hospitalLocation}</span>
                        </p>
                      </div>

                      <div className="text-[11px] text-slate-400">
                        Units Required: <strong className="text-red-400 font-extrabold">{req.unitsRequired}</strong>
                      </div>

                      <a 
                        href={`tel:${req.contactNumber}`}
                        className="inline-flex items-center gap-1.5 py-1 px-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-[10px] transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        Call Contact
                      </a>
                    </div>

                    <div className="flex flex-col items-center justify-center">
                      <div className="relative flex items-center justify-center h-12 w-12 rounded-full bg-red-500/10 border border-red-500/40 text-red-500 font-black text-lg shadow-[0_0_8px_rgba(239,68,68,0.15)]">
                        {req.bloodTypeRequired}
                      </div>
                      <span className="text-[8px] uppercase tracking-wider text-red-400 font-extrabold mt-1.5 animate-pulse">
                        Urgent
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
          </div>
        </div>

      </div>
    </div>
  );
}

export default Home;
