-- Create settlements table for tracking who owes whom
CREATE TABLE public.settlements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL,
  to_user_id UUID NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'settled')),
  settled_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT different_users CHECK (from_user_id != to_user_id)
);

-- Enable RLS
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for settlements
CREATE POLICY "Users can view settlements in their groups"
ON public.settlements FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id FROM group_members 
    WHERE group_id = settlements.group_id
  )
);

CREATE POLICY "Group members can create settlements"
ON public.settlements FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT user_id FROM group_members 
    WHERE group_id = settlements.group_id
  )
);

CREATE POLICY "Users involved can update settlement status"
ON public.settlements FOR UPDATE
USING (
  auth.uid() IN (from_user_id, to_user_id) OR
  auth.uid() IN (
    SELECT user_id FROM group_members 
    WHERE group_id = settlements.group_id AND role = 'admin'
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_settlements_updated_at
BEFORE UPDATE ON public.settlements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_settlements_group_id ON public.settlements(group_id);
CREATE INDEX idx_settlements_status ON public.settlements(status);
CREATE INDEX idx_settlements_users ON public.settlements(from_user_id, to_user_id);