-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create groups table
CREATE TABLE public.groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create group members junction table
CREATE TABLE public.group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Create expenses table
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  category TEXT DEFAULT 'other',
  paid_by UUID NOT NULL REFERENCES auth.users(id),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create expense participants table (for split calculations)
CREATE TABLE public.expense_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_owed DECIMAL(10,2) NOT NULL CHECK (amount_owed >= 0),
  UNIQUE(expense_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_participants ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" 
ON public.profiles FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Groups policies
CREATE POLICY "Users can view groups they are members of" 
ON public.groups FOR SELECT 
USING (
  auth.uid() IN (
    SELECT user_id FROM public.group_members 
    WHERE group_id = groups.id
  )
);

CREATE POLICY "Users can create groups" 
ON public.groups FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group admins can update groups" 
ON public.groups FOR UPDATE 
USING (
  auth.uid() IN (
    SELECT user_id FROM public.group_members 
    WHERE group_id = groups.id AND role = 'admin'
  )
);

-- Group members policies
CREATE POLICY "Users can view group members for their groups" 
ON public.group_members FOR SELECT 
USING (
  auth.uid() IN (
    SELECT user_id FROM public.group_members gm2 
    WHERE gm2.group_id = group_members.group_id
  )
);

CREATE POLICY "Group admins can add members" 
ON public.group_members FOR INSERT 
WITH CHECK (
  auth.uid() IN (
    SELECT user_id FROM public.group_members 
    WHERE group_id = group_members.group_id AND role = 'admin'
  ) OR auth.uid() = user_id
);

-- Expenses policies
CREATE POLICY "Users can view expenses for their groups" 
ON public.expenses FOR SELECT 
USING (
  auth.uid() IN (
    SELECT user_id FROM public.group_members 
    WHERE group_id = expenses.group_id
  )
);

CREATE POLICY "Group members can add expenses" 
ON public.expenses FOR INSERT 
WITH CHECK (
  auth.uid() IN (
    SELECT user_id FROM public.group_members 
    WHERE group_id = expenses.group_id
  )
);

CREATE POLICY "Expense creator can update expenses" 
ON public.expenses FOR UPDATE 
USING (auth.uid() = paid_by);

-- Expense participants policies
CREATE POLICY "Users can view expense participants for their groups" 
ON public.expense_participants FOR SELECT 
USING (
  auth.uid() IN (
    SELECT gm.user_id FROM public.group_members gm
    JOIN public.expenses e ON e.group_id = gm.group_id
    WHERE e.id = expense_participants.expense_id
  )
);

CREATE POLICY "Group members can add expense participants" 
ON public.expense_participants FOR INSERT 
WITH CHECK (
  auth.uid() IN (
    SELECT gm.user_id FROM public.group_members gm
    JOIN public.expenses e ON e.group_id = gm.group_id
    WHERE e.id = expense_participants.expense_id
  )
);

-- Create function to automatically update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_groups_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();