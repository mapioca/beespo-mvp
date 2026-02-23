-- Waitlist signups table for landing page
CREATE TABLE waitlist_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE waitlist_signups ENABLE ROW LEVEL SECURITY;

-- Allow insert from anonymous users (no auth required for waitlist)
CREATE POLICY "Allow anonymous insert" ON waitlist_signups
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow authenticated users to insert as well
CREATE POLICY "Allow authenticated insert" ON waitlist_signups
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
