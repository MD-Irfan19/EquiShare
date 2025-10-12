import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Users, DollarSign, Receipt, TrendingUp, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CreateGroupDialog } from '@/components/groups/CreateGroupDialog';
import { AddExpenseDialog } from '@/components/expenses/AddExpenseDialog';
import { ExpensesList } from '@/components/expenses/ExpensesList';
import { ExpenseChart } from '@/components/dashboard/ExpenseChart';
import { CSVImportDialog } from '@/components/import/CSVImportDialog';
import { SmartInsightsPanel } from '@/components/ai/SmartInsightsPanel';
import { NaturalLanguageQuery } from '@/components/ai/NaturalLanguageQuery';
import { format, subMonths } from 'date-fns';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<any[]>([]);
  const [chartData, setChartData] = useState({
    categoryData: [],
    monthlyData: [],
    totalAmount: 0,
  });
  const [stats, setStats] = useState({
    totalExpenses: 0,
    groupCount: 0,
    yourBalance: 0,
    recentCount: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      const { data: groupsData, error: groupsError } = await supabase
        .from('group_members')
        .select(`
          groups (
            id,
            name,
            description,
            currency,
            created_at
          )
        `)
        .eq('user_id', user.id);

      if (groupsError) throw groupsError;

      const userGroups = groupsData?.map(item => item.groups).filter(Boolean) || [];
      setGroups(userGroups);

      if (userGroups.length > 0 && !selectedGroup) {
        setSelectedGroup(userGroups[0]);
      }

      if (userGroups.length === 0) {
        setLoading(false);
        return;
      }

      const groupIds = userGroups.map(g => g.id);
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('id, amount, description, category, expense_date, paid_by, group_id')
        .in('group_id', groupIds)
        .order('created_at', { ascending: false })
        .limit(5);

      if (expensesError) throw expensesError;

      setRecentExpenses(expensesData || []);

      const { data: allExpenses, error: statsError } = await supabase
        .from('expenses')
        .select('amount')
        .in('group_id', groupIds);

      if (statsError) throw statsError;

      const totalExpenses = allExpenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;

      setStats({
        totalExpenses,
        groupCount: userGroups.length,
        yourBalance: 0,
        recentCount: expensesData?.length || 0,
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupData = async () => {
    if (!selectedGroup) return;

    try {
      // First get group members
      const { data: membersData, error: membersError } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', selectedGroup.id);

      if (membersError) throw membersError;

      // Then get their profiles
      const userIds = membersData?.map(m => m.user_id) || [];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, email')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      const members = membersData?.map(m => {
        const profile = profilesData?.find(p => p.user_id === m.user_id);
        return {
          id: m.user_id,
          user_id: m.user_id,
          display_name: profile?.display_name || profile?.email || 'Unknown',
          email: profile?.email,
        };
      }) || [];

      setGroupMembers(members);

      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('amount, category, expense_date')
        .eq('group_id', selectedGroup.id)
        .gte('expense_date', format(subMonths(new Date(), 12), 'yyyy-MM-dd'));

      if (expensesError) throw expensesError;

      const categoryMap = new Map();
      expensesData?.forEach(expense => {
        const existing = categoryMap.get(expense.category) || { amount: 0, count: 0 };
        categoryMap.set(expense.category, {
          category: expense.category,
          amount: existing.amount + Number(expense.amount),
          count: existing.count + 1,
        });
      });

      const monthlyMap = new Map();
      expensesData?.forEach(expense => {
        const month = format(new Date(expense.expense_date), 'MMM yyyy');
        const existing = monthlyMap.get(month) || 0;
        monthlyMap.set(month, existing + Number(expense.amount));
      });

      const monthlyData = Array.from(monthlyMap.entries())
        .map(([month, amount]) => ({ month, amount }))
        .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

      const totalAmount = expensesData?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;

      setChartData({
        categoryData: Array.from(categoryMap.values()),
        monthlyData,
        totalAmount,
      });

    } catch (error) {
      console.error('Error fetching group data:', error);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  useEffect(() => {
    fetchGroupData();
  }, [selectedGroup]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Welcome back, {user?.email}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              onClick={() => navigate('/analytics')}
              variant="outline"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Button>
            <CreateGroupDialog onGroupCreated={fetchDashboardData} />
            <Button 
              onClick={() => supabase.auth.signOut()}
              variant="outline"
            >
              Sign Out
            </Button>
          </div>
        </div>

        {groups.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Groups Yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first group to start tracking shared expenses
              </p>
              <CreateGroupDialog onGroupCreated={fetchDashboardData} />
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${stats.totalExpenses.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">Across all groups</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Your Balance</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${stats.yourBalance.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">Amount you're owed</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Groups</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.groupCount}</div>
                  <p className="text-xs text-muted-foreground">Active groups</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.recentCount}</div>
                  <p className="text-xs text-muted-foreground">New expenses</p>
                </CardContent>
              </Card>
            </div>

            {/* Group Selection and Actions */}
            {selectedGroup && (
              <Card className="mb-6">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <CardTitle>{selectedGroup.name}</CardTitle>
                        {selectedGroup.description && (
                          <p className="text-sm text-muted-foreground mt-1">{selectedGroup.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {groups.map((group) => (
                          <Button
                            key={group.id}
                            variant={selectedGroup.id === group.id ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedGroup(group)}
                          >
                            {group.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <CSVImportDialog 
                        groupId={selectedGroup.id}
                        groupMembers={groupMembers}
                        onImportComplete={fetchGroupData}
                      />
                      <AddExpenseDialog 
                        groupId={selectedGroup.id}
                        groupMembers={groupMembers}
                        onExpenseAdded={() => {
                          fetchDashboardData();
                          fetchGroupData();
                        }}
                      />
                    </div>
                  </div>
                </CardHeader>
              </Card>
            )}

            {/* AI Features */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <SmartInsightsPanel groupId={selectedGroup?.id} />
              <NaturalLanguageQuery />
            </div>

            {/* Charts */}
            {selectedGroup && chartData.categoryData.length > 0 && (
              <ExpenseChart 
                categoryData={chartData.categoryData}
                monthlyData={chartData.monthlyData}
                totalAmount={chartData.totalAmount}
              />
            )}

            {/* Expenses List */}
            {selectedGroup && (
              <ExpensesList 
                groupId={selectedGroup.id}
                groupMembers={groupMembers}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;