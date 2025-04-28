-- Add app_settings table for global settings
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  privacy_enabled BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update Families Table to add is_public flag
ALTER TABLE families ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- User Family Access Table
CREATE TABLE IF NOT EXISTS user_family_access (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  access_level TEXT NOT NULL DEFAULT 'viewer',
  status TEXT NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, family_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_family_access_user_id ON user_family_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_family_access_family_id ON user_family_access(family_id);
CREATE INDEX IF NOT EXISTS idx_user_family_access_status ON user_family_access(status);

-- Add family_id column to family_members table if not exists
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id) ON DELETE CASCADE;

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- e.g. 'request', 'approval', 'rejection'
  message TEXT NOT NULL,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read BOOLEAN DEFAULT false
);
