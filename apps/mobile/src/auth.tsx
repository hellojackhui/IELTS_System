import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '@ielts/core';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, setToken } from './api';
import { resetLocal } from './store';

const TOKEN_KEY = 'token:v1';
const USER_KEY = 'user:v1';

interface AuthState {
  user: User | null;
  loading: boolean;
  register: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [token, rawUser] = await Promise.all([
        AsyncStorage.getItem(TOKEN_KEY),
        AsyncStorage.getItem(USER_KEY),
      ]);
      if (token && rawUser) {
        setToken(token);
        setUser(JSON.parse(rawUser));
      }
      setLoading(false);
    })();
  }, []);

  async function persistSession(token: string, u: User) {
    setToken(token);
    setUser(u);
    await AsyncStorage.multiSet([
      [TOKEN_KEY, token],
      [USER_KEY, JSON.stringify(u)],
    ]);
  }

  async function register(email: string, password: string) {
    const res = await api.register(email, password);
    await persistSession(res.token, res.user);
  }

  async function login(email: string, password: string) {
    const res = await api.login(email, password);
    await persistSession(res.token, res.user);
  }

  async function logout() {
    setToken(null);
    setUser(null);
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    await resetLocal();
  }

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
