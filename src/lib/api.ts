import type {
  TokenResponse,
  User,
  UserCreate,
  UserUpdate,
  MessageResponse,
} from "@/types/auth";
import type {
  SessionCreate,
  SessionUpdate,
  SessionResponse,
  SessionDetailResponse,
  PaginatedResponse,
  InterviewReportResponse,
  NextQuestionResponse,
  InterviewMessageResponse,
  InterviewSummaryResponse,
  AIHintResponse,
} from "@/types/session";
import type {
  ResumeResponse,
  TailorResumeRequest,
  TailoredResumeResponse,
  TailoredResumeContent,
  ATSAnalysisResponse,
  JDMatchRequest,
  JDMatchResponse,
  JDExtractResponse,
  AssessResumeRequest,
  AssessResumeResponse,
  AiEditResumeResponse,
} from "@/types/resume";
import type {
  CandidateProfileResponse,
  ProfileUpdate,
  LinkedInImportRequest,
  CareerGoals,
} from "@/types/profile";
import type {
  CareerRecommendationResponse,
  CareerRequest,
} from "@/types/career";
import type {
  PrepPackResponse,
  PrepRequest,
  PrepChatMessage,
  PrepChatStreamFrame,
} from "@/types/prep";
import type { UsageSummary } from "@/types/usage";
import type {
  BillingPlan,
  Wallet,
  LedgerEntry,
  DiscountPreviewResponse,
  RedeemDiscountRequest,
  RedeemDiscountResponse,
  CheckoutRequest,
  CheckoutResponse,
  ModuleCost,
} from "@/types/billing";
import {
  getInterviewWsUrl as buildInterviewWsUrl,
  getMockInterviewWsUrl as buildMockInterviewWsUrl,
} from "@/lib/realtime";
import axiosMain, { API_URL } from "@/lib/axiosMain";

export function getInterviewWsUrl(sessionId: string, token: string): string {
  return buildInterviewWsUrl(API_URL, sessionId, token);
}

export function getMockInterviewWsUrl(
  sessionId: string,
  token: string,
  durationMinutes: number = 20,
): string {
  return buildMockInterviewWsUrl(API_URL, sessionId, token, durationMinutes);
}

function authHeader(accessToken: string) {
  return { headers: { Authorization: `Bearer ${accessToken}` } };
}

