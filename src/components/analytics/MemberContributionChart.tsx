import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface MemberData {
  user_id: string;
  name: string;
  amount: number;
  count: number;
}

interface MemberContributionChartProps {
  data: MemberData[];
}

export const MemberContributionChart = ({ data }: MemberContributionChartProps) => {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const memberData = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{memberData.name}</p>
          <p className="text-primary">Total: ${memberData.amount.toFixed(2)}</p>
          <p className="text-muted-foreground text-sm">{memberData.count} expenses</p>
          <p className="text-muted-foreground text-sm">
            Avg: ${(memberData.amount / memberData.count).toFixed(2)} per expense
          </p>
        </div>
      );
    }
    return null;
  };

  // Generate colors based on amount (higher amounts get more saturated colors)
  const maxAmount = Math.max(...data.map(d => d.amount));
  const getBarColor = (amount: number) => {
    const intensity = amount / maxAmount;
    return `hsl(var(--primary) / ${0.3 + intensity * 0.7})`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Member Contributions</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart 
              data={data} 
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              layout="horizontal"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                type="number"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickFormatter={(value) => `$${value.toFixed(0)}`}
              />
              <YAxis 
                type="category"
                dataKey="name"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                width={100}
                tick={{ textAnchor: 'end' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="amount" 
                radius={[0, 4, 4, 0]}
              >
                {data.map((member, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(member.amount)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[350px] flex items-center justify-center text-muted-foreground">
            No member data available
          </div>
        )}
      </CardContent>
    </Card>
  );
};