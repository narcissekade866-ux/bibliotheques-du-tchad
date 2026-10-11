import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const data = await apiGet('/auth/me');
      setUser(data);
    } catch {
      setUser(null);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const login = async (email, mot_de_passe) => {
    const data = await apiPost('/auth/login', { email, mot_de_passe });
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    setUser(data.user);
    return data;
  };

  const register = async (nom, email, mot_de_passe) => {
    const data = await apiPost('/auth/register', { nom, email, mot_de_passe });
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    const rt = localStorage.getItem('refresh_token');
    try {
      if (rt) await apiPost('/auth/logout', { refresh_token: rt });
    } catch { /* ignore */ }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  const isAdmin = user?.role === 'administrateur';

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAdmin, fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
