import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const useSessionManager = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isIdle, setIsIdle] = useState(false);
  
  // Refs to track timers and activity
  const warningTimerRef = useRef(null);
  const logoutTimerRef = useRef(null);
  const checkTokenTimerRef = useRef(null);
  const idleTimerRef = useRef(null);
  const lastActivityRef = useRef(Date.now());

  // Configuration
  const WARNING_TIME = 30 * 1000; // 30 seconds before expiry
  const IDLE_TIME = 5 * 60 * 1000; // 5 minutes of inactivity
  const CHECK_INTERVAL = 30 * 1000; // Check token every 30 seconds
  const LOGOUT_GRACE_TIME = 30 * 1000; // 30 seconds to respond to warning

  // Activity events to track
  const activityEvents = [
    'mousedown', 'mousemove', 'keypress', 'scroll', 
    'touchstart', 'click', 'focus', 'blur'
  ];

  // Clear all timers
  const clearAllTimers = useCallback(() => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (checkTokenTimerRef.current) clearInterval(checkTokenTimerRef.current);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
  }, []);

  // Update last activity timestamp
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    setIsIdle(false);
    
    // Reset idle timer
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      setIsIdle(true);
    }, IDLE_TIME);
  }, []);

  // Check if user is currently idle
  const checkIdleStatus = useCallback(() => {
    const now = Date.now();
    const timeSinceActivity = now - lastActivityRef.current;
    return timeSinceActivity > IDLE_TIME;
  }, []);

  // Validate current token
  const validateToken = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setIsAuthenticated(false);
      return null;
    }

    try {
      const response = await axios.get('http://127.0.0.1:8000/api/users/token/validate/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setIsAuthenticated(true);
      return response.data;
    } catch (error) {
      console.error('Token validation failed:', error);
      setIsAuthenticated(false);
      return null;
    }
  }, []);

  // Extend session
  const extendSession = useCallback(async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      console.error('No refresh token available');
      return false;
    }

    try {
      const response = await axios.post('http://127.0.0.1:8000/api/users/token/extend/', {
        refresh_token: refreshToken
      });

      if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        setShowWarning(false);
        setTimeLeft(0);
        
        // Clear warning timers
        if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
        if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
        
        console.log('Session extended successfully');
        return true;
      }
    } catch (error) {
      console.error('Failed to extend session:', error);
      return false;
    }
    return false;
  }, []);

  // Force logout
  const forceLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    setIsAuthenticated(false);
    setShowWarning(false);
    setTimeLeft(0);
    clearAllTimers();
    
    // Redirect to login
    window.location.href = '/login';
  }, [clearAllTimers]);

  // Handle session warning
  const handleSessionWarning = useCallback((minutesLeft) => {
    setShowWarning(true);
    setTimeLeft(minutesLeft * 60); // Convert to seconds
    
    // Start countdown
    const countdownInterval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          forceLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Auto logout after grace period
    logoutTimerRef.current = setTimeout(() => {
      clearInterval(countdownInterval);
      forceLogout();
    }, LOGOUT_GRACE_TIME);
  }, [forceLogout]);

  // Check token expiration periodically
  const checkTokenExpiration = useCallback(async () => {
    // Don't check if user is idle - let it expire naturally
    if (checkIdleStatus()) {
      return;
    }

    const tokenData = await validateToken();
    if (!tokenData) {
      forceLogout();
      return;
    }

    const minutesUntilExpiry = tokenData.minutes_until_expiry;
    
    // Show warning if token expires soon and user is active
    if (minutesUntilExpiry <= WARNING_TIME / 60000 && !showWarning) {
      handleSessionWarning(minutesUntilExpiry);
    }
  }, [validateToken, forceLogout, showWarning, handleSessionWarning, checkIdleStatus]);

  // Handle continue session (extend)
  const handleContinueSession = useCallback(async () => {
    const success = await extendSession();
    if (success) {
      updateActivity(); // Reset activity timer
    } else {
      forceLogout();
    }
  }, [extendSession, updateActivity, forceLogout]);

  // Handle logout from warning
  const handleLogoutNow = useCallback(() => {
    forceLogout();
  }, [forceLogout]);

  // Initialize session manager
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
      
      // Initial token validation
      validateToken();
      
      // Set up periodic token checking
      checkTokenTimerRef.current = setInterval(checkTokenExpiration, CHECK_INTERVAL);
      
      // Set up activity listeners
      activityEvents.forEach(event => {
        document.addEventListener(event, updateActivity, true);
      });
      
      // Initialize idle timer
      updateActivity();
    }

    // Cleanup on unmount
    return () => {
      clearAllTimers();
      activityEvents.forEach(event => {
        document.removeEventListener(event, updateActivity, true);
      });
    };
  }, [validateToken, checkTokenExpiration, updateActivity, clearAllTimers]);

  return {
    isAuthenticated,
    isIdle,
    showWarning,
    timeLeft,
    extendSession: handleContinueSession,
    forceLogout: handleLogoutNow,
    updateActivity
  };
};

export default useSessionManager;
