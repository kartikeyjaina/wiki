import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function IngredientPulse({ className }: { className?: string }) {
  return (
    <div className={cn("relative h-14 w-14", className)} aria-hidden="true">
      {[0, 1, 2].map((item) => (
        <motion.span
          key={item}
          className="absolute inset-0 rounded-full border border-foreground"
          animate={{ opacity: [0.35, 0], scale: [0.45, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, delay: item * 0.35, ease: [0.16, 1, 0.3, 1] }}
        />
      ))}
      <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground" />
    </div>
  );
}
