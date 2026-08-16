import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Safely extracts the FastAPI `detail` field from an Axios error response. */
export function getApiErrorDetail(err: unknown): string | undefined {
  if (
    err !== null &&
    typeof err === "object" &&
    "response" in err &&
    err.response !== null &&
    typeof err.response === "object" &&
    "data" in err.response &&
    err.response.data !== null &&
    typeof err.response.data === "object" &&
    "detail" in err.response.data &&
    typeof (err.response.data as Record<string, unknown>).detail === "string"
  ) {
    return (err.response.data as { detail: string }).detail;
  }
  return undefined;
}
