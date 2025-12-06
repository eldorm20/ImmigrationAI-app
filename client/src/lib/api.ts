import { toast } from "@/hooks/use-toast";

const API_URL = import.meta.env.VITE_API_URL || "/api";

interface RequestOptions extends RequestInit {
  skipErrorToast?: boolean;
  timeout?: number;
}

export class APIError extends Error {
  constructor(
    public statusCode: number,
    public data: any,
    message?: string
  ) {
    super(message || `API Error: ${statusCode}`);
  }
}

async function getAuthToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}

async function setAuthTokens(accessToken: string, refreshToken: string): Promise<void> {
  if (typeof window === "undefined") return;
  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("refreshToken", refreshToken);
}

async function clearAuthTokens(): Promise<void> {
  if (typeof window === "undefined") return;
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {},
  retryCount = 0
): Promise<T> {
  const {
    skipErrorToast = false,
    timeout = 30000,
    ...fetchOptions
  } = options;

  // Normalize headers to a plain object so we can safely assign properties
  const normalizeHeaders = (h?: HeadersInit): Record<string, string> => {
    const out: Record<string, string> = { "Content-Type": "application/json" };
    if (!h) return out;
    if (h instanceof Headers) {
      h.forEach((v, k) => (out[k] = v));
    } else if (Array.isArray(h)) {
      h.forEach(([k, v]) => (out[k] = v));
    } else {
      Object.assign(out, h);
    }
    return out;
  };

  const headers = normalizeHeaders(fetchOptions.headers);

  const token = await getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...fetchOptions,
      headers,
      credentials: "include",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle 401 - Try to refresh token
    if (response.status === 401 && retryCount < 1) {
      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        try {
          const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
            credentials: "include",
          });

          if (refreshResponse.ok) {
            const { accessToken, refreshToken: newRefreshToken } =
              await refreshResponse.json();
            await setAuthTokens(accessToken, newRefreshToken);

            // Retry original request
            return apiRequest<T>(endpoint, options, retryCount + 1);
          }
        } catch (err) {
          await clearAuthTokens();
          if (typeof window !== "undefined") {
            window.location.href = "/auth";
          }
          throw err;
        }
      }

      await clearAuthTokens();
      if (typeof window !== "undefined") {
        window.location.href = "/auth";
      }
      throw new APIError(401, null, "Session expired");
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new APIError(response.status, errorData);
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof APIError) {
      if (!skipErrorToast && error.statusCode !== 401) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
      throw error;
    }

    if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
      const err = new APIError(0, null, "Network error");
      if (!skipErrorToast) {
        toast({
          title: "Network Error",
          description: "Please check your connection and try again",
          variant: "destructive",
        });
      }
      throw err;
    }

    throw error;
  }
}