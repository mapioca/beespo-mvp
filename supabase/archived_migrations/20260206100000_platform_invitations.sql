-- Beespo MVP - Platform Invitations (Gatekeeper System)
-- Restricts user registration to only those with valid invite codes

-- =====================================================
-- STEP 1: Create platform_invitations table
-- =====================================================

CREATE TABLE platform_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,                    -- The invite code (short alphanumeric)
  description TEXT,                              -- Optional admin note (e.g., "Beta testers batch 1")
  max_uses INTEGER NOT NULL DEFAULT 1,           -- Maximum number of signups allowed
  uses_count INTEGER NOT NULL DEFAULT 0,         -- Current usage count
  expires_at TIMESTAMPTZ,                        -- Nullable expiration timestamp
  status TEXT NOT NULL DEFAULT 'active'          -- 'active', 'exhausted', 'expired', 'revoked'
    CHECK (status IN ('active', 'exhausted', 'expired', 'revoked')),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Sys-admin who created the code
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- STEP 2: Create indexes for performance
-- =====================================================

-- Primary index on code for fast lookups
CREATE UNIQUE INDEX idx_platform_invitations_code ON platform_invitations(code);

-- Status index for filtering active codes
CREATE INDEX idx_platform_invitations_status ON platform_invitations(status);

-- Created_by index for admin management views
CREATE INDEX idx_platform_invitations_created_by ON platform_invitations(created_by);

-- =====================================================
-- STEP 3: Add updated_at trigger
-- =====================================================

CREATE TRIGGER update_platform_invitations_updated_at 
  BEFORE UPDATE ON platform_invitations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STEP 4: Create rate limiting table for brute-force prevention
-- =====================================================

CREATE TABLE invite_validation_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ip_address TEXT NOT NULL,
  attempted_code TEXT,                           -- Hash or partial code for debugging (optional)
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  was_successful BOOLEAN DEFAULT false
);

-- Indexes for rate limiting queries
CREATE INDEX idx_invite_attempts_ip ON invite_validation_attempts(ip_address);
CREATE INDEX idx_invite_attempts_time ON invite_validation_attempts(attempted_at);
CREATE INDEX idx_invite_attempts_ip_time ON invite_validation_attempts(ip_address, attempted_at);

-- =====================================================
-- STEP 5: Link signups to invitations (audit trail)
-- =====================================================

ALTER TABLE profiles ADD COLUMN platform_invitation_id UUID 
  REFERENCES platform_invitations(id) ON DELETE SET NULL;

-- Index for tracking which invitation a user used
CREATE INDEX idx_profiles_platform_invitation ON profiles(platform_invitation_id);

-- =====================================================
-- STEP 6: Enable RLS on new tables
-- =====================================================

ALTER TABLE platform_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_validation_attempts ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 7: RLS Policies for platform_invitations
-- =====================================================

-- System admins can manage all invitations
CREATE POLICY "Sys admins can manage platform invitations"
  ON platform_invitations FOR ALL
  USING (
    (SELECT is_sys_admin FROM profiles WHERE id = auth.uid()) = true
  );

-- Allow unauthenticated code validation (for signup flow)
-- Note: This only allows SELECT, not modification
CREATE POLICY "Anyone can validate invitation codes"
  ON platform_invitations FOR SELECT
  USING (true);

-- =====================================================
-- STEP 8: RLS Policies for rate limiting table
-- =====================================================

-- Sys admins can view attempts for security monitoring
CREATE POLICY "Sys admins can view validation attempts"
  ON invite_validation_attempts FOR SELECT
  USING (
    (SELECT is_sys_admin FROM profiles WHERE id = auth.uid()) = true
  );

-- Allow inserting attempts from API routes (service role)
-- Note: Insert will be done via service role/admin client in API
CREATE POLICY "Allow insert for rate limiting"
  ON invite_validation_attempts FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- STEP 9: Helper function to validate and consume invite code
-- This runs atomically to prevent race conditions
-- =====================================================

