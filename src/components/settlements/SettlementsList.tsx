import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Settlement } from '@/types/settlement';
import { ArrowRight, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SettlementsListProps {
  settlements: Settlement[];
  currency: string;
  onSettleUp: (settlement: Settlement) => void;
}

export function SettlementsList({ settlements, currency, onSettleUp }: SettlementsListProps) {
  if (settlements.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Check className="h-12 w-12 text-success mb-4" />
          <p className="text-lg font-semibold">All Settled Up!</p>
          <p className="text-sm text-muted-foreground">No pending settlements in this group</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Suggested Settlements</CardTitle>
        <CardDescription>
          Optimized to minimize the number of transactions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {settlements.map((settlement, index) => (
          <div key={index} className="flex items-center justify-between p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-4 flex-1">
              <Avatar>
                <AvatarFallback>
                  {settlement.fromName?.substring(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <p className="font-medium">{settlement.fromName || 'Unknown'}</p>
                <p className="text-sm text-muted-foreground">owes</p>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-lg font-bold">
                  {currency} {settlement.amount.toFixed(2)}
                </Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>

              <div className="flex-1 text-right">
                <p className="font-medium">{settlement.toName || 'Unknown'}</p>
              </div>

              <Avatar>
                <AvatarFallback>
                  {settlement.toName?.substring(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </div>

            <Button onClick={() => onSettleUp(settlement)} className="ml-4">
              Settle Up
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}