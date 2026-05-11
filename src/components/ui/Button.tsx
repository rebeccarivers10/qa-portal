"use client";

import { cn } from "@/lib/cn";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded font-semibold tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none uppercase text-xs",
          {
            "text-white focus-visible:ring-blue-500": variant === "primary",
            "bg-gray-100 text-[#0B2341] hover:bg-gray-200 focus-visible:ring-gray-400 normal-case tracking-normal text-sm font-medium": variant === "secondary",
            "hover:bg-blue-50 text-[#0B2341] normal-case tracking-normal text-sm font-medium": variant === "ghost",
            "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500": variant === "danger",
          },
          {
            "h-8 px-4 text-[11px]": size === "sm",
            "h-10 px-5 text-xs": size === "md",
            "h-11 px-7 text-xs": size === "lg",
          },
          className
        )}
        style={variant === "primary" ? { backgroundColor: "var(--lp-blue)" } : undefined}
        onMouseEnter={(e) => {
          if (variant === "primary") (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--lp-blue-hover)";
        }}
        onMouseLeave={(e) => {
          if (variant === "primary") (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--lp-blue)";
        }}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
