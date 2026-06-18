import { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://bloodbridge-ulsa.onrender.com');

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('bloodbridge_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = async (email, password, location = null) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, location }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Invalid email or password');
      }

      localStorage.setItem('bloodbridge_user', JSON.stringify(data));
      setUser(data);
      setLoading(false);
      return { success: true };
    } catch (err) {
      setError(err.message);
      setLoading(false);
      return { success: false, message: err.message };
    }
  };

  const register = async ({ name, email, password, bloodType, role, location, cityName }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password, bloodType, role, location, cityName }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      localStorage.setItem('bloodbridge_user', JSON.stringify(data));
      setUser(data);
      setLoading(false);
      return { success: true };
    } catch (err) {
      setError(err.message);
      setLoading(false);
      return { success: false, message: err.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('bloodbridge_user');
    setUser(null);
    setError(null);
  };

  const refreshUser = async () => {
    const savedUser = localStorage.getItem('bloodbridge_user');
    if (!savedUser) return;
    const parsedUser = JSON.parse(savedUser);
    if (!parsedUser || !parsedUser.token) return;

    try {
      const response = await fetch(`${API_URL}/api/users/profile`, {
        headers: {
          'Authorization': `Bearer ${parsedUser.token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        const updatedUser = { ...parsedUser, ...data };
        localStorage.setItem('bloodbridge_user', JSON.stringify(updatedUser));
        setUser(updatedUser);
      }
    } catch (err) {
      console.error('Failed to refresh user profile:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, error, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

