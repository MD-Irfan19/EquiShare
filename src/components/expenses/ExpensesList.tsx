import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, Filter, Download, Receipt } from 'lucide-react';
import { format } from 'date-fns';
import { EXPENSE_CATEGORIES, getCategoryIcon } from '@/data/categories';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Expense {
  id: string;
  amount: number;
  description: string;
  category: string;
  expense_date: string;
  paid_by: string;
  receipt_url?: string;
  split_method: string;
  payer_name: string;
}

interface ExpensesListProps {
  groupId: string;
  groupMembers: Array<{ user_id: string; display_name: string }>;
}

export const ExpensesList = ({ groupId, groupMembers }: ExpensesListProps) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [memberFilter, setMemberFilter] = useState('all');
  const { toast } = useToast();

  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *
        `)
        .eq('group_id', groupId)
        .order('expense_date', { ascending: false });

      if (error) throw error;

      const expensesWithPayer = data?.map(expense => {
        const payer = groupMembers.find(m => m.user_id === expense.paid_by);
        return {
          ...expense,
          payer_name: payer?.display_name || 'Unknown'
        };
      }) || [];

      setExpenses(expensesWithPayer);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast({
        title: "Error",
        description: "Failed to load expenses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, groupMembers]);

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.payer_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;
    const matchesMember = memberFilter === 'all' || expense.paid_by === memberFilter;
    
    return matchesSearch && matchesCategory && matchesMember;
  });

  const exportToCSV = () => {
    const headers = ['Date', 'Description', 'Category', 'Amount', 'Paid By', 'Split Method'];
    const csvData = [
      headers.join(','),
      ...filteredExpenses.map(expense => [
        expense.expense_date,
        `"${expense.description}"`,
        expense.category,
        expense.amount,
        `"${expense.payer_name}"`,
        expense.split_method
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading expenses...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search expenses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {EXPENSE_CATEGORIES.map(category => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={memberFilter} onValueChange={setMemberFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All members" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All members</SelectItem>
                {groupMembers.map(member => (
                  <SelectItem key={member.user_id} value={member.user_id}>
                    {member.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={exportToCSV} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Expenses List */}
      <div className="space-y-3">
        {filteredExpenses.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No expenses found matching your filters.
            </CardContent>
          </Card>
        ) : (
          filteredExpenses.map(expense => {
            const category = EXPENSE_CATEGORIES.find(cat => cat.id === expense.category);
            const CategoryIcon = getCategoryIcon(category?.icon || 'HelpCircle');
            
            return (
              <Card key={expense.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <CategoryIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">{expense.description}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{category?.name}</span>
                          <span>•</span>
                          <span>{format(new Date(expense.expense_date), 'MMM dd, yyyy')}</span>
                          <span>•</span>
                          <span>Paid by {expense.payer_name}</span>
                          {expense.receipt_url && (
                            <>
                              <span>•</span>
                              <div className="flex items-center gap-1">
                                <Receipt className="h-3 w-3" />
                                <span>Receipt</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold">${expense.amount.toFixed(2)}</div>
                      <div className="text-sm text-muted-foreground capitalize">
                        {expense.split_method} split
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};