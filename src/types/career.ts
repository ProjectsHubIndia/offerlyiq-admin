export interface SkillGap {
  matched_skills: string[];
  missing_skills: string[];
  weak_skills: string[];
}

export interface CourseRecommendation {
  title: string;
  provider: string;
  url?: string;
  skill: string;
}

export interface CertificationRecommendation {
  name: string;
  provider: string;
  skill: string;
}

export interface MockInterviewPlanItem {
  focus_area: string;
  question_categories: string[];
  target_count: number;
}

export interface CareerMapResource {
  label: string;
  type: "course" | "certification" | "practice" | "article" | string;
  url?: string | null;
}

export interface CareerStage {
  id: string;
  title: string;
  status: "done" | "in_progress" | "upcoming" | string;
  skills: string[];
  gap?: string | null;
  resources: CareerMapResource[];
}

export interface CareerMapNode {
  role: string;
  level: number;
}

export interface CareerMapEdge {
  source: string;
  target: string;
}

export interface CareerMap {
  current: CareerMapNode;
  target: CareerMapNode;
  stages: CareerStage[];
  edges: CareerMapEdge[];
}

export interface CareerRecommendationResult {
  target_role: string;
  summary: string;
  skill_gap: SkillGap;
  performance_signals: string[];
  courses: CourseRecommendation[];
  certifications: CertificationRecommendation[];
  practice_areas: string[];
  mock_interview_plan: MockInterviewPlanItem[];
  career_map?: CareerMap | null;
}

export interface CareerRequest {
  target_role?: string;
  job_description?: string;
}

export interface CareerRecommendationResponse {
  id: string;
  target_role: string;
  result: CareerRecommendationResult;
  created_at: string;
}
