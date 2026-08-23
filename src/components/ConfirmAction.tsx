"use client";

import React, { useState } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConfirmActionProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  title: string;
  consequence: string;
  isDanger?: boolean;
}

export function ConfirmAction({
  isOpen,
  onClose,
  onConfirm,
  title,
  consequence,
  isDanger = false,
}: ConfirmActionProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    if (reason.trim().length < 3) {
      setError("Please provide a reason (minimum 3 characters).");
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      await onConfirm(reason.trim());
      setReason(""); // clear on success
    } catch (err: any) {
      setError(err?.message || "Action failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card w-full max-w-md p-6 rounded-lg shadow-lg border border-border relative">
        <button
          onClick={() => {
            if (!isSubmitting) onClose();
          }}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
          disabled={isSubmitting}
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 mb-2">
          {isDanger && <AlertTriangle className="w-5 h-5 text-destructive" />}
          <h2 className="text-xl font-bold">{title}</h2>
        </div>
        <p className={`text-sm mb-4 ${isDanger ? "text-destructive" : "text-muted-foreground"}`}>
          {consequence}
        </p>

        <div className="space-y-2 mb-6">
          <label className="text-sm font-medium text-foreground">
            Reason for action <span className="text-destructive">*</span>
          </label>
          <textarea
            className="w-full p-2 border border-border rounded-lg bg-background text-sm min-h-[80px] focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Required for audit log..."
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError("");
            }}
            disabled={isSubmitting}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant={isDanger ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={isSubmitting || reason.trim().length < 3}
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}
