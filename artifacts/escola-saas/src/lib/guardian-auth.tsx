import React, { createContext, useContext, useEffect, useState } from "react";

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

export function GuardianAuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem("edusaas_guardian_token"));
  const [guardian, setGuardian] = useState<Guardian | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      try {
        const payload = JSON.parse(atob(token));
        if (payload.guardianId && payload.exp > Date.now()) {
          setGuardian({ id: payload.guardianId, tenantId: payload.tenantId, name: payload.name ?? "", email: payload.email ?? "" });
        } else {
          localStorage.removeItem("edusaas_guardian_token");
          setToken(null);
        }
      } catch {
        localStorage.removeItem("edusaas_guardian_token");
        setToken(null);
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
