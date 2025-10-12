import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { SettlementRecord } from '@/types/settlement';
import { format } from 'date-fns';
import { Check, History } from 'lucide-react';

interface SettlementHistoryProps {
  groupId: string;
  currency: string;
  profiles: Array<{ user_id: string; display_name?: string; email?: string }>;
}

export function SettlementHistory({ groupId, currency, profiles }: SettlementHistoryProps) {
  const [settlements, setSettlements] = useState<SettlementRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettlements();
  }, [groupId]);

  const fetchSettlements = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('settlements')
        .select('*')
        .eq('group_id', groupId)
        .eq('status', 'settled')
        .order('settled_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setSettlements((data as SettlementRecord[]) || []);
    } catch (error) {
      console.error('Error fetching settlements:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProfileName = (userId: string) => {
    const profile = profiles.find(p => p.user_id === userId);
    return profile?.display_name || profile?.email || 'Unknown';
  };

  if (loading) {
    return <Card><CardContent className="py-12 text-center">Loading history...</CardContent></Card>;
  }

  if (settlements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Settlement History
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">No settlement history yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Settlement History
        </CardTitle>
        <CardDescription>Recent payments in this group</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {settlements.map((settlement) => (
            <div key={settlement.id} className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-3 flex-1">
                <Check className="h-5 w-5 text-success" />
                <div className="flex-1">
                  <p className="font-medium">
                    {getProfileName(settlement.from_user_id)} paid {getProfileName(settlement.to_user_id)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {settlement.settled_at && format(new Date(settlement.settled_at), 'MMM d, yyyy')}
                  </p>
                  {settlement.notes && (
                    <p className="text-sm text-muted-foreground italic mt-1">{settlement.notes}</p>
                  )}
                </div>
                <Badge variant="secondary" className="font-bold">
                  {currency} {parseFloat(settlement.amount.toString()).toFixed(2)}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}