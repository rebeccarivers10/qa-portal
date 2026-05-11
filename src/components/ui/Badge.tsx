import { cn } from "@/lib/cn";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "needs_review" | "acknowledged" | "mgr_acknowledged" | "default";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        {
          "bg-yellow-100 text-yellow-800": variant === "needs_review",
          "bg-green-100 text-green-800": variant === "acknowledged",
          "bg-purple-100 text-purple-800": variant === "mgr_acknowledged",
          "bg-gray-100 text-gray-700": variant === "default",
        },
        className
      )}
    >
      {children}
    </span>
  );
}
