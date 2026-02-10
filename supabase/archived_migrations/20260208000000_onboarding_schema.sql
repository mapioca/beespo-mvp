-- Beespo Onboarding Schema
-- Adds support for group unit type, unit_name, and profile onboarding fields

-- 1. Add 'group' to workspace type (update check constraint)
ALTER TABLE workspaces DROP CONSTRAINT IF EXISTS workspaces_type_check;
ALTER TABLE workspaces ADD CONSTRAINT workspaces_type_check
  CHECK (type IN ('group', 'branch', 'ward', 'district', 'stake'));

-- 2. Add unit_name to workspaces
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS unit_name TEXT;

-- 3. Add onboarding fields to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role_title TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS feature_interests JSONB DEFAULT '[]'::JSONB;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS feature_tier TEXT
  CHECK (feature_tier IS NULL OR feature_tier IN ('bishopric', 'organization', 'support'));

-- 4. Create index for feature_tier lookups
CREATE INDEX IF NOT EXISTS idx_profiles_feature_tier ON profiles(feature_tier);

-- 5. Add comment for documentation
COMMENT ON COLUMN workspaces.unit_name IS 'The name of the church unit (e.g., "Riverside" for Riverside Ward)';
COMMENT ON COLUMN profiles.role_title IS 'The user role title within their organization (e.g., "Bishop", "Relief Society President")';
COMMENT ON COLUMN profiles.feature_interests IS 'Array of feature keys the user is interested in';
COMMENT ON COLUMN profiles.feature_tier IS 'Feature tier based on role: bishopric (full), organization (standard), support (limited)';
