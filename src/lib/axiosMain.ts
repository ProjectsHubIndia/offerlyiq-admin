import axios, { type AxiosRequestConfig } from "axios";
import { getRefreshToken, setTokens, clearTokens } from "@/lib/auth";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";

const axiosMain = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    "ngrok-skip-browser-warning": "true",
  },
});

export class InsufficientCreditsError extends Error {
  readonly isInsufficientCredits = true;
  constructor(message: string) {
    super(message);
    this.name = "InsufficientCreditsError";
  }
}

export const isInsufficientCreditsError = (err: any): err is InsufficientCreditsError => 
  err?.isInsufficientCredits === true;

type RetryableConfig = AxiosRequestConfig & { _retried?: boolean };

// Concurrent 401s share one in-flight refresh instead of each firing their own.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = getRefreshToken();
      if (!refreshToken) throw new Error("No refresh token available");
      // Plain axios (not axiosMain) so this call never recurses into this interceptor.
      const { data } = await axios.post<{
        access_token: string;
        refresh_token: string;
      }>(`${API_URL}/auth/refresh`, { refresh_token: refreshToken });
      setTokens(data.access_token, data.refresh_token);
      return data.access_token;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

axiosMain.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (axios.isAxiosError(error)) {
      const config = error.config as RetryableConfig | undefined;
      const hadAuthHeader = Boolean(
        config?.headers &&
        (config.headers as Record<string, unknown>).Authorization,
      );

      if (
        error.response?.status === 401 &&
        config &&
        hadAuthHeader &&
        !config._retried
      ) {
        config._retried = true;
        try {
          const newAccessToken = await refreshAccessToken();
          config.headers = {
            ...config.headers,
            Authorization: `Bearer ${newAccessToken}`,
          };
          return axiosMain.request(config);
        } catch {
          clearTokens();
          if (typeof window !== "undefined") {
            window.location.replace("/login");
          }
        }
      }

      if (error.response?.status === 429) {
        return Promise.reject(new Error("Please slow down and try again shortly."));
      }

      const detail = error.response?.data?.detail;
      const message =
        typeof detail === "string"
          ? detail
          : Array.isArray(detail)
            ? detail.map((e: { msg: string }) => e.msg).join(", ")
            : "Request failed";
            
      if (error.response?.status === 402) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("insufficientCredits", { detail: message }));
        }
        return Promise.reject(new InsufficientCreditsError(message));
      }

      return Promise.reject(new Error(message));
    }
    return Promise.reject(error);
  },
);

export default axiosMain;
