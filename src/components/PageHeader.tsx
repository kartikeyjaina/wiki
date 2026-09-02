import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow ? <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-muted">{eyebrow}</p> : null}
        <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-[-0.03em] md:text-6xl">{title}</h1>
        {description ? <p className="mt-4 max-w-2xl text-base leading-7 text-muted">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
