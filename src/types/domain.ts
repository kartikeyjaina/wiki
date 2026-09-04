export type Role = "member" | "admin";

export type IdeaStatus =
  | "new"
  | "discussing"
  | "under_review"
  | "planned"
  | "in_progress"
  | "shipped"
  | "parked"
  | "declined"
  | "duplicate";

export type EntityType = "wiki_page" | "asset" | "idea" | "comment" | "project" | "person";

export type ProjectStatus = "planned" | "in_progress" | "blocked" | "shipped" | "archived";
export type ProjectPriority = "low" | "medium" | "high" | "urgent";

export interface Profile {
  id: string;
  display_name: string | null;
  role: string | null;
  avatar_url: string | null;
  email_domain?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Idea {
  id: string;
  title: string;
  description: string;
  why_it_matters: string | null;
  category_id: string | null;
  status: IdeaStatus;
  author_id: string;
  created_at: string;
  updated_at: string;
  score?: number;
  comment_count?: number;
  author?: Profile | null;
  category?: { id: string; name: string } | null;
  user_vote?: -1 | 0 | 1;
}

export interface Asset {
  id: string;
  collection_id: string;
  name: string;
  category: string | null;
  asset_type: string;
  preview_url: string | null;
  storage_path: string | null;
  metadata: Record<string, unknown> | null;
  owner_id: string | null;
  version: string | null;
  last_reviewed_at: string | null;
  source_url: string | null;
  usage_guidance: string | null;
  created_at: string;
  updated_at: string;
  collection?: Pick<AssetCollection, "id" | "name" | "slug"> | null;
}

export interface AssetCollection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  display_order: number;
  accent: string;
  is_visible: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  file_count?: number;
}

export interface FeaturedKit {
  id: string;
  name: string;
  slug: string;
  description: string;
  package_storage_path: string | null;
  package_size: number | null;
  mime_type: string;
  display_order: number;
  is_visible: boolean;
  is_featured: boolean;
  accent: string;
  archived_at: string | null;
  download_count: number;
  created_at: string;
  updated_at: string;
}

export interface AssetVersion {
  id: string;
  asset_id: string;
  version: string;
  storage_path: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  creator?: Profile | null;
}

export interface Comment {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  parent_id: string | null;
  author_id: string;
  body: string;
  edited_at: string | null;
  created_at: string;
  updated_at: string;
  author?: Profile | null;
}

export interface ActivityEvent {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  actor_id: string | null;
  event_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
  actor?: Profile | null;
}

export interface WikiPage {
  id: string;
  title: string;
  slug: string;
  content: string;
  author_id: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  author?: Profile | null;
}

export interface WikiRevision {
  id: string;
  wiki_page_id: string;
  author_id: string | null;
  content: string;
  title: string | null;
  tags: string[];
  change_summary: string | null;
  created_at: string;
  author?: Profile | null;
}

export interface Project {
  id: string;
  title: string;
  description: string | null;
  status: ProjectStatus;
  originating_idea_id: string | null;
  created_at: string;
  updated_at: string;
  owner_id?: string | null;
  due_date?: string | null;
  priority?: ProjectPriority;
}

export interface ProjectMilestone {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  display_order: number;
  status: "pending" | "in_progress" | "completed";
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectTodo {
  id: string;
  project_id: string;
  title: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectAttachment {
  id: string;
  project_id: string;
  storage_path: string;
  file_name: string;
  description: string | null;
  mime_type: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface ReputationRule {
  id: string;
  rule_key: string;
  label: string;
  points: number;
  enabled: boolean;
  updated_at: string;
}

export interface EntityRelationship {
  id: string;
  from_type: EntityType;
  from_id: string;
  to_type: EntityType;
  to_id: string;
  relationship_type: string;
  created_at: string;
  title?: string | null;
  href?: string | null;
}

export interface SearchResult {
  id: string;
  type: EntityType;
  title: string;
  excerpt?: string | null;
  href: string;
}
