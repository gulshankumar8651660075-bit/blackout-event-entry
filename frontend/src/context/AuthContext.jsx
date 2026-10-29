import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const cached = localStorage.getItem('blackout_cached_user');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [loading, setLoading] = useState(false);
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

  // Verify online token if present, but NEVER log out user if offline
  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    const verifyToken = async () => {
      try {
        const res = await api.getMe();
        if (isMounted && res.user) {
          setUser(res.user);
          localStorage.setItem('blackout_cached_user', JSON.stringify(res.user));
        }
      } catch (err) {
        // Offline or connection error: keep cached user session intact!
        console.warn('Network auth verify skipped (Offline Resilience Mode Active)');
      }
    };

    verifyToken();
    return () => { isMounted = false; };
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
    // Complete clean reset to root
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
