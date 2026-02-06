-- =====================================================
-- Dynamic Tables System Migration
-- Creates tables for dynamic tables, columns, rows, and views
-- Notion/Airtable-style database functionality
-- =====================================================

-- =====================================================
-- ENUM Type for Column Types
-- =====================================================

CREATE TYPE column_type_enum AS ENUM (
  'text',
  'number',
  'select',
  'multi_select',
  'date',
  'datetime',
  'checkbox',
  'user_link',
  'table_link'  -- Phase 2: Table-to-table links
);

-- =====================================================
-- Dynamic Tables (Metadata)
-- =====================================================

CREATE TABLE dynamic_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,  -- emoji or icon name
  slug TEXT NOT NULL,
  linked_form_id UUID REFERENCES forms(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique slug per workspace
  UNIQUE(workspace_id, slug)
);

-- =====================================================
-- Dynamic Columns (Schema Definition)
-- =====================================================

CREATE TABLE dynamic_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES dynamic_tables(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type column_type_enum NOT NULL DEFAULT 'text',
  config JSONB NOT NULL DEFAULT '{}',
  position INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT false,
  default_value JSONB,
  deleted_at TIMESTAMPTZ,  -- Soft delete with 30-day recovery
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- Dynamic Views (Saved Filters/Sorts)
-- =====================================================

CREATE TABLE dynamic_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES dynamic_tables(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '[]',
  sorts JSONB NOT NULL DEFAULT '[]',
  visible_columns UUID[] NOT NULL DEFAULT '{}',
  column_widths JSONB NOT NULL DEFAULT '{}',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- Dynamic Rows (Data Storage)
-- =====================================================

CREATE TABLE dynamic_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES dynamic_tables(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,  -- Denormalized for RLS
  position INTEGER NOT NULL DEFAULT 0,
  data JSONB NOT NULL DEFAULT '{}',  -- { "column_id": value, ... }
  form_submission_id UUID REFERENCES form_submissions(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- Indexes for Performance
-- =====================================================

-- Tables indexes
CREATE INDEX idx_dynamic_tables_workspace_id ON dynamic_tables(workspace_id);
CREATE INDEX idx_dynamic_tables_slug ON dynamic_tables(workspace_id, slug);
CREATE INDEX idx_dynamic_tables_created_at ON dynamic_tables(created_at DESC);
CREATE INDEX idx_dynamic_tables_linked_form ON dynamic_tables(linked_form_id) WHERE linked_form_id IS NOT NULL;

-- Columns indexes
CREATE INDEX idx_dynamic_columns_table_id ON dynamic_columns(table_id);
CREATE INDEX idx_dynamic_columns_position ON dynamic_columns(table_id, position);
CREATE INDEX idx_dynamic_columns_deleted ON dynamic_columns(table_id, deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_dynamic_columns_active ON dynamic_columns(table_id) WHERE deleted_at IS NULL;

-- Views indexes
CREATE INDEX idx_dynamic_views_table_id ON dynamic_views(table_id);
CREATE INDEX idx_dynamic_views_default ON dynamic_views(table_id, is_default) WHERE is_default = true;

-- Rows indexes
CREATE INDEX idx_dynamic_rows_table_id ON dynamic_rows(table_id);
CREATE INDEX idx_dynamic_rows_workspace_id ON dynamic_rows(workspace_id);
CREATE INDEX idx_dynamic_rows_position ON dynamic_rows(table_id, position);
CREATE INDEX idx_dynamic_rows_form_submission ON dynamic_rows(form_submission_id) WHERE form_submission_id IS NOT NULL;
CREATE INDEX idx_dynamic_rows_data ON dynamic_rows USING GIN (data);  -- For JSONB queries

-- =====================================================
-- Row Level Security
-- =====================================================

ALTER TABLE dynamic_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE dynamic_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE dynamic_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE dynamic_rows ENABLE ROW LEVEL SECURITY;

-- Dynamic Tables: Workspace members can manage their tables
CREATE POLICY "dynamic_tables_select_workspace"
  ON dynamic_tables FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "dynamic_tables_insert_workspace"
  ON dynamic_tables FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "dynamic_tables_update_workspace"
  ON dynamic_tables FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "dynamic_tables_delete_workspace"
  ON dynamic_tables FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Dynamic Columns: Access through parent table
CREATE POLICY "dynamic_columns_select"
  ON dynamic_columns FOR SELECT
  USING (
    table_id IN (
      SELECT id FROM dynamic_tables WHERE workspace_id IN (
        SELECT workspace_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "dynamic_columns_insert"
  ON dynamic_columns FOR INSERT
  WITH CHECK (
    table_id IN (
      SELECT id FROM dynamic_tables WHERE workspace_id IN (
        SELECT workspace_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "dynamic_columns_update"
  ON dynamic_columns FOR UPDATE
  USING (
    table_id IN (
      SELECT id FROM dynamic_tables WHERE workspace_id IN (
        SELECT workspace_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "dynamic_columns_delete"
  ON dynamic_columns FOR DELETE
  USING (
    table_id IN (
      SELECT id FROM dynamic_tables WHERE workspace_id IN (
        SELECT workspace_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Dynamic Views: Access through parent table
CREATE POLICY "dynamic_views_select"
  ON dynamic_views FOR SELECT
  USING (
    table_id IN (
      SELECT id FROM dynamic_tables WHERE workspace_id IN (
        SELECT workspace_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "dynamic_views_insert"
  ON dynamic_views FOR INSERT
  WITH CHECK (
    table_id IN (
      SELECT id FROM dynamic_tables WHERE workspace_id IN (
        SELECT workspace_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "dynamic_views_update"
  ON dynamic_views FOR UPDATE
  USING (
    table_id IN (
      SELECT id FROM dynamic_tables WHERE workspace_id IN (
        SELECT workspace_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "dynamic_views_delete"
  ON dynamic_views FOR DELETE
  USING (
    table_id IN (
      SELECT id FROM dynamic_tables WHERE workspace_id IN (
        SELECT workspace_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Dynamic Rows: Workspace-level access (denormalized for performance)
CREATE POLICY "dynamic_rows_select_workspace"
  ON dynamic_rows FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "dynamic_rows_insert_workspace"
  ON dynamic_rows FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "dynamic_rows_update_workspace"
  ON dynamic_rows FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "dynamic_rows_delete_workspace"
  ON dynamic_rows FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM profiles WHERE id = auth.uid()
    )
  );

-- =====================================================
-- Triggers for updated_at
-- =====================================================

CREATE TRIGGER update_dynamic_tables_updated_at
  BEFORE UPDATE ON dynamic_tables
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dynamic_columns_updated_at
  BEFORE UPDATE ON dynamic_columns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dynamic_views_updated_at
  BEFORE UPDATE ON dynamic_views
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dynamic_rows_updated_at
  BEFORE UPDATE ON dynamic_rows
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Helper Functions
-- =====================================================

-- Generate unique slug for dynamic tables
CREATE OR REPLACE FUNCTION generate_dynamic_table_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]+', '-', 'g'));
    base_slug := trim(both '-' from base_slug);

    -- Append random suffix for uniqueness
    final_slug := base_slug || '-' || substring(gen_random_uuid()::text from 1 for 8);

    NEW.slug := final_slug;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_dynamic_table_slug_trigger
  BEFORE INSERT ON dynamic_tables
  FOR EACH ROW
  EXECUTE FUNCTION generate_dynamic_table_slug();

-- Auto-set position for new columns
CREATE OR REPLACE FUNCTION set_column_position()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.position = 0 THEN
    SELECT COALESCE(MAX(position), 0) + 1 INTO NEW.position
    FROM dynamic_columns
    WHERE table_id = NEW.table_id AND deleted_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_column_position_trigger
  BEFORE INSERT ON dynamic_columns
  FOR EACH ROW
  EXECUTE FUNCTION set_column_position();

-- Auto-set position for new rows
CREATE OR REPLACE FUNCTION set_row_position()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.position = 0 THEN
    SELECT COALESCE(MAX(position), 0) + 1 INTO NEW.position
    FROM dynamic_rows
    WHERE table_id = NEW.table_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_row_position_trigger
  BEFORE INSERT ON dynamic_rows
  FOR EACH ROW
  EXECUTE FUNCTION set_row_position();

-- Ensure only one default view per table
CREATE OR REPLACE FUNCTION ensure_single_default_view()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE dynamic_views
    SET is_default = false
    WHERE table_id = NEW.table_id
      AND id != NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_default_view_trigger
  BEFORE INSERT OR UPDATE ON dynamic_views
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION ensure_single_default_view();

-- =====================================================
-- Comments for Documentation
-- =====================================================

COMMENT ON TABLE dynamic_tables IS 'User-defined tables with custom schema (Notion/Airtable-style)';
COMMENT ON TABLE dynamic_columns IS 'Column definitions for dynamic tables with type-specific config';
COMMENT ON TABLE dynamic_views IS 'Saved views with filters, sorts, and column visibility';
COMMENT ON TABLE dynamic_rows IS 'Row data stored as JSONB with column_id keys';

COMMENT ON COLUMN dynamic_columns.config IS 'Type-specific configuration: options for select, format for numbers, etc.';
COMMENT ON COLUMN dynamic_columns.deleted_at IS 'Soft delete timestamp for 30-day recovery window';
COMMENT ON COLUMN dynamic_rows.data IS 'Row data as { "column_id": value } - values typed per column definition';
COMMENT ON COLUMN dynamic_rows.workspace_id IS 'Denormalized for RLS performance - always matches table.workspace_id';
