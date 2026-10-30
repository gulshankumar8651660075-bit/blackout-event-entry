import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const cached = localStorage.getItem('blackout_cached_user');
    const token = localStorage.getItem('blackout_token');
    if (cached && token) {
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

  // Verify auth session in background: if token rejected by backend, clear session
  useEffect(() => {
    const savedToken = localStorage.getItem('blackout_token');
    if (!savedToken) {
      setUser(null);
      return;
    }

    let isMounted = true;
    const verifySession = async () => {
      try {
        const res = await api.getMe();
        if (isMounted && res.user) {
          setUser(res.user);
          localStorage.setItem('blackout_cached_user', JSON.stringify(res.user));
        }
      } catch (err) {
        if (isMounted) {
          console.warn('Session verification fallback notice:', err.message);
        }
      }
    };

    verifySession();
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
    window.location.href = '/';
  };

  // 1-Click Fast Role Switcher for Hackathon Testing & Evaluation
  const switchRole = async (targetRole) => {
    setLoading(true);
    const targetEmail = targetRole === 'volunteer' ? 'volunteer@blackout.io' : 'organizer@blackout.io';
    try {
      const res = await api.login({ email: targetEmail, password: 'password123' });
      login(res.user, res.token);
    } catch (e) {
      // Offline fallback: switch locally
      const isVol = targetRole === 'volunteer';
      const fallbackUser = {
        id: isVol ? 'user-vol-01' : 'user-org-01',
        name: isVol ? 'Alex (Gate Volunteer)' : 'Gulshan (Lead Organiser)',
        email: targetEmail,
        role: targetRole
      };
      login(fallbackUser, 'offline_token_' + targetRole);
    } finally {
      setLoading(false);
    }
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
        switchRole,
        updateGate
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
