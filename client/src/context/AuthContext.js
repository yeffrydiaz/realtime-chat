import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get('/api/auth/me')
      .then((res) => setCurrentUser(res.data.user ?? res.data))
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/api/auth/login', { email, password });
    const { token, user } = res.data;
    localStorage.setItem('token', token);
    setCurrentUser(user);
    return user;
  }, []);

  const register = useCallback(async (username, email, password) => {
    const res = await api.post('/api/auth/register', { username, email, password });
    const { token, user } = res.data;
    localStorage.setItem('token', token);
    setCurrentUser(user);
    return user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setCurrentUser(null);
  }, []);

  const updateProfile = useCallback(async (data) => {
    const res = await api.put('/api/auth/me', data);
    const updated = res.data.user ?? res.data;
    setCurrentUser(updated);
    return updated;
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
