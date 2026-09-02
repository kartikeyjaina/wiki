import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function IngredientSpark({ className }: { className?: string }) {
  return (
    <motion.svg
      aria-hidden="true"
      className={cn("h-16 w-16 text-foreground", className)}
      viewBox="0 0 64 64"
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.path
        d="M32 8v16M32 40v16M8 32h16M40 32h16M17 17l11 11M36 36l11 11M47 17 36 28M28 36 17 47"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      />
      <circle cx="32" cy="32" r="4" fill="currentColor" />
    </motion.svg>
  );
}
