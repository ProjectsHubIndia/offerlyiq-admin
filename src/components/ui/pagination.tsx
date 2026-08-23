import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const getVisiblePages = (current: number, total: number) => {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    if (current <= 4) {
      return [1, 2, 3, 4, 5, '...', total];
    }
    if (current >= total - 3) {
      return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
    }
    return [1, '...', current - 1, current, current + 1, '...', total];
  };

  const pages = getVisiblePages(currentPage, totalPages);

  return (
    <div className="flex items-center justify-center gap-1 mt-6">
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="p-2 rounded-xl text-muted-foreground hover:bg-foreground/5 hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <div className="flex items-center gap-1 px-2">
        {pages.map((page, idx) => {
          if (page === '...') {
            return (
              <span key={`ellipsis-${idx}`} className="w-10 h-10 flex items-center justify-center text-muted-foreground font-medium">
                ...
              </span>
            );
          }
          const pageNum = page as number;
          const isActive = pageNum === currentPage;
          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-gradient-to-br from-orange-500/15 to-purple-500/15"
                  : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
              }`}
            >
              {isActive ? (
                <span className="bg-gradient-to-br from-orange-400 to-purple-400 bg-clip-text text-transparent">
                  {pageNum}
                </span>
              ) : (
                pageNum
              )}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="p-2 rounded-xl text-muted-foreground hover:bg-foreground/5 hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}
