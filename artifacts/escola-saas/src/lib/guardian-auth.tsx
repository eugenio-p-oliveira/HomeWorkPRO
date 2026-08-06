import React, { createContext, useContext, useEffect, useState } from "react";
import { API_URL } from "./api-url";

interface Guardian {
  id: number;
  name: string;
  email: string;
  tenantId: number;
}

interface GuardianAuthContextType {
  guardian: Guardian | null;
  isLoading: boolean;
  login: (token: string, guardian: Guardian) => void;
  logout: () => void;
  isAuthenticated: boolean;
  token: string | null;
}

const GuardianAuthContext = createContext<GuardianAuthContextType | undefined>(undefined);

function decodeTokenPayload(token: string): { guardianId?: number; tenantId?: number; exp?: number } | null {
  try {
    const [encodedPayload] = token.split(".");
    if (!encodedPayload) return null;
    const normalized = encodedPayload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

export function GuardianAuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem("edusaas_guardian_token"));
  const [guardian, setGuardian] = useState<Guardian | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      const payload = decodeTokenPayload(token);
      if (payload?.guardianId && payload.exp && payload.exp > Date.now()) {
        fetch(`${API_URL}/api/guardians/me`, { headers: { Authorization: `Bearer ${token}` } })
          .then(async (res) => {
            if (!res.ok) throw new Error("Invalid guardian session");
            return res.json();
          })
          .then((currentGuardian) => setGuardian(currentGuardian))
          .catch(() => {
            localStorage.removeItem("edusaas_guardian_token");
            setToken(null);
            setGuardian(null);
          })
          .finally(() => setIsLoading(false));
        return;
      } else {
        localStorage.removeItem("edusaas_guardian_token");
        setToken(null);
        setGuardian(null);
      }
    }
    setIsLoading(false);
  }, [token]);

  const login = (newToken: string, g: Guardian) => {
    localStorage.setItem("edusaas_guardian_token", newToken);
    setToken(newToken);
    setGuardian(g);
  };

  const logout = () => {
    localStorage.removeItem("edusaas_guardian_token");
    setToken(null);
    setGuardian(null);
  };

  return (
    <GuardianAuthContext.Provider value={{
      guardian: guardian || null,
      isLoading,
      login,
      logout,
      isAuthenticated: !!token && !!guardian,
      token,
    }}>
      {children}
    </GuardianAuthContext.Provider>
  );
}

export function useGuardianAuth() {
  const context = useContext(GuardianAuthContext);
  if (context === undefined) {
    throw new Error("useGuardianAuth must be used within a GuardianAuthProvider");
  }
  return context;
}
