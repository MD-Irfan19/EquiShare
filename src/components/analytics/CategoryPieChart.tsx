import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { EXPENSE_CATEGORIES } from '@/data/categories';

interface CategoryData {
  category: string;
  amount: number;
  count: number;
}

interface CategoryPieChartProps {
  data: CategoryData[];
}

export const CategoryPieChart = ({ data }: CategoryPieChartProps) => {
  const chartData = data
    .filter(item => item.amount > 0)
    .map(item => ({
      ...item,
      name: EXPENSE_CATEGORIES.find(cat => cat.id === item.category)?.name || item.category,
      color: EXPENSE_CATEGORIES.find(cat => cat.id === item.category)?.color || 'hsl(var(--muted))',
    }))
    .sort((a, b) => b.amount - a.amount);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-primary">Amount: ₹{data.amount.toFixed(2)}</p>
          <p className="text-muted-foreground text-sm">{data.count} expenses</p>
          <p className="text-muted-foreground text-sm">
            {((data.amount / chartData.reduce((sum, item) => sum + item.amount, 0)) * 100).toFixed(1)}% of total
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending by Category</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                outerRadius={120}
                dataKey="amount"
                label={({ name, percent }) => 
                  percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ''
                }
                labelLine={false}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value, entry: any) => `${value} (₹${entry.payload.amount.toFixed(2)})`}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[350px] flex items-center justify-center text-muted-foreground">
            No category data available
          </div>
        )}
      </CardContent>
    </Card>
  );
};