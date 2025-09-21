import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, getDay, subMonths } from 'date-fns';
import { Tooltip } from '@/components/ui/tooltip';

interface HeatmapData {
  date: string;
  amount: number;
}

interface SpendingHeatmapProps {
  data: HeatmapData[];
}

export const SpendingHeatmap = ({ data }: SpendingHeatmapProps) => {
  // Create a map for quick lookup
  const dataMap = new Map(data.map(d => [d.date, d.amount]));
  
  // Get the last 12 months
  const endDate = new Date();
  const startDate = subMonths(endDate, 11);
  
  // Generate calendar grid for the last 12 months
  const months = [];
  for (let i = 0; i < 12; i++) {
    const monthStart = subMonths(endDate, 11 - i);
    const monthEnd = endOfMonth(monthStart);
    const monthStartCalendar = startOfMonth(monthStart);
    
    const days = eachDayOfInterval({ start: monthStartCalendar, end: monthEnd });
    months.push({
      name: format(monthStart, 'MMM yyyy'),
      days: days.map(day => ({
        date: format(day, 'yyyy-MM-dd'),
        displayDate: format(day, 'd'),
        dayOfWeek: getDay(day),
        amount: dataMap.get(format(day, 'yyyy-MM-dd')) || 0,
        isCurrentMonth: day >= monthStart && day <= monthEnd,
      }))
    });
  }

  // Calculate max amount for color intensity
  const maxAmount = Math.max(...data.map(d => d.amount), 1);

  const getIntensity = (amount: number) => {
    if (amount === 0) return 0;
    return Math.min(amount / maxAmount, 1);
  };

  const getCellColor = (amount: number) => {
    if (amount === 0) return 'hsl(var(--muted))';
    const intensity = getIntensity(amount);
    return `hsl(var(--primary) / ${0.1 + intensity * 0.8})`;
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Spending Heatmap
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Less</span>
            <div className="flex gap-1">
              {[0, 0.2, 0.4, 0.6, 0.8, 1].map((intensity) => (
                <div
                  key={intensity}
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: intensity === 0 ? 'hsl(var(--muted))' : `hsl(var(--primary) / ${0.1 + intensity * 0.8})` }}
                />
              ))}
            </div>
            <span>More</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Week day labels */}
          <div className="grid grid-cols-8 gap-1 text-xs text-muted-foreground">
            <div></div>
            {weekDays.map(day => (
              <div key={day} className="text-center">{day}</div>
            ))}
          </div>
          
          {/* Monthly grids */}
          <div className="space-y-3">
            {months.map((month) => (
              <div key={month.name} className="space-y-1">
                <h4 className="text-sm font-medium text-muted-foreground">{month.name}</h4>
                <div className="grid grid-cols-8 gap-1">
                  <div></div>
                  {/* Create weekly rows */}
                  {Array.from({ length: Math.ceil(month.days.length / 7) }, (_, weekIndex) => {
                    const weekStart = weekIndex * 7;
                    const weekDays = month.days.slice(weekStart, weekStart + 7);
                    
                    return weekDays.map((day, dayIndex) => (
                      <div
                        key={`${month.name}-${weekStart + dayIndex}`}
                        className="w-4 h-4 rounded-sm cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all relative group"
                        style={{ 
                          backgroundColor: day.isCurrentMonth ? getCellColor(day.amount) : 'transparent',
                          opacity: day.isCurrentMonth ? 1 : 0.3
                        }}
                        title={`${day.date}: $${day.amount.toFixed(2)}`}
                      >
                        {/* Tooltip content */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                          {day.date}: ${day.amount.toFixed(2)}
                        </div>
                      </div>
                    ));
                  }).flat()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};