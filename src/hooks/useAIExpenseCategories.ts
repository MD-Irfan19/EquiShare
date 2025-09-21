import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export const useAIExpenseCategories = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const categorizeExpense = async (description: string, amount?: number): Promise<string | null> => {
    if (!description.trim()) return null;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-categorize', {
        body: { description, amount }
      });

      if (error) throw error;

      return data.category || 'other';
    } catch (error) {
      console.error('Error categorizing expense:', error);
      toast({
        title: 'AI Categorization Failed',
        description: 'Using default category. You can change it manually.',
        variant: 'destructive',
      });
      return 'other';
    } finally {
      setLoading(false);
    }
  };

  return { categorizeExpense, loading };
};