export type AppPlatform = "windows" | "mac" | "linux";

export interface AppDownload {
  platform: AppPlatform;
  label: string;
  file_name: string;
  size_bytes: number;
  size_label: string;
  url: string;
  updated_at: string;
  uploaded_by_email: string | null;
}

/** One platform's slot: what it accepts and what it currently holds. */
export interface AppSlot {
  platform: AppPlatform;
  label: string;
  accepted_extensions: string[];
  max_bytes: number;
  download: AppDownload | null;
}

export interface AppUploadTicket {
  upload_url: string;
  method: "PUT";
  headers: Record<string, string>;
  object_key: string;
  expires_at: string;
}
