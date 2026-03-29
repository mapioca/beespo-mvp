-- Add MFA support for regular users
-- 1. Workspace-level MFA enforcement toggle
-- 2. Trusted devices table for "remember this device" (30 days)

-- Add mfa_required flag to workspaces
ALTER TABLE public.workspaces
  ADD COLUMN mfa_required BOOLEAN NOT NULL DEFAULT false;

-- Trusted devices table
CREATE TABLE IF NOT EXISTS public.trusted_devices (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_token TEXT NOT NULL UNIQUE,
  device_name  TEXT,
  expires_at   TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for lookups by token (used in middleware/layout)
CREATE INDEX idx_trusted_devices_token ON public.trusted_devices(device_token);

-- Index for cleanup of expired tokens
CREATE INDEX idx_trusted_devices_expires ON public.trusted_devices(expires_at);

-- RLS
ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_devices"
  ON public.trusted_devices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_devices"
  ON public.trusted_devices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_delete_own_devices"
  ON public.trusted_devices FOR DELETE
  USING (auth.uid() = user_id);
