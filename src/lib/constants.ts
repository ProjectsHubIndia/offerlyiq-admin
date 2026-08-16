export const INTERVIEW_DEFAULTS = {
  mockTitle: "Practice Interview",
  liveTitle: "Live Copilot Session",
  role: "Software Engineer",
  durationMinutes: 20,
  durationOptions: [10, 15, 20, 30, 45] as const,
} as const;
