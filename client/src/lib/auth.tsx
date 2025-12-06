import React, { createContext, useContext, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/api";

export interface User {
  id: string;
  email: string;
  role: "admin" | "lawyer" | "applicant";
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
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

// Use shared API helper from `client/src/lib/api.ts`

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [_, setLocation] = useLocation();

  // Load user on mount
  useEffect(() => {
    refreshUser().finally(() => setIsLoading(false));
  }, []);

  const refreshUser = async () => {
    try {
      const userData = await apiRequest<Omit<User, "name">>("/auth/me");
      const nameFromEmail = userData.email.split("@")[0];
      const fullName =
        [userData.firstName, userData.lastName].filter(Boolean).join(" ").trim() ||
        nameFromEmail;

      setUser({
        ...userData,
        name: fullName,
      });
    } catch {
      setUser(null);
      clearTokens();
    }
  };

  const login = async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Login failed" }));
      throw new Error(error.message || "Login failed");
    }

    const data = await response.json();
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
  };

  const register = async (
    email: string,
    password: string,
    firstName?: string,
    lastName?: string,
    role: "applicant" | "lawyer" = "applicant"
  ) => {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, firstName, lastName, role }),
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Registration failed" }));
      throw new Error(error.message || "Registration failed");
    }

    const data = await response.json();
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
  };

// Update the logout function in AuthProvider
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
