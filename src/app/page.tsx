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
  Users,
  CreditCard,
  DollarSign,
  Activity,
  TrendingUp,
  Package,
  Tag,
  Server,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  ComposedChart,
  Line,
  LabelList,
  Legend,
} from "recharts";
import { DataTable, type Column } from "@/components/ui/data-table";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";

export default function AdminDashboard() {
  const [overviewData, setOverviewData] = useState<any>(null);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [periodPreset, setPeriodPreset] = useState<"all" | "this_month" | "30d" | "custom">("all");
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined);
  const [creditFlowData, setCreditFlowData] = useState<any>(null);
  const [moduleUsageData, setModuleUsageData] = useState<any[]>([]);
  const [planSalesData, setPlanSalesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getPeriodParams = () => {
    const now = new Date();
    if (periodPreset === "this_month") {
      const from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const to = new Date(now);
      to.setHours(23, 59, 59, 999);
      const daysCount = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)));
      return {
        since: from.toISOString(),
        until: to.toISOString(),
        label: "This month",
        chartDays: daysCount,
      };
    }
    if (periodPreset === "30d") {
      const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      from.setHours(0, 0, 0, 0);
      const to = new Date(now);
      to.setHours(23, 59, 59, 999);
      return {
        since: from.toISOString(),
        until: to.toISOString(),
        label: "Last 30 days",
        chartDays: 30,
      };
    }
    if (periodPreset === "custom") {
      if (customDateRange?.from) {
        const from = new Date(customDateRange.from);
        from.setHours(0, 0, 0, 0);
        let to = from;
        if (customDateRange.to) {
          to = new Date(customDateRange.to);
          to.setHours(23, 59, 59, 999);
        } else {
          to = new Date(from);
          to.setHours(23, 59, 59, 999);
        }
        const daysCount = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)));
        const label = customDateRange.to
          ? `${format(customDateRange.from, "LLL dd")} - ${format(customDateRange.to, "LLL dd")}`
          : format(customDateRange.from, "LLL dd");
        return {
          since: from.toISOString(),
          until: to.toISOString(),
          label,
          chartDays: daysCount,
        };
      }
      return { since: undefined, until: undefined, label: "Custom", chartDays: 30 };
    }
    return { since: undefined, until: undefined, label: "All time", chartDays: 365 };
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { getAccessToken } = await import("@/lib/auth");
        const token = getAccessToken() || undefined;
        const { since, until, chartDays } = getPeriodParams();

        const results = await Promise.allSettled([
          admin.overview(token, { since, until }),
          admin.getRevenueUsd(token, chartDays),
          admin.creditFlow(token, chartDays),
          admin.moduleUsage(token),
          admin.getPlanSalesUsd(token),
        ]);

        const overviewRes =
          results[0].status === "fulfilled" ? results[0].value : null;
        const revenueRes =
          results[1].status === "fulfilled" ? results[1].value : [];
        const creditFlowRes =
          results[2].status === "fulfilled" ? results[2].value : null;
        const moduleUsageRes =
          results[3].status === "fulfilled" ? results[3].value : [];
        const planSalesRes =
          results[4].status === "fulfilled" ? results[4].value : [];

        setOverviewData(overviewRes);

        // Build chart from USD endpoint (one point per day, all currencies combined in USD)
        const allRevenue = Array.isArray(revenueRes) ? revenueRes : [];
        const formattedRevenue = allRevenue.map((item: any) => {
          let shortDate = item.period;
          try {
            const parts = String(item.period).split("-");
            if (parts.length === 3) {
              const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
              shortDate = d.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              });
            } else {
              const d = new Date(item.period);
              if (!isNaN(d.getTime())) {
                shortDate = d.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
              }
            }
          } catch (e) {}

          return {
            date: shortDate,
            gross: typeof item.gross_usd === "number" ? item.gross_usd : 0,
            net: typeof item.net_usd === "number" ? item.net_usd : 0,
            unconverted: item.unconverted || 0,
            transactions: item.transactions || 0,
            fullDate: item.period,
          };
        });
        setRevenueData(formattedRevenue);

        let totalGranted = 0,
          totalSpent = 0,
          totalExpired = 0;
        if (creditFlowRes) {
          totalGranted = (creditFlowRes.granted || []).reduce(
            (acc: number, item: any) => acc + (item.value || 0),
            0,
          );
          totalSpent = (creditFlowRes.spent || []).reduce(
            (acc: number, item: any) => acc + (item.value || 0),
            0,
          );
          totalExpired = (creditFlowRes.expired || []).reduce(
            (acc: number, item: any) => acc + (item.value || 0),
            0,
          );
        }
        setCreditFlowData(
          creditFlowRes
            ? {
                granted: totalGranted,
                spent: totalSpent,
                expired: totalExpired,
              }
            : null,
        );

        setModuleUsageData(moduleUsageRes || []);
        setPlanSalesData(planSalesRes || []);
      } catch (err: any) {
        console.error("Dashboard fetch error:", err);
        setError(err.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [periodPreset, customDateRange]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-destructive">
        <h2 className="text-xl font-bold mb-2">Error Loading Dashboard</h2>
        <p>{error}</p>
      </div>
    );
  }

  const moduleUsageColumns: Column<any>[] = [
    {
      key: "module_code",
      header: "Module",
      render: (m) => <span className="font-medium">{m.module_code}</span>,
    },
    {
      key: "credits_spent",
      header: "Credits Spent",
      align: "right",
      render: (m) => <span className="font-mono">{m.credits_spent}</span>,
    },
  ];

  const planSalesColumns: Column<any>[] = [
    {
      key: "plan_code",
      header: "Plan",
      render: (p) => (
        <span className="font-medium capitalize">{p.plan_name || p.plan_code}</span>
      ),
    },
    {
      key: "purchases",
      header: "Sold",
      align: "right",
      render: (p) => <span className="font-mono">{p.purchases}</span>,
    },
    {
      key: "gross_usd",
      header: "Total (USD)",
      align: "right",
      render: (p) => (
        <span className="font-mono font-medium">${(p.gross_usd ?? 0).toFixed(2)}</span>
      ),
    },
    {
      key: "net_usd",
      header: "Net (USD)",
      align: "right",
      render: (p) => (
        <span className="font-mono text-emerald-500 font-medium">
          ${(p.net_usd ?? 0).toFixed(2)}
        </span>
      ),
    },
  ];

  const { label: periodLabel } = getPeriodParams();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of platform metrics and revenue.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex bg-muted/40 p-1 rounded-lg border border-border">
            <button
              type="button"
              onClick={() => setPeriodPreset("all")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                periodPreset === "all"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All time
            </button>
            <button
              type="button"
              onClick={() => setPeriodPreset("this_month")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                periodPreset === "this_month"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              This month
            </button>
            <button
              type="button"
              onClick={() => setPeriodPreset("30d")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                periodPreset === "30d"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Last 30 days
            </button>
            <button
              type="button"
              onClick={() => setPeriodPreset("custom")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                periodPreset === "custom"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Custom range
            </button>
          </div>
          {periodPreset === "custom" && (
            <DatePickerWithRange
              date={customDateRange}
              setDate={setCustomDateRange}
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Total Users */}
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overviewData?.total_users || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {overviewData?.active_users_30d || 0} active in last 30d
            </p>
          </CardContent>
        </Card>

        {/* Total Revenue */}
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(overviewData?.gross_revenue_usd ?? 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total paid by customers, all currencies
            </p>
            {overviewData?.revenue_by_currency?.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {(overviewData.revenue_by_currency || [])
                  .map(
                    (r: any) =>
                      `${r.currency_code} · ${r.transactions ?? 0} ${
                        r.transactions === 1 ? "sale" : "sales"
                      } · $${(r.gross_usd ?? 0).toFixed(2)}`,
                  )
                  .join(" · ")}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Net Revenue */}
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">
              ${(overviewData?.net_revenue_usd ?? 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              After Paddle fees &amp; tax (${(overviewData?.paddle_and_tax_usd ?? 0).toFixed(2)})
            </p>
            <p className="text-[11px] text-muted-foreground/80 mt-0.5">
              {periodLabel} · Net kept
            </p>
          </CardContent>
        </Card>

        {/* Paying Users */}
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paying Users</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overviewData?.paying_users || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Users who have paid
            </p>
          </CardContent>
        </Card>

        {/* Est. Margin */}
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Est. Margin</CardTitle>
            <TrendingUp
              className={`h-4 w-4 ${
                (overviewData?.estimated_margin_usd ?? 0) >= 0
                  ? "text-emerald-500"
                  : "text-destructive"
              }`}
            />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                (overviewData?.estimated_margin_usd ?? 0) >= 0
                  ? "text-emerald-500"
                  : "text-destructive"
              }`}
            >
              ${(overviewData?.estimated_margin_usd ?? 0).toFixed(2)}
              <span className="ml-2 text-sm font-medium text-muted-foreground">
                {overviewData?.margin_percent != null
                  ? `${overviewData.margin_percent}%`
                  : "—"}
              </span>
            </div>
            <p
              className="text-xs text-muted-foreground mt-1"
              title={
                overviewData?.cost_paid_usage_usd != null &&
                overviewData?.cost_free_usage_usd != null
                  ? `Paid usage $${overviewData.cost_paid_usage_usd.toFixed(2)} + free usage $${overviewData.cost_free_usage_usd.toFixed(2)} = $${(overviewData.estimated_cost_usd ?? 0).toFixed(2)}${overviewData.cost_per_credit_usd != null ? `, at $${overviewData.cost_per_credit_usd} per credit` : ""}`
                  : undefined
              }
            >
              Net revenue ${(overviewData?.net_revenue_usd ?? 0).toFixed(2)} · Cost $
              {(overviewData?.estimated_cost_usd ?? 0).toFixed(2)}
            </p>
            {overviewData?.margin_is_estimated && (
              <p className="text-xs text-muted-foreground mt-1">
                ${(overviewData?.net_revenue_estimated_usd ?? 0).toFixed(2)} of revenue converted at market rate
              </p>
            )}
            {overviewData?.margin_excludes_currencies?.length > 0 && (
              <p className="text-xs text-amber-500/80 mt-1">
                Missing {overviewData.margin_excludes_currencies.join(", ")} — no exchange rate yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-1 lg:col-span-2 shadow-sm border-border/50">
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
            <CardDescription>
              Recent revenue generated over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {revenueData && revenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={revenueData}
                    margin={{ top: 30, right: 10, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="colorRevenueBar"
                        x1="0"
                        y1="1"
                        x2="0"
                        y2="0"
                      >
                        <stop offset="0%" stopColor="#ea580c" stopOpacity={1} />
                        <stop
                          offset="100%"
                          stopColor="#ea580c"
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="hsl(var(--border))"
                      opacity={0.4}
                    />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tick={{
                        fill: "hsl(var(--muted-foreground))",
                        fontSize: 12,
                        fontWeight: 500,
                      }}
                      dy={10}
                    />
                    <YAxis
                      tickFormatter={(value) => `$${value}`}
                      tickLine={false}
                      axisLine={false}
                      tick={{
                        fill: "hsl(var(--muted-foreground))",
                        fontSize: 12,
                        fontWeight: 500,
                      }}
                      dx={-10}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(234, 88, 12, 0.08)" }}
                      contentStyle={{
                        backgroundColor: "rgba(15, 23, 42, 0.95)",
                        backdropFilter: "blur(8px)",
                        borderColor: "rgba(255,255,255,0.1)",
                        borderRadius: "12px",
                        boxShadow:
                          "0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                        color: "#fff",
                        padding: "12px 16px",
                      }}
                      labelStyle={{
                        color: "#94a3b8",
                        marginBottom: "6px",
                        fontSize: "13px",
                      }}
                      formatter={(value: any, name: any) => [
                        `$${parseFloat(value || 0).toFixed(2)}`,
                        name,
                      ]}
                    />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      wrapperStyle={{ paddingBottom: "10px", fontSize: "12px" }}
                    />
                    <Bar
                      name="Total"
                      dataKey="gross"
                      fill="url(#colorRevenueBar)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={50}
                    />
                    <Line
                      name="Net"
                      type="monotone"
                      dataKey="net"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ r: 3, fill: "#10b981", strokeWidth: 0 }}
                      activeDot={{
                        r: 6,
                        fill: "#10b981",
                        stroke: "#fff",
                        strokeWidth: 2,
                      }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground border border-dashed rounded-lg">
                  No revenue data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Credit Flow (30d)</CardTitle>
            <CardDescription>Granted vs Spent vs Expired</CardDescription>
          </CardHeader>
          <CardContent>
            {creditFlowData ? (
              <div className="space-y-4">
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-sm text-muted-foreground">Granted</span>
                  <span className="font-bold text-green-500">
                    +{creditFlowData.granted || 0}
                  </span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-sm text-muted-foreground">Spent</span>
                  <span className="font-bold text-orange-500">
                    -{creditFlowData.spent || 0}
                  </span>
                </div>
                <div className="flex justify-between pb-2">
                  <span className="text-sm text-muted-foreground">Expired</span>
                  <span className="font-bold text-destructive">
                    -{creditFlowData.expired || 0}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground border border-dashed rounded-lg bg-muted/20">
                <div className="text-center">
                  <Activity className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p>No credit flow data</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm border-border/50">
          <CardHeader>
            <CardTitle>Module Usage</CardTitle>
            <CardDescription>Top features consuming credits</CardDescription>
          </CardHeader>
          <CardContent>
            {moduleUsageData && moduleUsageData.length > 0 ? (
              <div className="pt-2">
                <DataTable
                  columns={moduleUsageColumns}
                  data={moduleUsageData}
                  isLoading={loading}
                  keyExtractor={(m: any) =>
                    m.module_code || Math.random().toString()
                  }
                />
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg bg-muted/20">
                No module usage data
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50">
          <CardHeader>
            <CardTitle>Plan Sales</CardTitle>
            <CardDescription>Subscriptions sold</CardDescription>
          </CardHeader>
          <CardContent>
            {planSalesData && planSalesData.length > 0 ? (
              <div className="pt-2">
                <DataTable
                  columns={planSalesColumns}
                  data={planSalesData}
                  isLoading={loading}
                  keyExtractor={(p: any) =>
                    p.plan_code || Math.random().toString()
                  }
                />
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg bg-muted/20">
                No plan sales data
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
