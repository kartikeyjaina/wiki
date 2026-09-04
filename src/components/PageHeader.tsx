import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="relative mb-10 overflow-hidden rounded-xl border border-border bg-surface px-6 py-7 shadow-soft md:px-8 md:py-8">
      <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-[#D6E8F8] opacity-80" />
      <div aria-hidden="true" className="pointer-events-none absolute right-16 bottom-[-2.5rem] h-20 w-20 rounded-full bg-[#E5D9F7] opacity-70" />
      <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          {eyebrow ? <p className="mb-3 inline-flex rounded-pill border border-black/10 bg-[#FBF0CC] px-3 py-1 text-xs font-bold tracking-[0.04em] text-foreground">{eyebrow}</p> : null}
          <h1 className="max-w-4xl break-words font-display text-4xl font-bold leading-[1.1] tracking-[-0.03em] md:text-5xl">{title}</h1>
          {description ? <p className="mt-4 max-w-2xl text-base leading-7 text-muted">{description}</p> : null}
        </div>
        {action ? <div className="relative shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}
