import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill border border-[#11111114] bg-[#eff1f3] px-3 py-1 text-xs font-semibold text-foreground",
        className,
      )}
      {...props}
    />
  );
}
