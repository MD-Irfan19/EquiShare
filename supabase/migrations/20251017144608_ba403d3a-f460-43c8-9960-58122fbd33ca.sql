-- Make group_code nullable so trigger can set it
ALTER TABLE groups ALTER COLUMN group_code DROP NOT NULL;

-- Update trigger to handle both null and empty string
CREATE OR REPLACE FUNCTION set_group_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.group_code IS NULL OR NEW.group_code = '' THEN
    NEW.group_code := generate_group_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;