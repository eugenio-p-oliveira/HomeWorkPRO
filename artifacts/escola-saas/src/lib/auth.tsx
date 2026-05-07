import React, { createContext, useContext, useEffect, useState } from "react";
import { useGetMe } from "@workspace/api-client-react";
import type { UserWithTenant } from "@workspace/api-client-react";
import { setAuthTokenGetter } from "@workspace/api-client-react/src/custom-fetch";

interface AuthContextType {
  user: UserWithTenant | null;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem("edusaas_token"));

  useEffect(() => {
    setAuthTokenGetter(() => localStorage.getItem("edusaas_token"));
  }, []);

  const { data: user, isLoading: isQueryLoading, error } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
    },
  });

  const isLoading = !!token && isQueryLoading;
  const isAuthenticated = !!token && !!user;

  useEffect(() => {
    if (error) {
      setToken(null);
      localStorage.removeItem("edusaas_token");
    }
  }, [error]);

  const login = (newToken: string) => {
    localStorage.setItem("edusaas_token", newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem("edusaas_token");
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user: user || null, isLoading, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
