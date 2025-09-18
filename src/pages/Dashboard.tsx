import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Users, DollarSign, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface Group {
  id: string;
  name: string;
  description: string;
  created_at: string;
  member_count: number;
}

interface Expense {
  id: string;
  amount: number;
  description: string;
  expense_date: string;
  group_name: string;
}

interface Stats {
  totalGroups: number;
  totalExpenses: number;
  totalAmount: number;
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState<Stats>({ totalGroups: 0, totalExpenses: 0, totalAmount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // Fetch user's groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select(`
          id,
          name,
          description,
          created_at
        `)
        .eq('group_members.user_id', user?.id);

      if (groupsError) throw groupsError;

      // Fetch recent expenses
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select(`
          id,
          amount,
          description,
          expense_date,
          groups!inner(name)
        `)
        .in('group_id', groupsData?.map(g => g.id) || [])
        .order('created_at', { ascending: false })
        .limit(5);

      if (expensesError) throw expensesError;

      // Calculate stats
      const totalGroups = groupsData?.length || 0;
      const totalExpenses = expensesData?.length || 0;
      const totalAmount = expensesData?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;

      setGroups(groupsData?.map(g => ({ ...g, member_count: 0 })) || []);
      setRecentExpenses(expensesData?.map(exp => ({
        ...exp,
        group_name: exp.groups.name
      })) || []);
      setStats({ totalGroups, totalExpenses, totalAmount });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">EquiShare</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {user?.email}
            </span>
            <Button variant="outline" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Dashboard</h2>
          <p className="text-muted-foreground">
            Manage your groups and track shared expenses
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Groups</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalGroups}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Expenses</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalExpenses}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalAmount.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
          <div className="flex gap-4">
            <Button asChild>
              <Link to="/groups/new">
                <Plus className="h-4 w-4 mr-2" />
                Create Group
              </Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link to="/groups">
                <Users className="h-4 w-4 mr-2" />
                View All Groups
              </Link>
            </Button>
          </div>
        </div>

        {/* Recent Groups */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Groups</CardTitle>
              <CardDescription>
                Groups you're part of
              </CardDescription>
            </CardHeader>
            <CardContent>
              {groups.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No groups yet. Create your first group to get started!
                </p>
              ) : (
                <div className="space-y-3">
                  {groups.slice(0, 3).map((group) => (
                    <div key={group.id} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{group.name}</h4>
                        <p className="text-sm text-muted-foreground">{group.description}</p>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/groups/${group.id}`}>View</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Expenses</CardTitle>
              <CardDescription>
                Latest expenses across all groups
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentExpenses.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No expenses yet. Add your first expense to a group!
                </p>
              ) : (
                <div className="space-y-3">
                  {recentExpenses.map((expense) => (
                    <div key={expense.id} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">${expense.amount.toFixed(2)}</h4>
                        <p className="text-sm text-muted-foreground">{expense.description}</p>
                        <p className="text-xs text-muted-foreground">{expense.group_name}</p>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(expense.expense_date).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}