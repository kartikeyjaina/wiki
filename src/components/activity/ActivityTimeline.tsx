import { useActivity } from "@/hooks/useActivity";
import type { ActivityEvent, EntityType } from "@/types/domain";
import { shortDate } from "@/lib/utils";

// ─── Human-readable event rendering ────────────────────────────────────────

function renderEventLabel(event: ActivityEvent): string {
  const actor = event.actor?.display_name ?? "A workspace member";
  const meta = event.metadata ?? {};

  switch (event.event_type) {
    case "created":
      return `${actor} created this`;

    case "comment_created":
      return meta.parent_id ? `${actor} replied to a comment` : `${actor} added a comment`;

    case "status_changed": {
      const from = String(meta.from ?? "").replace(/_/g, " ");
      const to = String(meta.to ?? "").replace(/_/g, " ");
      return `${actor} changed status from "${from}" to "${to}"`;
    }

    case "project_stage_changed": {
      const from = String(meta.from ?? "").replace(/_/g, " ");
      const to = String(meta.to ?? "").replace(/_/g, " ");
      return `${actor} moved project from "${from}" to "${to}"`;
    }

    case "project_created":
      return `${actor} created this project from an idea`;

    case "assets_uploaded": {
      const count = typeof meta.count === "number" ? meta.count : null;
      return count ? `${actor} uploaded ${count} asset${count === 1 ? "" : "s"}` : `${actor} uploaded assets`;
    }

    case "asset_version_uploaded": {
      const ver = meta.version ? `version ${meta.version}` : "a new version";
      return `${actor} uploaded ${ver}`;
    }

    case "asset_version_restored": {
      const ver = meta.restored_from ? `version ${meta.restored_from}` : "a previous version";
      return `${actor} restored ${ver}`;
    }

    case "project_member_added": {
      const role = String(meta.role ?? "member");
      const addedName = typeof meta.display_name === "string"
        ? meta.display_name
        : "a new member";
      return `${actor} added ${addedName} as a project ${role}`;
    }

    case "project_member_role_changed": {
      const newRole = String(meta.role ?? "member");
      const memberName = typeof meta.display_name === "string"
        ? meta.display_name
        : "a member";
      return `${actor} changed ${memberName}'s role to ${newRole}`;
    }

    case "project_member_removed": {
      const removedName = typeof meta.display_name === "string"
        ? meta.display_name
        : "a member";
      return `${actor} removed ${removedName} from the project`;
    }

    case "project_attachment_added": {
      const filename = typeof meta.file_name === "string" ? `"${meta.file_name}"` : "a file";
      return `${actor} attached ${filename}`;
    }

    case "project_attachment_removed": {
      const filename = typeof meta.file_name === "string" ? `"${meta.file_name}"` : "a file";
      return `${actor} removed attachment ${filename}`;
    }

    case "wiki_page_created":
      return `${actor} created this Wiki page`;

    case "wiki_page_updated": {
      const titleChanged = meta.title ? ` (titled "${meta.title}")` : "";
      return `${actor} updated this Wiki page${titleChanged}`;
    }

    case "wiki_revision_restored":
      return `${actor} restored a previous revision`;

    case "milestone_completed": {
      const title = typeof meta.title === "string" ? `"${meta.title}"` : "a milestone";
      return `${actor} completed ${title}`;
    }

    case "milestone_reopened": {
      const title = typeof meta.title === "string" ? `"${meta.title}"` : "a milestone";
      return `${actor} reopened ${title}`;
    }

    default:
      // Fall back to a readable version of the raw event type
      return `${actor} — ${event.event_type.replace(/_/g, " ")}`;
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ActivityTimeline({ entityType, entityId }: { entityType: EntityType; entityId: string }) {
  const { events, loading } = useActivity(entityType, entityId);

  return (
    <section className="mt-6 rounded-xl border border-border bg-white p-6">
      <h2 className="font-display text-xl font-bold tracking-[-0.03em]">Activity</h2>
      {loading ? (
        <p className="mt-4 text-sm text-muted" role="status">Loading activity...</p>
      ) : events.length ? (
        <ol className="mt-5 space-y-4" aria-label="Activity timeline">
          {events.map((event) => (
            <li key={event.id} className="border-l-2 border-border pl-4">
              <p className="text-sm font-semibold leading-snug">{renderEventLabel(event)}</p>
              <p className="mt-1 text-xs text-muted">{shortDate(event.created_at)}</p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-4 text-sm text-muted">No activity has been recorded yet.</p>
      )}
    </section>
  );
}
