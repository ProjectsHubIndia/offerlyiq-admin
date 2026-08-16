"use client";

import { useEffect, useState } from "react";
import { admin } from "@/lib/api";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Loader2, MoreHorizontal, UserCheck, UserX, Shield, Coins, Eye, X, RefreshCw } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/data-table";

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [grantAmount, setGrantAmount] = useState(10);
  const [grantReason, setGrantReason] = useState("");
  const [grantLoading, setGrantLoading] = useState(false);

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [userLedger, setUserLedger] = useState<any[]>([]);
  const [userTransactions, setUserTransactions] = useState<any[]>([]);
  const [userMargin, setUserMargin] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const fetchUsers = async (pageNumber: number, search?: string) => {
    setLoading(true);
    try {
      const { getAccessToken } = await import("@/lib/auth");
      const token = getAccessToken() || undefined;
      const response = await admin.getUsers(token, pageNumber, 10, search);
      setUsers(response.items || []);
      setTotalPages(response.pages || 1);
      setTotalItems(response.total || 0);
      setPage(pageNumber);
    } catch (err) {
      console.error("Failed to fetch users", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(1, searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const { getAccessToken } = await import("@/lib/auth");
      const token = getAccessToken() || undefined;
      await admin.updateUserStatus(id, newStatus, "Admin action via dashboard", token);
      fetchUsers(page, searchQuery);
    } catch (err) {
      console.error("Failed to update status", err);
      alert("Error updating status");
    }
  };

  const handleUpdateRole = async (id: string, newRole: string) => {
    try {
      const { getAccessToken } = await import("@/lib/auth");
      const token = getAccessToken() || undefined;
      await admin.updateUserRole(id, newRole, "Admin action via dashboard", token);
      fetchUsers(page, searchQuery);
    } catch (err) {
      console.error("Failed to update role", err);
      alert("Error updating role");
    }
  };

  const handleGrantCredits = async () => {
    if (!selectedUser) return;
    setGrantLoading(true);
    try {
      const { getAccessToken } = await import("@/lib/auth");
      const token = getAccessToken() || undefined;
      await admin.grantUserCredits(selectedUser.id, grantAmount, grantReason || "Admin granted", token);
      setShowGrantModal(false);
      setGrantAmount(10);
      setGrantReason("");
      alert(`Successfully granted ${grantAmount} credits to ${selectedUser.email}`);
    } catch (err) {
      console.error("Failed to grant credits", err);
      alert("Error granting credits");
    } finally {
      setGrantLoading(false);
    }
  };

  const handleViewDetails = async (user: any) => {
    setSelectedUser(user);
    setShowDetailsModal(true);
    setDetailsLoading(true);
    try {
      const { getAccessToken } = await import("@/lib/auth");
      const token = getAccessToken() || undefined;
      const [ledger, transactions, margin] = await Promise.all([
        admin.getUserLedger(user.id, token).catch(() => []),
        admin.getUserTransactions(user.id, token).catch(() => []),
        admin.userMargin(user.id, token).catch(() => null),
      ]);
      setUserLedger(ledger || []);
      setUserTransactions(transactions || []);
      setUserMargin(margin);
    } catch (err) {
      console.error("Failed to fetch user details", err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleReinstateUser = async (id: string) => {
    if (!window.confirm("Are you sure you want to reinstate this user?")) return;
    try {
      const { getAccessToken } = await import("@/lib/auth");
      const token = getAccessToken() || undefined;
      await admin.reinstateUser(id, token);
      alert("User reinstated successfully");
      fetchUsers(page, searchQuery);
    } catch (err) {
      console.error("Failed to reinstate user", err);
      alert("Error reinstating user");
    }
  };

  const columns: Column<any>[] = [
    {
      key: "user",
      header: "User",
      render: (user) => (
        <>
          <div className="font-medium text-foreground">{user.full_name || "N/A"}</div>
          <div className="text-muted-foreground text-xs">{user.email}</div>
        </>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (user) => (
        <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
          user.role === "superadmin" 
            ? "bg-purple-500/10 text-purple-500" 
            : user.role === "admin" 
            ? "bg-primary/10 text-primary" 
            : "bg-blue-500/10 text-blue-500"
        }`}>
          {user.role}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (user) => (
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${
            user.is_active ? "bg-green-500" : "bg-destructive"
          }`} />
          <span className="text-xs font-medium capitalize">
            {user.is_active ? "Active" : "Inactive"}
          </span>
        </div>
      ),
    },
    {
      key: "joined",
      header: "Joined",
      render: (user) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {new Date(user.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (user) => (
        <div className="flex items-center justify-end gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 px-2 text-xs"
            onClick={() => handleViewDetails(user)}
            title="View Details"
          >
            <Eye className="w-3.5 h-3.5" />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 px-2 text-xs text-primary hover:text-primary"
            onClick={() => {
              setSelectedUser(user);
              setShowGrantModal(true);
            }}
            title="Grant Credits"
          >
            <Coins className="w-3.5 h-3.5" />
          </Button>
          {user.role === "user" ? (
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 px-2 text-xs"
              onClick={() => handleUpdateRole(user.id, "admin")}
              title="Promote to Admin"
            >
              <Shield className="w-3.5 h-3.5 mr-1" /> Make Admin
            </Button>
          ) : user.role === "admin" ? (
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 px-2 text-xs"
              onClick={() => handleUpdateRole(user.id, "user")}
              title="Demote to User"
            >
              Revoke Admin
            </Button>
          ) : null}
          
          {user.is_active ? (
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10"
              onClick={() => handleUpdateStatus(user.id, "inactive")}
              title="Deactivate Account"
            >
              <UserX className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 px-2 text-xs text-green-500 hover:bg-green-500/10"
                onClick={() => handleUpdateStatus(user.id, "active")}
                title="Activate Account"
              >
                <UserCheck className="w-3.5 h-3.5" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 px-2 text-xs text-orange-500 hover:bg-orange-500/10 ml-1"
                onClick={() => handleReinstateUser(user.id)}
                title="Reinstate (Clear Chargebacks)"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Users</h1>
          <p className="text-muted-foreground">Manage user accounts and roles ({totalItems} total).</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
          />
        </div>
      </div>

      <DataTable 
        columns={columns} 
        data={users} 
        isLoading={loading} 
        keyExtractor={(user) => user.id} 
        emptyMessage="No users found."
        pagination={{
          currentPage: page,
          totalPages: totalPages,
          onPageChange: (newPage) => fetchUsers(newPage, searchQuery),
        }}
      />
    </div>

      {/* Grant Credits Modal */}
      {showGrantModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card w-full max-w-md p-6 rounded-lg shadow-lg border border-border relative">
            <button 
              onClick={() => setShowGrantModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-4">Grant Credits</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Add credits to <span className="font-semibold">{selectedUser.email}</span>.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Amount</label>
                <input 
                  type="number" 
                  value={grantAmount}
                  onChange={(e) => setGrantAmount(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Reason</label>
                <input 
                  type="text" 
                  placeholder="e.g. Compensation for error"
                  value={grantReason}
                  onChange={(e) => setGrantReason(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setShowGrantModal(false)}>Cancel</Button>
                <Button onClick={handleGrantCredits} disabled={grantLoading}>
                  {grantLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Grant Credits
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {showDetailsModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col rounded-lg shadow-lg border border-border relative">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">{selectedUser.full_name || "User"} Details</h2>
                <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
              </div>
              <button 
                onClick={() => setShowDetailsModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-8">
              {detailsLoading ? (
                <div className="flex justify-center p-12">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {userMargin && (
                    <div className="grid grid-cols-3 gap-4 border border-border rounded-lg p-4 bg-muted/20">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Revenue</p>
                        <p className="text-xl font-bold text-green-500">${(userMargin.revenue_minor / 100).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Est. Cost</p>
                        <p className="text-xl font-bold text-orange-500">${userMargin.estimated_cost_usd.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Est. Margin</p>
                        <p className={`text-xl font-bold ${userMargin.estimated_margin_usd > 0 ? "text-green-500" : "text-destructive"}`}>
                          ${userMargin.estimated_margin_usd.toFixed(2)}
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
                              <th className="px-4 py-2 font-medium">Plan/Module</th>
                              <th className="px-4 py-2 font-medium">Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {userTransactions.map((tx, idx) => (
                              <tr key={idx} className="hover:bg-muted/30">
                                <td className="px-4 py-2 capitalize">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    tx.status === "completed" ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground"
                                  }`}>
                                    {tx.status}
                                  </span>
                                </td>
                                <td className="px-4 py-2 font-mono">
                                  {tx.amount_minor ? `$${(tx.amount_minor / 100).toFixed(2)}` : "-"}
                                </td>
                                <td className="px-4 py-2 text-muted-foreground text-xs">
                                  {tx.plan_code || tx.module_code || "-"}
                                </td>
                                <td className="px-4 py-2 text-xs text-muted-foreground">
                                  {new Date(tx.created_at).toLocaleString()}
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
      )}
    </>
  );
}
