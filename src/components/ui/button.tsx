import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "icon" | "sm";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
          variant === "default" && "bg-primary text-primary-foreground hover:opacity-90",
          variant === "ghost" && "hover:bg-muted",
          variant === "outline" && "border border-border hover:bg-muted",
          size === "default" && "h-9 px-4 py-2",
          size === "icon" && "h-8 w-8",
          size === "sm" && "h-8 px-3",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
