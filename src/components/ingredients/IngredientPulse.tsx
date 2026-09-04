import { cn } from "@/lib/utils";

export function IngredientPulse({ className }: { className?: string }) {
  return (
    <div className={cn("relative h-14 w-14", className)} aria-hidden="true">
      {[0, 1, 2].map((item) => (
        <span
          key={item}
          className="absolute inset-0 animate-[ingredient-pulse_1.8s_cubic-bezier(0.16,1,0.3,1)_infinite] rounded-full border border-foreground"
          style={{ animationDelay: `${item * 0.35}s` }}
        />
      ))}
      <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground" />
    </div>
  );
}
