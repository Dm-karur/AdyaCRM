import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data } = await api.get('/auth/profile');
        setUser(data);
        // Also save non-sensitive user info for fast re-render
        localStorage.setItem('userInfo', JSON.stringify(data));
      } catch (error) {
        setUser(null);
        localStorage.removeItem('userInfo');
      } finally {
        setLoading(false);
      }
    };

    // Fast initial render from cache if available
    const cachedUser = localStorage.getItem('userInfo');
    if (cachedUser) {
      setUser(JSON.parse(cachedUser));
    }
    
    checkSession();
  }, []);

  const login = async (employeeId, password) => {
    const { data } = await api.post('/auth/login', { employeeId, password });
    setUser(data);
    localStorage.setItem('userInfo', JSON.stringify(data));
    return data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error', error);
    }
    setUser(null);
    localStorage.removeItem('userInfo');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
