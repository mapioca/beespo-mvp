-- Add invite tracking columns to waitlist_signups
ALTER TABLE waitlist_signups
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES profiles(id);
