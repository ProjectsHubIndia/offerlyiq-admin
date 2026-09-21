"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { admin } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";

const ACTION_LABELS: Record<string, string> = {
  "user.status": "Changed status",
  "user.role": "Changed role",
  "user.credits_adjust": "Adjusted credits",
  "user.reinstate": "Reinstated user",
  "plan.create": "Created plan",
  "plan.update": "Updated plan",
  "plan.set_prices": "Set prices",
  "plan.set_features": "Set features",
  "plan.set_highlights": "Set highlights",
  "plan.publish": "Published plan",
  "plan.unpublish": "Unpublished plan",
  "plan.archive": "Archived plan",
  "discount.create": "Created discount",
  "discount.update": "Updated discount",
  "discount.disable": "Disabled discount",
  "module_cost.update": "Updated module cost",
  "billing_setting.update": "Updated billing setting",
  "transaction.refund_requested": "Requested refund",
  "webhook.replay": "Replayed webhook",
};

const TARGET_TYPE_LABELS: Record<string, string> = {
  user: "User",
  plan: "Plan",
  discount: "Discount",
  payment_transaction: "Transaction",
  billing_setting: "Billing Setting",
  module_cost: "Module Cost",
  webhook_event: "Webhook Event",
};

const TARGET_TYPES = Object.entries(TARGET_TYPE_LABELS).map(([value, label]) => ({ value, label }));

function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

function diffSummary(before: any, after: any): string {
  if (!before && !after) return "—";
  if (!before) return "created";
  if (!after) return "removed";
  const parts: string[] = [];
  const allKeys = Array.from(new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]));
  for (const key of allKeys) {
    const bv = (before ?? {})[key];
    const av = (after ?? {})[key];
    if (JSON.stringify(bv) !== JSON.stringify(av)) {
      if (bv !== undefined && av !== undefined) {
        parts.push(`${key}: ${bv} → ${av}`);
      } else if (av !== undefined) {
        parts.push(`+${key}: ${av}`);
      }
    }
  }
  return parts.join(" · ") || "no visible change";
}

function targetPageLink(type: string, _id: string): string | null {
  if (type === "user") return `/users`;
  if (type === "plan") return `/plans`;
  if (type === "discount") return `/discounts`;
  if (type === "payment_transaction" || type === "webhook_event") return `/billing`;
  return null;
}

function AuditContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const actorId = searchParams.get("actor_user_id") ?? "";
  const actionFilter = searchParams.get("action") ?? "";
  const targetType = searchParams.get("target_type") ?? "";
  const targetId = searchParams.get("target_id") ?? "";
  const since = searchParams.get("since") ?? "";
  const until = searchParams.get("until") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [auditActions, setAuditActions] = useState<string[]>([]);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [selectedRow, setSelectedRow] = useState<any>(null);

  const setFilter = useCallback(
    (overrides: Record<string, string | undefined>) => {
      const p = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(overrides)) {
        if (v) p.set(k, v);
        else p.delete(k);
      }
      p.delete("page");
      router.push(`${pathname}?${p.toString()}`);
    },
    [searchParams, pathname, router],
  );

  const goToPage = useCallback(
    (p: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (p > 1) params.set("page", String(p));
      else params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, pathname, router],
  );

  useEffect(() => {
    let cancelled = false;
    async function fetchLog() {
      setLoading(true);
      try {
        const { getAccessToken } = await import("@/lib/auth");
        const token = getAccessToken() ?? undefined;
        const params: any = { page, size: 20 };
        if (actorId) params.actor_user_id = actorId;
        if (actionFilter) params.action = actionFilter;
        if (targetType) params.target_type = targetType;
        if (targetId) params.target_id = targetId;
        if (since) params.since = since;
        if (until) params.until = until;
        const data = await admin.getAuditLog(token, params);
        if (!cancelled) {
          setItems(data.items ?? []);
          setTotal(data.total ?? 0);
          setTotalPages(data.pages ?? 1);
        }
      } catch {
        if (!cancelled) toast.error("Failed to load audit log");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchLog();
    return () => {
      cancelled = true;
    };
  }, [actorId, actionFilter, targetType, targetId, since, until, page]);

  useEffect(() => {
    async function fetchMeta() {
      try {
        const { getAccessToken } = await import("@/lib/auth");
        const token = getAccessToken() ?? undefined;
        const [acts, admins1, admins2] = await Promise.allSettled([
          admin.getAuditActions(token),
          admin.getUsers(token, 1, 100, undefined, "admin"),
          admin.getUsers(token, 1, 100, undefined, "superadmin"),
        ]);
        if (acts.status === "fulfilled") setAuditActions(acts.value ?? []);
        const a1 = admins1.status === "fulfilled" ? (admins1.value?.items ?? []) : [];
        const a2 = admins2.status === "fulfilled" ? (admins2.value?.items ?? []) : [];
        setAdminUsers([...a1, ...a2]);
      } catch {}
    }
    fetchMeta();
  }, []);

  const setDatePreset = (preset: "24h" | "7d" | "30d" | "") => {
    const p = new URLSearchParams(searchParams.toString());
    if (!preset) {
      p.delete("since");
      p.delete("until");
    } else {
      const now = new Date();
      const s = new Date(now);
      if (preset === "24h") s.setHours(now.getHours() - 24);
      else if (preset === "7d") s.setDate(now.getDate() - 7);
      else s.setDate(now.getDate() - 30);
      p.set("since", s.toISOString());
      p.set("until", now.toISOString());
    }
    p.delete("page");
    router.push(`${pathname}?${p.toString()}`);
  };

  const hasFilters = !!(actorId || actionFilter || targetType || targetId || since);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-1">Audit Log</h1>
        <p className="text-muted-foreground">
          All admin actions recorded in the system.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            Admin
          </label>
          <select
            value={actorId}
            onChange={(e) =>
              setFilter({ actor_user_id: e.target.value || undefined })
            }
            className="bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary min-w-[160px]"
          >
            <option value="">All admins</option>
            {adminUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.email}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            Action
          </label>
          <select
            value={actionFilter}
            onChange={(e) =>
              setFilter({ action: e.target.value || undefined })
            }
            className="bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary min-w-[190px]"
          >
            <option value="">All actions</option>
            {auditActions.map((a) => (
              <option key={a} value={a}>
                {actionLabel(a)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            Target type
          </label>
          <select
            value={targetType}
            onChange={(e) =>
              setFilter({ target_type: e.target.value || undefined })
            }
            className="bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary min-w-[150px]"
          >
            <option value="">All types</option>
            {TARGET_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            Date range
          </label>
          <div className="flex gap-1">
            {(["24h", "7d", "30d"] as const).map((preset) => (
              <Button
                key={preset}
                variant="outline"
                size="sm"
                className="text-xs px-3"
                onClick={() => setDatePreset(preset)}
              >
                {preset}
              </Button>
            ))}
            {since && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs px-2 text-muted-foreground"
                onClick={() => setDatePreset("")}
                title="Clear date range"
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground self-end mb-0.5"
            onClick={() => router.push(pathname)}
          >
            Clear all
          </Button>
        )}
      </div>

      {targetId && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/20 border border-border px-3 py-2 rounded-md w-fit">
          <span>
            Filtered to target{" "}
            <span className="font-mono text-xs">{targetId}</span>
          </span>
          <button
            className="hover:text-foreground"
            onClick={() => setFilter({ target_id: undefined })}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin mb-4" />
          <p>Loading audit log...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-muted-foreground border border-dashed border-border rounded-lg">
          <p className="text-lg font-medium">No matching activity</p>
          <p className="text-sm mt-1">
            Try removing some filters or broadening the date range.
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {total.toLocaleString()} {total === 1 ? "entry" : "entries"}
          </p>
          <div className="rounded-lg border border-border overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-muted/30 border-b border-border">
                  {["When", "Who", "Action", "Target", "Change", "Reason"].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((row) => {
                  const link = targetPageLink(row.target_type, row.target_id);
                  const targetLabel =
                    TARGET_TYPE_LABELS[row.target_type] ?? row.target_type;
                  const summary = diffSummary(row.before, row.after);
                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-muted/5 transition-colors cursor-pointer"
                      onClick={() => setSelectedRow(row)}
                    >
                      <td
                        className="px-4 py-3 text-sm whitespace-nowrap"
                        title={formatDateTime(row.created_at)}
                      >
                        {relativeTime(row.created_at)}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        {row.actor_email ? (
                          <button
                            className="text-primary hover:underline text-left"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFilter({
                                actor_user_id: row.actor_user_id,
                              });
                            }}
                          >
                            {row.actor_email}
                          </button>
                        ) : (
                          <span className="italic text-muted-foreground">
                            deleted account
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-medium">
                          {actionLabel(row.action)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        {link ? (
                          <a
                            href={link}
                            className="text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {targetLabel}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">
                            {targetLabel}
                          </span>
                        )}
                      </td>
                      <td
                        className="px-4 py-3 text-sm text-muted-foreground max-w-[220px] truncate"
                        title={summary}
                      >
                        {summary}
                      </td>
                      <td
                        className="px-4 py-3 text-sm max-w-[180px] truncate"
                        title={row.reason ?? ""}
                      >
                        {row.reason ?? (
                          <span className="text-muted-foreground italic">
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => goToPage(page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => goToPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail drawer */}
      {selectedRow && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-black/40"
            onClick={() => setSelectedRow(null)}
          />
          <div className="w-full max-w-lg bg-card border-l border-border shadow-xl overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <div>
                <h2 className="text-lg font-semibold">
                  {actionLabel(selectedRow.action)}
                </h2>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  {selectedRow.action}
                </p>
              </div>
              <button
                onClick={() => setSelectedRow(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6 flex-1">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground uppercase font-medium mb-1">
                    When
                  </div>
                  <div>{formatDateTime(selectedRow.created_at)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase font-medium mb-1">
                    Who
                  </div>
                  <div>
                    {selectedRow.actor_email ?? (
                      <span className="italic text-muted-foreground">
                        deleted account
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase font-medium mb-1">
                    Target
                  </div>
                  <div>
                    {TARGET_TYPE_LABELS[selectedRow.target_type] ??
                      selectedRow.target_type}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase font-medium mb-1">
                    IP
                  </div>
                  <div className="font-mono text-xs">
                    {selectedRow.ip ?? "—"}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-muted-foreground uppercase font-medium mb-1">
                    Target ID
                  </div>
                  <div className="font-mono text-xs break-all">
                    {selectedRow.target_id}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-muted-foreground uppercase font-medium mb-1">
                    Reason
                  </div>
                  <div>
                    {selectedRow.reason ?? (
                      <span className="italic text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground uppercase font-medium mb-2">
                  Before
                </div>
                <pre className="bg-muted/30 border border-border rounded-md p-3 text-xs overflow-x-auto whitespace-pre-wrap break-all">
                  {selectedRow.before
                    ? JSON.stringify(selectedRow.before, null, 2)
                    : "—"}
                </pre>
              </div>

              <div>
                <div className="text-xs text-muted-foreground uppercase font-medium mb-2">
                  After
                </div>
                <pre className="bg-muted/30 border border-border rounded-md p-3 text-xs overflow-x-auto whitespace-pre-wrap break-all">
                  {selectedRow.after
                    ? JSON.stringify(selectedRow.after, null, 2)
                    : "—"}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AuditPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin mb-4" />
          <p>Loading...</p>
        </div>
      }
    >
      <AuditContent />
    </Suspense>
  );
}
