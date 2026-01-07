import React, { createContext, useContext, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { toast } from "@/hooks/use-toast";

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
  loginWithTelegram: (telegramData: any) => Promise<void>;
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
  localStorage.removeItem("iai_user");
  localStorage.removeItem("user");
  localStorage.removeItem("ai_chat_history");
  localStorage.removeItem("dashboardCache");
  localStorage.removeItem("applicationsCache");
}

let refreshUserPromise: Promise<void> | null = null;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [_, setLocation] = useLocation();
  const { t } = useI18n();

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    refreshUser().finally(() => setIsLoading(false));
  }, []);

  const refreshUser = async () => {
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

      if (userData.role === "lawyer" || userData.role === "admin") {
        setLocation("/lawyer");
      } else {
        setLocation("/dashboard");
      }
    } catch (err) {
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
      throw err;
    }
  };

  const logout = async () => {
    try {
      const refreshToken = getRefreshToken();
      await apiRequest("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken, logoutAll: true }),
        skipErrorToast: true,
      });
    } catch (err) {
      console.warn("Logout API call failed:", err);
    } finally {
      clearTokens();
      localStorage.removeItem("iai_user");
      localStorage.removeItem("ai_chat_history");
      localStorage.removeItem("language");
      sessionStorage.clear();
      setUser(null);
      window.location.href = '/auth';
    }
  };

  const loginWithTelegram = async (telegramData: any) => {
    try {
      const data = await apiRequest<any>("/auth/telegram", {
        method: "POST",
        body: JSON.stringify(telegramData),
      });
      setTokens(data.accessToken, data.refreshToken);
      const userData = data.user as Omit<User, "name">;
      const name = [userData.firstName, userData.lastName].filter(Boolean).join(" ");

      setUser({
        ...userData,
        name: name || userData.email.split("@")[0],
      });

      if (userData.role === "lawyer" || userData.role === "admin") {
        setLocation("/lawyer");
      } else {
        setLocation("/dashboard");
      }
    } catch (err) {
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading, refreshUser, loginWithTelegram }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export { apiRequest };
