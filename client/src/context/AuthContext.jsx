import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../api/client.js';

const AuthContext = createContext(null);

function loadStoredSession() {
  const token = window.localStorage.getItem('ts_token');
  const user = window.localStorage.getItem('ts_user');

  return {
    token,
    user: user ? JSON.parse(user) : null
  };
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState({ token: null, user: null, ready: false });

  useEffect(() => {
    const stored = loadStoredSession();
    setSession({ ...stored, ready: true });
  }, []);

  useEffect(() => {
    if (!session.ready) {
      return;
    }

    if (session.token) {
      window.localStorage.setItem('ts_token', session.token);
    } else {
      window.localStorage.removeItem('ts_token');
    }

    if (session.user) {
      window.localStorage.setItem('ts_user', JSON.stringify(session.user));
    } else {
      window.localStorage.removeItem('ts_user');
    }
  }, [session]);

  async function register(payload) {
    const data = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    setSession({ token: data.token, user: data.user, ready: true });
    return data;
  }

  async function login(payload) {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    setSession({ token: data.token, user: data.user, ready: true });
    return data;
  }

  async function refreshUser() {
    if (!session.token) {
      return null;
    }

    const data = await apiFetch('/auth/me', { token: session.token });
    setSession((current) => ({ ...current, user: data.user }));
    return data.user;
  }

  function logout() {
    setSession({ token: null, user: null, ready: true });
  }

  const value = useMemo(() => ({
    token: session.token,
    user: session.user,
    ready: session.ready,
    register,
    login,
    logout,
    refreshUser
  }), [session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}