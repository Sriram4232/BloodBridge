import { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import { Link } from 'react-router-dom';

function HospitalDashboard() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [scheduledDonations, setScheduledDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form states (Create Blood Request)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [formData, setFormData] = useState({
    patientName: '',
    bloodTypeRequired: 'O+',
    unitsRequired: 1,
    urgency: 'Normal',
    hospitalName: user?.name || '',
    hospitalLocation: user?.cityName || '',
    contactNumber: '',
    radius: 2
  });

  // Verification Modal states
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [verifySuccess, setVerifySuccess] = useState('');
  const [verifyData, setVerifyData] = useState({
    unitsDonated: 1,
    feedback: ''
  });

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/requests`);
      if (!response.ok) {
        throw new Error('Failed to load blood requests.');
      }
      const data = await response.json();
      setRequests(data);

      // Filter own requests submitted by this user
      const ownList = data.filter(req => 
        req.requester && (req.requester._id === user?._id || req.requester === user?._id)
      );
      
      // Fetch all scheduled donations for pending requests
      await fetchAllScheduledDonations(ownList);
    } catch (err) {
      setError(err.message || 'Error loading data.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllScheduledDonations = async (ownRequestsList) => {
    try {
      const activeOwnList = ownRequestsList.filter(r => r.status === 'Pending' || r.status === 'Fulfilled');
      const donationsPromises = activeOwnList.map(async (req) => {
        const res = await fetch(`${API_URL}/api/requests/${req._id}/donations`, {
          headers: {
            'Authorization': `Bearer ${user?.token}`
          }
        });
        if (res.ok) {
          return await res.json();
        }
        return [];
      });
      const results = await Promise.all(donationsPromises);
      // Flatten and keep only 'Scheduled' status donations
      const flatDonations = results.flat().filter(d => d.status === 'Scheduled');
      setScheduledDonations(flatDonations);
    } catch (err) {
      console.error('Failed to fetch scheduled donations:', err);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const ownRequests = requests.filter(req => 
    req.requester && (req.requester._id === user?._id || req.requester === user?._id)
  );

  const openForm = (urgencyLevel = 'Normal') => {
    setFormData({
      patientName: '',
      bloodTypeRequired: 'O+',
      unitsRequired: 1,
      urgency: urgencyLevel,
      hospitalName: user?.name || '',
      hospitalLocation: user?.cityName || '',
      contactNumber: '',
      radius: 2
    });
    setFormError('');
    setFormSuccess('');
    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setFormError('');
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setFormLoading(true);

    if (!formData.patientName.trim() || !formData.hospitalName.trim() || !formData.hospitalLocation.trim() || !formData.contactNumber.trim()) {
      setFormError('All fields are required.');
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
          'Authorization': `Bearer ${user?.token}`,
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

  const updateStatus = async (id, newStatus) => {
    try {
      const response = await fetch(`${API_URL}/api/requests/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to update request.');
      }

      fetchRequests();
    } catch (err) {
      alert(err.message);
    }
  };

  // Open Verify Modal
  const openVerifyModal = (donation) => {
    setSelectedDonation(donation);
    setVerifyData({
      unitsDonated: donation.unitsDonated || 1,
      feedback: ''
    });
    setVerifyError('');
    setVerifySuccess('');
    setIsVerifyModalOpen(true);
  };

  // Submit Verification completion
  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setVerifyError('');
    setVerifySuccess('');
    setVerifyLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/requests/verify-donation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({
          donationId: selectedDonation._id,
          unitsDonated: Number(verifyData.unitsDonated),
          feedback: verifyData.feedback
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Verification failed.');
      }
      setVerifySuccess(data.message || 'Donation verified successfully!');
      fetchRequests();
      setTimeout(() => {
        setIsVerifyModalOpen(false);
      }, 1800);
    } catch (err) {
      setVerifyError(err.message);
    } finally {
      setVerifyLoading(false);
    }
  };

  // Report fake donation
  const handleReportFake = async (donationId) => {
    if (!window.confirm('Are you sure you want to report this donation as fake? The donor trust score will be reduced and investigated.')) {
      return;
    }
    try {
      const response = await fetch(`${API_URL}/api/requests/report-fake`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({ donationId })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Reporting failed.');
      }
      alert('Report submitted successfully. The donor trust score has been lowered.');
      fetchRequests();
    } catch (err) {
      alert(err.message);
    }
  };

  const pendingOwn = ownRequests.filter(r => r.status === 'Pending');
  const fulfilledOwn = ownRequests.filter(r => r.status === 'Fulfilled');
  const closedOwn = ownRequests.filter(r => r.status === 'Closed');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 pt-28 pb-16 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
          <div>
            <span className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold rounded-full uppercase tracking-wider">
              Hospital Portal
            </span>
            <h1 className="text-3xl font-black text-slate-100 mt-2">
              Welcome back, {user?.name || 'Hospital Staff'}!
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Manage your center's blood demands, verify volunteer donations, and protect coordinates database.
            </p>
            {/* Trust Score Meter */}
            <div className="pt-3 max-w-xs">
              <div className="flex justify-between text-xs text-slate-450 font-bold mb-1">
                <span>Center Trust Score</span>
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

          <div className="flex gap-3">
            <button
              onClick={() => openForm('Normal')}
              className="py-3 px-5 text-sm font-semibold rounded-xl text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all shadow-md hover:-translate-y-0.5"
            >
              Request Blood
            </button>
            <button
              onClick={() => openForm('Critical')}
              className="py-3 px-5 text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 transition-all shadow-lg flex items-center gap-2 hover:-translate-y-0.5 animate-pulse-slow"
            >
              🚨 Emergency Request
            </button>
          </div>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Total Requests Submitted</p>
            <p className="text-3xl font-black text-blue-500">{ownRequests.length}</p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Pending Demand</p>
            <p className="text-3xl font-black text-amber-500">{pendingOwn.length}</p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Pending Volunteers</p>
            <p className="text-3xl font-black text-emerald-400">{scheduledDonations.length}</p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Closed Requests</p>
            <p className="text-3xl font-black text-slate-400">{closedOwn.length}</p>
          </div>
        </div>

        {/* SECTION: Scheduled Volunteer Donations */}
        {scheduledDonations.length > 0 && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md mb-12">
            <h2 className="text-2xl font-black text-rose-400 mb-6 flex items-center gap-2">
              🚨 Pending Donation Verifications
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-4">Donor Name</th>
                    <th className="py-3 px-4">Blood Type</th>
                    <th className="py-3 px-4">Scheduled Units</th>
                    <th className="py-3 px-4">Distance</th>
                    <th className="py-3 px-4">Trust Score</th>
                    <th className="py-3 px-4">Badge</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {scheduledDonations.map(donation => (
                    <tr key={donation._id} className="hover:bg-white/2 transition">
                      <td className="py-4 px-4 font-bold text-slate-200">
                        {donation.donor?.name || 'Anonymous Donor'}
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-500/10 border border-red-500/30 font-black text-red-500 text-xs">
                          {donation.bloodType}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-slate-350">{donation.unitsDonated} Unit(s)</td>
                      <td className="py-4 px-4 text-slate-350 font-medium">
                        {donation.distance !== null && donation.distance !== undefined
                          ? `📍 ${donation.distance} km`
                          : 'N/A'}
                      </td>
                      <td className="py-4 px-4 text-slate-400 font-semibold">{donation.donor?.trustScore || 100}%</td>
                      <td className="py-4 px-4 uppercase text-[10px] tracking-wider font-bold">
                        {donation.donor?.badge || 'none'}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => openVerifyModal(donation)}
                            className="py-1 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition"
                          >
                            Verify Completion
                          </button>
                          <button 
                            onClick={() => handleReportFake(donation._id)}
                            className="py-1 px-3 bg-red-650 hover:bg-red-750 text-white rounded-lg text-xs font-semibold transition"
                          >
                            Report Fake / Absent
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Request List and Actions */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md">
          <h2 className="text-2xl font-black text-slate-100 mb-6 flex items-center gap-2">
            📊 Your Submitted Blood Requests
          </h2>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <svg className="animate-spin h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-xs text-slate-400">Loading your requests...</p>
            </div>
          ) : error ? (
            <p className="text-red-400 text-sm">{error}</p>
          ) : ownRequests.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400 text-base font-semibold mb-1">No Requests Submitted Yet</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                You haven't posted any blood requests from this account yet. Click the button above to request.
              </p>
              <button 
                onClick={() => openForm('Normal')}
                className="py-2 px-4 bg-blue-600/20 border border-blue-500/30 text-blue-300 rounded-xl text-xs font-semibold hover:bg-blue-600/30 transition"
              >
                Create Request
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <th className="py-3.5 px-4">Patient Name</th>
                    <th className="py-3.5 px-4">Blood Type</th>
                    <th className="py-3.5 px-4">Units</th>
                    <th className="py-3.5 px-4">Urgency</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Date Created</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {ownRequests.map(req => {
                    const isCritical = req.urgency === 'Critical';
                    const isHigh = req.urgency === 'High';
                    
                    return (
                      <tr key={req._id} className="hover:bg-white/2 transition duration-150">
                        <td className="py-4 px-4 font-bold text-slate-200">{req.patientName}</td>
                        <td className="py-4 px-4">
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-500/10 border border-red-500/30 font-black text-red-500 text-xs">
                            {req.bloodTypeRequired}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-slate-350">{req.unitsRequired} Units</td>
                        <td className="py-4 px-4">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full tracking-wide uppercase ${
                            isCritical
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : isHigh
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-slate-700/30 text-slate-400'
                          }`}>
                            {req.urgency}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full ${
                            req.status === 'Pending'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : req.status === 'Fulfilled'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-slate-800 text-slate-450 border border-slate-700/50'
                          }`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-slate-500 text-xs">
                          {new Date(req.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-4 text-right">
                          {req.status === 'Pending' ? (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => updateStatus(req._id, 'Fulfilled')}
                                className="py-1 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition"
                              >
                                Mark Fulfilled
                              </button>
                              <button
                                onClick={() => updateStatus(req._id, 'Closed')}
                                className="py-1 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-semibold transition"
                              >
                                Close
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500 italic">No Action Needed</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Modal: Create Blood Request */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 overflow-y-auto bg-black/75 backdrop-blur-sm">
          <div className="relative w-full max-w-lg p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">✕</button>

            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
                {formData.urgency === 'Critical' ? '🚨 Create Emergency Blood Request' : 'Create Blood Request'}
              </h2>
              <p className="text-slate-400 text-xs mt-1">
                Enter details below to submit request to our donor network.
              </p>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-sm flex items-center gap-2">
                <span>⚠️ {formError}</span>
              </div>
            )}
            
            {formSuccess && (
              <div className="mb-4 p-3 bg-emerald-500/20 border border-emerald-500/50 rounded-xl text-emerald-200 text-sm flex items-center gap-2">
                <span>✅ {formSuccess}</span>
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none"
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none"
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none"
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none disabled:opacity-75"
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Hospital / Clinic Name</label>
                <input
                  type="text"
                  name="hospitalName"
                  value={formData.hospitalName}
                  onChange={handleInputChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none"
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none"
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none"
                  required
                />
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/2 py-3 bg-slate-800 text-slate-200 rounded-xl text-sm font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-1/2 py-3 bg-gradient-to-r from-blue-650 to-blue-750 text-white rounded-xl text-sm font-semibold shadow-lg transition flex justify-center items-center gap-2"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Verify Donation (Award Points, check Fraud) */}
      {isVerifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 overflow-y-auto bg-black/75 backdrop-blur-sm">
          <div className="relative w-full max-w-lg p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsVerifyModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">✕</button>

            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
                🛡️ Verify Donation Completion
              </h2>
              <p className="text-slate-400 text-xs mt-1">
                Confirm donor details. Submitting triggers AI collusion and point-farming checks.
              </p>
            </div>

            {verifyError && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-sm">
                <span>⚠️ {verifyError}</span>
              </div>
            )}
            
            {verifySuccess && (
              <div className="mb-4 p-3 bg-emerald-500/20 border border-emerald-500/50 rounded-xl text-emerald-200 text-sm">
                <span>✅ {verifySuccess}</span>
              </div>
            )}

            <form onSubmit={handleVerifySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Donor Name</label>
                <input
                  type="text"
                  value={selectedDonation?.donor?.name || ''}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-400 focus:outline-none"
                  disabled
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Blood Type</label>
                  <input
                    type="text"
                    value={selectedDonation?.bloodType || ''}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-400 focus:outline-none"
                    disabled
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Units Donated</label>
                  <input
                    type="number"
                    value={verifyData.unitsDonated}
                    onChange={(e) => setVerifyData({ ...verifyData, unitsDonated: e.target.value })}
                    min="1"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Verification Comment (Mandatory for AI Check)</label>
                <textarea
                  value={verifyData.feedback}
                  onChange={(e) => setVerifyData({ ...verifyData, feedback: e.target.value })}
                  placeholder="e.g. Donor successfully completed donation of 1 unit at our blood drive center."
                  className="w-full h-24 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white placeholder-slate-650 focus:outline-none"
                  required
                />
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsVerifyModalOpen(false)}
                  className="w-1/2 py-3 bg-slate-800 text-slate-200 rounded-xl text-sm font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={verifyLoading}
                  className="w-1/2 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl text-sm font-semibold shadow-lg transition flex justify-center items-center gap-2"
                >
                  {verifyLoading ? 'Checking Collusion...' : 'Approve & Reward'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default HospitalDashboard;
