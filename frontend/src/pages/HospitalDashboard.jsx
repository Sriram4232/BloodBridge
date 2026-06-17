import { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import { Link } from 'react-router-dom';

function HospitalDashboard() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form states
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
    hospitalLocation: user?.location || '',
    contactNumber: '',
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
    } catch (err) {
      setError(err.message || 'Error loading data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // Filter requests submitted by this user
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
      hospitalLocation: user?.location || '',
      contactNumber: '',
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

    try {
      const response = await fetch(`${API_URL}/api/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify(formData),
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
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to update request.');
      }

      // Refresh list
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
              Recipient Portal
            </span>
            <h1 className="text-3xl font-black text-slate-100 mt-2">
              Welcome back, {user?.name || 'Hospital Staff'}!
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Manage your center's blood demands, request inventory, and coordinate with matched donors.
            </p>
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
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Fulfilled Requests</p>
            <p className="text-3xl font-black text-emerald-500">{fulfilledOwn.length}</p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Closed Requests</p>
            <p className="text-3xl font-black text-slate-400">{closedOwn.length}</p>
          </div>
        </div>

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

      {/* Modal Request Form */}
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
                Enter details below to submit request to our donor network.
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white placeholder-slate-550 focus:outline-none focus:ring-2 focus:ring-red-500"
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
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Hospital / Clinic Name</label>
                <input
                  type="text"
                  name="hospitalName"
                  value={formData.hospitalName}
                  onChange={handleInputChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white placeholder-slate-550 focus:outline-none focus:ring-2 focus:ring-red-550"
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
                  className="w-1/2 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl text-sm font-semibold shadow-lg transition flex justify-center items-center gap-2"
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

export default HospitalDashboard;
