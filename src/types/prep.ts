import type { SkillGap } from "./career";

export interface FocusTopic {
  topic: string;
  reason: string;
  priority: number;
}

export interface LikelyQuestion {
  question: string;
  category: string;
  why?: string;
}

export interface StoryBankEntry {
  competency: string;
  situation: string;
  suggested_story: string;
}

export interface ConceptRefresher {
  concept: string;
  brief: string;
}

export interface CaseScenarioSeed {
  title: string;
  prompt: string;
  category?: string;
}

export interface PrepPackResult {
  target_role: string;
  summary: string;
  skill_gap: SkillGap;
  focus_topics: FocusTopic[];
  likely_questions: LikelyQuestion[];
  story_bank: StoryBankEntry[];
  concept_refreshers: ConceptRefresher[];
  case_scenarios: CaseScenarioSeed[];
  readiness_checklist: string[];
}

export interface PrepRequest {
  target_role?: string;
  job_description?: string;
  company?: string;
}

export interface PrepPackResponse {
  id: string;
  target_role: string;
  result: PrepPackResult;
  created_at: string;
}

export interface PrepChatMessage {
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

export interface PrepChatStreamFrame {
  type: "token" | "done" | "error";
  text?: string;
  detail?: string;
}
