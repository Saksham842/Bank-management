import { create } from 'zustand';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const useAuthStore = create((set, get) => ({
  user: null,
  accessToken: null,
  loading: false,
  error: null,

  setUser: (user) => {
    set({ user });
    if (user) {
      localStorage.setItem("ledger_user", JSON.stringify(user));
    }
  },
  clearError: () => set({ error: null }),

  login: async (email, password, mfaToken) => {
    set({ loading: true, error: null });
    try {
      const res = await axios.post(
        `${API_URL}/auth/login`,
        { email, password, token: mfaToken },
        { withCredentials: true }
      );
      
      if (res.data.mfaRequired) {
        set({ loading: false });
        return { mfaRequired: true, success: true };
      }

      let userData = res.data.user;
      // Merge with existing profile to preserve name, income, onboardingDone
      const storedProfile = localStorage.getItem("ledger_user");
      if (storedProfile) {
        try {
          const profile = JSON.parse(storedProfile);
          userData = { ...profile, ...userData };
        } catch (e) {}
      }
      localStorage.setItem("ledger_user", JSON.stringify(userData));

      set({
        user: userData,
        accessToken: res.data.accessToken,
        loading: false
      });
      return { success: true };
    } catch (err) {
      console.error('Login error detailed:', err);
      let message = 'Login failed.';
      if (err.response?.data) {
        if (err.response.data.message) {
          message = err.response.data.message;
        } else if (err.response.data.errors && Array.isArray(err.response.data.errors)) {
          message = err.response.data.errors.map((e) => e.message).join(' ');
        }
      }
      set({ error: message, loading: false });
      return { success: false };
    }
  },

  register: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const res = await axios.post(
        `${API_URL}/auth/register`,
        { email, password },
        { withCredentials: true }
      );
      const userData = res.data.user;
      localStorage.setItem("ledger_user", JSON.stringify(userData));
      set({
        user: userData,
        accessToken: res.data.accessToken,
        loading: false
      });
      return true;
    } catch (err) {
      console.error('Registration error detailed:', err);
      let message = 'Registration failed.';
      if (err.response?.data) {
        if (err.response.data.message) {
          message = err.response.data.message;
        } else if (err.response.data.errors && Array.isArray(err.response.data.errors)) {
          message = err.response.data.errors.map((e) => e.message).join(' ');
        }
      }
      set({ error: message, loading: false });
      return false;
    }
  },

  refreshToken: async () => {
    try {
      const res = await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
      set({ accessToken: res.data.accessToken });
    } catch (err) {
      localStorage.removeItem("ledger_user");
      set({ accessToken: null, user: null });
      throw err;
    }
  },

  logout: async () => {
    try {
      await axios.post(`${API_URL}/auth/logout`, {}, { withCredentials: true });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem("ledger_user");
      set({ user: null, accessToken: null, error: null });
    }
  }
}));
