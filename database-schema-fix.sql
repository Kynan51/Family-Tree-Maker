-- Create families table if it doesn't exist
CREATE TABLE IF NOT EXISTS families (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create family_members table if it doesn't exist
CREATE TABLE IF NOT EXISTS family_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  year_of_birth INTEGER NOT NULL,
  living_place TEXT NOT NULL,
  is_deceased BOOLEAN DEFAULT false,
  marital_status TEXT NOT NULL,
  photo_url TEXT,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create relationships table if it doesn't exist
CREATE TABLE IF NOT EXISTS relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  related_member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('parent', 'child', 'spouse')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(member_id, related_member_id, type)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_relationships_member_id ON relationships(member_id);
CREATE INDEX IF NOT EXISTS idx_relationships_related_member_id ON relationships(related_member_id);
CREATE INDEX IF NOT EXISTS idx_family_members_family_id ON family_members(family_id);

-- Add sample data if families table is empty
INSERT INTO families (id, name, description, is_public, created_at, updated_at)
SELECT 
  '00000000-0000-0000-0000-000000000001'::uuid, 
  'Sample Family', 
  'A sample family for demonstration', 
  true, 
  NOW(), 
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM families LIMIT 1);

-- Add sample family members if none exist
INSERT INTO family_members (id, full_name, year_of_birth, living_place, is_deceased, marital_status, family_id, created_at, updated_at)
SELECT 
  '00000000-0000-0000-0000-000000000002'::uuid,
  'John Doe',
  1950,
  'New York, USA',
  false,
  'Married',
  '00000000-0000-0000-0000-000000000001'::uuid,
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM family_members WHERE id = '00000000-0000-0000-0000-000000000002'::uuid);

INSERT INTO family_members (id, full_name, year_of_birth, living_place, is_deceased, marital_status, family_id, created_at, updated_at)
SELECT 
  '00000000-0000-0000-0000-000000000003'::uuid,
  'Jane Doe',
  1955,
  'New York, USA',
  false,
  'Married',
  '00000000-0000-0000-0000-000000000001'::uuid,
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM family_members WHERE id = '00000000-0000-0000-0000-000000000003'::uuid);

-- Add sample relationships if none exist
INSERT INTO relationships (member_id, related_member_id, type)
SELECT 
  '00000000-0000-0000-0000-000000000002'::uuid,
  '00000000-0000-0000-0000-000000000003'::uuid,
  'spouse'
WHERE NOT EXISTS (
  SELECT 1 
  FROM relationships 
  WHERE member_id = '00000000-0000-0000-0000-000000000002'::uuid 
    AND related_member_id = '00000000-0000-0000-0000-000000000003'::uuid
) AND EXISTS (
  SELECT 1 
  FROM family_members 
  WHERE id IN (
    '00000000-0000-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000003'::uuid
  )
);

INSERT INTO relationships (member_id, related_member_id, type)
SELECT 
  '00000000-0000-0000-0000-000000000003'::uuid,
  '00000000-0000-0000-0000-000000000002'::uuid,
  'spouse'
WHERE NOT EXISTS (
  SELECT 1 
  FROM relationships 
  WHERE member_id = '00000000-0000-0000-0000-000000000003'::uuid 
    AND related_member_id = '00000000-0000-0000-0000-000000000002'::uuid
) AND EXISTS (
  SELECT 1 
  FROM family_members 
  WHERE id IN (
    '00000000-0000-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000003'::uuid
  )
);