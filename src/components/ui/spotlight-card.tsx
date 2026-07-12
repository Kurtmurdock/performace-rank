"use client";

import React, { useRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GlowCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: "blue" | "purple" | "green" | "red" | "orange";
}

const glowColorMap: Record<string, number> = {
  blue: 220,
  purple: 280,
  green: 120,
  red: 0,
  orange: 30,
};

export function GlowCard({ children, className = "", glowColor = "red" }: GlowCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const hue = glowColorMap[glowColor];

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    cardRef.current?.style.setProperty("--x", `${x}px`);
    cardRef.current?.style.setProperty("--y", `${y}px`);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      className={cn(
        "relative rounded-2xl border border-border bg-card overflow-hidden",
        "transition-shadow duration-300",
        className
      )}
      style={
        {
          "--x": "50%",
          "--y": "50%",
        } as React.CSSProperties
      }
    >
      {/* Camada de brilho que segue o cursor */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `radial-gradient(220px circle at var(--x) var(--y), hsl(${hue} 90% 55% / 0.18), transparent 70%)`,
        }}
      />
      {/* Borda que acende no hover */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `radial-gradient(160px circle at var(--x) var(--y), hsl(${hue} 100% 60% / 0.5), transparent 70%)`,
          mask: "linear-gradient(#000,#000) padding-box, linear-gradient(#000,#000)",
          WebkitMask:
            "linear-gradient(#000 0 0) padding-box, linear-gradient(#000 0 0)",
          padding: "1px",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
