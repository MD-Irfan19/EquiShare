import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Balance } from '@/types/settlement';
import { ArrowUp, ArrowDown, DollarSign } from 'lucide-react';

interface BalanceSummaryProps {
  balances: Balance[];
  currency?: string;
}

export function BalanceSummary({ balances, currency = 'INR' }: BalanceSummaryProps) {
  const userBalance = balances.find(b => b.amount !== 0);
  const totalOwed = balances.filter(b => b.amount < 0).reduce((sum, b) => sum + Math.abs(b.amount), 0);
  const totalOwedTo = balances.filter(b => b.amount > 0).reduce((sum, b) => sum + b.amount, 0);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Your Balance</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {currency} {Math.abs(userBalance?.amount || 0).toFixed(2)}
          </div>
          <Badge variant={userBalance && userBalance.amount < 0 ? 'destructive' : 'default'} className="mt-2">
            {userBalance && userBalance.amount < 0 ? 'You Owe' : userBalance && userBalance.amount > 0 ? 'You Are Owed' : 'Settled Up'}
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total You Owe</CardTitle>
          <ArrowUp className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">
            {currency} {totalOwed.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            To {balances.filter(b => b.amount > 0).length} {balances.filter(b => b.amount > 0).length === 1 ? 'person' : 'people'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total You're Owed</CardTitle>
          <ArrowDown className="h-4 w-4 text-success" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-success">
            {currency} {totalOwedTo.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            From {balances.filter(b => b.amount < 0).length} {balances.filter(b => b.amount < 0).length === 1 ? 'person' : 'people'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}