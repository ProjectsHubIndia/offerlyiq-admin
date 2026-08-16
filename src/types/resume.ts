export interface ResumeResponse {
  id: string;
  user_id: string;
  file_name: string;
  file_size: number;
  content_type: string;
  raw_text: string;
  created_at: string;
  updated_at: string;
}

export interface EnrichmentAnswer {
  question_id: string;
  question?: string;
  answer: string;
}

export interface TailorResumeRequest {
  role: string;
  job_description: string;
  enrichment?: EnrichmentAnswer[];
}

export interface AssessResumeRequest {
  role: string;
  job_description: string;
}

export interface ResumeGap {
  id: string;
  section: string;
  severity: "critical" | "minor";
  detail: string;
}

export interface EnrichmentQuestion {
  id: string;
  gap: string;
  question: string;
  suggested_answer: string;
}

export interface AssessResumeResponse {
  readiness_score: number;
  verdict: "ready" | "thin" | "sparse";
  gaps: ResumeGap[];
  questions: EnrichmentQuestion[];
}

export interface ResumeContact {
  full_name: string;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  links: string[];
}

export interface ResumeExperienceEntry {
  company: string;
  title: string;
  location?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  bullets: string[];
}

export interface ResumeProjectEntry {
  name: string;
  context?: string | null;
  tech: string[];
  bullets: string[];
}

export interface ResumeEducationEntry {
  institution: string;
  degree: string;
  start_date?: string | null;
  end_date?: string | null;
}

export interface ATSKeyword {
  term: string;
  type: "hard" | "soft";
  present: boolean;
  importance: number;
}

export interface ATSMatch {
  score: number;
  title_match: boolean;
  keywords: ATSKeyword[];
  missing_hard: string[];
  missing_soft: string[];
  suggestions: string[];
  format_ok: boolean;
}

export interface TailoredResumeContent {
  contact: ResumeContact;
  headline?: string | null;
  summary: string;
  skills: string[];
  recommended_skills?: string[];
  experience: ResumeExperienceEntry[];
  education: ResumeEducationEntry[];
  certifications: string[];
  projects: ResumeProjectEntry[];
  change_log: string[];
  ats_match?: ATSMatch | null;
}

export interface TailoredResumeResponse {
  id: string;
  role: string;
  job_description?: string | null;
  content: TailoredResumeContent;
  created_at: string;
}

export interface AiEditResumeRequest {
  instruction: string;
}

export interface AiEditResumeResponse {
  resume: TailoredResumeResponse;
  change_summary: string;
}

export interface SectionFinding {
  section: string;
  status: "present" | "missing" | "weak";
  detail: string;
}

export interface ATSResult {
  score: number;
  summary: string;
  strengths: string[];
  issues: string[];
  section_findings: SectionFinding[];
  keyword_suggestions: string[];
}

export interface ATSAnalysisResponse {
  id: string;
  result: ATSResult;
  created_at: string;
}

export interface JDMatchResult {
  score: number;
  summary: string;
  matched_skills: string[];
  missing_skills: string[];
  recommendations: string[];
}

export interface JDMatchRequest {
  job_description?: string | null;
  session_id?: string | null;
}

export interface JDMatchResponse {
  id: string;
  job_description?: string | null;
  result: JDMatchResult;
  created_at: string;
}

export interface JDExtractResponse {
  text: string;
}
