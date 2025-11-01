import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Balance } from '@/types/settlement';
import { ArrowUp, ArrowDown, DollarSign } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BalanceSummaryProps {
  balances: Balance[];
  currency?: string;
}

export function BalanceSummary({ balances, currency = 'USD' }: BalanceSummaryProps) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || null);
    });
  }, []);

  const userBalance = balances.find(b => b.userId === currentUserId);
  const myBalance = userBalance?.amount || 0;
  
  // If my balance is negative, I owe money
  const totalOwed = myBalance < 0 ? Math.abs(myBalance) : 0;
  // If my balance is positive, people owe me money
  const totalOwedTo = myBalance > 0 ? myBalance : 0;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Your Balance</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {currency} {Math.abs(myBalance).toFixed(2)}
          </div>
          <Badge variant={myBalance < 0 ? 'destructive' : myBalance > 0 ? 'default' : 'secondary'} className="mt-2">
            {myBalance < 0 ? 'You Owe' : myBalance > 0 ? 'You Are Owed' : 'Settled Up'}
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
            {totalOwed > 0 ? 'Amount you need to pay' : 'You don\'t owe anything'}
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
            {totalOwedTo > 0 ? 'Amount others owe you' : 'No one owes you'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}