import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(() => localStorage.getItem('blackout_token'));
  
  // Gate scanner device credentials
  const [activeGate, setActiveGate] = useState(() => localStorage.getItem('blackout_gate') || 'Gate A');
  const [deviceId, setDeviceId] = useState(() => {
    let id = localStorage.getItem('blackout_device_id');
    if (!id) {
      id = 'DEV-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      localStorage.setItem('blackout_device_id', id);
    }
    return id;
  });

  // Verify auth session on load: MUST validate with backend to prevent zombie/expired sessions
  useEffect(() => {
    const savedToken = localStorage.getItem('blackout_token');
    
    if (!savedToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    const verifySession = async () => {
      try {
        const res = await api.getMe();
        if (res.user) {
          setUser(res.user);
          localStorage.setItem('blackout_cached_user', JSON.stringify(res.user));
        } else {
          throw new Error('Invalid user payload');
        }
      } catch (err) {
        // If token is invalid or rejected by backend, FORCE CLEAN LOGOUT so user logs in fresh!
        console.warn('Session verification failed, prompting clean login:', err.message);
        localStorage.removeItem('blackout_token');
        localStorage.removeItem('blackout_cached_user');
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    verifySession();
  }, [token]);

  const login = (userData, authToken) => {
    localStorage.setItem('blackout_token', authToken);
    localStorage.setItem('blackout_cached_user', JSON.stringify(userData));
    setToken(authToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('blackout_token');
    localStorage.removeItem('blackout_cached_user');
    setToken(null);
    setUser(null);
    window.location.href = '/';
  };

  const updateGate = (newGate) => {
    setActiveGate(newGate);
    localStorage.setItem('blackout_gate', newGate);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        activeGate,
        deviceId,
        isOrganizer: user?.role === 'organizer',
        isVolunteer: user?.role === 'volunteer',
        login,
        logout,
        updateGate
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
