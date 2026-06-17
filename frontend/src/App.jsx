import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/Header';
import Home from './pages/Home';
import Login from './pages/Login';
import About from './pages/About';
import DonorDashboard from './pages/DonorDashboard';
import BloodRequestDashboard from './pages/BloodRequestDashboard';
import HospitalDashboard from './pages/HospitalDashboard';

function DashboardRouter() {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'hospital' || user.role === 'recipient') {
    return <HospitalDashboard />;
  }
  
  return <DonorDashboard />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/about" element={<About />} />
          <Route path="/dashboard" element={<DashboardRouter />} />
          <Route path="/blood-request" element={<BloodRequestDashboard />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
