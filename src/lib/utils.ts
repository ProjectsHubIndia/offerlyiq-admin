import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Safely extracts the API error detail or message from Axios, FastAPI or ApiError responses. */
export function getApiErrorDetail(err: unknown): string {
  if (!err) return "An unexpected error occurred";
  
  if (typeof err === "string") return err;

  if (typeof err === "object" && err !== null) {
    const anyErr = err as any;

    // Axios response data
    const responseData = anyErr.response?.data;
    if (typeof responseData === "string" && responseData.trim()) {
      return responseData;
    }
    if (responseData && typeof responseData === "object") {
      const detail = responseData.detail;
      if (typeof detail === "string" && detail.trim()) return detail;
      if (Array.isArray(detail)) {
        return detail.map((d: any) => d.msg || d.message || JSON.stringify(d)).join("; ");
      }
      if (typeof detail === "object" && detail !== null) {
        return JSON.stringify(detail);
      }
      if (typeof responseData.message === "string" && responseData.message.trim()) {
        return responseData.message;
      }
      if (typeof responseData.error === "string" && responseData.error.trim()) {
        return responseData.error;
      }
    }

    // ApiError data detail
    const dataDetail = anyErr.data?.detail;
    if (typeof dataDetail === "string" && dataDetail.trim()) return dataDetail;
    if (Array.isArray(dataDetail)) {
      return dataDetail.map((d: any) => d.msg || d.message || JSON.stringify(d)).join("; ");
    }
    if (typeof anyErr.data?.message === "string" && anyErr.data.message.trim()) {
      return anyErr.data.message;
    }

    // Error message
    if (typeof anyErr.message === "string" && anyErr.message && anyErr.message !== "Error") {
      return anyErr.message;
    }
  }

  return "An unexpected error occurred";
}

export function getApiErrorStatus(err: unknown): number | undefined {
  if (typeof err === "object" && err !== null) {
    const anyErr = err as any;
    return anyErr.status ?? anyErr.response?.status;
  }
  return undefined;
}
