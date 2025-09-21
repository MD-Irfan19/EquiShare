import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { BarChart3, Calendar, Download, PieChart, TrendingUp, Users } from 'lucide-react';
import { CategoryPieChart } from '@/components/analytics/CategoryPieChart';
import { MonthlyTrendChart } from '@/components/analytics/MonthlyTrendChart';
import { MemberContributionChart } from '@/components/analytics/MemberContributionChart';
import { SpendingHeatmap } from '@/components/analytics/SpendingHeatmap';
import { format, subMonths, subYears } from 'date-fns';

interface Group {
  id: string;
  name: string;
  currency: string;
}

interface AnalyticsData {
  categoryData: Array<{ category: string; amount: number; count: number; }>;
  monthlyData: Array<{ month: string; amount: number; }>;
  memberData: Array<{ user_id: string; name: string; amount: number; count: number; }>;
  heatmapData: Array<{ date: string; amount: number; }>;
  totalAmount: number;
  totalExpenses: number;
  avgPerMember: number;
}

export default function Analytics() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('12m');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    categoryData: [],
    monthlyData: [],
    memberData: [],
    heatmapData: [],
    totalAmount: 0,
    totalExpenses: 0,
    avgPerMember: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchGroups = async () => {
    if (!user) return;

    try {
      const { data: groupsData, error } = await supabase
        .from('group_members')
        .select(`
          groups (
            id,
            name,
            currency
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      const userGroups = groupsData?.map(item => item.groups).filter(Boolean) || [];
      setGroups(userGroups);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const getDateRange = () => {
    const now = new Date();
    switch (timeRange) {
      case '1m': return subMonths(now, 1);
      case '3m': return subMonths(now, 3);
      case '6m': return subMonths(now, 6);
      case '12m': return subMonths(now, 12);
      case '2y': return subYears(now, 2);
      default: return subMonths(now, 12);
    }
  };

  const fetchAnalyticsData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const startDate = format(getDateRange(), 'yyyy-MM-dd');
      
      // Build group filter
      let groupFilter = {};
      if (selectedGroup !== 'all') {
        groupFilter = { group_id: selectedGroup };
      } else {
        const groupIds = groups.map(g => g.id);
        if (groupIds.length > 0) {
          groupFilter = { group_id: { in: groupIds } };
        }
      }

      // Fetch expenses data
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('amount, category, expense_date, paid_by, group_id')
        .gte('expense_date', startDate)
        .match(selectedGroup === 'all' ? {} : { group_id: selectedGroup });

      if (expensesError) throw expensesError;

      const expenses = expensesData || [];

      // Filter by user's groups if 'all' is selected
      const filteredExpenses = selectedGroup === 'all' 
        ? expenses.filter(exp => groups.some(g => g.id === exp.group_id))
        : expenses;

      // Process category data
      const categoryMap = new Map();
      filteredExpenses.forEach(expense => {
        const existing = categoryMap.get(expense.category) || { amount: 0, count: 0 };
        categoryMap.set(expense.category, {
          category: expense.category,
          amount: existing.amount + Number(expense.amount),
          count: existing.count + 1,
        });
      });

      // Process monthly data
      const monthlyMap = new Map();
      filteredExpenses.forEach(expense => {
        const month = format(new Date(expense.expense_date), 'MMM yyyy');
        const existing = monthlyMap.get(month) || 0;
        monthlyMap.set(month, existing + Number(expense.amount));
      });

      const monthlyData = Array.from(monthlyMap.entries())
        .map(([month, amount]) => ({ month, amount }))
        .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

      // Process member contribution data
      const memberMap = new Map();
      for (const expense of filteredExpenses) {
        if (!memberMap.has(expense.paid_by)) {
          // Get member profile
          const { data: profileData } = await supabase
            .from('profiles')
            .select('display_name, email')
            .eq('user_id', expense.paid_by)
            .single();
          
          memberMap.set(expense.paid_by, {
            user_id: expense.paid_by,
            name: profileData?.display_name || profileData?.email || 'Unknown',
            amount: 0,
            count: 0,
          });
        }
        
        const member = memberMap.get(expense.paid_by);
        member.amount += Number(expense.amount);
        member.count += 1;
      }

      // Process heatmap data (daily spending)
      const heatmapMap = new Map();
      filteredExpenses.forEach(expense => {
        const date = expense.expense_date;
        const existing = heatmapMap.get(date) || 0;
        heatmapMap.set(date, existing + Number(expense.amount));
      });

      const heatmapData = Array.from(heatmapMap.entries())
        .map(([date, amount]) => ({ date, amount }));

      // Calculate totals
      const totalAmount = filteredExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
      const totalExpenses = filteredExpenses.length;
      const uniqueMembers = new Set(filteredExpenses.map(exp => exp.paid_by)).size;
      const avgPerMember = uniqueMembers > 0 ? totalAmount / uniqueMembers : 0;

      setAnalyticsData({
        categoryData: Array.from(categoryMap.values()),
        monthlyData,
        memberData: Array.from(memberMap.values()).sort((a, b) => b.amount - a.amount),
        heatmapData,
        totalAmount,
        totalExpenses,
        avgPerMember,
      });

    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportData = (format: 'csv' | 'pdf') => {
    // TODO: Implement export functionality
    console.log(`Exporting analytics data as ${format.toUpperCase()}`);
  };

  useEffect(() => {
    fetchGroups();
  }, [user]);

  useEffect(() => {
    if (groups.length > 0) {
      fetchAnalyticsData();
    }
  }, [groups, selectedGroup, timeRange]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading analytics...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="h-8 w-8" />
              Analytics Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Comprehensive insights into your spending patterns
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => exportData('csv')} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={() => exportData('pdf')} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedGroup} onValueChange={setSelectedGroup}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1m">1 Month</SelectItem>
                <SelectItem value="3m">3 Months</SelectItem>
                <SelectItem value="6m">6 Months</SelectItem>
                <SelectItem value="12m">12 Months</SelectItem>
                <SelectItem value="2y">2 Years</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${analyticsData.totalAmount.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                {analyticsData.totalExpenses} expenses
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average per Member</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${analyticsData.avgPerMember.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                {analyticsData.memberData.length} active members
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Category</CardTitle>
              <PieChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analyticsData.categoryData[0]?.category || 'None'}
              </div>
              <p className="text-xs text-muted-foreground">
                ${analyticsData.categoryData[0]?.amount.toFixed(2) || '0.00'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <CategoryPieChart data={analyticsData.categoryData} />
          <MemberContributionChart data={analyticsData.memberData} />
        </div>

        <div className="space-y-6">
          <MonthlyTrendChart data={analyticsData.monthlyData} />
          <SpendingHeatmap data={analyticsData.heatmapData} />
        </div>
      </div>
    </div>
  );
}