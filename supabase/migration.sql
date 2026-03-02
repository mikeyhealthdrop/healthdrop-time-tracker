-- =====================================================
-- HEALTHDROP TIME TRACKER - DATABASE SETUP
-- Run this entire script in Supabase SQL Editor
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. ORGANIZATIONS TABLE
-- =====================================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert Healthdrop as the first organization
INSERT INTO organizations (name, slug) VALUES ('Healthdrop Manufacturing', 'healthdrop');

-- =====================================================
-- 2. USERS TABLE (employee profiles)
-- =====================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'employee')) DEFAULT 'employee',
  employee_type TEXT NOT NULL CHECK (employee_type IN ('w2', 'agency', 'contractor_1099')) DEFAULT 'w2',
  base_rate DECIMAL(10,2) DEFAULT 0 CHECK (base_rate >= 0),
  loaded_rate DECIMAL(10,2) DEFAULT 0 CHECK (loaded_rate >= 0),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_org_id ON users(org_id);
CREATE INDEX idx_users_auth_id ON users(auth_id);
CREATE INDEX idx_users_email ON users(email);

-- =====================================================
-- 3. JOBS TABLE
-- =====================================================
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  job_number TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  UNIQUE(org_id, job_number)
);

CREATE INDEX idx_jobs_org_id ON jobs(org_id);
CREATE INDEX idx_jobs_active ON jobs(org_id, is_active);

-- =====================================================
-- 4. TIME ENTRIES TABLE
-- =====================================================
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id),
  clock_in TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  clock_out TIMESTAMPTZ,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('work', 'lunch')) DEFAULT 'work',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_time_entries_user ON time_entries(user_id);
CREATE INDEX idx_time_entries_job ON time_entries(job_id);
CREATE INDEX idx_time_entries_org ON time_entries(org_id);
CREATE INDEX idx_time_entries_clock_in ON time_entries(clock_in);
CREATE INDEX idx_time_entries_active ON time_entries(user_id) WHERE clock_out IS NULL;

-- =====================================================
-- 5. TIME ENTRY EDITS TABLE (audit log)
-- =====================================================
CREATE TABLE time_entry_edits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  time_entry_id UUID NOT NULL REFERENCES time_entries(id) ON DELETE CASCADE,
  edited_by UUID NOT NULL REFERENCES users(id),
  old_values JSONB NOT NULL,
  new_values JSONB NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_edits_entry ON time_entry_edits(time_entry_id);

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entry_edits ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's org_id
CREATE OR REPLACE FUNCTION auth.user_org_id()
RETURNS UUID AS $$
  SELECT org_id FROM users WHERE auth_id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS TEXT AS $$
  SELECT role FROM users WHERE auth_id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper function to get current user's profile id
CREATE OR REPLACE FUNCTION auth.user_profile_id()
RETURNS UUID AS $$
  SELECT id FROM users WHERE auth_id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ORGANIZATIONS: users can only see their own org
CREATE POLICY "Users can view their own organization"
  ON organizations FOR SELECT
  USING (id = auth.user_org_id());

-- USERS: users in same org can see each other
CREATE POLICY "Users can view users in their org"
  ON users FOR SELECT
  USING (org_id = auth.user_org_id());

-- USERS: only admins can insert/update
CREATE POLICY "Admins can manage users"
  ON users FOR ALL
  USING (org_id = auth.user_org_id() AND auth.user_role() = 'admin');

-- Allow users to read their own profile always
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  USING (auth_id = auth.uid());

-- JOBS: users in same org can see jobs
CREATE POLICY "Users can view org jobs"
  ON jobs FOR SELECT
  USING (org_id = auth.user_org_id());

-- JOBS: managers and admins can create/edit jobs
CREATE POLICY "Managers and admins can manage jobs"
  ON jobs FOR ALL
  USING (
    org_id = auth.user_org_id()
    AND auth.user_role() IN ('admin', 'manager')
  );

-- TIME ENTRIES: employees can see their own, managers/admins can see all in org
CREATE POLICY "Employees can view own time entries"
  ON time_entries FOR SELECT
  USING (
    org_id = auth.user_org_id()
    AND (
      user_id = auth.user_profile_id()
      OR auth.user_role() IN ('admin', 'manager')
    )
  );

-- TIME ENTRIES: employees can insert their own entries
CREATE POLICY "Employees can create own time entries"
  ON time_entries FOR INSERT
  WITH CHECK (
    org_id = auth.user_org_id()
    AND user_id = auth.user_profile_id()
  );

-- TIME ENTRIES: employees can update their own active entries (clock out)
CREATE POLICY "Employees can update own time entries"
  ON time_entries FOR UPDATE
  USING (
    org_id = auth.user_org_id()
    AND (
      user_id = auth.user_profile_id()
      OR auth.user_role() = 'admin'
    )
  );

-- TIME ENTRIES: admins can delete time entries
CREATE POLICY "Admins can delete time entries"
  ON time_entries FOR DELETE
  USING (
    org_id = auth.user_org_id()
    AND auth.user_role() = 'admin'
  );

-- TIME ENTRY EDITS: only admins can manage
CREATE POLICY "Admins can manage time entry edits"
  ON time_entry_edits FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM time_entries te
      WHERE te.id = time_entry_id
      AND te.org_id = auth.user_org_id()
    )
    AND auth.user_role() = 'admin'
  );

-- Allow admins to view edits
CREATE POLICY "Admins can view time entry edits"
  ON time_entry_edits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM time_entries te
      WHERE te.id = time_entry_id
      AND te.org_id = auth.user_org_id()
    )
    AND auth.user_role() IN ('admin', 'manager')
  );

-- =====================================================
-- 7. REALTIME (enable for live updates)
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE time_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE jobs;

-- =====================================================
-- 8. FUNCTION: Auto-create user profile on signup
-- =====================================================
-- This function creates a user profile when someone signs up
-- It assigns them to Healthdrop org by default
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  healthdrop_org_id UUID;
BEGIN
  -- Get Healthdrop org ID
  SELECT id INTO healthdrop_org_id FROM organizations WHERE slug = 'healthdrop';

  -- Check if a user profile already exists for this email
  -- (admin may have pre-created the profile)
  UPDATE users
  SET auth_id = NEW.id
  WHERE email = NEW.email
  AND auth_id IS NULL;

  -- If no existing profile was found, create one
  IF NOT FOUND THEN
    INSERT INTO users (auth_id, org_id, email, first_name, last_name, role, employee_type)
    VALUES (
      NEW.id,
      healthdrop_org_id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1)),
      COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
      'employee',
      'w2'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run on new auth user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- 9. SEED DATA: Sample jobs for Healthdrop
-- =====================================================
DO $$
DECLARE
  healthdrop_org_id UUID;
BEGIN
  SELECT id INTO healthdrop_org_id FROM organizations WHERE slug = 'healthdrop';

  INSERT INTO jobs (org_id, job_number, is_active) VALUES
    (healthdrop_org_id, 'HD-2026-0041', true),
    (healthdrop_org_id, 'HD-2026-0039', true),
    (healthdrop_org_id, 'HD-2026-0037', true),
    (healthdrop_org_id, 'HD-2026-0035', true),
    (healthdrop_org_id, 'HD-2026-0028', true);
END $$;

-- =====================================================
-- DONE! Your database is set up.
-- Next: Create your admin user account through the app's
-- sign-up flow, then update their role to 'admin' by running:
--
-- UPDATE users SET role = 'admin', first_name = 'Mikey', last_name = 'Caplin'
-- WHERE email = 'your-email@example.com';
-- =====================================================
