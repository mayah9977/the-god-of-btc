// components/ui/badge.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline";
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  const base =
    "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium";
  const variants: Record<string, string> = {
    default: "bg-primary text-primary-foreground border-transparent",
    secondary: "bg-muted text-muted-foreground border-transparent",
    outline: "border-border text-foreground",
  };

  return (
    <div
      className={cn(base, variants[variant] ?? variants.default, className)}
      {...props}
    />
  );
}

export default Badge;
