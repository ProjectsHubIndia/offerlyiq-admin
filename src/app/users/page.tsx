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
import { Button } from "@/components/ui/button";
import {
  Search,
  Loader2,
  MoreHorizontal,
  UserCheck,
  UserX,
  Shield,
  Coins,
  Eye,
  X,
  RefreshCw,
  History,
  Trash2,
} from "lucide-react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { ConfirmAction } from "@/components/ConfirmAction";
import { toast } from "sonner";
import { useAdminSession } from "@/components/layout/admin-session-provider";

export default function UsersPage() {
  const { user: currentUser } = useAdminSession();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Modals state
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Grant/Adjust Credits
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [creditDirection, setCreditDirection] = useState<"grant" | "deduct">(
    "grant",
  );
  const [grantAmount, setGrantAmount] = useState(10);
  const [grantReason, setGrantReason] = useState("");
  const [expiresInDays, setExpiresInDays] = useState<number | "">("");
  const [grantLoading, setGrantLoading] = useState(false);

  // Delete User state (Superadmin)
  const [deleteUserModalOpen, setDeleteUserModalOpen] = useState(false);
  const [deleteTargetUser, setDeleteTargetUser] = useState<any>(null);
  const [deleteUserReason, setDeleteUserReason] = useState("");
  const [deleteUserEmailConfirm, setDeleteUserEmailConfirm] = useState("");
  const [deleteUserLoading, setDeleteUserLoading] = useState(false);
  const [deleteUserError, setDeleteUserError] = useState("");

  // ConfirmAction state
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    consequence: string;
    isDanger: boolean;
    action: (reason: string) => Promise<void>;
  }>({
    isOpen: false,
    title: "",
    consequence: "",
    isDanger: false,
    action: async () => {},
  });

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [userDetails, setUserDetails] = useState<any>(null);
  const [userLedger, setUserLedger] = useState<any[]>([]);
  const [userTransactions, setUserTransactions] = useState<any[]>([]);
  const [userMargin, setUserMargin] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const fetchUsers = async (
    pageNumber: number,
    search?: string,
    rFilter = roleFilter,
    sFilter = statusFilter,
  ) => {
    setLoading(true);
    try {
      const { getAccessToken } = await import("@/lib/auth");
      const token = getAccessToken() || undefined;
      const response = await admin.getUsers(
        token,
        pageNumber,
        10,
        search,
        rFilter,
        sFilter,
      );
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
      fetchUsers(1, searchQuery, roleFilter, statusFilter);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, roleFilter, statusFilter]);

  const requestUpdateStatus = (user: any, newStatus: "active" | "inactive") => {
    setConfirmState({
      isOpen: true,
      title: newStatus === "inactive" ? "Deactivate User" : "Activate User",
      consequence:
        newStatus === "inactive"
          ? `Deactivate ${user.email}? They lose access immediately. Their credits are not touched.`
          : `Activate ${user.email}? They will regain access to their account.`,
      isDanger: newStatus === "inactive",
      action: async (reason: string) => {
        const { getAccessToken } = await import("@/lib/auth");
        const token = getAccessToken() || undefined;
        await admin.updateUserStatus(user.id, newStatus, reason, token);
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
        fetchUsers(page, searchQuery, roleFilter, statusFilter);
      },
    });
  };

  const requestUpdateRole = (
    user: any,
    newRole: "admin" | "user" | "superadmin",
  ) => {
    setConfirmState({
      isOpen: true,
      title: `Change Role to ${newRole}`,
      consequence:
        newRole === "superadmin"
          ? `Grant superadmin to ${user.email}? They will be able to move prices, mint credits and issue refunds.`
          : `Change ${user.email}'s role to ${newRole}?`,
      isDanger: newRole === "superadmin",
      action: async (reason: string) => {
        const { getAccessToken } = await import("@/lib/auth");
        const token = getAccessToken() || undefined;
        await admin.updateUserRole(user.id, newRole, reason, token);
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
        fetchUsers(page, searchQuery, roleFilter, statusFilter);
      },
    });
  };

  const requestReinstateUser = (user: any) => {
    setConfirmState({
      isOpen: true,
      title: "Reinstate User",
      consequence: `Reinstate ${user.email}? This clears a chargeback lockout.`,
      isDanger: false,
      action: async (reason: string) => {
        const { getAccessToken } = await import("@/lib/auth");
        const token = getAccessToken() || undefined;
        await admin.reinstateUser(user.id, reason, token);
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
        toast.success("User reinstated successfully");
        fetchUsers(page, searchQuery, roleFilter, statusFilter);
      },
    });
  };

  const handleGrantCredits = async () => {
    if (!selectedUser) return;
    if (grantAmount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }
    if (!grantReason || grantReason.length < 3) {
      toast.error("Reason is required (min 3 characters)");
      return;
    }

    setGrantLoading(true);
    try {
      const { getAccessToken } = await import("@/lib/auth");
      const token = getAccessToken() || undefined;
      const delta = creditDirection === "grant" ? grantAmount : -grantAmount;
      const expires =
        creditDirection === "grant" && expiresInDays !== ""
          ? Number(expiresInDays)
          : undefined;

      const updatedUser = await admin.grantUserCredits(
        selectedUser.id,
        delta,
        grantReason,
        expires,
        token,
      );
      setShowGrantModal(false);
      setGrantAmount(10);
      setGrantReason("");
      setExpiresInDays("");

      // Update selectedUser balance if details modal is open, but they are separate so it's fine.
      toast.success(`Successfully adjusted credits for ${selectedUser.email}`);
    } catch (err: any) {
      console.error("Failed to adjust credits", err);
      toast.error(err.message || "Error adjusting credits");
    } finally {
      setGrantLoading(false);
    }
  };

  const requestDeleteUser = (user: any) => {
    setDeleteTargetUser(user);
    setDeleteUserReason("");
    setDeleteUserEmailConfirm("");
    setDeleteUserError("");
    setDeleteUserModalOpen(true);
  };

  const handleDeleteUserSubmit = async () => {
    if (!deleteTargetUser) return;
    if (deleteUserEmailConfirm.trim() !== deleteTargetUser.email) {
      setDeleteUserError("Email confirmation does not match");
      return;
    }
    if (deleteUserReason.trim().length < 3) {
      setDeleteUserError("Reason is required (minimum 3 characters)");
      return;
    }
    setDeleteUserLoading(true);
    setDeleteUserError("");
    try {
      const { getAccessToken } = await import("@/lib/auth");
      const token = getAccessToken() || undefined;
      await admin.deleteUser(deleteTargetUser.id, deleteUserReason.trim(), token);
      setDeleteUserModalOpen(false);
      setDeleteTargetUser(null);
      toast.success("User deleted successfully");
      fetchUsers(page, searchQuery, roleFilter, statusFilter);
    } catch (err: any) {
      console.error("Failed to delete user", err);
      const detail = err.response?.data?.detail;
      setDeleteUserError(typeof detail === "string" ? detail : "Failed to delete user");
    } finally {
      setDeleteUserLoading(false);
    }
  };

  const handleViewDetails = async (user: any) => {
    setSelectedUser(user);
    setShowDetailsModal(true);
    setDetailsLoading(true);
    setUserDetails(null);
    try {
      const { getAccessToken } = await import("@/lib/auth");
      const token = getAccessToken() || undefined;
      const results = await Promise.allSettled([
        admin.getUserDetail(user.id, token),
        admin.getUserLedger(user.id, token),
        admin.getUserTransactions(user.id, token),
        admin.userMargin(user.id, token),
      ]);
      setUserDetails(
        results[0].status === "fulfilled" ? results[0].value : null,
      );
      setUserLedger(
        results[1].status === "fulfilled" ? results[1].value || [] : [],
      );
      setUserTransactions(
        results[2].status === "fulfilled" ? results[2].value || [] : [],
      );
      setUserMargin(
        results[3].status === "fulfilled" ? results[3].value : null,
      );
    } catch (err) {
      console.error("Failed to fetch user details", err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const columns: Column<any>[] = [
    {
      key: "user",
      header: "User",
      render: (user) => (
        <>
          <div className="font-medium text-foreground">
            {user.full_name || "N/A"}
          </div>
          <div className="text-muted-foreground text-xs">{user.email}</div>
        </>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (user) => (
        <div
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
            user.role === "superadmin"
              ? "bg-purple-500/10 text-purple-500"
              : user.role === "admin"
                ? "bg-primary/10 text-primary"
                : "bg-blue-500/10 text-blue-500"
          }`}
        >
          {user.role}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (user) => (
        <div className="flex items-center gap-2">
          {user.deleted_at ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-destructive/10 text-destructive">
              Deleted
            </span>
          ) : (
            <>
              <span
                className={`w-2 h-2 rounded-full ${
                  user.is_active ? "bg-green-500" : "bg-destructive"
                }`}
              />
              <span className="text-xs font-medium capitalize">
                {user.is_active ? "Active" : "Inactive"}
              </span>
            </>
          )}
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
          {!user.deleted_at && (
            <>
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
                  onClick={() => requestUpdateRole(user, "admin")}
                  title="Promote to Admin"
                >
                  <Shield className="w-3.5 h-3.5 mr-1" /> Make Admin
                </Button>
              ) : user.role === "admin" ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={() => requestUpdateRole(user, "user")}
                  title="Demote to User"
                  disabled={currentUser?.id === user.id}
                >
                  Revoke Admin
                </Button>
              ) : null}

              {user.is_active ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10"
                  onClick={() => requestUpdateStatus(user, "inactive")}
                  title="Deactivate Account"
                  disabled={currentUser?.id === user.id}
                >
                  <UserX className="w-3.5 h-3.5" />
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 text-xs text-green-500 hover:bg-green-500/10"
                    onClick={() => requestUpdateStatus(user, "active")}
                    title="Activate Account"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 text-xs text-orange-500 hover:bg-orange-500/10 ml-1"
                    onClick={() => requestReinstateUser(user)}
                    title="Reinstate (Clear Chargebacks)"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>
                </>
              )}

              {currentUser?.role === "superadmin" &&
                currentUser?.id !== user.id &&
                user.role === "user" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => requestDeleteUser(user)}
                    title="Delete User (Superadmin)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
            </>
          )}
          {(user.role === "admin" || user.role === "superadmin") && (
            <a
              href={`/audit?actor_user_id=${user.id}`}
              className="inline-flex items-center justify-center h-8 px-2 rounded-md border border-border text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors gap-1"
              title="View admin activity"
            >
              <History className="w-3.5 h-3.5" /> Activity
            </a>
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
            <p className="text-muted-foreground">
              Manage user accounts and roles ({totalItems} total).
            </p>
          </div>
          <div className="flex gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">All Roles</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="superadmin">Superadmin</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
              />
            </div>
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

      {/* Adjust Credits Modal */}
      {showGrantModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card w-full max-w-md p-6 rounded-lg shadow-lg border border-border relative">
            <button
              onClick={() => setShowGrantModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-4">Adjust Credits</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Modify credits for{" "}
              <span className="font-semibold">{selectedUser.email}</span>.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Direction
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="direction"
                      checked={creditDirection === "grant"}
                      onChange={() => setCreditDirection("grant")}
                    />{" "}
                    Grant
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="direction"
                      checked={creditDirection === "deduct"}
                      onChange={() => setCreditDirection("deduct")}
                    />{" "}
                    Deduct
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Amount</label>
                <input
                  type="number"
                  value={grantAmount}
                  onChange={(e) =>
                    setGrantAmount(parseInt(e.target.value) || 0)
                  }
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              {creditDirection === "grant" && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Expires in (days){" "}
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  </label>
                  <input
                    type="number"
                    value={expiresInDays}
                    onChange={(e) =>
                      setExpiresInDays(
                        e.target.value === ""
                          ? ""
                          : parseInt(e.target.value) || 0,
                      )
                    }
                    placeholder="e.g. 90"
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Reason <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Compensation for error"
                  value={grantReason}
                  onChange={(e) => setGrantReason(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowGrantModal(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleGrantCredits} disabled={grantLoading}>
                  {grantLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Confirm
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
                <h2 className="text-xl font-bold">
                  {selectedUser.full_name || "User"} Details
                </h2>
                <p className="text-sm text-muted-foreground">
                  {selectedUser.email}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/audit?target_type=user&target_id=${selectedUser.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-border text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-colors"
                  title="View audit history for this user"
                >
                  <History className="w-3.5 h-3.5" /> View history
                </a>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-8">
              {detailsLoading ? (
                <div className="flex justify-center p-12">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {userDetails && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border border-border rounded-lg p-4 bg-muted/20">
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
                        <p className="text-sm text-muted-foreground">
                          Total Revenue
                        </p>
                        <p className="text-xl font-bold text-green-500">
                          {userMargin.revenue_by_currency?.length
                            ? userMargin.revenue_by_currency
                                .map((r: any) => r.display)
                                .join(" · ")
                            : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Est. Cost
                        </p>
                        <p className="text-xl font-bold text-orange-500">
                          ${(userMargin.estimated_cost_usd ?? 0).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Est. Margin
                        </p>
                        <p
                          className={`text-xl font-bold ${userMargin.estimated_margin_usd > 0 ? "text-green-500" : "text-destructive"}`}
                        >
                          ${(userMargin.estimated_margin_usd ?? 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-lg font-semibold mb-3">
                      Credit Ledger
                    </h3>
                    {userLedger.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No ledger entries found.
                      </p>
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
                                <td className="px-4 py-2 capitalize">
                                  {entry.reason}
                                </td>
                                <td
                                  className={`px-4 py-2 font-mono ${entry.delta > 0 ? "text-green-500" : "text-destructive"}`}
                                >
                                  {entry.delta > 0 ? "+" : ""}
                                  {entry.delta}
                                </td>
                                <td className="px-4 py-2 font-mono">
                                  {entry.balance_after}
                                </td>
                                <td className="px-4 py-2 text-muted-foreground text-xs">
                                  {entry.module_code || "-"}
                                </td>
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
                      <p className="text-sm text-muted-foreground">
                        No transactions found.
                      </p>
                    ) : (
                      <div className="overflow-x-auto border border-border rounded-md">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px]">
                            <tr>
                              <th className="px-4 py-2 font-medium">Status</th>
                              <th className="px-4 py-2 font-medium">Amount</th>
                              <th className="px-4 py-2 font-medium">
                                Plan/Module
                              </th>
                              <th className="px-4 py-2 font-medium">Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {userTransactions.map((tx, idx) => (
                              <tr key={idx} className="hover:bg-muted/30">
                                <td className="px-4 py-2 capitalize">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      tx.status === "completed"
                                        ? "bg-green-500/10 text-green-500"
                                        : "bg-muted text-muted-foreground"
                                    }`}
                                  >
                                    {tx.status}
                                  </span>
                                </td>
                                <td className="px-4 py-2 font-mono">
                                  {tx.amount_minor
                                    ? `${tx.currency_code ?? ""} ${(tx.amount_minor / 100).toFixed(2)}`.trim()
                                    : "-"}
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
      {/* Confirm Action Component */}
      <ConfirmAction
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        consequence={confirmState.consequence}
        isDanger={confirmState.isDanger}
        onClose={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmState.action}
      />

      {/* Delete User Modal (Superadmin) */}
      {deleteUserModalOpen && deleteTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card w-full max-w-lg p-6 rounded-lg shadow-lg border border-destructive/30 relative">
            <button
              onClick={() => {
                if (!deleteUserLoading) setDeleteUserModalOpen(false);
              }}
              disabled={deleteUserLoading}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-destructive/10 text-destructive shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  Delete User
                </h2>
                <p className="text-xs text-destructive font-medium">
                  Irreversible superadmin action
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              This permanently deletes all user creations (resumes, interviews, reports, cover letters) and scrubs their personal information. Payment records are kept de-identified for 7 years.
            </p>

            {deleteUserError && (
              <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-xs">
                {deleteUserError}
              </div>
            )}

            <div className="space-y-4 mb-6">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-foreground">
                  Type <span className="font-mono text-destructive">{deleteTargetUser.email}</span> to confirm:
                </label>
                <input
                  type="text"
                  value={deleteUserEmailConfirm}
                  onChange={(e) => setDeleteUserEmailConfirm(e.target.value)}
                  placeholder={deleteTargetUser.email}
                  disabled={deleteUserLoading}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-destructive"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-foreground">
                  Reason for deletion <span className="text-destructive">*</span> (3–500 chars):
                </label>
                <textarea
                  value={deleteUserReason}
                  onChange={(e) => setDeleteUserReason(e.target.value)}
                  placeholder="e.g. User requested account erasure via support email on 24 Sep"
                  maxLength={500}
                  rows={3}
                  disabled={deleteUserLoading}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-destructive resize-none"
                />
                <div className="text-[10px] text-muted-foreground text-right">
                  {deleteUserReason.length} / 500
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                disabled={deleteUserLoading}
                onClick={() => setDeleteUserModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={
                  deleteUserLoading ||
                  deleteUserEmailConfirm.trim() !== deleteTargetUser.email ||
                  deleteUserReason.trim().length < 3
                }
                onClick={handleDeleteUserSubmit}
              >
                {deleteUserLoading && (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                )}
                Permanently Delete User
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
