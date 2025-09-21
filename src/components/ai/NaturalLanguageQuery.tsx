import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Send, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface QueryResult {
  answer: string;
  data?: any;
  summary?: {
    totalExpenses: number;
    totalAmount: string;
    categories: number;
    members: number;
    groups: number;
  };
}

export const NaturalLanguageQuery = () => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-query', {
        body: { query: query.trim() }
      });

      if (error) throw error;

      setResult(data);
      setQuery('');
    } catch (error) {
      console.error('Error processing query:', error);
      toast({
        title: 'Error',
        description: 'Failed to process your query. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickQuery = (quickQuery: string) => {
    setQuery(quickQuery);
  };

  const quickQueries = [
    "How much did I spend on food last month?",
    "Who spends the most in our group?",
    "Show me my travel expenses this year",
    "What's my average monthly spending?",
    "Which category do I spend most on?"
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Ask About Your Expenses
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask anything about your expenses..."
            disabled={loading}
          />
          <Button type="submit" disabled={loading || !query.trim()}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>

        {/* Quick Queries */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Quick questions:</p>
          <div className="flex flex-wrap gap-2">
            {quickQueries.map((quickQuery, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handleQuickQuery(quickQuery)}
                disabled={loading}
                className="text-xs h-8"
              >
                {quickQuery}
              </Button>
            ))}
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-4 pt-4 border-t">
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Answer:</h4>
              <p className="text-sm text-foreground whitespace-pre-wrap">{result.answer}</p>
            </div>

            {result.summary && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                <div className="bg-primary/10 p-2 rounded text-center">
                  <div className="font-medium">{result.summary.totalExpenses}</div>
                  <div className="text-muted-foreground">Expenses</div>
                </div>
                <div className="bg-primary/10 p-2 rounded text-center">
                  <div className="font-medium">${result.summary.totalAmount}</div>
                  <div className="text-muted-foreground">Total</div>
                </div>
                <div className="bg-primary/10 p-2 rounded text-center">
                  <div className="font-medium">{result.summary.categories}</div>
                  <div className="text-muted-foreground">Categories</div>
                </div>
                <div className="bg-primary/10 p-2 rounded text-center">
                  <div className="font-medium">{result.summary.members}</div>
                  <div className="text-muted-foreground">Members</div>
                </div>
                <div className="bg-primary/10 p-2 rounded text-center">
                  <div className="font-medium">{result.summary.groups}</div>
                  <div className="text-muted-foreground">Groups</div>
                </div>
              </div>
            )}

            {result.data && Array.isArray(result.data) && (
              <div className="bg-muted/30 p-3 rounded">
                <h4 className="font-medium mb-2 text-sm">Relevant Data:</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {result.data.slice(0, 10).map((item: any, index: number) => (
                    <div key={index} className="text-xs bg-background p-2 rounded flex justify-between">
                      <span>
                        {item.category || item.member || item.description || 'Item'}: 
                        {item.amount && ` $${Number(item.amount).toFixed(2)}`}
                      </span>
                      {item.percentage && (
                        <span className="text-muted-foreground">{item.percentage}%</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};