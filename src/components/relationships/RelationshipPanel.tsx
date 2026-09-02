import { Link } from "react-router-dom";
import { useRelationships } from "@/hooks/useRelationships";
import type { EntityType } from "@/types/domain";
import { formatStatus } from "@/lib/utils";

export function RelationshipPanel({ entityType, entityId }: { entityType: EntityType; entityId: string }) {
  const { relationships, loading } = useRelationships(entityType, entityId);
  return (
    <section className="mt-6 rounded-xl border border-border bg-white p-6">
      <h2 className="font-display text-xl font-bold tracking-[-0.03em]">Related work</h2>
      {loading ? <p className="mt-4 text-sm text-muted">Loading relationships...</p> : relationships.length ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {relationships.map((item) => (
            <Link key={item.id} to={item.href ?? "#"} className="rounded-lg border border-border bg-surface p-4 transition hover:border-[#1111112e] hover:bg-white">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">{formatStatus(item.to_type)}</p>
              <p className="mt-2 font-semibold">{item.title ?? "Related record"}</p>
            </Link>
          ))}
        </div>
      ) : <p className="mt-4 text-sm text-muted">No relationships have been added yet.</p>}
    </section>
  );
}
