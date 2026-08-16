"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";

type PersonaType = "candidate" | "hr" | "admin" | "coding";

export function LogoSplit({
  priority = false,
  persona,
  className = "h-10 w-auto object-contain",
}: {
  priority?: boolean;
  persona?: PersonaType;
  className?: string;
}) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = persona === "coding" || resolvedTheme === "dark";
  const logoSrc =
    mounted && !isDark
      ? "/assets/Logo/bg Light2.png"
      : "/assets/images/Headerfinal/Header BG transparent.png";

  const resolvedClass =
    mounted && !isDark ? "h-[85px] w-auto object-contain" : className;

  return (
    <div className="flex items-center select-none shrink-0">
      <Image
        src={logoSrc}
        alt="OfferlyIQ.ai Logo"
        width={300}
        height={120}
        className={resolvedClass}
        priority={priority}
      />
    </div>
  );
}
