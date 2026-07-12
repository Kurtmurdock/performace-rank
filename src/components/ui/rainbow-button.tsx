"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface RainbowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

/** Botão com borda em gradiente arco-íris rotativo animado — tema padrão do site. */
export function RainbowButton({ className, children, ...props }: RainbowButtonProps) {
  return (
    <button
      className={cn(
        "relative inline-flex items-center justify-center rounded-lg px-5 py-2.5 font-semibold text-white",
        "bg-black overflow-hidden group cursor-pointer transition-transform active:scale-95",
        className
      )}
      {...props}
    >
      <span
        className="absolute inset-0 rounded-lg opacity-90 group-hover:opacity-100 transition-opacity"
        style={{
          background:
            "conic-gradient(from 0deg, #ff0055, #ff9900, #ffee00, #33ff00, #00ffee, #3300ff, #cc00ff, #ff0055)",
          animation: "rainbow-spin 3s linear infinite",
        }}
      />
      <span className="absolute inset-[2px] rounded-[7px] bg-black" />
      <span className="relative z-10">{children}</span>
      <style jsx global>{`
        @keyframes rainbow-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  );
}
