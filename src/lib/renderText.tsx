import React from "react";

export function renderInline(text: string, baseKey: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[\s\S]*?\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong
          key={`${baseKey}-b${i}`}
          className="font-semibold text-orange-600 dark:text-orange-400 bg-orange-500/10 px-0.5 rounded"
        >
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return (
        <em key={`${baseKey}-i${i}`} className="italic text-foreground/80">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code
          key={`${baseKey}-c${i}`}
          className="font-mono text-[13px] bg-secondary/15 text-secondary px-1.5 py-0.5 rounded"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={`${baseKey}-t${i}`}>{part}</span>;
  });
}
