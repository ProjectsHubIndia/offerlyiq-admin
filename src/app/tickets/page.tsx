"use client";

import { useEffect, useRef, useState } from "react";
import { admin } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { ExternalLink, Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";

// ── helpers ────────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  general: "General Support",
  billing: "Billing & Payments",
  security: "Security",
  partnerships: "Partnerships & Enterprise",
  bug: "Bug Reports",
  press: "Press & Media",
};

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
];

function statusClass(status: string) {
  if (status === "open") return "bg-blue-500/10 text-blue-500";
  if (status === "in_progress") return "bg-amber-500/10 text-amber-600";
  if (status === "resolved") return "bg-green-500/10 text-green-600";
  return "bg-muted text-muted-foreground";
}

async function getToken() {
  const { getAccessToken } = await import("@/lib/auth");
  return getAccessToken() || undefined;
}

// ── page ───────────────────────────────────────────────────────────────────────

type TabValue = "" | "open" | "in_progress" | "resolved";

export default function TicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabValue>("");
  const [summary, setSummary] = useState({ open: 0, in_progress: 0, resolved: 0, total: 0 });

  // detail modal
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [patchStatus, setPatchStatus] = useState("");
  const [patchNote, setPatchNote] = useState("");
  const [patchLoading, setPatchLoading] = useState(false);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── data fetching ────────────────────────────────────────────────────────────

  const fetchSummary = async () => {
    try {
      const token = await getToken();
      const data = await admin.getTicketsSummary(token);
      setSummary({
        open: data.open ?? 0,
        in_progress: data.in_progress ?? 0,
        resolved: data.resolved ?? 0,
        total: data.total ?? 0,
      });
    } catch {
      // non-critical
    }
  };

  const fetchTickets = async (p: number, q?: string, status?: string) => {
    setLoading(true);
    try {
      const token = await getToken();
      const params: Record<string, unknown> = { page: p, size: 20 };
      if (q) params.q = q;
      if (status) params.status = status;
      const data = await admin.getTickets(token, params as any);
      setTickets(data.items || []);
      setTotalPages(data.pages || 1);
      setTotalItems(data.total || 0);
      setPage(p);
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch tickets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      fetchTickets(1, searchQuery, activeTab || undefined);
    }, 400);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [searchQuery, activeTab]);

  // ── detail modal ─────────────────────────────────────────────────────────────

  const openDetail = (ticket: any) => {
    setSelectedTicket(ticket);
    setPatchStatus(ticket.status);
    setPatchNote(ticket.admin_note || "");
  };

  const handlePatch = async () => {
    if (!selectedTicket) return;
    const updates: { status?: string; admin_note?: string | null } = {};
    if (patchStatus !== selectedTicket.status) updates.status = patchStatus;
    const originalNote = selectedTicket.admin_note || "";
    if (patchNote !== originalNote) updates.admin_note = patchNote || null;
    if (Object.keys(updates).length === 0) {
      toast.info("No changes to save.");
      return;
    }
    setPatchLoading(true);
    try {
      const token = await getToken();
      const updated = await admin.updateTicket(selectedTicket.id, updates, token);
      setSelectedTicket(updated);
      toast.success("Ticket updated.");
      fetchSummary();
      fetchTickets(page, searchQuery, activeTab || undefined);
    } catch (err: any) {
      toast.error(err.message || "Failed to update ticket");
    } finally {
      setPatchLoading(false);
    }
  };

  // ── tabs ─────────────────────────────────────────────────────────────────────

  const tabs: { value: TabValue; label: string; count: number }[] = [
    { value: "", label: "All", count: summary.total },
    { value: "open", label: "Open", count: summary.open },
    { value: "in_progress", label: "In Progress", count: summary.in_progress },
    { value: "resolved", label: "Resolved", count: summary.resolved },
  ];

  // ── columns ──────────────────────────────────────────────────────────────────

  const columns: Column<any>[] = [
    {
      key: "reference",
      header: "Reference",
      render: (t) => (
        <button
          onClick={() => openDetail(t)}
          className="font-mono text-xs font-bold text-primary hover:underline"
        >
          {t.reference}
        </button>
      ),
    },
    {
      key: "sender",
      header: "Sender",
      render: (t) => (
        <>
          <div className="font-medium text-sm text-foreground">{t.name}</div>
          <div className="text-xs text-muted-foreground">{t.email}</div>
        </>
      ),
    },
    {
      key: "subject",
      header: "Subject / Message",
      render: (t) => (
        <div className="max-w-xs truncate text-sm text-muted-foreground">
          {t.subject || t.message?.slice(0, 80)}
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (t) => (
        <span className="text-xs text-muted-foreground">
          {CATEGORY_LABELS[t.category] ?? t.category}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (t) => (
        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${statusClass(t.status)}`}>
          {t.status_label}
        </span>
      ),
    },
    {
      key: "received",
      header: "Received",
      render: (t) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {new Date(t.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (t) => (
        <Button variant="outline" size="sm" className="h-8 px-2 text-xs" onClick={() => openDetail(t)}>
          View
        </Button>
      ),
    },
  ];

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Support Tickets</h1>
          <p className="text-muted-foreground">
            Messages from the Contact Us form ({totalItems} total).
          </p>
        </div>

        {/* Status tabs */}
        <div className="flex flex-wrap gap-0 border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setActiveTab(tab.value);
                setPage(1);
              }}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab.value
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              <span
                className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.value
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Search by name, email, subject, message…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
          />
        </div>

        {/* Table */}
        <DataTable
          columns={columns}
          data={tickets}
          isLoading={loading}
          keyExtractor={(t) => t.id}
          emptyMessage="No tickets found."
          pagination={{
            currentPage: page,
            totalPages: totalPages,
            onPageChange: (p) => fetchTickets(p, searchQuery, activeTab || undefined),
          }}
        />
      </div>

      {/* ── Detail modal ─────────────────────────────────────────────────────── */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col rounded-lg shadow-lg border border-border">
            {/* Header */}
            <div className="p-5 border-b border-border flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-mono text-sm font-bold text-foreground">
                  {selectedTicket.reference}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-semibold ${statusClass(
                    selectedTicket.status,
                  )}`}
                >
                  {selectedTicket.status_label}
                </span>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-muted-foreground hover:text-foreground shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              {/* Sender info */}
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-sm font-semibold text-foreground">{selectedTicket.name}</p>
                  <a
                    href={`mailto:${selectedTicket.email}?subject=Re: ${encodeURIComponent(
                      selectedTicket.subject || selectedTicket.reference,
                    )}`}
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    {selectedTicket.email}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(selectedTicket.created_at).toLocaleString()}
                    {" · "}
                    {CATEGORY_LABELS[selectedTicket.category] ?? selectedTicket.category}
                  </p>
                </div>
                {selectedTicket.user_id && (
                  <a
                    href={`/users`}
                    title={`User ID: ${selectedTicket.user_id}`}
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-colors"
                  >
                    View user
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {/* Subject */}
              {selectedTicket.subject && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Subject
                  </p>
                  <p className="text-sm text-foreground">{selectedTicket.subject}</p>
                </div>
              )}

              {/* Message */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Message
                </p>
                <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {selectedTicket.message}
                </div>
              </div>

              {/* Status + Note + Save */}
              <div className="space-y-4 pt-2 border-t border-border">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    Status
                  </label>
                  <select
                    value={patchStatus}
                    onChange={(e) => setPatchStatus(e.target.value)}
                    className="px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary w-48"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    Private note{" "}
                    <span className="font-normal">(never shown to the sender)</span>
                  </label>
                  <textarea
                    value={patchNote}
                    onChange={(e) => setPatchNote(e.target.value)}
                    rows={3}
                    placeholder="Add an internal note…"
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  />
                </div>

                <div className="flex items-end justify-between gap-4">
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {selectedTicket.handled_by_email && (
                      <p>
                        Handled by{" "}
                        <span className="font-medium text-foreground">
                          {selectedTicket.handled_by_email}
                        </span>
                      </p>
                    )}
                    {selectedTicket.resolved_at && (
                      <p>
                        Resolved{" "}
                        {new Date(selectedTicket.resolved_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <Button onClick={handlePatch} disabled={patchLoading} size="sm">
                    {patchLoading && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    )}
                    Save changes
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
