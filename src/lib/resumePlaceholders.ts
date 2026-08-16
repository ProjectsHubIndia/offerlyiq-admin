import type { TailoredResumeContent } from "@/types/resume";

// Curly-brace markers the tailoring prompt writes when a fact is missing
// (see RESUME_TAILOR_PROMPT) — e.g. "{team size}". Never square brackets.
export const PLACEHOLDER_RE = /\{[^{}]+\}/g;

export interface ResumeGapPlaceholder {
  label: string; // e.g. "{team size}"
  location: string; // human-readable location, e.g. "Bullet under Engineer @ Acme"
}

function extract(
  text: string | null | undefined,
  location: string,
  out: ResumeGapPlaceholder[],
): void {
  if (!text) return;
  const matches = text.match(PLACEHOLDER_RE);
  if (!matches) return;
  for (const label of matches) out.push({ label, location });
}

/** Scans a tailored resume's text fields for unresolved {placeholder} markers. */
export function findResumeGapPlaceholders(
  content: TailoredResumeContent,
): ResumeGapPlaceholder[] {
  const out: ResumeGapPlaceholder[] = [];
  extract(content.summary, "Summary", out);
  extract(content.headline, "Headline", out);
  content.experience.forEach((entry) => {
    const where = [entry.title, entry.company].filter(Boolean).join(" @ ") || "an experience entry";
    entry.bullets.forEach((bullet) => extract(bullet, `Bullet under ${where}`, out));
  });
  content.projects.forEach((project) => {
    extract(project.context, `Project "${project.name}"`, out);
    project.bullets.forEach((bullet) => extract(bullet, `Bullet under project "${project.name}"`, out));
  });
  return out;
}
