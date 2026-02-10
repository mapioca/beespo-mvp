-- Add parent-child relationship to discussions
-- Allows discussions to have follow-up discussions linked to them

-- Add parent_discussion_id column to discussions table
ALTER TABLE discussions
ADD COLUMN parent_discussion_id UUID REFERENCES discussions(id) ON DELETE SET NULL;

-- Add index for efficient querying of child discussions
CREATE INDEX idx_discussions_parent ON discussions(parent_discussion_id);

-- Add comment for documentation
COMMENT ON COLUMN discussions.parent_discussion_id IS 'Reference to parent discussion if this is a follow-up discussion';
