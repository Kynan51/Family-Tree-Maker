-- Update users table to add super_admin role and profile fields
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS bio TEXT;

-- Ensure email column has a unique constraint
ALTER TABLE auth.users ADD CONSTRAINT unique_email UNIQUE (email);

-- Ensure id column has a default value
ALTER TABLE auth.users ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Create a super admin user (replace with your email)
INSERT INTO auth.users (email, role, encrypted_password, created_at, updated_at)
VALUES ('kenankiplimo@gmail.com', 'super_admin', '40976220', NOW(), NOW())
ON CONFLICT (email) 
DO UPDATE SET role = 'super_admin';

-- Add export_logs table to track data exports
CREATE TABLE IF NOT EXISTS export_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  export_type TEXT NOT NULL,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);