CREATE OR REPLACE FUNCTION validate_and_consume_invite_code(
  p_code TEXT,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS TABLE (
  is_valid BOOLEAN,
  error_message TEXT,
  invitation_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation RECORD;
  v_rate_limited BOOLEAN := false;
  v_attempt_count INTEGER;
BEGIN
  -- Check rate limiting (5 failed attempts in 15 minutes = locked)
  IF p_ip_address IS NOT NULL THEN
    SELECT COUNT(*) INTO v_attempt_count
    FROM invite_validation_attempts
    WHERE ip_address = p_ip_address
      AND was_successful = false
      AND attempted_at > NOW() - INTERVAL '15 minutes';
    
    IF v_attempt_count >= 5 THEN
      -- Log this blocked attempt
      INSERT INTO invite_validation_attempts (ip_address, attempted_code, was_successful)
      VALUES (p_ip_address, LEFT(p_code, 4) || '****', false);
      
      RETURN QUERY SELECT false, 'Too many attempts. Please try again later.', NULL::UUID;
      RETURN;
    END IF;
  END IF;

  -- Find and lock the invitation row for update
  SELECT * INTO v_invitation
  FROM platform_invitations
  WHERE code = UPPER(TRIM(p_code))  -- Case-insensitive comparison
  FOR UPDATE;

  -- Code doesn't exist
  IF v_invitation IS NULL THEN
    IF p_ip_address IS NOT NULL THEN
      INSERT INTO invite_validation_attempts (ip_address, attempted_code, was_successful)
      VALUES (p_ip_address, LEFT(p_code, 4) || '****', false);
    END IF;
    
    RETURN QUERY SELECT false, 'Invalid invite code.', NULL::UUID;
    RETURN;
  END IF;

  -- Check if revoked
  IF v_invitation.status = 'revoked' THEN
    IF p_ip_address IS NOT NULL THEN
      INSERT INTO invite_validation_attempts (ip_address, attempted_code, was_successful)
      VALUES (p_ip_address, LEFT(p_code, 4) || '****', false);
    END IF;
    
    RETURN QUERY SELECT false, 'Invalid invite code.', NULL::UUID;
    RETURN;
  END IF;

  -- Check if expired
  IF v_invitation.expires_at IS NOT NULL AND v_invitation.expires_at < NOW() THEN
    -- Update status to expired if not already
    IF v_invitation.status != 'expired' THEN
      UPDATE platform_invitations SET status = 'expired' WHERE id = v_invitation.id;
    END IF;
    
    IF p_ip_address IS NOT NULL THEN
      INSERT INTO invite_validation_attempts (ip_address, attempted_code, was_successful)
      VALUES (p_ip_address, LEFT(p_code, 4) || '****', false);
    END IF;
    
    RETURN QUERY SELECT false, 'Invalid invite code.', NULL::UUID;
    RETURN;
  END IF;

  -- Check if exhausted
  IF v_invitation.uses_count >= v_invitation.max_uses THEN
    -- Update status to exhausted if not already
    IF v_invitation.status != 'exhausted' THEN
      UPDATE platform_invitations SET status = 'exhausted' WHERE id = v_invitation.id;
    END IF;
    
    IF p_ip_address IS NOT NULL THEN
      INSERT INTO invite_validation_attempts (ip_address, attempted_code, was_successful)
      VALUES (p_ip_address, LEFT(p_code, 4) || '****', false);
    END IF;
    
    RETURN QUERY SELECT false, 'Invalid invite code.', NULL::UUID;
    RETURN;
  END IF;

  -- Code is valid! Increment usage count
  UPDATE platform_invitations 
  SET 
    uses_count = uses_count + 1,
    status = CASE 
      WHEN uses_count + 1 >= max_uses THEN 'exhausted'
      ELSE status 
    END
  WHERE id = v_invitation.id;

  -- Log successful attempt
  IF p_ip_address IS NOT NULL THEN
    INSERT INTO invite_validation_attempts (ip_address, attempted_code, was_successful)
    VALUES (p_ip_address, LEFT(p_code, 4) || '****', true);
  END IF;

  RETURN QUERY SELECT true, NULL::TEXT, v_invitation.id;
END;
$$;

-- =====================================================
-- STEP 10: Helper function to generate invite codes
-- Format: BEE-XXXXXX (3 letter prefix + 6 alphanumeric)
-- =====================================================

CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_code TEXT;
  v_chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  -- Exclude confusing chars: I, O, 0, 1
  v_i INTEGER;
BEGIN
  v_code := 'BEE-';
  
  FOR v_i IN 1..6 LOOP
    v_code := v_code || SUBSTR(v_chars, FLOOR(RANDOM() * LENGTH(v_chars) + 1)::INTEGER, 1);
  END LOOP;
  
  RETURN v_code;
END;
$$;

-- =====================================================
-- STEP 11: Function to create a new invite code (admin only)
-- =====================================================

CREATE OR REPLACE FUNCTION create_platform_invitation(
  p_max_uses INTEGER DEFAULT 1,
  p_description TEXT DEFAULT NULL,
  p_expires_in_days INTEGER DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  code TEXT,
  max_uses INTEGER,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code TEXT;
  v_new_id UUID;
  v_expires_at TIMESTAMPTZ;
  v_attempts INTEGER := 0;
BEGIN
  -- Verify caller is sys_admin
  IF (SELECT is_sys_admin FROM profiles WHERE id = auth.uid()) != true THEN
    RAISE EXCEPTION 'Only system administrators can create invite codes';
  END IF;

  -- Calculate expiration
  IF p_expires_in_days IS NOT NULL THEN
    v_expires_at := NOW() + (p_expires_in_days || ' days')::INTERVAL;
  END IF;

  -- Generate unique code with retry
  LOOP
    v_code := generate_invite_code();
    v_attempts := v_attempts + 1;
    
    -- Check if code already exists
    IF NOT EXISTS (SELECT 1 FROM platform_invitations WHERE code = v_code) THEN
      EXIT;
    END IF;
    
    IF v_attempts > 10 THEN
      RAISE EXCEPTION 'Unable to generate unique code after 10 attempts';
    END IF;
  END LOOP;

  -- Insert the new invitation
  INSERT INTO platform_invitations (code, description, max_uses, expires_at, created_by)
  VALUES (v_code, p_description, p_max_uses, v_expires_at, auth.uid())
  RETURNING platform_invitations.id INTO v_new_id;

  RETURN QUERY 
  SELECT v_new_id, v_code, p_max_uses, v_expires_at;
END;
$$;

-- Grant execute permissions to authenticated users (RLS will handle authorization)
GRANT EXECUTE ON FUNCTION validate_and_consume_invite_code TO authenticated;
GRANT EXECUTE ON FUNCTION create_platform_invitation TO authenticated;
