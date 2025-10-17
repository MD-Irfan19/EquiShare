-- Add group_code column to groups table
ALTER TABLE groups ADD COLUMN group_code TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX idx_groups_group_code ON groups(group_code);

-- Generate unique codes for existing groups (6 character alphanumeric)
UPDATE groups SET group_code = upper(substr(md5(random()::text || id::text), 1, 6)) WHERE group_code IS NULL;

-- Make group_code NOT NULL after populating existing rows
ALTER TABLE groups ALTER COLUMN group_code SET NOT NULL;

-- Function to generate unique group code
CREATE OR REPLACE FUNCTION generate_group_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 6 character uppercase alphanumeric code
    new_code := upper(substr(md5(random()::text), 1, 6));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM groups WHERE group_code = new_code) INTO code_exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate group code on insert
CREATE OR REPLACE FUNCTION set_group_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.group_code IS NULL THEN
    NEW.group_code := generate_group_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_group_code
  BEFORE INSERT ON groups
  FOR EACH ROW
  EXECUTE FUNCTION set_group_code();