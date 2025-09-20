-- Add receipt storage support to expenses table
ALTER TABLE public.expenses ADD COLUMN receipt_url TEXT;

-- Add split method to expenses table to track how expense was split
ALTER TABLE public.expenses ADD COLUMN split_method TEXT DEFAULT 'equal' CHECK (split_method IN ('equal', 'percentage', 'custom'));

-- Create storage bucket for receipts
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', false);

-- Create policies for receipt uploads
CREATE POLICY "Users can upload receipts for their group expenses" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'receipts' AND 
  auth.uid() IN (
    SELECT gm.user_id 
    FROM group_members gm 
    JOIN expenses e ON e.group_id = gm.group_id 
    WHERE split_part(name, '/', 1) = e.id::text
  )
);

CREATE POLICY "Users can view receipts for their group expenses" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'receipts' AND 
  auth.uid() IN (
    SELECT gm.user_id 
    FROM group_members gm 
    JOIN expenses e ON e.group_id = gm.group_id 
    WHERE split_part(name, '/', 1) = e.id::text
  )
);

CREATE POLICY "Users can update receipts for expenses they created" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'receipts' AND 
  auth.uid() IN (
    SELECT e.paid_by 
    FROM expenses e 
    WHERE split_part(name, '/', 1) = e.id::text
  )
);

CREATE POLICY "Users can delete receipts for expenses they created" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'receipts' AND 
  auth.uid() IN (
    SELECT e.paid_by 
    FROM expenses e 
    WHERE split_part(name, '/', 1) = e.id::text
  )
);