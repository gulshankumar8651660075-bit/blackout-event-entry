import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('blackout_token'));
  
  // Gate scanner device credentials
  const [activeGate, setActiveGate] = useState(localStorage.getItem('blackout_gate') || 'Gate A');
  const [deviceId, setDeviceId] = useState(() => {
    let id = localStorage.getItem('blackout_device_id');
    if (!id) {
      id = 'DEV-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      localStorage.setItem('blackout_device_id', id);
    }
    return id;
  });

  useEffect(() => {
    const fetchUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.getMe();
        setUser(res.user);
      } catch (err) {
        console.warn('Auth validation failed, falling back or offline:', err);
        // If offline and cached user exists in localStorage, maintain session!
        const cachedUser = localStorage.getItem('blackout_cached_user');
        if (cachedUser) {
          try {
            setUser(JSON.parse(cachedUser));
          } catch (e) {
            setUser(null);
          }
        }
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
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
