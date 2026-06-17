import { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import { Link } from 'react-router-dom';

function DonorDashboard() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/requests`);
      if (!response.ok) {
        throw new Error('Failed to load blood requests.');
      }
      const data = await response.json();
      setRequests(data);
    } catch (err) {
      setError(err.message || 'Error loading data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // Medical Blood Compatibility Check
  // checkCompatibility(donor, recipient)
  const checkCompatibility = (donor, recipient) => {
    if (!donor || !recipient) return false;
    const compatibilityMap = {
      'O-': ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'],
      'O+': ['O+', 'A+', 'B+', 'AB+'],
      'A-': ['A+', 'A-', 'AB+', 'AB-'],
      'A+': ['A+', 'AB+'],
      'B-': ['B+', 'B-', 'AB+', 'AB-'],
      'B+': ['B+', 'AB+'],
      'AB-': ['AB+', 'AB-'],
      'AB+': ['AB+']
    };
    return compatibilityMap[donor]?.includes(recipient) || false;
  };

  // Filter requests that are Pending
  const pendingRequests = requests.filter(r => r.status === 'Pending');

  // Filter requests compatible with donor's blood type
  const compatibleRequests = pendingRequests.filter(req => 
    checkCompatibility(user?.bloodType, req.bloodTypeRequired)
  );

  // Filter critical/emergency requests compatible with donor's blood type
  const criticalCompatible = compatibleRequests.filter(req => req.urgency === 'Critical');

  // Other active requests (not directly compatible or different blood types)
  const otherRequests = pendingRequests.filter(req => 
    !checkCompatibility(user?.bloodType, req.bloodTypeRequired)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 pt-28 pb-16 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
          <div>
            <span className="px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold rounded-full uppercase tracking-wider">
              Donor Portal
            </span>
            <h1 className="text-3xl font-black text-slate-100 mt-2">
              Welcome back, {user?.name || 'Donor'}!
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Your registered blood type is <strong className="text-red-500 font-extrabold">{user?.bloodType || 'O+'}</strong>, located in <strong>{user?.location || 'Unknown'}</strong>.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
            <div className="relative flex items-center justify-center h-14 w-14 rounded-full bg-red-500/10 border-2 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)] font-black text-2xl text-red-500">
              {user?.bloodType || 'O+'}
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Compatibility Status</p>
              <p className="text-sm font-semibold text-emerald-400">Ready to Donate</p>
            </div>
          </div>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md relative overflow-hidden">
            <div className="absolute right-4 top-4 text-emerald-500/10 text-5xl">❤️</div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Compatible Requests</p>
            <p className="text-3xl font-black text-emerald-400">{compatibleRequests.length}</p>
            <p className="text-xs text-slate-500 mt-2">Active patients you can save today</p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md relative overflow-hidden">
            <div className="absolute right-4 top-4 text-red-500/10 text-5xl">🚨</div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Critical Matches</p>
            <p className="text-3xl font-black text-rose-500 flex items-center gap-2">
              {criticalCompatible.length}
              {criticalCompatible.length > 0 && (
                <span className="h-2 w-2 bg-red-500 rounded-full inline-block animate-ping"></span>
              )}
            </p>
            <p className="text-xs text-slate-500 mt-2">Emergency alerts matching your type</p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md relative overflow-hidden">
            <div className="absolute right-4 top-4 text-slate-500/10 text-5xl">🩸</div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Total Active Demand</p>
            <p className="text-3xl font-black text-slate-300">{pendingRequests.length}</p>
            <p className="text-xs text-slate-500 mt-2">Requests across all blood types</p>
          </div>
        </div>

        {/* Call to Action for critical matches */}
        {criticalCompatible.length > 0 && (
          <div className="mb-10 p-6 bg-gradient-to-r from-red-950/60 to-slate-900/60 border border-red-500/30 rounded-2xl backdrop-blur-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-[0_0_25px_rgba(239,68,68,0.1)]">
            <div className="flex items-center gap-3">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              <div>
                <h2 className="text-lg font-bold text-red-400">Emergency Match Alert!</h2>
                <p className="text-slate-300 text-sm mt-0.5">
                  There are {criticalCompatible.length} critical emergency requests looking for blood type {user?.bloodType}. Your response could save a life right now!
                </p>
              </div>
            </div>
            <a href="#urgent-matches" className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-lg transition-all hover:scale-105">
              Respond Now
            </a>
          </div>
        )}

        {/* Main Sections layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Column 1 & 2: Matches list */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Direct Matches Section */}
            <div id="urgent-matches">
              <h2 className="text-2xl font-black text-slate-100 mb-6 flex items-center gap-2">
                <span className="text-red-500">🩸</span> Compatible Matches for You
              </h2>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 bg-white/5 border border-white/5 rounded-2xl">
                  <svg className="animate-spin h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <p className="text-xs text-slate-400">Finding compatible requests...</p>
                </div>
              ) : error ? (
                <p className="text-red-400 text-sm p-4 bg-red-500/10 rounded-xl">{error}</p>
              ) : compatibleRequests.length === 0 ? (
                <div className="text-center py-12 bg-white/5 border border-white/15 rounded-2xl p-6">
                  <p className="text-slate-400 text-base font-semibold mb-1">No Matching Demands</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Currently, there are no active blood requests looking for blood types you can donate to.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {compatibleRequests.map(req => {
                    const isCritical = req.urgency === 'Critical';
                    const isHigh = req.urgency === 'High';
                    
                    return (
                      <div 
                        key={req._id}
                        className={`rounded-2xl p-5 border transition-all duration-300 hover:-translate-y-1 ${
                          isCritical
                            ? 'bg-gradient-to-br from-red-950/30 via-slate-900 to-slate-900/90 border-red-500/70 shadow-[0_4px_15px_rgba(239,68,68,0.15)]'
                            : 'bg-white/5 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2 mb-3">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full tracking-wide uppercase ${
                            isCritical 
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                              : isHigh 
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                              : 'bg-slate-700/30 text-slate-400'
                          }`}>
                            {req.urgency} Urgency
                          </span>
                          <span className="text-xs text-slate-400">
                            Needs {req.unitsRequired} {req.unitsRequired > 1 ? 'units' : 'unit'}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 mb-4">
                          <div className="h-10 w-10 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center font-black text-red-500 text-base">
                            {req.bloodTypeRequired}
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-200">{req.patientName}</h3>
                            <p className="text-[11px] text-slate-500">{new Date(req.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>

                        <div className="space-y-1.5 text-xs text-slate-400 mb-4 border-t border-slate-800/80 pt-3">
                          <p className="flex items-center gap-1.5">
                            <span className="text-slate-500 font-medium">Hospital:</span> {req.hospitalName}
                          </p>
                          <p className="flex items-center gap-1.5">
                            <span className="text-slate-500 font-medium">Location:</span> {req.hospitalLocation}
                          </p>
                          <p className="flex items-center gap-1.5">
                            <span className="text-slate-500 font-medium">Contact:</span> 
                            <a href={`tel:${req.contactNumber}`} className="text-red-400 hover:underline">{req.contactNumber}</a>
                          </p>
                        </div>

                        <a 
                          href={`tel:${req.contactNumber}`}
                          className={`block w-full py-2 rounded-xl text-xs font-semibold text-center transition ${
                            isCritical 
                              ? 'bg-red-600 hover:bg-red-700 text-white' 
                              : 'bg-white/10 hover:bg-white/15 text-slate-200'
                          }`}
                        >
                          Donate & Save Life
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Other Requests Section */}
            <div>
              <h2 className="text-xl font-bold text-slate-200 mb-4">
                Other Active Demands
              </h2>
              {loading ? null : otherRequests.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No other requests active.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-75 hover:opacity-100 transition-opacity duration-300">
                  {otherRequests.map(req => (
                    <div key={req._id} className="rounded-2xl p-4 bg-white/5 border border-white/5 hover:border-white/15 transition-all">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                          {req.urgency} Urgency
                        </span>
                        <span className="text-xs text-slate-500">Needs {req.unitsRequired} U</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-400 text-sm">
                          {req.bloodTypeRequired}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-slate-300">{req.patientName}</h4>
                          <p className="text-[10px] text-slate-500">{req.hospitalName}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Column 3: Sidebar Details */}
          <div className="space-y-6">
            
            {/* Donor Quick Tips */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <h3 className="text-lg font-bold text-slate-200 mb-4">Donor Guidelines</h3>
              <ul className="space-y-3.5 text-xs text-slate-400">
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-500 font-bold mt-0.5">✓</span>
                  <span>Ensure you are well-hydrated and have had a healthy meal before donating.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-500 font-bold mt-0.5">✓</span>
                  <span>Carry a valid photo ID card (Driver's License, Govt ID) to the hospital.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-500 font-bold mt-0.5">✓</span>
                  <span>Keep a gap of at least 8 to 12 weeks between successive blood donations.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-500 font-bold mt-0.5">✓</span>
                  <span>Avoid strenuous physical activity or heavy lifting for the rest of the day after donating.</span>
                </li>
              </ul>
            </div>

            {/* General Requests Navigation */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-red-950/20 to-slate-900/40 border border-white/10 backdrop-blur-md text-center">
              <h3 className="font-bold text-slate-200 mb-2">Need to request blood?</h3>
              <p className="text-xs text-slate-400 mb-4">
                If you or a family member needs blood, you can submit a request directly to the community database.
              </p>
              <Link 
                to="/blood-request" 
                className="inline-block w-full py-2.5 bg-red-600/20 border border-red-500/30 hover:bg-red-600/30 text-red-300 rounded-xl text-xs font-semibold transition"
              >
                Go to Requests Dashboard
              </Link>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

export default DonorDashboard;
