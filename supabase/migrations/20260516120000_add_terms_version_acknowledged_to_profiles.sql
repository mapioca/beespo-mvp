ALTER TABLE profiles
  ADD COLUMN terms_version_acknowledged TEXT;

COMMENT ON COLUMN profiles.terms_version_acknowledged IS
  'ISO date string of the most recent terms version the user has acknowledged via the in-app banner.';
