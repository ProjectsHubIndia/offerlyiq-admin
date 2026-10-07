"use client";

import { useEffect, useState } from "react";
import { admin } from "@/lib/api";
import { Loader2, X, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface UserProfileModalProps {
  userId: string | null;
  onClose: () => void;
}

const CURRENCY_EXPONENTS: Record<string, number> = {
  JPY: 0, KRW: 0, BIF: 0, CLP: 0, GNF: 0, ISK: 0, MGA: 0, PYG: 0,
  RWF: 0, UGX: 0, VND: 0, VUV: 0, XAF: 0, XOF: 0, XPF: 0,
  KWD: 3, BHD: 3, OMR: 3, JOD: 3,
};

function formatAmount(amountMinor: number | string | null | undefined, currencyCode?: string | null): string {
  if (amountMinor === null || amountMinor === undefined) return "-";
  const minor = typeof amountMinor === "string" ? parseInt(amountMinor, 10) : amountMinor;
  if (isNaN(minor)) return "-";
  const code = currencyCode || "USD";
  const exp = CURRENCY_EXPONENTS[code] ?? 2;
  return `${code} ${(minor / Math.pow(10, exp)).toFixed(exp)}`;
}

export function UserProfileModal({ userId, onClose }: UserProfileModalProps) {
  const [userDetails, setUserDetails] = useState<any>(null);
  const [userLedger, setUserLedger] = useState<any[]>([]);
  const [userTransactions, setUserTransactions] = useState<any[]>([]);
  const [userMargin, setUserMargin] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setUserDetails(null);
      setUserLedger([]);
      setUserTransactions([]);
      setUserMargin(null);
      try {
        const { getAccessToken } = await import("@/lib/auth");
        const token = getAccessToken() || undefined;
        const results = await Promise.allSettled([
          admin.getUserDetail(userId!, token),
          admin.getUserLedger(userId!, token),
          admin.getUserTransactions(userId!, token),
          admin.userMargin(userId!, token),
        ]);
        if (!cancelled) {
          setUserDetails(results[0].status === "fulfilled" ? results[0].value : null);
          setUserLedger(results[1].status === "fulfilled" ? results[1].value || [] : []);
          setUserTransactions(results[2].status === "fulfilled" ? results[2].value || [] : []);
          setUserMargin(results[3].status === "fulfilled" ? results[3].value : null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [userId]);

  if (!userId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col rounded-lg shadow-lg border border-border relative">
        <div className="p-6 border-b border-border flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">
                {userDetails?.full_name || "User"} Details
              </h2>
              <Badge variant="outline">
                {userDetails?.plan_name ?? "Free"}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-sm text-muted-foreground">
                {userDetails?.email ?? ""}
              </p>
              {userDetails?.has_google ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20">
                  <svg viewBox="0 0 24 24" className="w-2.5 h-2.5" aria-hidden>
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Google
                </span>
              ) : userDetails ? (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground border border-border">
                  Email
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {userDetails && (
              <a
                href={`/audit?target_type=user&target_id=${userId}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-border text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-colors"
                title="View audit history for this user"
              >
                <History className="w-3.5 h-3.5" /> View history
              </a>
            )}
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-8">
          {loading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {userDetails && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 border border-border rounded-lg p-4 bg-muted/20">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Current Balance</p>
                    <p className="text-xl font-bold text-foreground mt-0.5">
                      {userDetails.balance ?? 0} <span className="text-xs font-normal text-muted-foreground">credits</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Lifetime Granted</p>
                    <p className="text-xl font-bold text-green-500 mt-0.5">
                      +{userDetails.lifetime_granted ?? 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Lifetime Spent</p>
                    <p className="text-xl font-bold text-muted-foreground mt-0.5">
                      -{userDetails.lifetime_spent ?? 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Status & Role</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${userDetails.status === "active" ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive"}`}>
                        {userDetails.status}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground uppercase">
                        {userDetails.role}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Sign-in</p>
                    <div className="mt-1">
                      {userDetails.has_google ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20">
                          <svg viewBox="0 0 24 24" className="w-2.5 h-2.5" aria-hidden>
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                          </svg>
                          Google
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground border border-border">
                          Email
                        </span>
                      )}
                    </div>
                  </div>
                  {userDetails.features && userDetails.features.length > 0 && (
                    <div className="col-span-full pt-2 border-t border-border/50">
                      <p className="text-xs text-muted-foreground font-medium mb-1.5">Effective Feature Flags:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {userDetails.features.map((feat: string, idx: number) => (
                          <span key={idx} className="px-2 py-0.5 rounded-md text-[11px] bg-primary/10 text-primary font-mono">
                            {feat}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {userMargin && (
                <div className="grid grid-cols-3 gap-4 border border-border rounded-lg p-4 bg-muted/20">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-xl font-bold text-green-500">
                      {userMargin.revenue_by_currency?.length
                        ? userMargin.revenue_by_currency.map((r: any) => r.display).join(" · ")
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Est. Cost</p>
                    <p className="text-xl font-bold text-orange-500">
                      ${(userMargin.estimated_cost_usd ?? 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Est. Margin</p>
                    <p className={`text-xl font-bold ${userMargin.estimated_margin_usd > 0 ? "text-green-500" : "text-destructive"}`}>
                      ${(userMargin.estimated_margin_usd ?? 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-lg font-semibold mb-3">Credit Ledger</h3>
                {userLedger.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No ledger entries found.</p>
                ) : (
                  <div className="overflow-x-auto border border-border rounded-md">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px]">
                        <tr>
                          <th className="px-4 py-2 font-medium">Reason</th>
                          <th className="px-4 py-2 font-medium">Delta</th>
                          <th className="px-4 py-2 font-medium">Balance</th>
                          <th className="px-4 py-2 font-medium">Module</th>
                          <th className="px-4 py-2 font-medium">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {userLedger.map((entry, idx) => (
                          <tr key={idx} className="hover:bg-muted/30">
                            <td className="px-4 py-2 capitalize">{entry.reason}</td>
                            <td className={`px-4 py-2 font-mono ${entry.delta > 0 ? "text-green-500" : "text-destructive"}`}>
                              {entry.delta > 0 ? "+" : ""}{entry.delta}
                            </td>
                            <td className="px-4 py-2 font-mono">{entry.balance_after}</td>
                            <td className="px-4 py-2 text-muted-foreground text-xs">{entry.module_code || "-"}</td>
                            <td className="px-4 py-2 text-xs text-muted-foreground">
                              {new Date(entry.created_at).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Transactions</h3>
                {userTransactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No transactions found.</p>
                ) : (
                  <div className="overflow-x-auto border border-border rounded-md">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px]">
                        <tr>
                          <th className="px-4 py-2 font-medium">Status</th>
                          <th className="px-4 py-2 font-medium">Amount</th>
                          <th className="px-4 py-2 font-medium">Plan</th>
                          <th className="px-4 py-2 font-medium">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {userTransactions.map((tx, idx) => (
                          <tr key={idx} className="hover:bg-muted/30">
                            <td className="px-4 py-2 capitalize">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${tx.status === "completed" ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground"}`}>
                                {tx.status}
                              </span>
                            </td>
                            <td className="px-4 py-2 font-mono">
                              {formatAmount(tx.amount_minor, tx.currency_code)}
                            </td>
                            <td className="px-4 py-2 text-muted-foreground text-xs">
                              {tx.plan_name ?? tx.plan_code ?? tx.module_code ?? "-"}
                            </td>
                            <td className="px-4 py-2 text-xs text-muted-foreground">
                              {new Date(tx.occurred_at ?? tx.created_at).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
