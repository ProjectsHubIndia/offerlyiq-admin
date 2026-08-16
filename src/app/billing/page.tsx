"use client";

import { useEffect, useState } from "react";
import { admin } from "@/lib/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  Reply,
  Eye,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";

export default function BillingOpsPage() {
  const [activeTab, setActiveTab] = useState<
    "webhooks" | "transactions" | "chargebacks"
  >("webhooks");

  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [chargebacks, setChargebacks] = useState<any[]>([]);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [refundReason, setRefundReason] = useState("");

  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<any>(null);
  const [webhookDetailsLoading, setWebhookDetailsLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { getAccessToken } = await import("@/lib/auth");
      const token = getAccessToken() || undefined;

      if (activeTab === "webhooks") {
        const response = await admin.getWebhooks(token, currentPage, pageSize);
        setWebhooks(response?.items || []);
        setTotalPages(response?.pages || 1);
      } else if (activeTab === "transactions") {
        const response = await admin.getTransactions(token, currentPage, pageSize);
        setTransactions(response?.items || []);
        setTotalPages(response?.pages || 1);
      } else if (activeTab === "chargebacks") {
        const response = await admin.getChargebacks(token, currentPage, pageSize);
        setChargebacks(response?.items || []);
        setTotalPages(response?.pages || 1);
      }
    } catch (err) {
      console.error(`Failed to fetch ${activeTab}`, err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [activeTab, currentPage]);

  const handleReplay = async (id: string) => {
    setActionLoading(id);
    try {
      const { getAccessToken } = await import("@/lib/auth");
      const token = getAccessToken() || undefined;
      await admin.replayWebhook(id, token);
      alert("Webhook replay triggered successfully");
      fetchData();
    } catch (err) {
      console.error("Failed to replay webhook", err);
      alert("Failed to replay webhook");
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewWebhook = async (hook: any) => {
    setShowWebhookModal(true);
    setWebhookDetailsLoading(true);
    try {
      const { getAccessToken } = await import("@/lib/auth");
      const token = getAccessToken() || undefined;
      const details = await admin.getWebhookDetail(hook.id, token);
      setSelectedWebhook(details);
    } catch (err) {
      console.error("Failed to fetch webhook details", err);
      setSelectedWebhook(hook); // fallback to basic hook data
    } finally {
      setWebhookDetailsLoading(false);
    }
  };

  const handleRefund = async () => {
    if (!selectedTx || !refundReason) return;
    setActionLoading("refund");
    try {
      const { getAccessToken } = await import("@/lib/auth");
      const token = getAccessToken() || undefined;
      await admin.refundTransaction(selectedTx.id, refundReason, token);
      alert("Refund initiated successfully");
      setShowRefundModal(false);
      setRefundReason("");
      fetchData();
    } catch (err) {
      console.error("Failed to refund transaction", err);
      alert("Failed to refund transaction");
    } finally {
      setActionLoading(null);
    }
  };

  const webhookColumns: Column<any>[] = [
    {
      key: "status",
      header: "Status",
      render: (hook) => (
        <>
          {hook.status === "processed" ? (
            <div className="flex items-center gap-2 text-green-500">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs font-medium">Processed</span>
            </div>
          ) : hook.status === "failed" ? (
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-4 h-4" />
              <span className="text-xs font-medium">Failed</span>
            </div>
          ) : hook.status === "ignored" ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-muted-foreground/50" />
              <span className="text-xs font-medium">Ignored</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-muted-foreground/50" />
              <span className="text-xs font-medium capitalize">
                {hook.status || "Pending"}
              </span>
            </div>
          )}
        </>
      ),
    },
    {
      key: "event_type",
      header: "Event Type",
      render: (hook) => (
        <span className="font-mono text-xs">{hook.event_type}</span>
      ),
    },
    {
      key: "provider_id",
      header: "Provider ID",
      render: (hook) => (
        <span className="font-mono text-xs text-muted-foreground">
          {hook.provider_event_id}
        </span>
      ),
    },
    {
      key: "date",
      header: "Date",
      render: (hook) => (
        <span className="text-muted-foreground">
          {hook.occurred_at
            ? new Date(hook.occurred_at).toLocaleString()
            : "N/A"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (hook) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => handleViewWebhook(hook)}
            title="View Details"
          >
            <Eye className="w-3.5 h-3.5" />
          </Button>
          {hook.status === "failed" && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={() => handleReplay(hook.id)}
              disabled={actionLoading === hook.id}
              title="Replay Webhook"
            >
              {actionLoading === hook.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RotateCcw className="w-3.5 h-3.5" />
              )}
            </Button>
          )}
        </div>
      ),
    },
  ];

  const createTxColumns = (showActions: boolean): Column<any>[] => {
    const cols: Column<any>[] = [
      {
        key: "status",
        header: "Status",
        render: (tx) => (
          <span
            className={`px-2 py-0.5 rounded text-xs font-bold capitalize ${
              tx.status === "completed"
                ? "bg-green-500/10 text-green-500"
                : tx.status === "refunded"
                  ? "bg-yellow-500/10 text-yellow-500"
                  : tx.status === "chargeback"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-muted text-muted-foreground"
            }`}
          >
            {tx.status}
          </span>
        ),
      },
      {
        key: "amount",
        header: "Amount",
        render: (tx) => (
          <span className="font-mono text-sm">
            {tx.amount_minor
              ? `${tx.currency_code} ${(tx.amount_minor / 100).toFixed(2)}`
              : "-"}
          </span>
        ),
      },
      {
        key: "user_id",
        header: "User ID",
        render: (tx) => (
          <span className="font-mono text-xs text-muted-foreground truncate max-w-[120px] block">
            {tx.user_id}
          </span>
        ),
      },
      {
        key: "provider_tx",
        header: "Provider TX",
        render: (tx) => (
          <span className="font-mono text-xs text-muted-foreground truncate max-w-[150px] block">
            {tx.provider_transaction_id}
          </span>
        ),
      },
      {
        key: "date",
        header: "Date",
        render: (tx) => (
          <span className="text-xs text-muted-foreground">
            {new Date(tx.created_at).toLocaleString()}
          </span>
        ),
      },
    ];

    if (showActions) {
      cols.push({
        key: "actions",
        header: "Actions",
        align: "right",
        render: (tx) => (
          <div className="flex justify-end">
            {tx.status === "completed" && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10"
                onClick={() => {
                  setSelectedTx(tx);
                  setShowRefundModal(true);
                }}
                title="Refund Transaction"
              >
                <Reply className="w-3.5 h-3.5 mr-1" /> Refund
              </Button>
            )}
          </div>
        ),
      });
    }

    return cols;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">
            Billing Operations
          </h1>
          <p className="text-muted-foreground">
            Monitor webhook events and transaction logs.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Data
        </button>
      </div>

      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("webhooks")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "webhooks" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Webhooks
        </button>
        <button
          onClick={() => setActiveTab("transactions")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "transactions" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Transactions
        </button>
        <button
          onClick={() => setActiveTab("chargebacks")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "chargebacks" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Chargebacks
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">
            {activeTab === "webhooks" && "Recent Webhook Events"}
            {activeTab === "transactions" && "Recent Transactions"}
            {activeTab === "chargebacks" && "Chargebacks & Disputes"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {activeTab === "webhooks" &&
              "Logs from Paddle or Stripe integration"}
            {activeTab === "transactions" &&
              "Real-money payments on the platform"}
            {activeTab === "chargebacks" &&
              "Disputed or charged back transactions"}
          </p>
        </div>

        {activeTab === "webhooks" && (
          <DataTable
            columns={webhookColumns}
            data={webhooks}
            isLoading={loading}
            keyExtractor={(hook) => hook.id || Math.random().toString()}
            emptyMessage="No webhook events recorded recently."
            pagination={{
              currentPage,
              totalPages,
              onPageChange: setCurrentPage,
            }}
          />
        )}

        {(activeTab === "transactions" || activeTab === "chargebacks") && (
          <DataTable
            columns={createTxColumns(activeTab === "transactions")}
            data={activeTab === "transactions" ? transactions : chargebacks}
            isLoading={loading}
            keyExtractor={(tx) => tx.id || Math.random().toString()}
            emptyMessage="No records found."
            pagination={{
              currentPage,
              totalPages,
              onPageChange: setCurrentPage,
            }}
          />
        )}
      </div>

      {/* Refund Modal */}
      {showRefundModal && selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card w-full max-w-md p-6 rounded-lg shadow-lg border border-border relative">
            <h2 className="text-xl font-bold text-destructive mb-4">
              Refund Transaction
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              You are about to refund transaction{" "}
              <strong>{selectedTx.id}</strong> for{" "}
              <strong className="text-foreground">
                {selectedTx.currency_code}{" "}
                {(selectedTx.amount_minor / 100).toFixed(2)}
              </strong>
              . This action cannot be undone.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Reason for Refund
                </label>
                <input
                  type="text"
                  placeholder="e.g. Customer requested, accidental charge"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowRefundModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleRefund}
                  disabled={actionLoading === "refund" || !refundReason.trim()}
                >
                  {actionLoading === "refund" ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Confirm Refund
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Webhook Details Modal */}
      {showWebhookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card w-full max-w-3xl p-6 rounded-lg shadow-lg border border-border relative max-h-[90vh] flex flex-col">
            <button
              onClick={() => setShowWebhookModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-1">Webhook Details</h2>
            {selectedWebhook && (
              <p className="text-sm text-muted-foreground mb-4 font-mono">
                {selectedWebhook.event_type} | {selectedWebhook.id}
              </p>
            )}

            <div className="flex-1 overflow-y-auto min-h-[300px]">
              {webhookDetailsLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : selectedWebhook ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm bg-muted/20 p-4 rounded-md border border-border">
                    <div>
                      <span className="font-medium text-muted-foreground">
                        Status:
                      </span>{" "}
                      <span className="capitalize">
                        {selectedWebhook.status}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">
                        Provider Event ID:
                      </span>{" "}
                      <span className="font-mono">
                        {selectedWebhook.provider_event_id}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">
                        Occurred At:
                      </span>{" "}
                      {selectedWebhook.occurred_at
                        ? new Date(selectedWebhook.occurred_at).toLocaleString()
                        : "N/A"}
                    </div>
                    {selectedWebhook.error_message && (
                      <div className="col-span-2">
                        <span className="font-medium text-muted-foreground">
                          Error:
                        </span>{" "}
                        <span className="text-destructive font-mono text-xs">
                          {selectedWebhook.error_message}
                        </span>
                      </div>
                    )}
                  </div>

                  {selectedWebhook.payload && selectedWebhook.payload.data && (
                    <div className="bg-muted/10 p-4 rounded-md border border-border">
                      <h3 className="text-sm font-medium mb-3">
                        Extracted Details
                      </h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {selectedWebhook.payload.data.custom_data?.user_id && (
                          <div>
                            <span className="text-muted-foreground block text-xs">
                              User ID
                            </span>
                            <span className="font-mono">
                              {selectedWebhook.payload.data.custom_data.user_id}
                            </span>
                          </div>
                        )}
                        {selectedWebhook.payload.data.customer_id && (
                          <div>
                            <span className="text-muted-foreground block text-xs">
                              Customer ID
                            </span>
                            <span className="font-mono">
                              {selectedWebhook.payload.data.customer_id}
                            </span>
                          </div>
                        )}
                        {selectedWebhook.payload.data.custom_data
                          ?.plan_code && (
                          <div>
                            <span className="text-muted-foreground block text-xs">
                              Plan Code
                            </span>
                            <span className="capitalize font-medium">
                              {
                                selectedWebhook.payload.data.custom_data
                                  .plan_code
                              }
                            </span>
                          </div>
                        )}
                        {selectedWebhook.payload.data.details?.totals
                          ?.total && (
                          <div>
                            <span className="text-muted-foreground block text-xs">
                              Total Amount
                            </span>
                            <span className="font-mono text-green-500 font-bold">
                              $
                              {(
                                parseInt(
                                  selectedWebhook.payload.data.details.totals
                                    .total,
                                ) / 100
                              ).toFixed(2)}{" "}
                              {selectedWebhook.payload.data.currency_code}
                            </span>
                          </div>
                        )}
                        {selectedWebhook.payload.data.items?.[0]?.price
                          ?.description && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground block text-xs">
                              Item Description
                            </span>
                            <span>
                              {
                                selectedWebhook.payload.data.items[0].price
                                  .description
                              }
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedWebhook.payload && (
                    <div>
                      <details>
                        <summary className="text-sm font-medium mb-2 cursor-pointer hover:text-primary">
                          View Raw JSON Payload
                        </summary>
                        <pre className="bg-muted p-4 rounded-md overflow-x-auto text-xs font-mono border border-border mt-2">
                          {JSON.stringify(selectedWebhook.payload, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Failed to load details.
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border">
              <Button
                variant="outline"
                onClick={() => setShowWebhookModal(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