export async function googleLogin(idToken: string): Promise<TokenResponse> {
  const { data } = await axiosMain.post<TokenResponse>("/auth/google", {
    id_token: idToken,
  });
  return data;
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

export async function getUsage(accessToken: string): Promise<UsageSummary> {
  const { data } = await axiosMain.get<UsageSummary>(
    "/users/me/usage",
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

export async function createSession(
  accessToken: string,
  payload: SessionCreate,
): Promise<SessionResponse> {
  const { data } = await axiosMain.post<SessionResponse>(
    "/sessions",
    payload,
    authHeader(accessToken),
  );
  return data;
}

export async function updateSession(
  accessToken: string,
  sessionId: string,
  payload: SessionUpdate,
): Promise<SessionResponse> {
  const { data } = await axiosMain.patch<SessionResponse>(
    `/sessions/${sessionId}`,
    payload,
    authHeader(accessToken),
  );
  return data;
}

export async function cancelSession(
  accessToken: string,
  sessionId: string,
): Promise<SessionResponse> {
  const { data } = await axiosMain.post<SessionResponse>(
    `/sessions/${sessionId}/cancel`,
    undefined,
    authHeader(accessToken),
  );
  return data;
}

export async function generateInterviewReport(
  accessToken: string,
  sessionId: string,
): Promise<InterviewReportResponse> {
  const { data } = await axiosMain.post<InterviewReportResponse>(
    `/sessions/${sessionId}/report`,
    undefined,
    authHeader(accessToken),
  );
  return data;
}

export async function getInterviewReport(
  accessToken: string,
  sessionId: string,
): Promise<InterviewReportResponse> {
  const { data } = await axiosMain.get<InterviewReportResponse>(
    `/sessions/${sessionId}/report`,
    authHeader(accessToken),
  );
  return data;
}

export async function verifyEmail(token: string): Promise<MessageResponse> {
  const { data } = await axiosMain.post<MessageResponse>("/auth/verify-email", {
    token,
  });
  return data;
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

export async function forgotPassword(email: string): Promise<MessageResponse> {
  const { data } = await axiosMain.post<MessageResponse>(
    "/auth/forgot-password",
    { email },
  );
  return data;
}

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<MessageResponse> {
  const { data } = await axiosMain.post<MessageResponse>(
    "/auth/reset-password",
    {
      token,
      new_password: newPassword,
    },
  );
  return data;
}

export async function register(payload: UserCreate): Promise<User> {
  const { data } = await axiosMain.post<User>("/auth/register", payload);
  return data;
}

export async function refreshToken(
  refresh_token: string,
): Promise<TokenResponse> {
  const { data } = await axiosMain.post<TokenResponse>("/auth/refresh", {
    refresh_token,
  });
  return data;
}

export async function changePassword(
  accessToken: string,
  currentPassword: string,
  newPassword: string,
): Promise<MessageResponse> {
  const { data } = await axiosMain.post<MessageResponse>(
    "/users/me/change-password",
    { current_password: currentPassword, new_password: newPassword },
    authHeader(accessToken),
  );
  return data;
}

export async function updateProfile(
  accessToken: string,
  payload: UserUpdate,
): Promise<User> {
  const { data } = await axiosMain.patch<User>(
    "/users/me",
    payload,
    authHeader(accessToken),
  );
  return data;
}

export async function listSessions(
  accessToken: string,
  page = 1,
  size = 10,
): Promise<PaginatedResponse<SessionResponse>> {
  const { data } = await axiosMain.get<PaginatedResponse<SessionResponse>>(
    "/sessions",
    {
      ...authHeader(accessToken),
      params: { page, size },
    },
  );
  return data;
}

export async function completeSession(
  accessToken: string,
  sessionId: string,
): Promise<SessionResponse> {
  const { data } = await axiosMain.post<SessionResponse>(
    `/sessions/${sessionId}/complete`,
    undefined,
    authHeader(accessToken),
  );
  return data;
}

export async function deleteAccount(accessToken: string): Promise<void> {
  await axiosMain.delete("/users/me", authHeader(accessToken));
}

export async function getResume(
  accessToken: string,
): Promise<ResumeResponse | null> {
  const response = await axiosMain.get<ResumeResponse>("/users/me/resume", {
    ...authHeader(accessToken),
    validateStatus: (status) => status === 200 || status === 404,
  });
  if (response.status === 404) return null;
  return response.data;
}

export async function uploadResume(
  accessToken: string,
  file: File,
): Promise<ResumeResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await axiosMain.post<ResumeResponse>(
    "/users/me/resume",
    formData,
    authHeader(accessToken),
  );
  return data;
}

export async function deleteResume(accessToken: string): Promise<void> {
  await axiosMain.delete("/users/me/resume", authHeader(accessToken));
}

export async function getSession(
  accessToken: string,
  sessionId: string,
): Promise<SessionDetailResponse> {
  const { data } = await axiosMain.get<SessionDetailResponse>(
    `/sessions/${sessionId}`,
    authHeader(accessToken),
  );
  return data;
}

export async function assessResume(
  accessToken: string,
  payload: AssessResumeRequest,
): Promise<AssessResumeResponse> {
  const { data } = await axiosMain.post<AssessResumeResponse>(
    "/users/me/resume/tailor/assess",
    payload,
    authHeader(accessToken),
  );
  return data;
}

export async function tailorResume(
  accessToken: string,
  payload: TailorResumeRequest,
): Promise<TailoredResumeResponse> {
  const { data } = await axiosMain.post<TailoredResumeResponse>(
    "/users/me/resume/tailor",
    payload,
    authHeader(accessToken),
  );
  return data;
}

export async function getTailoredResume(
  accessToken: string,
  tailoredId: string,
): Promise<TailoredResumeResponse> {
  const { data } = await axiosMain.get<TailoredResumeResponse>(
    `/users/me/resume/tailor/${tailoredId}`,
    authHeader(accessToken),
  );
  return data;
}

export async function updateTailoredResume(
  accessToken: string,
  tailoredId: string,
  content: TailoredResumeContent,
): Promise<TailoredResumeResponse> {
  const { data } = await axiosMain.patch<TailoredResumeResponse>(
    `/users/me/resume/tailor/${tailoredId}`,
    { content },
    authHeader(accessToken),
  );
  return data;
}

export async function aiEditTailoredResume(
  accessToken: string,
  tailoredId: string,
  instruction: string,
): Promise<AiEditResumeResponse> {
  const { data } = await axiosMain.post<AiEditResumeResponse>(
    `/users/me/resume/tailor/${tailoredId}/ai-edit`,
    { instruction },
    authHeader(accessToken),
  );
  return data;
}

export async function downloadTailoredResume(
  accessToken: string,
  tailoredId: string,
  format: "pdf" | "docx",
): Promise<Blob> {
  const { data } = await axiosMain.get<Blob>(
    `/users/me/resume/tailor/${tailoredId}/download`,
    {
      ...authHeader(accessToken),
      params: { format },
      responseType: "blob",
    },
  );
  return data;
}

export async function runAtsAnalysis(
  accessToken: string,
): Promise<ATSAnalysisResponse> {
  const { data } = await axiosMain.post<ATSAnalysisResponse>(
    "/users/me/resume/ats",
    undefined,
    authHeader(accessToken),
  );
  return data;
}

export async function getAtsAnalysis(
  accessToken: string,
): Promise<ATSAnalysisResponse> {
  const { data } = await axiosMain.get<ATSAnalysisResponse>(
    "/users/me/resume/ats",
    authHeader(accessToken),
  );
  return data;
}

export async function runJdMatch(
  accessToken: string,
  payload: JDMatchRequest,
): Promise<JDMatchResponse> {
  const { data } = await axiosMain.post<JDMatchResponse>(
    "/users/me/resume/jd-match",
    payload,
    authHeader(accessToken),
  );
  return data;
}

export async function getJdMatch(
  accessToken: string,
): Promise<JDMatchResponse> {
  const { data } = await axiosMain.get<JDMatchResponse>(
    "/users/me/resume/jd-match",
    authHeader(accessToken),
  );
  return data;
}

export async function getProfile(
  accessToken: string,
): Promise<CandidateProfileResponse | null> {
  const response = await axiosMain.get<CandidateProfileResponse>(
    "/users/me/profile",
    {
      ...authHeader(accessToken),
      validateStatus: (status) => status === 200 || status === 404,
    },
  );
  if (response.status === 404) return null;
  return response.data;
}

export async function createProfile(
  accessToken: string,
  confirm = false,
): Promise<CandidateProfileResponse> {
  const { data } = await axiosMain.post<CandidateProfileResponse>(
    "/users/me/profile",
    confirm ? { confirm: true } : undefined,
    authHeader(accessToken),
  );
  return data;
}

export async function updateCandidateProfile(
  accessToken: string,
  payload: ProfileUpdate,
): Promise<CandidateProfileResponse> {
  const { data } = await axiosMain.patch<CandidateProfileResponse>(
    "/users/me/profile",
    payload,
    authHeader(accessToken),
  );
  return data;
}

export async function deleteProfile(accessToken: string): Promise<void> {
  await axiosMain.delete("/users/me/profile", authHeader(accessToken));
}

export async function importLinkedInProfile(
  accessToken: string,
  payload: LinkedInImportRequest,
): Promise<CandidateProfileResponse> {
  const { data } = await axiosMain.post<CandidateProfileResponse>(
    "/users/me/profile/import-linkedin",
    payload,
    authHeader(accessToken),
  );
  return data;
}

export async function updateCareerGoals(
  accessToken: string,
  payload: CareerGoals,
): Promise<CandidateProfileResponse> {
  const { data } = await axiosMain.put<CandidateProfileResponse>(
    "/users/me/profile/career-goals",
    payload,
    authHeader(accessToken),
  );
  return data;
}

export async function getCareerRecommendations(
  accessToken: string,
): Promise<CareerRecommendationResponse | null> {
  const response = await axiosMain.get<CareerRecommendationResponse>(
    "/users/me/career/recommendations",
    {
      ...authHeader(accessToken),
      validateStatus: (status) => status === 200 || status === 404,
    },
  );
  if (response.status === 404) return null;
  return response.data;
}

export async function getCareerHistory(
  accessToken: string,
): Promise<CareerRecommendationResponse[]> {
  const response = await axiosMain.get<CareerRecommendationResponse[]>(
    "/users/me/career/recommendations/history",
    {
      ...authHeader(accessToken),
      validateStatus: (status) => status === 200 || status === 404,
    },
  );
  if (response.status === 404) return [];
  return response.data;
}

export async function generateCareerRecommendations(
  accessToken: string,
  payload: CareerRequest,
): Promise<CareerRecommendationResponse> {
  const { data } = await axiosMain.post<CareerRecommendationResponse>(
    "/users/me/career/recommendations",
    payload,
    authHeader(accessToken),
  );
  return data;
}

export async function getPrepPack(
  accessToken: string,
): Promise<PrepPackResponse | null> {
  const response = await axiosMain.get<PrepPackResponse>("/users/me/prep", {
    ...authHeader(accessToken),
    validateStatus: (status) => status === 200 || status === 404,
  });
  if (response.status === 404) return null;
  return response.data;
}

export async function generatePrepPack(
  accessToken: string,
  payload: PrepRequest,
): Promise<PrepPackResponse> {
  const { data } = await axiosMain.post<PrepPackResponse>(
    "/users/me/prep",
    payload,
    authHeader(accessToken),
  );
  return data;
}

export async function getPrepHistory(
  accessToken: string,
  page = 1,
  size = 10,
): Promise<PaginatedResponse<PrepPackResponse>> {
  const { data } = await axiosMain.get<PaginatedResponse<PrepPackResponse>>(
    "/users/me/prep/history",
    {
      ...authHeader(accessToken),
      params: { page, size },
    },
  );
  return data;
}

export async function extractJdText(
  accessToken: string,
  file: File,
): Promise<JDExtractResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await axiosMain.post<JDExtractResponse>(
    "/users/me/resume/jd-extract",
    formData,
    authHeader(accessToken),
  );
  return data;
}

export async function startInterview(
  accessToken: string,
  sessionId: string,
): Promise<NextQuestionResponse> {
  const { data } = await axiosMain.post<NextQuestionResponse>(
    `/sessions/${sessionId}/start`,
    undefined,
    authHeader(accessToken),
  );
  return data;
}

export async function submitAnswer(
  accessToken: string,
  sessionId: string,
  answer: string,
): Promise<NextQuestionResponse> {
  const { data } = await axiosMain.post<NextQuestionResponse>(
    `/sessions/${sessionId}/answer`,
    { answer },
    authHeader(accessToken),
  );
  return data;
}

export async function getSessionMessages(
  accessToken: string,
  sessionId: string,
): Promise<InterviewMessageResponse[]> {
  const { data } = await axiosMain.get<InterviewMessageResponse[]>(
    `/sessions/${sessionId}/messages`,
    authHeader(accessToken),
  );
  return data;
}

export async function finishInterview(
  accessToken: string,
  sessionId: string,
): Promise<InterviewSummaryResponse> {
  const { data } = await axiosMain.post<InterviewSummaryResponse>(
    `/sessions/${sessionId}/finish`,
    undefined,
    authHeader(accessToken),
  );
  return data;
}

export async function getInterviewHint(
  accessToken: string,
  sessionId: string,
  question: string,
  userAnswer: string,
): Promise<AIHintResponse> {
  const { data } = await axiosMain.post<AIHintResponse>(
    `/sessions/${sessionId}/hint`,
    { question, user_answer: userAnswer },
    authHeader(accessToken),
  );
  return data;
}

export async function getSessionSummary(
  accessToken: string,
  sessionId: string,
): Promise<InterviewSummaryResponse> {
  const { data } = await axiosMain.get<InterviewSummaryResponse>(
    `/sessions/${sessionId}/summary`,
    authHeader(accessToken),
  );
  return data;
}

export async function getPrepChatHistory(
  accessToken: string,
): Promise<PrepChatMessage[]> {
  const { data } = await axiosMain.get<PrepChatMessage[]>(
    "/users/me/prep/chat/history",
    authHeader(accessToken),
  );
  return data;
}

export async function streamPrepChatMessage(
  accessToken: string,
  message: string,
  callbacks: {
    onToken: (text: string) => void;
    onError: (errDetail: string) => void;
    onDone: () => void;
  },
): Promise<void> {
  const response = await fetch(`${API_URL}/users/me/prep/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ message }),
  });

  if (!response.ok) {
    let errMessage = `Request failed (${response.status})`;
    try {
      const errData = await response.json();
      if (errData?.detail) {
        errMessage =
          typeof errData.detail === "string"
            ? errData.detail
            : JSON.stringify(errData.detail);
      }
    } catch {
      /* ignore JSON parse failure */
    }
    callbacks.onError(errMessage);
    return;
  }

  if (!response.body) {
    callbacks.onError("No response stream available.");
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data: ")) continue;
      try {
        const frame: PrepChatStreamFrame = JSON.parse(trimmed.slice(6));
        if (frame.type === "token" && frame.text) {
          callbacks.onToken(frame.text);
        } else if (frame.type === "error") {
          callbacks.onError(frame.detail || "Stream error occurred");
        } else if (frame.type === "done") {
          callbacks.onDone();
        }
      } catch {
        /* ignore invalid JSON frame */
      }
    }
  }
  callbacks.onDone();
}

// --- Billing API ---

export async function listPublicPlans(): Promise<BillingPlan[]> {
  const { data } = await axiosMain.get<BillingPlan[]>("/billing/plans");
  return data;
}

export async function listModuleCosts(): Promise<ModuleCost[]> {
  const { data } = await axiosMain.get<ModuleCost[]>("/billing/costs");
  return data;
}

export async function getWallet(accessToken: string): Promise<Wallet> {
  const { data } = await axiosMain.get<Wallet>(
    "/billing/wallet",
    authHeader(accessToken),
  );
  return data;
}

export async function getLedger(
  accessToken: string,
  offset: number = 0,
  limit: number = 20,
): Promise<LedgerEntry[]> {
  const { data } = await axiosMain.get<LedgerEntry[]>("/billing/ledger", {
    ...authHeader(accessToken),
    params: { offset, limit },
  });
  return data;
}

export async function previewDiscount(
  accessToken: string,
  code: string,
): Promise<DiscountPreviewResponse> {
  const { data } = await axiosMain.get<DiscountPreviewResponse>(
    `/billing/discounts/${code}/preview`,
    authHeader(accessToken),
  );
  return data;
}

export async function redeemDiscount(
  accessToken: string,
  payload: RedeemDiscountRequest,
): Promise<RedeemDiscountResponse> {
  const { data } = await axiosMain.post<RedeemDiscountResponse>(
    "/billing/redeem",
    payload,
    authHeader(accessToken),
  );
  return data;
}

export async function createCheckout(
  token: string,
  planCode: string,
  discountCode?: string,
): Promise<CheckoutResponse> {
  const req: CheckoutRequest = { plan_code: planCode };
  if (discountCode) req.discount_code = discountCode;

  const { data } = await axiosMain.post<CheckoutResponse>(
    "/billing/checkout",
    req,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return data;
}

export async function getModuleCosts(): Promise<ModuleCost[]> {
  const { data } = await axiosMain.get<ModuleCost[]>("/billing/costs");
  return data;
}

const authConfig = (token?: string) =>
  token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;

export const admin = {
  // Analytics
  overview: (token?: string) =>
    axiosMain
      .get("/admin/analytics/overview", authConfig(token))
      .then((r) => r.data),
  revenue: (token?: string) =>
    axiosMain
      .get("/admin/analytics/revenue", authConfig(token))
      .then((r) => r.data),
  credits: (token?: string) =>
    axiosMain
      .get("/admin/analytics/credits", authConfig(token))
      .then((r) => r.data),
  modulesAnalytics: (token?: string) =>
    axiosMain
      .get("/admin/analytics/modules", authConfig(token))
      .then((r) => r.data),
  plansAnalytics: (token?: string) =>
    axiosMain
      .get("/admin/analytics/plans", authConfig(token))
      .then((r) => r.data),

  // Users
  getUsers: (token?: string, page = 1, size = 20, q?: string) =>
    axiosMain
      .get("/admin/users", {
        ...authConfig(token),
        params: { page, size, ...(q ? { q } : {}) },
      })
      .then((r) => r.data),
  getUser: (id: string, token?: string) =>
    axiosMain.get(`/admin/users/${id}`, authConfig(token)).then((r) => r.data),
  updateUserStatus: (
    id: string,
    status: string,
    reason: string,
    token?: string,
  ) =>
    axiosMain
      .patch(`/admin/users/${id}/status`, { status, reason }, authConfig(token))
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
    amount: number,
    reason: string,
    token?: string,
  ) =>
    axiosMain
      .post(`/admin/users/${id}/credits`, { amount, reason }, authConfig(token))
      .then((r) => r.data),

  userMargin: (id: string, token?: string) =>
    axiosMain
      .get(`/admin/analytics/users/${id}/margin`, authConfig(token))
      .then((r) => r.data),
  reinstateUser: (id: string, token?: string) =>
    axiosMain
      .post(`/admin/billing/users/${id}/reinstate`, {}, authConfig(token))
      .then((r) => r.data),

  // Plans
  getPlans: (token?: string) =>
    axiosMain.get("/admin/plans", authConfig(token)).then((r) => r.data),
  getPlan: (id: string, token?: string) =>
    axiosMain.get(`/admin/plans/${id}`, authConfig(token)).then((r) => r.data),
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
  // Billing Ops
  getWebhooks: (token?: string, page = 1, size = 10) =>
    axiosMain
      .get("/admin/billing/webhooks", { ...authConfig(token), params: { page, size } })
      .then((r) => r.data),
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
      .get("/admin/billing/transactions", { ...authConfig(token), params: { page, size } })
      .then((r) => r.data),
  getChargebacks: (token?: string, page = 1, size = 10) =>
    axiosMain
      .get("/admin/billing/chargebacks", { ...authConfig(token), params: { page, size } })
      .then((r) => r.data),
  refundTransaction: (id: string, reason: string, token?: string) =>
    axiosMain
      .post(
        `/admin/billing/transactions/${id}/refund`,
        { reason },
        authConfig(token),
      )
      .then((r) => r.data),

  // Analytics
  overview: (token?: string) =>
    axiosMain
      .get("/admin/analytics/overview", authConfig(token))
      .then((r) => r.data),
  revenue: (token?: string) =>
    axiosMain
      .get("/admin/analytics/revenue", authConfig(token))
      .then((r) => r.data),
  creditFlow: (token?: string) =>
    axiosMain
      .get("/admin/analytics/credits", authConfig(token))
      .then((r) => r.data),
  moduleUsage: (token?: string) =>
    axiosMain
      .get("/admin/analytics/modules", authConfig(token))
      .then((r) => r.data),
  planSales: (token?: string) =>
    axiosMain
      .get("/admin/analytics/plans", authConfig(token))
      .then((r) => r.data),

  // Discounts Extensions
  getDiscountRedemptions: (id: string, token?: string) =>
    axiosMain
      .get(`/admin/discounts/${id}/redemptions`, authConfig(token))
      .then((r) => r.data),
};
