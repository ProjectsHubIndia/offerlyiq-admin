export interface SessionCreate {
  title: string;
  role: string;
  notes?: string;
  mode?: "live" | "mock";
  job_description?: string | null;
  prep_pack_id?: string | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface SessionUpdate {
  title?: string;
  role?: string;
  notes?: string;
  status?: string;
}

export interface SessionResponse {
  id: string;
  user_id: string;
  title: string;
  role: string;
  status: string;
  mode: string;
  notes?: string;
  job_description?: string | null;
  prep_pack_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MockEvaluation {
  score: number;
  feedback: string;
  suggestions: string[];
  is_case: boolean;
  thread_id?: string | null;
  structure?: string;
  handling_complications?: string;
  conclusion?: string;
}

export interface QAResponse {
  id: string;
  session_id: string;
  sequence: number;
  source: string;
  question: string;
  ai_answer?: string | null;
  user_answer?: string | null;
  score?: number | null;
  feedback?: string | null;
  suggestions?: string[] | null;
  category?: string | null;
  created_at: string;
}

export interface SessionDetailResponse extends SessionResponse {
  qa: QAResponse[];
}

export interface DimensionScore {
  score: number;
  notes: string;
}

export interface CategoryBreakdown {
  category: string;
  average_score: number;
  question_count: number;
}

export interface CaseEvaluation {
  thread_id: string | null;
  scenario: string;
  score: number;
  structure: string;
  handling_complications: string;
  conclusion: string;
}

export interface PrepReadiness {
  prepped_topics_covered: string[];
  prepped_topics_missed: string[];
  note: string;
}

export interface InterviewReportResult {
  score: number;
  summary: string;
  content: DimensionScore;
  communication: DimensionScore;
  technical_accuracy: DimensionScore;
  behavioral: DimensionScore;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  category_breakdown: CategoryBreakdown[];
  case_evaluations: CaseEvaluation[];
  prep_readiness: PrepReadiness | null;
  per_question?: QuestionFeedback[];
}

export interface InterviewReportResponse {
  id: string;
  session_id: string;
  result: InterviewReportResult;
  created_at: string;
}

export interface NextQuestionResponse {
  question: string;
}

export interface InterviewMessageResponse {
  id: string;
  session_id: string;
  role: "interviewer" | "candidate";
  content: string;
  position: number;
  created_at: string;
}

export interface QuestionFeedback {
  question: string;
  answer: string;
  score: number;
  feedback: string;
  improvement: string;
}

export interface InterviewSummaryResponse {
  score: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  suggestions: string[];
  per_question: QuestionFeedback[];
}

export interface AIHintResponse {
  feedback: string;
  score?: number | null;
  suggestions: string[];
}
