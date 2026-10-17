"use client";

import { useEffect, useRef, useState } from "react";
import {
  Download,
  Laptop,
  Loader2,
  Monitor,
  RefreshCw,
  Terminal,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { admin, uploadToStorage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import type { AppPlatform, AppSlot } from "@/types/app-downloads";

// ── helpers ────────────────────────────────────────────────────────────────────

const PLATFORM_ICONS: Record<AppPlatform, typeof Monitor> = {
  windows: Monitor,
  mac: Laptop,
  linux: Terminal,
};

type UploadPhase = "preparing" | "uploading" | "publishing";

interface UploadState {
  fileName: string;
  phase: UploadPhase;
  percent: number;
  controller: AbortController;
}

async function getToken() {
  const { getAccessToken } = await import("@/lib/auth");
  return getAccessToken() || undefined;
}

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error && err.message ? err.message : fallback;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let size = bytes / 1024;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }
  return `${size.toFixed(1)} ${units[unit]}`;
}

/** Same rule the API applies — checked here so a wrong file fails before a long upload. */
function checkFile(slot: AppSlot, file: File): string | null {
  const name = file.name.toLowerCase();
  if (!slot.accepted_extensions.some((ext) => name.endsWith(ext))) {
    return `A ${slot.label} installer must be one of: ${slot.accepted_extensions.join(", ")}`;
  }
  if (file.size === 0) return "That file is empty.";
  if (file.size > slot.max_bytes) {
    return `The file is ${formatBytes(file.size)}; the largest allowed is ${formatBytes(slot.max_bytes)}.`;
  }
  return null;
}

// ── page ───────────────────────────────────────────────────────────────────────

