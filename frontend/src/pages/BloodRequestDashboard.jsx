import { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function BloodRequestDashboard() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Accept donation states
  const [donationSuccess, setDonationSuccess] = useState('');
  const [donationError, setDonationError] = useState('');
  const [acceptLoadingId, setAcceptLoadingId] = useState(null);

  const [formData, setFormData] = useState({
    patientName: '',
    bloodTypeRequired: 'O+',
    unitsRequired: 1,
    urgency: 'Normal',
    hospitalName: '',
    hospitalLocation: '',
    contactNumber: '',
    radius: 2,
  });

  // Filter states
  const [bloodFilter, setBloodFilter] = useState('All');
  const [urgencyFilter, setUrgencyFilter] = useState('All');

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/requests`);
      if (!response.ok) {
        throw new Error('Failed to fetch blood requests.');
      }
      const data = await response.json();
      setRequests(data);
      setError('');
    } catch (err) {
      setError(err.message || 'Error loading requests.');
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

  const getRemainingCoolingDays = () => {
    if (!user?.coolingPeriodEnd) return 0;
    const end = new Date(user.coolingPeriodEnd);
    const diff = end - new Date();
    return diff > 0 ? Math.ceil(diff / (24 * 60 * 60 * 1000)) : 0;
  };

  const coolingDays = getRemainingCoolingDays();

  const handleAcceptDonation = async (reqId) => {
    setDonationError('');
    setDonationSuccess('');
    setAcceptLoadingId(reqId);
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
        throw new Error(data.message || 'Failed to accept donation.');
      }
      setDonationSuccess('Donation accepted successfully! The requestee can now verify your donation.');
      fetchRequests();
      if (refreshUser) {
        refreshUser();
      }
    } catch (err) {
      setDonationError(err.message);
    } finally {
      setAcceptLoadingId(null);
    }
  };

  const openForm = (urgencyLevel = 'Normal') => {
    if (!user) {
      navigate('/login');
      return;
    }
    setFormData({
      patientName: '',
      bloodTypeRequired: 'O+',
      unitsRequired: 1,
      urgency: urgencyLevel,
      hospitalName: '',
      hospitalLocation: '',
      contactNumber: '',
      radius: 2,
    });
    setFormError('');
    setFormSuccess('');
    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setFormError('');
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setFormLoading(true);

    // Basic frontend validation
    if (!formData.patientName.trim() || !formData.hospitalName.trim() || !formData.hospitalLocation.trim() || !formData.contactNumber.trim()) {
      setFormError('All fields are required.');
      setFormLoading(false);
      return;
    }

    if (formData.unitsRequired < 1) {
      setFormError('Required units must be at least 1.');
      setFormLoading(false);
      return;
    }

    // Obtain coordinates for the request
    let coordinates = [82.2198, 16.7324]; // Fallback (Uppalaguptam)
    if (user?.location?.coordinates) {
      coordinates = user.location.coordinates;
    }

    const getBrowserCoords = () => {
      return new Promise((resolve) => {
        if (!navigator.geolocation) {
          resolve(null);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (position) => resolve([position.coords.longitude, position.coords.latitude]),
          () => resolve(null),
          { timeout: 3000 }
        );
      });
    };

    const browserCoords = await getBrowserCoords();
    if (browserCoords) {
      coordinates = browserCoords;
    }

    try {
      const response = await fetch(`${API_URL}/api/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          ...formData,
          coordinates,
          radius: Number(formData.radius) || 2
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit request.');
      }

      setFormSuccess('Blood request created successfully!');
      setFormData({
        patientName: '',
        bloodTypeRequired: 'O+',
        unitsRequired: 1,
        urgency: 'Normal',
        hospitalName: '',
        hospitalLocation: '',
        contactNumber: '',
        radius: 2,
      });
      fetchRequests();
      setTimeout(() => {
        setIsModalOpen(false);
      }, 1500);
    } catch (err) {
      setFormError(err.message || 'API request error.');
    } finally {
      setFormLoading(false);
    }
  };

  // Filter requests
  const filteredRequests = requests.filter((req) => {
    const matchesBlood = bloodFilter === 'All' || req.bloodTypeRequired === bloodFilter;
    const matchesUrgency = urgencyFilter === 'All' || req.urgency === urgencyFilter;
    return matchesBlood && matchesUrgency;
  });

  // Sort: Critical (Emergency) first, then high, then normal, then by date (newest first)
  const sortedRequests = [...filteredRequests].sort((a, b) => {
    const urgencyWeight = { 'Critical': 3, 'High': 2, 'Normal': 1 };
    const weightDiff = (urgencyWeight[b.urgency] || 1) - (urgencyWeight[a.urgency] || 1);
    if (weightDiff !== 0) return weightDiff;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const totalCritical = requests.filter(r => r.urgency === 'Critical' && r.status === 'Pending').length;
  const totalPending = requests.filter(r => r.status === 'Pending').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 pt-28 pb-16 px-4 md:px-8">
      {/* Top Banner Dashboard */}
      <div className="max-w-7xl mx-auto">
        {donationSuccess && (
          <div className="mb-6 p-4 bg-emerald-500/20 border border-emerald-500/50 rounded-2xl text-emerald-200 text-sm flex items-center gap-2">
            <span>✅ {donationSuccess}</span>
          </div>
        )}
        {donationError && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-2xl text-red-200 text-sm flex items-center gap-2">
            <span>⚠️ {donationError}</span>
          </div>
        )}
        {user?.isFrozen && (
          <div className="mb-6 p-4 bg-amber-500/20 border border-amber-500/50 rounded-2xl text-amber-200 text-sm">
            🔒 <strong>Account Frozen:</strong> Your trust score is low ({user?.trustScore}/100). Account is restricted until verified documentation is submitted.
          </div>
        )}
        {coolingDays > 0 && (
          <div className="mb-6 p-4 bg-blue-500/20 border border-blue-500/50 rounded-2xl text-blue-200 text-sm">
            ❄️ <strong>Donation Cooling Period:</strong> A person cannot donate frequently. Your account is frozen for <strong>{coolingDays} more day(s)</strong>.
          </div>
        )}

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-red-400 via-pink-500 to-red-600 bg-clip-text text-transparent mb-3">
              Blood Requests Dashboard
            </h1>
            <p className="text-slate-400 text-base max-w-2xl">
              Search, filter, and respond to active blood requests. If you are in need of urgent blood, submit a normal or critical emergency request.
            </p>
          </div>
          
          <div className="flex gap-4">
            <button
              onClick={() => openForm('Normal')}
              className="py-3 px-5 text-sm font-semibold rounded-xl text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all duration-200 shadow-md hover:-translate-y-0.5"
            >
              Request Blood
            </button>
            <button
              onClick={() => openForm('Critical')}
              className="py-3 px-5 text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-lg flex items-center gap-2 hover:-translate-y-0.5 animate-pulse-slow"
            >
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              🚨 Emergency Request
            </button>
          </div>
        </div>

        {/* Info Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Total Active Requests</p>
            <p className="text-3xl font-black text-red-500">{totalPending}</p>
          </div>
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md relative overflow-hidden">
            <div className="absolute right-4 top-4 text-red-500/20 text-5xl">🚨</div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Critical Emergencies</p>
            <p className="text-3xl font-black text-rose-500 flex items-center gap-2">
              {totalCritical}
              {totalCritical > 0 && (
                <span className="px-2 py-0.5 text-xs bg-red-500/20 text-red-400 border border-red-500/30 rounded-full animate-bounce">
                  Urgent Need
                </span>
              )}
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Platform Status</p>
            <p className="text-3xl font-black text-emerald-500 flex items-center gap-2">
              Active
              <span className="h-3 w-3 bg-emerald-500 rounded-full inline-block animate-ping"></span>
            </p>
          </div>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl mb-8">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span className="text-sm font-semibold text-slate-300">Filters:</span>
          </div>

          <div className="flex flex-wrap gap-4">
            <div>
              <label className="text-xs text-slate-400 mr-2 uppercase font-bold">Blood Type</label>
              <select
                value={bloodFilter}
                onChange={(e) => setBloodFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                <option value="All">All Types</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 mr-2 uppercase font-bold">Urgency</label>
              <select
                value={urgencyFilter}
                onChange={(e) => setUrgencyFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                <option value="All">All Urgencies</option>
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Critical">Critical (Emergency)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Requests Grid */}
        {loading ? (
          <div className="flex flex-col justify-center items-center py-20 gap-4">
            <svg className="animate-spin h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-slate-400 text-sm">Fetching active blood requests...</p>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center text-red-400 max-w-xl mx-auto my-10">
            <p className="font-semibold mb-2">Error Loading Dashboard</p>
            <p className="text-xs mb-4">{error}</p>
            <button onClick={fetchRequests} className="py-2 px-4 bg-red-500 hover:bg-red-600 rounded-xl text-white text-xs font-semibold transition">
              Try Again
            </button>
          </div>
        ) : sortedRequests.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/30 border border-slate-800/80 rounded-2xl max-w-2xl mx-auto">
            <div className="text-5xl mb-4">🩸</div>
            <p className="text-lg font-bold text-slate-300 mb-1">No Active Blood Requests</p>
            <p className="text-slate-500 text-sm max-w-md mx-auto px-4">
              There are currently no active blood requests matching the filters. If you or someone you know requires assistance, click below to submit a request.
            </p>
            <button
              onClick={() => openForm('Normal')}
              className="mt-6 py-2 px-5 bg-red-500/20 border border-red-500/40 text-red-300 rounded-xl text-sm font-semibold hover:bg-red-500/30 transition"
            >
              Submit First Request
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedRequests.map((req) => {
              const isCritical = req.urgency === 'Critical';
              const isHigh = req.urgency === 'High';
              
              return (
                <div
                  key={req._id}
                  className={`relative overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 ${
                    isCritical 
                      ? 'bg-gradient-to-br from-red-950/40 via-slate-900/90 to-red-950/30 border-2 border-red-500/80 shadow-[0_4px_20px_rgba(239,68,68,0.2)]'
                      : 'bg-white/5 border border-white/10 hover:border-white/20'
                  }`}
                >
                  {/* Highlight Glow for Critical */}
                  {isCritical && (
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-2xl z-0 pointer-events-none"></div>
                  )}

                  <div className="relative z-10 flex flex-col h-full justify-between">
                    <div>
                      {/* Urgency and Blood Type Badge */}
                      <div className="flex justify-between items-center mb-4">
                        <span className={`px-2.5 py-0.5 text-xs font-extrabold rounded-full tracking-wide uppercase ${
                          isCritical
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
                            : isHigh
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-slate-700/30 text-slate-400 border border-slate-700/30'
                        }`}>
                          {req.urgency} Urgency
                        </span>

                        <div className="relative flex items-center justify-center h-12 w-12 rounded-full bg-red-500/10 border border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.15)] font-black text-lg text-red-500">
                          {req.bloodTypeRequired}
                        </div>
                      </div>

                      <h3 className="text-xl font-bold text-slate-100 mb-1">
                        {req.patientName}
                      </h3>
                      <p className="text-xs text-slate-400 mb-4 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                        </svg>
                        Required Units: <span className="font-extrabold text-slate-200">{req.unitsRequired}</span>
                      </p>

                      <hr className="border-slate-800 my-3" />

                      <div className="space-y-2 text-sm text-slate-350 mb-5">
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          <span>{req.hospitalName}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span>{req.hospitalLocation}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <a href={`tel:${req.contactNumber}`} className="text-red-400 hover:text-red-300 font-medium hover:underline transition">
                            {req.contactNumber}
                          </a>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 w-full">
                      <a
                        href={`tel:${req.contactNumber}`}
                        className={`w-full py-2.5 rounded-xl text-xs font-semibold text-center transition-all ${
                          isCritical
                            ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-md'
                            : 'bg-white/10 hover:bg-white/15 text-slate-200'
                        }`}
                      >
                        📞 Call {req.contactNumber}
                      </a>
                      {user && user.role === 'donor' && (
                        <button
                          onClick={() => handleAcceptDonation(req._id)}
                          disabled={acceptLoadingId === req._id || coolingDays > 0 || user?.isFrozen}
                          className="w-full py-2.5 rounded-xl text-xs font-semibold text-center transition bg-red-650 hover:bg-red-750 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {acceptLoadingId === req._id ? 'Accepting...' : '🤝 Accept Donation'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Form Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 overflow-y-auto bg-black/75 backdrop-blur-sm">
          <div className="relative w-full max-w-lg p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
                {formData.urgency === 'Critical' ? '🚨 Create Emergency Blood Request' : 'Create Blood Request'}
              </h2>
              <p className="text-slate-400 text-xs mt-1">
                Enter details to instantly list the demand and notify local donors.
              </p>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-sm flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{formError}</span>
              </div>
            )}
            
            {formSuccess && (
              <div className="mb-4 p-3 bg-emerald-500/20 border border-emerald-500/50 rounded-xl text-emerald-200 text-sm flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Patient Name</label>
                <input
                  type="text"
                  name="patientName"
                  value={formData.patientName}
                  onChange={handleInputChange}
                  placeholder="e.g. John Doe"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Blood Type</label>
                  <select
                    name="bloodTypeRequired"
                    value={formData.bloodTypeRequired}
                    onChange={handleInputChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Units Required</label>
                  <input
                    type="number"
                    name="unitsRequired"
                    value={formData.unitsRequired}
                    onChange={handleInputChange}
                    min="1"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Urgency Level</label>
                  <select
                    name="urgency"
                    value={formData.urgency}
                    onChange={handleInputChange}
                    disabled={formData.urgency === 'Critical'}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-75 disabled:cursor-not-allowed"
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical (Emergency)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Search Radius (1-10 km)</label>
                  <input
                    type="number"
                    name="radius"
                    value={formData.radius}
                    onChange={handleInputChange}
                    min="1"
                    max="10"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>
              </div>
              {formData.urgency === 'Critical' && (
                <p className="text-[10px] text-red-400 mt-1 font-medium">Locked to Critical for Emergency Request</p>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Hospital / Clinic Name</label>
                <input
                  type="text"
                  name="hospitalName"
                  value={formData.hospitalName}
                  onChange={handleInputChange}
                  placeholder="e.g. Mercy General Hospital"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Hospital Address / Location</label>
                <input
                  type="text"
                  name="hospitalLocation"
                  value={formData.hospitalLocation}
                  onChange={handleInputChange}
                  placeholder="e.g. 123 Health Ave, San Francisco"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Contact Number</label>
                <input
                  type="text"
                  name="contactNumber"
                  value={formData.contactNumber}
                  onChange={handleInputChange}
                  placeholder="e.g. +1 (555) 019-2834"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/2 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-1/2 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl text-sm font-semibold shadow-lg transition flex justify-center items-center gap-2"
                >
                  {formLoading && (
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default BloodRequestDashboard;
