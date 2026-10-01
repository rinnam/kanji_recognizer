import type { ColumnType, Generated } from 'kysely';

type Timestamp = ColumnType<Date, Date | string, Date | string>;
type Json = unknown;

export interface OwnerScopeTable {
  id: string;
  kind: 'local' | 'account' | 'hybrid';
  external_subject: string | null;
  locale: string;
  timezone_id: string;
  created_at: Timestamp;
  updated_at: Timestamp;
  version: Generated<string>;
  deleted_at: Timestamp | null;
}

export interface LibraryTable {
  id: string;
  owner_id: string;
  created_at: Timestamp;
  updated_at: Timestamp;
  version: Generated<string>;
}

export interface DeckTable {
  id: string;
  library_id: string;
  owner_id: string;
  parent_id: string | null;
  sort_position: Generated<string>;
  name: string;
  description: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
  archived_at: Timestamp | null;
  deleted_at: Timestamp | null;
  version: Generated<string>;
}

export interface SavedItemTable {
  id: string;
  library_id: string;
  owner_id: string;
  content_item_id: string;
  source_kind: 'recognition' | 'import' | 'manual' | 'reference';
  source_ref: string | null;
  created_at: Timestamp;
  archived_at: Timestamp | null;
  deleted_at: Timestamp | null;
  version: Generated<string>;
}

export interface DeckMembershipTable {
  deck_id: string;
  saved_item_id: string;
  owner_id: string;
  added_at: Timestamp;
  source_context: Json | null;
}

export interface ContentItemTable {
  id: string;
  kind: 'kanji' | 'vocabulary' | 'grammar';
  canonical_key: string;
  status: 'draft' | 'active' | 'deprecated';
  source_ref: string;
  license_ref: string;
  current_revision_no: number;
  content_profile_key: string | null;
  jlpt_level: number | null;
  stroke_count: number | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface SchemaMigrationsTable {
  version: string;
  checksum: string;
  applied_at: Timestamp;
}

export interface Database {
  owner_scope: OwnerScopeTable;
  library: LibraryTable;
  deck: DeckTable;
  saved_item: SavedItemTable;
  deck_membership: DeckMembershipTable;
  content_item: ContentItemTable;
  schema_migrations: SchemaMigrationsTable;
}
