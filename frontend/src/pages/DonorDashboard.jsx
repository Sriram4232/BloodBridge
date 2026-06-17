import { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import { Link } from 'react-router-dom';

function DonorDashboard() {
  const { user, setUser, refreshUser } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Alerts states
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Redeeming state
  const [redeemSuccess, setRedeemSuccess] = useState('');
  const [redeemError, setRedeemError] = useState('');
  const [voucher, setVoucher] = useState('');

  // Certificate Modal State
  const [isCertOpen, setIsCertOpen] = useState(false);

  // Health Profile Personalization & Document upload states
  const [hasHealthIssues, setHasHealthIssues] = useState(user?.hasHealthIssues || false);
  const [healthIssuesDetails, setHealthIssuesDetails] = useState(user?.healthIssuesDetails || '');
  const [isUploading, setIsUploading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Sync state when user profile changes
  useEffect(() => {
    if (user) {
      setHasHealthIssues(user.hasHealthIssues || false);
      setHealthIssuesDetails(user.healthIssuesDetails || '');
    }
  }, [user]);

  const handleSaveHealthProfile = async () => {
    setProfileSuccess('');
    setProfileError('');
    try {
      const response = await fetch(`${API_URL}/api/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({
          hasHealthIssues,
          healthIssuesDetails
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update health personalization.');
      }
      setProfileSuccess('Health personalization updated successfully.');
      if (refreshUser) {
        await refreshUser();
      }
    } catch (err) {
      setProfileError(err.message);
    }
  };

  const handleDocumentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setProfileSuccess('');
    setProfileError('');
    setIsUploading(true);

    // Simulate file upload progress
    setTimeout(async () => {
      try {
        const mockFilename = `Aadhar_${user?.name.replace(/\s+/g, '_')}_Verified.pdf`;
        const response = await fetch(`${API_URL}/api/users/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user?.token}`
          },
          body: JSON.stringify({
            verificationDocument: mockFilename
          })
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Failed to submit verification document.');
        }
        setProfileSuccess('Document uploaded and account verified/unfrozen successfully!');
        if (refreshUser) {
          await refreshUser();
        }
      } catch (err) {
        setProfileError(err.message);
      } finally {
        setIsUploading(false);
      }
    }, 1500);
  };


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
    if (refreshUser) {
      refreshUser();
    }
  }, []);

  const handleScheduleDonation = async (reqId) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const response = await fetch(`${API_URL}/api/requests/${reqId}/donate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to schedule donation.');
      }
      setSuccessMsg('Donation scheduled successfully! Please coordinate details with the hospital.');
      fetchRequests();
      if (refreshUser) {
        refreshUser();
      }
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleRedeem = async (privilegeType) => {
    setRedeemError('');
    setRedeemSuccess('');
    setVoucher('');
    try {
      const response = await fetch(`${API_URL}/api/users/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({ privilegeType })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to redeem.');
      }
      setRedeemSuccess(data.message);
      setVoucher(data.voucherCode);

      // Update context and local storage
      const updatedUser = { ...user, rewardPoints: data.newPointsBalance };
      localStorage.setItem('bloodbridge_user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (err) {
      setRedeemError(err.message);
    }
  };

  const getRemainingCoolingDays = () => {
    if (!user?.coolingPeriodEnd) return 0;
    const end = new Date(user.coolingPeriodEnd);
    const diff = end - new Date();
    return diff > 0 ? Math.ceil(diff / (24 * 60 * 60 * 1000)) : 0;
  };

  const coolingDays = getRemainingCoolingDays();

  // Medical Blood Compatibility Check
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

  const pendingRequests = requests.filter(r => r.status === 'Pending');

  // Filter requests compatible with donor's blood type
  const compatibleRequests = pendingRequests.filter(req => 
    checkCompatibility(user?.bloodType, req.bloodTypeRequired)
  );

  const criticalCompatible = compatibleRequests.filter(req => req.urgency === 'Critical');

  const otherRequests = pendingRequests.filter(req => 
    !checkCompatibility(user?.bloodType, req.bloodTypeRequired)
  );

  const getBadgeIcon = (badge) => {
    switch (badge?.toLowerCase()) {
      case 'gold':
        return '🥇 Gold Donor';
      case 'silver':
        return '🥈 Silver Donor';
      case 'bronze':
        return '🥉 Bronze Donor';
      default:
        return '🎗️ Volunteer';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 pt-28 pb-16 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Status Alerts */}
        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-500/20 border border-emerald-500/50 rounded-2xl text-emerald-200 text-sm flex items-center gap-2">
            <span>✅ {successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-2xl text-red-200 text-sm flex items-center gap-2">
            <span>⚠️ {errorMsg}</span>
          </div>
        )}

        {/* User Suspended or Frozen Warn */}
        {user?.isFrozen && (
          <div className="mb-6 p-4 bg-amber-500/20 border border-amber-500/50 rounded-2xl text-amber-200 text-sm">
            🔒 <strong>Account Frozen:</strong> Your trust score is low ({user?.trustScore}/100). Account is restricted until verified documentation is submitted.
          </div>
        )}

        {user?.hasHealthIssues && (
          <div className="mb-6 p-4 bg-rose-500/20 border border-rose-500/50 rounded-2xl text-rose-200 text-sm">
            🛡️ <strong>Insurance Account Mode:</strong> Since you registered chronic health conditions, your account is configured as an <strong>insurance/request-only</strong> account. You cannot volunteer for donations.
          </div>
        )}

        {coolingDays > 0 && (
          <div className="mb-6 p-4 bg-blue-500/20 border border-blue-500/50 rounded-2xl text-blue-200 text-sm">
            ❄️ <strong>Donation Cooling Period:</strong> A person cannot donate frequently. Your account is frozen for <strong>{coolingDays} more day(s)</strong>. Thank you for your recent donation!
          </div>
        )}

        {/* Welcome Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10 bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold rounded-full uppercase tracking-wider">
                Donor Portal
              </span>
              <span className="px-3 py-1 bg-amber-400/10 text-amber-400 border border-amber-400/20 text-xs font-bold rounded-full uppercase tracking-wider">
                {getBadgeIcon(user?.badge)}
              </span>
              {user?.isEmergencyHero && (
                <span className="px-3 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-bold rounded-full uppercase tracking-wider animate-pulse">
                  🚨 Emergency Hero
                </span>
              )}
            </div>
            
            <h1 className="text-3xl font-black text-slate-100">
              Welcome back, {user?.name || 'Donor'}!
            </h1>
            
            <p className="text-slate-400 text-sm">
              Your registered blood type is <strong className="text-red-500 font-extrabold">{user?.bloodType || 'O+'}</strong>, located in <strong>{user?.cityName || 'Unknown'}</strong>.
            </p>

            {/* Trust Score Meter */}
            <div className="pt-2 max-w-xs">
              <div className="flex justify-between text-xs text-slate-450 font-bold mb-1">
                <span>Trust Score</span>
                <span className={user?.trustScore >= 75 ? 'text-emerald-400' : 'text-amber-400'}>{user?.trustScore || 100}%</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${user?.trustScore >= 75 ? 'bg-emerald-500' : user?.trustScore >= 40 ? 'bg-amber-500' : 'bg-red-500'}`} 
                  style={{ width: `${user?.trustScore || 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex items-center gap-4 bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
              <div className="relative flex items-center justify-center h-14 w-14 rounded-full bg-red-500/10 border-2 border-red-500/50 font-black text-2xl text-red-500">
                {user?.bloodType || 'O+'}
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Balance</p>
                <p className="text-lg font-black text-red-400">{user?.rewardPoints || 0} Points</p>
              </div>
            </div>

            {user?.donationsCount > 0 && (
              <button 
                onClick={() => setIsCertOpen(true)}
                className="py-3 px-5 text-sm font-semibold rounded-xl text-white bg-slate-850 hover:bg-slate-750 border border-slate-700 transition"
              >
                📜 Certificate
              </button>
            )}
          </div>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Compatible Requests</p>
            <p className="text-3xl font-black text-emerald-400">{compatibleRequests.length}</p>
            <p className="text-xs text-slate-500 mt-2">Active patients you can save today</p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Critical Matches</p>
            <p className="text-3xl font-black text-rose-500 flex items-center gap-2">
              {criticalCompatible.length}
              {criticalCompatible.length > 0 && (
                <span className="h-2 w-2 bg-red-500 rounded-full inline-block animate-ping"></span>
              )}
            </p>
            <p className="text-xs text-slate-500 mt-2">Emergency alerts matching your type</p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Total Donations</p>
            <p className="text-3xl font-black text-slate-350">{user?.donationsCount || 0}</p>
            <p className="text-xs text-slate-500 mt-2">Your historical lives-saved count</p>
          </div>
        </div>

        {/* Main Sections Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Matches List */}
          <div className="lg:col-span-2 space-y-8">
            <div>
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
                    const mapsLink = req.location?.coordinates
                      ? `https://www.google.com/maps/search/?api=1&query=${req.location.coordinates[1]},${req.location.coordinates[0]}`
                      : null;
                    
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
                            Needs {req.unitsRequired} U
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
                          {mapsLink && (
                            <p className="flex items-center gap-1.5">
                              <span className="text-slate-500 font-medium">Map Directions:</span>
                              <a href={mapsLink} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">
                                📍 View Location on Google Maps
                              </a>
                            </p>
                          )}
                          <p className="flex items-center gap-1.5">
                            <span className="text-slate-500 font-medium">Contact:</span> 
                            <a href={`tel:${req.contactNumber}`} className="text-red-400 hover:underline">{req.contactNumber}</a>
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleScheduleDonation(req._id)}
                            disabled={coolingDays > 0 || user?.isFrozen || user?.hasHealthIssues}
                            title={user?.hasHealthIssues ? "Disabled: Registered health conditions prevent blood donation" : ""}
                            className={`w-full py-2.5 rounded-xl text-xs font-semibold text-center transition ${
                              isCritical 
                                ? 'bg-red-600 hover:bg-red-700 text-white' 
                                : 'bg-white/10 hover:bg-white/15 text-slate-200'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            Schedule Donation
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Other Active Demands */}
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

          {/* Sidebar Panels: Redeem Privileges */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-4">
              <h3 className="text-lg font-bold text-slate-200">Redeem Medical Privileges</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Use your hard-earned points to unlock discounts and consultations with partner healthcare networks.
              </p>

              {redeemSuccess && (
                <div className="p-3 bg-emerald-500/20 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs">
                  🎉 {redeemSuccess}
                  {voucher && (
                    <div className="mt-2 font-mono font-bold bg-black/40 p-2 rounded text-center text-sm border border-emerald-500/30">
                      {voucher}
                    </div>
                  )}
                </div>
              )}
              {redeemError && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300 text-xs">
                  ⚠️ {redeemError}
                </div>
              )}

              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                  <div>
                    <h4 className="text-xs font-bold">Free Digital Doctor Consultation</h4>
                    <p className="text-[9px] text-slate-500">Virtual medical checkup voucher</p>
                  </div>
                  <button 
                    onClick={() => handleRedeem('consultation')}
                    disabled={user?.rewardPoints < 15}
                    className="py-1.5 px-3 bg-red-500/20 hover:bg-red-500/35 border border-red-500/30 text-red-300 rounded-lg text-[10px] font-bold transition disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    15 pts
                  </button>
                </div>

                <div className="flex justify-between items-center bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                  <div>
                    <h4 className="text-xs font-bold">50% Off Diagnostic Blood Test</h4>
                    <p className="text-[9px] text-slate-500">Free pathology tests voucher</p>
                  </div>
                  <button 
                    onClick={() => handleRedeem('test')}
                    disabled={user?.rewardPoints < 30}
                    className="py-1.5 px-3 bg-red-500/20 hover:bg-red-500/35 border border-red-500/30 text-red-300 rounded-lg text-[10px] font-bold transition disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    30 pts
                  </button>
                </div>

                <div className="flex justify-between items-center bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                  <div>
                    <h4 className="text-xs font-bold">Priority Hospital Booking</h4>
                    <p className="text-[9px] text-slate-500">Booking privileges for non-emergencies</p>
                  </div>
                  <button 
                    onClick={() => handleRedeem('booking')}
                    disabled={user?.rewardPoints < 50}
                    className="py-1.5 px-3 bg-red-500/20 hover:bg-red-500/35 border border-red-500/30 text-red-300 rounded-lg text-[10px] font-bold transition disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    50 pts
                  </button>
                </div>
              </div>
            </div>

            {/* Profile & Health Verification Card */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-4">
              <h3 className="text-lg font-bold text-slate-200">Profile & Verification</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Configure chronic health conditions or upload medical documents to verify your account status.
              </p>

              {profileSuccess && (
                <div className="p-3 bg-emerald-500/20 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs">
                  ✅ {profileSuccess}
                </div>
              )}
              {profileError && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300 text-xs">
                  ⚠️ {profileError}
                </div>
              )}

              {/* Health Personalization form */}
              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-2 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                  <input 
                    type="checkbox"
                    id="hasHealthIssues"
                    checked={hasHealthIssues}
                    onChange={(e) => {
                      setHasHealthIssues(e.target.checked);
                      if (!e.target.checked) setHealthIssuesDetails('');
                    }}
                    className="mt-1 rounded border-slate-700 bg-slate-950 text-red-500 focus:ring-red-500 focus:ring-offset-slate-900"
                  />
                  <label htmlFor="hasHealthIssues" className="text-xs font-semibold text-slate-350 cursor-pointer select-none">
                    Chronic health conditions (e.g. Diabetes, HIV/AIDS, Sugar, or other issues preventing donation)
                  </label>
                </div>

                {hasHealthIssues && (
                  <div className="space-y-1.5 animate-fadeIn">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Condition Details</label>
                    <textarea
                      value={healthIssuesDetails}
                      onChange={(e) => setHealthIssuesDetails(e.target.value)}
                      placeholder="Please specify (e.g., Type 2 Diabetes, High Sugar level)"
                      className="w-full h-16 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none placeholder-slate-600 focus:border-red-500/30"
                    />
                    <p className="text-[10px] text-rose-400 font-medium italic leading-relaxed">
                      * Note: You will serve as insurance/request-only for future blood requests and won't be listed as a donor.
                    </p>
                  </div>
                )}

                <button
                  onClick={handleSaveHealthProfile}
                  className="w-full py-2.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-300 hover:text-red-200 rounded-xl text-xs font-bold transition shadow-sm"
                >
                  Save Personalization
                </button>
              </div>

              {/* Verification Document Upload */}
              <div className="border-t border-slate-800/80 pt-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Account Verification</h4>
                {user?.verificationDocument ? (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <span>🛡️ Verification Document Attached:</span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400 break-all">{user.verificationDocument}</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[10px] text-slate-500 leading-normal">
                      Upload an Aadhar copy or Medical Certificate to verify status and resolve account freezes.
                    </p>
                    
                    <label className="relative flex flex-col items-center justify-center p-4 border border-dashed border-slate-700 hover:border-slate-500 rounded-xl bg-slate-950/40 cursor-pointer transition">
                      {isUploading ? (
                        <div className="flex flex-col items-center gap-1.5 py-1">
                          <svg className="animate-spin h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span className="text-[10px] font-semibold text-slate-400">Uploading certificate...</span>
                        </div>
                      ) : (
                        <div className="text-center">
                          <span className="text-lg block mb-1">📤</span>
                          <span className="text-[11px] font-bold text-red-400 hover:text-red-300">Upload Aadhar / Medical Certificate</span>
                          <span className="text-[9px] text-slate-500 block mt-0.5">PDF or Image (Max 5MB)</span>
                        </div>
                      )}
                      <input 
                        type="file" 
                        accept=".pdf, image/*"
                        onChange={handleDocumentUpload}
                        disabled={isUploading}
                        className="hidden" 
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>

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

      {/* Recognition Certificate Modal */}
      {isCertOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-2xl w-full text-center relative shadow-2xl">
            <button onClick={() => setIsCertOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white text-xl">✕</button>
            <div className="border-4 border-double border-red-500/50 p-6 rounded-xl bg-slate-950/80 my-4 text-slate-100">
              <h2 className="text-3xl font-serif text-red-500 mb-1">CERTIFICATE OF RECOGNITION</h2>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-6">BloodBridge Lifesaver Network</p>
              
              <p className="text-sm italic text-slate-400">This certificate is proudly presented to</p>
              <p className="text-3xl font-serif font-bold text-red-400 my-4 border-b border-slate-800 pb-2">{user?.name}</p>
              
              <p className="text-xs text-slate-350 max-w-md mx-auto leading-relaxed my-4">
                In grateful recognition of your voluntary contributions as a verified donor, accumulating <strong>{user?.rewardPoints || 0} Honor Points</strong> and helping save lives in emergencies.
              </p>

              <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-slate-800 text-xs">
                <div>
                  <p className="font-bold text-slate-350">{user?.badge?.toUpperCase() === 'NONE' ? 'BRONZE' : user?.badge?.toUpperCase()} DONOR</p>
                  <p className="text-[10px] text-slate-500">Badge Rank</p>
                </div>
                <div>
                  <p className="font-bold text-slate-350">{new Date().toLocaleDateString()}</p>
                  <p className="text-[10px] text-slate-500">Date Issued</p>
                </div>
              </div>
            </div>
            <button onClick={() => window.print()} className="mt-4 py-2.5 px-6 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-650 hover:to-red-700 text-white rounded-xl text-xs font-semibold shadow-md transition">
              Print / Save Certificate
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default DonorDashboard;
