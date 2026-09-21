import type { TokenResponse, User, MessageResponse } from "@/types/auth";
import axiosMain from "@/lib/axiosMain";

function authHeader(accessToken: string) {
  return { headers: { Authorization: `Bearer ${accessToken}` } };
}

export async function login(
  email: string,
  password: string,
): Promise<TokenResponse> {
  const { data } = await axiosMain.post<TokenResponse>("/auth/login", {
    email,
    password,
  });
  return data;
}

export async function getCurrentUser(accessToken: string): Promise<User> {
  const { data } = await axiosMain.get<User>(
    "/users/me",
    authHeader(accessToken),
  );
  return data;
}

export async function logout(
  refreshToken: string,
  accessToken: string,
): Promise<void> {
  await axiosMain.post(
    "/auth/logout",
    { refresh_token: refreshToken },
    authHeader(accessToken),
  );
}

export async function resendVerification(
  email: string,
): Promise<MessageResponse> {
  const { data } = await axiosMain.post<MessageResponse>(
    "/auth/resend-verification",
    { email },
  );
  return data;
}

const authConfig = (token?: string) =>
  token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;

export const admin = {
  // Analytics
  overview: (token?: string, days?: number) =>
    axiosMain
      .get("/admin/analytics/overview", { ...authConfig(token), params: days ? { days } : undefined })
      .then((r) => r.data),
  revenue: (token?: string, days?: number) =>
    axiosMain
      .get("/admin/analytics/revenue", { ...authConfig(token), params: days ? { days } : undefined })
      .then((r) => r.data),
  // Users
  getUsers: (token?: string, page = 1, size = 20, q?: string, role?: string, is_active?: string) =>
    axiosMain
      .get("/admin/users", {
        ...authConfig(token),
        params: { page, size, ...(q ? { q } : {}), ...(role && role !== "all" ? { role } : {}), ...(is_active && is_active !== "all" ? { is_active: is_active === "active" } : {}) },
      })
      .then((r) => r.data),
  updateUserStatus: (
    id: string,
    status: string,
    reason: string,
    token?: string,
  ) =>
    axiosMain
      .patch(`/admin/users/${id}/status`, { is_active: status === "active", reason }, authConfig(token))
      .then((r) => r.data),
  updateUserRole: (id: string, role: string, reason: string, token?: string) =>
    axiosMain
      .patch(`/admin/users/${id}/role`, { role, reason }, authConfig(token))
      .then((r) => r.data),
  getUserLedger: (id: string, token?: string) =>
    axiosMain
      .get(`/admin/users/${id}/ledger`, authConfig(token))
      .then((r) => r.data),
  getUserTransactions: (id: string, token?: string) =>
    axiosMain
      .get(`/admin/users/${id}/transactions`, authConfig(token))
      .then((r) => r.data),
  grantUserCredits: (
    id: string,
    delta: number,
    reason: string,
    expires_in_days?: number,
    token?: string,
  ) =>
    axiosMain
      .post(`/admin/users/${id}/credits`, { delta, reason, expires_in_days }, authConfig(token))
      .then((r) => r.data),

  userMargin: (id: string, token?: string) =>
    axiosMain
      .get(`/admin/analytics/users/${id}/margin`, authConfig(token))
      .then((r) => r.data),
  reinstateUser: (id: string, reason: string, token?: string) =>
    axiosMain
      .post(`/admin/billing/users/${id}/reinstate`, { reason }, authConfig(token))
      .then((r) => r.data),

  // Plans
  getPlans: (token?: string) =>
    axiosMain.get("/admin/plans", authConfig(token)).then((r) => r.data),
  createPlan: (data: any, token?: string) =>
    axiosMain.post("/admin/plans", data, authConfig(token)).then((r) => r.data),
  updatePlan: (id: string, data: any, token?: string) =>
    axiosMain
      .patch(`/admin/plans/${id}`, data, authConfig(token))
      .then((r) => r.data),
  updatePlanPrices: (id: string, data: any, token?: string) =>
    axiosMain
      .put(`/admin/plans/${id}/prices`, data, authConfig(token))
      .then((r) => r.data),
  updatePlanFeatures: (id: string, data: any, token?: string) =>
    axiosMain
      .put(`/admin/plans/${id}/features`, data, authConfig(token))
      .then((r) => r.data),
  publishPlan: (id: string, token?: string) =>
    axiosMain
      .post(`/admin/plans/${id}/publish`, undefined, authConfig(token))
      .then((r) => r.data),
  unpublishPlan: (id: string, token?: string) =>
    axiosMain
      .post(`/admin/plans/${id}/unpublish`, undefined, authConfig(token))
      .then((r) => r.data),
  archivePlan: (id: string, token?: string) =>
    axiosMain
      .post(`/admin/plans/${id}/archive`, undefined, authConfig(token))
      .then((r) => r.data),
  updatePlanHighlights: (id: string, data: any[], token?: string) =>
    axiosMain
      .put(`/admin/plans/${id}/highlights`, data, authConfig(token))
      .then((r) => r.data),
  getBillingCosts: (token?: string) =>
    axiosMain.get("/billing/costs", authConfig(token)).then((r) => r.data),

  // Catalog
  getModules: (token?: string) =>
    axiosMain.get("/admin/modules", authConfig(token)).then((r) => r.data),
  patchModule: (code: string, data: any, token?: string) =>
    axiosMain
      .patch(`/admin/modules/${code}`, data, authConfig(token))
      .then((r) => r.data),
  getFeatures: (token?: string) =>
    axiosMain.get("/admin/features", authConfig(token)).then((r) => r.data),
  getSettings: (token?: string) =>
    axiosMain.get("/admin/settings", authConfig(token)).then((r) => r.data),
  patchSetting: (key: string, data: any, token?: string) =>
    axiosMain
      .patch(`/admin/settings/${key}`, data, authConfig(token))
      .then((r) => r.data),

  // Discounts
  getDiscounts: (token?: string) =>
    axiosMain.get("/admin/discounts", authConfig(token)).then((r) => r.data),
  createDiscount: (data: any, token?: string) =>
    axiosMain
      .post("/admin/discounts", data, authConfig(token))
      .then((r) => r.data),
  updateDiscount: (id: string, data: any, token?: string) =>
    axiosMain
      .patch(`/admin/discounts/${id}`, data, authConfig(token))
      .then((r) => r.data),
  deleteDiscount: (id: string, token?: string) =>
    axiosMain
      .delete(`/admin/discounts/${id}`, authConfig(token))
      .then((r) => r.data),

  // Billing Ops
  getWebhooks: (token?: string, page = 1, size = 10, filters?: { status?: string, eventType?: string, since?: string, until?: string }) => {
    const params: any = { page, size };
    if (filters?.status && filters.status !== "all") params.status = filters.status;
    if (filters?.eventType && filters.eventType !== "all") params.event_type = filters.eventType;
    if (filters?.since) params.since = filters.since;
    if (filters?.until) params.until = filters.until;
    return axiosMain
      .get("/admin/billing/webhooks", {
        ...authConfig(token),
        params,
      })
      .then((r) => r.data);
  },
  getWebhookDetail: (id: string, token?: string) =>
    axiosMain
      .get(`/admin/billing/webhooks/${id}`, authConfig(token))
      .then((r) => r.data),
  replayWebhook: (id: string, token?: string) =>
    axiosMain
      .post(`/admin/billing/webhooks/${id}/replay`, {}, authConfig(token))
      .then((r) => r.data),
  getTransactions: (token?: string, page = 1, size = 10) =>
    axiosMain
      .get("/admin/billing/transactions", {
        ...authConfig(token),
        params: { page, size },
      })
      .then((r) => r.data),
  getChargebacks: (token?: string, page = 1, size = 10) =>
    axiosMain
      .get("/admin/billing/chargebacks", {
        ...authConfig(token),
        params: { page, size },
      })
      .then((r) => r.data),
  refundTransaction: (id: string, reason: string, token?: string) =>
    axiosMain
      .post(
        `/admin/billing/transactions/${id}/refund`,
        { reason },
        authConfig(token),
      )
      .then((r) => r.data),
  creditFlow: (token?: string, days?: number) =>
    axiosMain
      .get("/admin/analytics/credits", {
        ...authConfig(token),
        params: { days },
      })
      .then((r) => r.data),
  moduleUsage: (token?: string, days?: number) =>
    axiosMain
      .get("/admin/analytics/modules", {
        ...authConfig(token),
        params: { days },
      })
      .then((r) => r.data),
  planSales: (token?: string, days?: number) =>
    axiosMain
      .get("/admin/analytics/plans", {
        ...authConfig(token),
        params: { days },
      })
      .then((r) => r.data),

  // Discounts Extensions
  getDiscountRedemptions: (id: string, token?: string) =>
    axiosMain
      .get(`/admin/discounts/${id}/redemptions`, authConfig(token))
      .then((r) => r.data),

  // Audit log
  getAuditLog: (token?: string, params?: { actor_user_id?: string; action?: string; target_type?: string; target_id?: string; since?: string; until?: string; page?: number; size?: number }) =>
    axiosMain.get("/admin/audit", { ...authConfig(token), params }).then((r) => r.data),
  getAuditActions: (token?: string) =>
    axiosMain.get("/admin/audit/actions", authConfig(token)).then((r) => r.data),
};