export default function DownloadsPage() {
  const [slots, setSlots] = useState<AppSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploads, setUploads] = useState<Partial<Record<AppPlatform, UploadState>>>({});
  const [toRemove, setToRemove] = useState<AppSlot | null>(null);
  const [removing, setRemoving] = useState(false);
  const fileInputs = useRef<Partial<Record<AppPlatform, HTMLInputElement | null>>>({});

  const isUploading = Object.keys(uploads).length > 0;

  const fetchSlots = async () => {
    try {
      const token = await getToken();
      setSlots(await admin.getAppDownloads(token));
    } catch (err) {
      toast.error(errorMessage(err, "Failed to load app downloads"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, []);

  // Closing the tab cancels the PUT. Nothing goes live until publish, so the website is
  // never broken by it — but the admin should know their upload is about to be lost.
  useEffect(() => {
    if (!isUploading) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isUploading]);

  const setUpload = (platform: AppPlatform, patch: Partial<UploadState> | null) =>
    setUploads((prev) => {
      const next = { ...prev };
      if (patch === null) delete next[platform];
      else next[platform] = { ...(prev[platform] as UploadState), ...patch };
      return next;
    });

  const replaceSlot = (updated: AppSlot) =>
    setSlots((prev) => prev.map((s) => (s.platform === updated.platform ? updated : s)));

  const handleFile = async (slot: AppSlot, file: File) => {
    const problem = checkFile(slot, file);
    if (problem) {
      toast.error(problem);
      return;
    }

    const controller = new AbortController();
    setUploads((prev) => ({
      ...prev,
      [slot.platform]: { fileName: file.name, phase: "preparing", percent: 0, controller },
    }));

    try {
      const token = await getToken();
      // ① where to upload
      const ticket = await admin.createAppUploadUrl(
        slot.platform,
        { file_name: file.name, size_bytes: file.size },
        token,
      );
      // ② straight to storage
      setUpload(slot.platform, { phase: "uploading" });
      await uploadToStorage(
        ticket,
        file,
        (percent) => setUpload(slot.platform, { percent }),
        controller.signal,
      );
      // ③ make it live
      setUpload(slot.platform, { phase: "publishing", percent: 100 });
      const updated = await admin.publishAppDownload(slot.platform, ticket.object_key, token);
      replaceSlot(updated);
      toast.success(`${slot.label} installer is live: ${updated.download?.file_name}`);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError")
        toast.info("Upload cancelled. Nothing was changed.");
      else toast.error(errorMessage(err, "Upload failed"));
    } finally {
      setUpload(slot.platform, null);
    }
  };

  const handleRemove = async () => {
    if (!toRemove) return;
    setRemoving(true);
    try {
      const token = await getToken();
      await admin.removeAppDownload(toRemove.platform, token);
      replaceSlot({ ...toRemove, download: null });
      toast.success(`${toRemove.label} download removed from the website.`);
      setToRemove(null);
    } catch (err) {
      toast.error(errorMessage(err, "Failed to remove"));
    } finally {
      setRemoving(false);
    }
  };

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-1">App Downloads</h1>
            <p className="text-muted-foreground">
              The desktop installers offered on the website. One file per platform — uploading
              a new one replaces it.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchSlots} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {loading && slots.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {slots.map((slot) => {
              const Icon = PLATFORM_ICONS[slot.platform];
              const upload = uploads[slot.platform];
              const file = slot.download;
              return (
                <div
                  key={slot.platform}
                  className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-foreground">{slot.label}</h2>
                        <p className="text-xs text-muted-foreground">
                          {slot.accepted_extensions.join(", ")} · up to {formatBytes(slot.max_bytes)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        file ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {file ? "Live" : "Not uploaded"}
                    </span>
                  </div>

                  {/* Current file */}
                  <div className="flex-1 rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm">
                    {file ? (
                      <div className="space-y-1">
                        <p className="font-medium text-foreground break-all">{file.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {file.size_label} · updated {new Date(file.updated_at).toLocaleString()}
                        </p>
                        {file.uploaded_by_email && (
                          <p className="text-xs text-muted-foreground truncate" title={file.uploaded_by_email}>
                            by {file.uploaded_by_email}
                          </p>
                        )}
                        <a
                          href={file.url}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline pt-1"
                        >
                          <Download className="w-3 h-3" />
                          Download to check
                        </a>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">
                        Nothing uploaded — the website shows no {slot.label} button.
                      </p>
                    )}
                  </div>

                  {/* Upload progress */}
                  {upload && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground truncate pr-2" title={upload.fileName}>
                          {upload.phase === "preparing" && "Preparing…"}
                          {upload.phase === "uploading" && `Uploading ${upload.fileName}`}
                          {upload.phase === "publishing" && "Publishing…"}
                        </span>
                        <span className="font-semibold text-foreground">{upload.percent}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-200"
                          style={{ width: `${upload.percent}%` }}
                        />
                      </div>
                      {upload.phase === "uploading" && (
                        <p className="text-[11px] text-muted-foreground">
                          Keep this tab open. Nothing changes on the website until the upload finishes.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <input
                      ref={(el) => {
                        fileInputs.current[slot.platform] = el;
                      }}
                      type="file"
                      accept={slot.accepted_extensions.join(",")}
                      className="hidden"
                      onChange={(e) => {
                        const picked = e.target.files?.[0];
                        e.target.value = ""; // so picking the same file again still fires
                        if (picked) handleFile(slot, picked);
                      }}
                    />
                    {upload ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        disabled={upload.phase !== "uploading"}
                        onClick={() => upload.controller.abort()}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => fileInputs.current[slot.platform]?.click()}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {file ? "Replace" : "Upload"}
                      </Button>
                    )}
                    {file && !upload && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setToRemove(slot)}
                        aria-label={`Remove ${slot.label} installer`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={toRemove !== null}
        onClose={() => !removing && setToRemove(null)}
        onConfirm={handleRemove}
        title={`Remove the ${toRemove?.label ?? ""} installer?`}
        description={`The website will stop offering a ${toRemove?.label ?? ""} download and ${
          toRemove?.download?.file_name ?? "the file"
        } will be deleted. You can upload a new one at any time.`}
        confirmText="Remove"
        isDestructive
        isLoading={removing}
      />
    </>
  );
}
