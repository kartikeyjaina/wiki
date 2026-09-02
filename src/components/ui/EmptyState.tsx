import type { ReactNode } from "react";
import { Button } from "./Button";
import { IngredientSpark } from "@/components/ingredients/IngredientSpark";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-white px-6 py-12 text-center">
      <IngredientSpark className="mb-6" />
      <h2 className="font-display text-2xl font-bold tracking-[-0.03em] text-foreground">{title}</h2>
      <p className="mt-3 max-w-md text-sm leading-6 text-muted">{description}</p>
      {action ? <div className="mt-7">{action}</div> : null}
    </div>
  );
}

export function EmptyAction({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <Button type="button" onClick={onClick}>
      {children}
    </Button>
  );
}
