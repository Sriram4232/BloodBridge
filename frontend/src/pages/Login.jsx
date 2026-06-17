import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import loginBg from '../assets/login.mp4';

function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    bloodType: 'O+',
    role: 'donor',
    location: '',
  });

  const [localLoading, setLocalLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleTabChange = (signUpMode) => {
    setIsSignUp(signUpMode);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLocalLoading(true);

    if (isSignUp) {
      // Validation
      if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim() || !formData.location.trim()) {
        setError('All fields are required.');
        setLocalLoading(false);
        return;
      }
      
      const res = await register(formData);
      if (res.success) {
        setSuccess('Registration successful! Connecting you to BloodBridge...');
        setTimeout(() => {
          navigate('/dashboard');
        }, 1800);
      } else {
        setError(res.message || 'Registration failed. Try again.');
      }
    } else {
      // Validation
      if (!formData.email.trim() || !formData.password.trim()) {
        setError('Email and password are required.');
        setLocalLoading(false);
        return;
      }

      const res = await login(formData.email, formData.password);
      if (res.success) {
        setSuccess('Login successful! Redirecting to dashboard...');
        setTimeout(() => {
          navigate('/dashboard');
        }, 1800);
      } else {
        setError(res.message || 'Invalid email or password.');
      }
    }
    setLocalLoading(false);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-y-auto py-12 px-4">
      {/* Background Video */}
      <video 
        autoPlay 
        loop 
        muted 
        playsInline 
        className="fixed inset-0 w-full h-full object-cover z-0"
      >
        <source src={loginBg} type="video/mp4" />
      </video>
      
      {/* Dark Overlay for better contrast */}
      <div className="fixed inset-0 bg-black/50 z-0"></div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-lg p-8 backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] text-white transform transition-all duration-500 hover:shadow-[0_8px_40px_0_rgba(0,0,0,0.5)] my-auto">
        
        {/* Toggle Tabs */}
        <div className="flex justify-center mb-8 bg-black/20 p-1 rounded-xl border border-white/10">
          <button 
            type="button"
            onClick={() => handleTabChange(false)}
            className={`w-1/2 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${!isSignUp ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md' : 'text-gray-300 hover:text-white'}`}
          >
            Sign In
          </button>
          <button 
            type="button"
            onClick={() => handleTabChange(true)}
            className={`w-1/2 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${isSignUp ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md' : 'text-gray-300 hover:text-white'}`}
          >
            Sign Up
          </button>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-3xl font-extrabold tracking-tight mb-2 drop-shadow-md">
            {isSignUp ? 'Create An Account' : 'Welcome Back'}
          </h2>
          <p className="text-gray-200 text-sm font-medium tracking-wide">
            {isSignUp ? 'Join BloodBridge to save or request lives' : 'Access your personalized donor/hospital portal'}
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-sm flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-emerald-500/20 border border-emerald-500/50 rounded-xl text-emerald-200 text-sm flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">Full Name</label>
              <input 
                type="text" 
                name="name" 
                value={formData.name} 
                onChange={handleChange} 
                placeholder="John Doe"
                className="w-full bg-black/30 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">Email Address</label>
            <input 
              type="email" 
              name="email" 
              value={formData.email} 
              onChange={handleChange} 
              placeholder="example@bloodbridge.org"
              className="w-full bg-black/30 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">Password</label>
            <input 
              type="password" 
              name="password" 
              value={formData.password} 
              onChange={handleChange} 
              placeholder="••••••••"
              className="w-full bg-black/30 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
              required
            />
          </div>

          {isSignUp && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">Blood Type</label>
                <select 
                  name="bloodType" 
                  value={formData.bloodType} 
                  onChange={handleChange} 
                  className="w-full bg-black/35 border border-white/20 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                >
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(t => (
                    <option key={t} value={t} className="bg-slate-900 text-white">{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">Account Role</label>
                <select 
                  name="role" 
                  value={formData.role} 
                  onChange={handleChange} 
                  className="w-full bg-black/35 border border-white/20 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                >
                  <option value="donor" className="bg-slate-900 text-white">Donor</option>
                  <option value="recipient" className="bg-slate-900 text-white">Hospital / Recipient</option>
                </select>
              </div>
            </div>
          )}

          {isSignUp && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">Location / City</label>
              <input 
                type="text" 
                name="location" 
                value={formData.location} 
                onChange={handleChange} 
                placeholder="San Francisco, CA"
                className="w-full bg-black/30 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                required
              />
            </div>
          )}

          <button 
            type="submit" 
            disabled={localLoading}
            className="w-full mt-4 flex justify-center items-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 shadow-lg transform transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {localLoading ? (
              <svg className="animate-spin h-5 w-5 text-white mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : null}
            {isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <button 
            onClick={() => handleTabChange(!isSignUp)}
            className="text-xs text-gray-300 hover:text-white font-medium transition-colors"
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;
