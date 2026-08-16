"use client";

import { AlertCircle, CheckCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormAlertProps {
  type: "error" | "success";
  message: string;
  /** Adds text-center — used on auth pages */
  center?: boolean;
  /** Prepends the default icon (AlertCircle / CheckCircle) */
  icon?: boolean;
  /** Extra class names (e.g. "mb-4") */
  className?: string;
  /** Renders an X button that calls this handler */
  onDismiss?: () => void;
}

export function FormAlert({
  type,
  message,
  center,
  icon,
  className,
  onDismiss,
}: FormAlertProps) {
  const isError = type === "error";
  const colorClasses = isError
    ? "bg-red-500/10 border-red-500/20 text-red-400"
    : "bg-green-500/10 border-green-500/20 text-green-400";
  const Icon = isError ? AlertCircle : CheckCircle;
  const hasLayout = icon || !!onDismiss;

  return (
    <div
      className={cn(
        "p-3 rounded-lg border text-sm",
        colorClasses,
        hasLayout && "flex items-center gap-2",
        onDismiss && "justify-between",
        center && "text-center",
        className,
      )}
    >
      {icon && <Icon className="w-4 h-4 shrink-0" />}
      <span>{message}</span>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
