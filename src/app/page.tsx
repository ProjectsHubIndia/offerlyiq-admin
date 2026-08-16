"use client";

import { useEffect, useState } from "react";
import { admin } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, CreditCard, DollarSign, Activity, TrendingUp, Package, Tag, Server } from "lucide-react";
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
  LabelList
} from "recharts";
import { DataTable, type Column } from "@/components/ui/data-table";

export default function AdminDashboard() {
  const [overviewData, setOverviewData] = useState<any>(null);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [creditFlowData, setCreditFlowData] = useState<any>(null);
  const [moduleUsageData, setModuleUsageData] = useState<any[]>([]);
  const [planSalesData, setPlanSalesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { getAccessToken } = await import("@/lib/auth");
        const token = getAccessToken() || undefined;
        
        const [overviewRes, revenueRes, creditFlowRes, moduleUsageRes, planSalesRes] = await Promise.all([
          admin.overview(token),
          admin.revenue(token).catch(() => []),
          admin.creditFlow(token).catch(() => null),
          admin.moduleUsage(token).catch(() => []),
          admin.planSales(token).catch(() => []),
        ]);
        
        setOverviewData(overviewRes);
        
        // Format revenue data for Recharts (convert cents to dollars, period to date)
        const formattedRevenue = (revenueRes || []).map((item: any) => {
          let shortDate = item.period;
          try {
            const d = new Date(item.period);
            if (!isNaN(d.getTime())) {
              shortDate = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
            }
          } catch (e) {}
          
          return {
            date: shortDate,
            amount: item.value ? item.value / 100 : 0,
            fullDate: item.period
          };
        });
        setRevenueData(formattedRevenue);
        
        let totalGranted = 0, totalSpent = 0, totalExpired = 0;
        if (creditFlowRes) {
          totalGranted = (creditFlowRes.granted || []).reduce((acc: number, item: any) => acc + (item.value || 0), 0);
          totalSpent = (creditFlowRes.spent || []).reduce((acc: number, item: any) => acc + (item.value || 0), 0);
          totalExpired = (creditFlowRes.expired || []).reduce((acc: number, item: any) => acc + (item.value || 0), 0);
        }
        setCreditFlowData(creditFlowRes ? { granted: totalGranted, spent: totalSpent, expired: totalExpired } : null);
        
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
  }, []);

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
      render: (p) => <span className="font-medium capitalize">{p.plan_code}</span>,
    },
    {
      key: "purchases",
      header: "Purchases",
      align: "right",
      render: (p) => <span className="font-mono">{p.purchases}</span>,
    },
    {
      key: "revenue",
      header: "Revenue",
      align: "right",
      render: (p) => (
        <span className="font-mono text-green-500">
          ${(p.revenue_minor / 100).toFixed(2)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Overview</h1>
        <p className="text-muted-foreground">Monitor platform performance and metrics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overviewData?.total_users || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {overviewData?.active_users_30d || 0} active in last 30d
            </p>
          </CardContent>
        </Card>

        {/* Est. Revenue */}
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Est. Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">
              ${overviewData?.revenue_minor ? (overviewData.revenue_minor / 100).toFixed(2) : "0.00"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Lifetime {overviewData?.revenue_currency || "USD"}
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
            <div className="text-2xl font-bold">{overviewData?.paying_users || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Users who have paid
            </p>
          </CardContent>
        </Card>

        {/* Est. Margin */}
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Est. Margin</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">
              ${overviewData?.estimated_margin_usd?.toFixed(2) || "0.00"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Cost: ${overviewData?.estimated_cost_usd?.toFixed(2) || "0.00"}
            </p>
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
                  <ComposedChart data={revenueData} margin={{ top: 30, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenueBar" x1="0" y1="1" x2="0" y2="0">
                        <stop offset="0%" stopColor="#ea580c" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#ea580c" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                    <XAxis 
                      dataKey="date" 
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12, fontWeight: 500 }}
                      dy={10}
                    />
                    <YAxis 
                      tickFormatter={(value) => `$${value}`}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12, fontWeight: 500 }}
                      dx={-10}
                    />
                    <Tooltip 
                      cursor={{ fill: 'rgba(234, 88, 12, 0.1)' }}
                      contentStyle={{ 
                        backgroundColor: "rgba(15, 23, 42, 0.9)", 
                        backdropFilter: "blur(8px)",
                        borderColor: "rgba(255,255,255,0.1)", 
                        borderRadius: "12px",
                        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                        color: "#fff",
                        padding: "12px 16px"
                      }}
                      itemStyle={{ color: "#ea580c", fontWeight: "bold", fontSize: "16px", padding: 0 }}
                      labelStyle={{ color: "#94a3b8", marginBottom: "4px", fontSize: "13px" }}
                      formatter={(value: any) => [`$${parseFloat(value).toFixed(2)}`, "Revenue"]}
                    />
                    <Bar 
                      dataKey="amount" 
                      fill="url(#colorRevenueBar)" 
                      radius={[4, 4, 0, 0]}
                      maxBarSize={50}
                    >
                      <LabelList 
                        dataKey="amount" 
                        position="top" 
                        formatter={(val: any) => `$${Number(val).toFixed(2)}`}
                        style={{ fill: 'hsl(var(--foreground))', fontSize: 12, fontWeight: 'bold' }}
                      />
                    </Bar>
                    <Line 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="#f97316" 
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#10b981", strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: "#f97316", stroke: "#fff", strokeWidth: 2 }}
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
                  <span className="font-bold text-green-500">+{creditFlowData.granted || 0}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-sm text-muted-foreground">Spent</span>
                  <span className="font-bold text-orange-500">-{creditFlowData.spent || 0}</span>
                </div>
                <div className="flex justify-between pb-2">
                  <span className="text-sm text-muted-foreground">Expired</span>
                  <span className="font-bold text-destructive">-{creditFlowData.expired || 0}</span>
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
                  keyExtractor={(m: any) => m.module_code || Math.random().toString()} 
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
                  keyExtractor={(p: any) => p.plan_code || Math.random().toString()} 
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
