import { useActivity } from "@/hooks/useActivity";
import type { EntityType } from "@/types/domain";
import { formatStatus, shortDate } from "@/lib/utils";

export function ActivityTimeline({ entityType, entityId }: { entityType: EntityType; entityId: string }) {
  const { events, loading } = useActivity(entityType, entityId);
  return (
    <section className="mt-6 rounded-xl border border-border bg-white p-6">
      <h2 className="font-display text-xl font-bold tracking-[-0.03em]">Activity</h2>
      {loading ? <p className="mt-4 text-sm text-muted">Loading activity...</p> : events.length ? (
        <ol className="mt-5 space-y-4">
          {events.map((event) => (
            <li key={event.id} className="border-l border-border pl-4">
              <p className="text-sm font-semibold">{formatStatus(event.event_type)}</p>
              <p className="mt-1 text-xs text-muted">{event.actor?.display_name ?? "System"} · {shortDate(event.created_at)}</p>
            </li>
          ))}
        </ol>
      ) : <p className="mt-4 text-sm text-muted">No activity has been recorded yet.</p>}
    </section>
  );
}
