export interface ProfilePersonalInfo {
  full_name: string;
  email?: string;
  phone?: string;
  location?: string;
  links: string[];
}

export interface ProfileExperienceEntry {
  company: string;
  title: string;
  start_date?: string;
  end_date?: string;
  bullets: string[];
}

export interface ProfileEducationEntry {
  institution: string;
  degree: string;
  start_date?: string;
  end_date?: string;
}

export interface ProfileProject {
  name: string;
  description?: string;
  skills: string[];
}

export interface SkillGraph {
  technical: string[];
  soft: string[];
  domain: string[];
}

export interface CandidateProfileContent {
  personal_info: ProfilePersonalInfo;
  summary: string;
  skills: SkillGraph;
  experience: ProfileExperienceEntry[];
  projects: ProfileProject[];
  certifications: string[];
  education: ProfileEducationEntry[];
}

export interface CareerGoals {
  target_roles: string[];
  target_companies: string[];
  notes?: string;
}

export interface CandidateProfileResponse {
  id: string;
  content: CandidateProfileContent;
  career_goals?: CareerGoals;
  linkedin_url?: string;
  source: string;
  is_stale: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfileUpdate {
  personal_info?: ProfilePersonalInfo;
  summary?: string;
  skills?: SkillGraph;
  experience?: ProfileExperienceEntry[];
  projects?: ProfileProject[];
  certifications?: string[];
  education?: ProfileEducationEntry[];
}

export interface LinkedInImportRequest {
  linkedin_url?: string;
  profile_text: string;
}


