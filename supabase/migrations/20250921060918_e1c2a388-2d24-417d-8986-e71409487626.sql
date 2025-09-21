-- Fix infinite recursion in group_members RLS policy
DROP POLICY IF EXISTS "Group admins can add members" ON group_members;

-- Recreate the policy with correct logic
CREATE POLICY "Group admins can add members" 
ON group_members 
FOR INSERT 
WITH CHECK (
  (auth.uid() IN ( 
    SELECT gm.user_id
    FROM group_members gm
    WHERE gm.group_id = group_members.group_id 
    AND gm.role = 'admin'
  )) 
  OR (auth.uid() = user_id)
);