import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function IngredientGrid({ className }: { className?: string }) {
  return (
    <motion.div
      aria-hidden="true"
      className={cn("grid h-16 w-16 grid-cols-3 gap-2", className)}
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
    >
      {Array.from({ length: 9 }).map((_, index) => (
        <motion.span
          key={index}
          className="rounded-md border border-border bg-white"
          variants={{
            hidden: { opacity: 0, y: 8 },
            visible: { opacity: 1, y: index === 2 ? -5 : 0 },
          }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        />
      ))}
    </motion.div>
  );
}
