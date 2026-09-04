import { cn } from "@/lib/utils";

export function IngredientGrid({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("grid h-16 w-16 grid-cols-3 gap-2", className)}
    >
      {Array.from({ length: 9 }).map((_, index) => (
        <span
          key={index}
          className="rounded-md border border-border bg-white"
        />
      ))}
    </div>
  );
}
