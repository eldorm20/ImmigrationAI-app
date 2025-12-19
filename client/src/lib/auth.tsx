import React, { createContext, useContext, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/api";

export interface User {
  id: string;
  email: string;
  role: "admin" | "lawyer" | "applicant" | "employer";
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  avatar?: string | null;
  emailVerified: boolean;
  /** Convenience display name for UI components */
  name: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName?: string, lastName?: string, role?: "applicant" | "lawyer") => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const API_URL = import.meta.env.VITE_API_URL || "/api";

// Token management
function getAccessToken(): string | null {
  return localStorage.getItem("accessToken");
}

function getRefreshToken(): string | null {
  return localStorage.getItem("refreshToken");
}

function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("refreshToken", refreshToken);
}

function clearTokens() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
}

// Request deduplication to prevent multiple simultaneous /auth/me calls
let refreshUserPromise: Promise<void> | null = null;

// Use shared API helper from `client/src/lib/api.ts`

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [_, setLocation] = useLocation();

  // Load user on mount
  useEffect(() => {
    // Check if token exists before attempting to fetch user
    const token = getAccessToken();
    if (!token) {
      // No token, user not authenticated
      setUser(null);
      setIsLoading(false);
      return;
    }
    refreshUser().finally(() => setIsLoading(false));
  }, []);

  const refreshUser = async () => {
    // Return existing promise if already in flight to deduplicate requests
    if (refreshUserPromise) {
      return refreshUserPromise;
    }

    refreshUserPromise = (async () => {
      try {
        const userData = await apiRequest<Omit<User, "name">>("/auth/me", { skipErrorToast: true });
        const nameFromEmail = userData.email.split("@")[0];
        const fullName =
          [userData.firstName, userData.lastName].filter(Boolean).join(" ").trim() ||
          nameFromEmail;

        setUser({
          ...userData,
          name: fullName,
        });
      } catch (err) {
        // Expected on initial load if user is not authenticated
        setUser(null);
        clearTokens();
      } finally {
        refreshUserPromise = null;
      }
    })();

    return refreshUserPromise;
  };

  const login = async (email: string, password: string) => {
    try {
      const data = await apiRequest<any>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setTokens(data.accessToken, data.refreshToken);
      const userData = data.user as Omit<User, "name">;
      const nameFromEmail = userData.email.split("@")[0];
      const fullName =
        [userData.firstName, userData.lastName].filter(Boolean).join(" ").trim() ||
        nameFromEmail;

      setUser({
        ...userData,
        name: fullName,
      });

      // Redirect based on role
      if (userData.role === "lawyer" || userData.role === "admin") {
        setLocation("/lawyer");
      } else {
        setLocation("/dashboard");
      }
    } catch (err) {
      // Propagate error so callers can handle it
      throw err;
    }
  };

  const register = async (
    email: string,
    password: string,
    firstName?: string,
    lastName?: string,
    role: "applicant" | "lawyer" = "applicant"
  ) => {
    try {
      const data = await apiRequest<any>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, firstName, lastName, role }),
      });
      setTokens(data.accessToken, data.refreshToken);
      const userData = data.user as Omit<User, "name">;
      const nameFromEmail = userData.email.split("@")[0];
      const fullName =
        [userData.firstName, userData.lastName].filter(Boolean).join(" ").trim() ||
        nameFromEmail;

      const mappedUser: User = {
        ...userData,
        name: fullName,
      };

      setUser(mappedUser);

      if (mappedUser.role === "lawyer" || mappedUser.role === "admin") {
        setLocation("/lawyer");
      } else {
        setLocation("/dashboard");
      }
    } catch (err) {
      // Propagate registration errors to caller
      throw err;
    }
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        await apiRequest("/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refreshToken }),
          skipErrorToast: true,
        });
      }
    } catch (err) {
      // Ignore errors on logout
    } finally {
      clearTokens();
      setUser(null);
      setLocation("/");
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

// Export API request helper for use in other components
export { apiRequest };
