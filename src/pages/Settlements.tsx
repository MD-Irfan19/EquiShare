import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Balance, Settlement } from '@/types/settlement';
import { BalanceSummary } from '@/components/settlements/BalanceSummary';
import { SettlementsList } from '@/components/settlements/SettlementsList';
import { SettlementHistory } from '@/components/settlements/SettlementHistory';
import { SettleUpDialog } from '@/components/settlements/SettleUpDialog';
import { AddBalanceDialog } from '@/components/settlements/AddBalanceDialog';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export default function Settlements() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [balances, setBalances] = useState<Balance[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [profiles, setProfiles] = useState<Array<{ user_id: string; display_name?: string; email?: string }>>([]);
  const [groupCurrency, setGroupCurrency] = useState('USD');
  const [loading, setLoading] = useState(true);
  const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addBalanceOpen, setAddBalanceOpen] = useState(false);

  useEffect(() => {
    if (groupId) {
      fetchGroupData();
      calculateSettlements();
    }
  }, [groupId]);

  const fetchGroupData = async () => {
    try {
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('currency')
        .eq('id', groupId)
        .single();

      if (groupError) throw groupError;
      setGroupCurrency(group.currency);

      const { data: members, error: membersError } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId);

      if (membersError) throw membersError;

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, email')
        .in('user_id', members?.map(m => m.user_id) || []);

      if (profilesError) throw profilesError;
      setProfiles(profilesData || []);
    } catch (error: any) {
      console.error('Error fetching group data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load group data',
        variant: 'destructive',
      });
    }
  };

  const calculateSettlements = async () => {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('calculate-settlements', {
        body: { groupId },
      });

      if (response.error) throw response.error;

      const { balances: calculatedBalances, settlements: calculatedSettlements } = response.data;

      // Enrich with profile names
      const enrichedBalances = calculatedBalances.map((balance: Balance) => {
        const profile = profiles.find(p => p.user_id === balance.userId);
        return {
          ...balance,
          display_name: profile?.display_name || profile?.email,
          email: profile?.email,
        };
      });

      const enrichedSettlements = calculatedSettlements.map((settlement: Settlement) => {
        const fromProfile = profiles.find(p => p.user_id === settlement.from);
        const toProfile = profiles.find(p => p.user_id === settlement.to);
        return {
          ...settlement,
          fromName: fromProfile?.display_name || fromProfile?.email || 'Unknown',
          toName: toProfile?.display_name || toProfile?.email || 'Unknown',
        };
      });

      setBalances(enrichedBalances);
      setSettlements(enrichedSettlements);
    } catch (error: any) {
      console.error('Error calculating settlements:', error);
      toast({
        title: 'Error',
        description: 'Failed to calculate settlements',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSettleUp = (settlement: Settlement) => {
    setSelectedSettlement(settlement);
    setDialogOpen(true);
  };

  const handleSettled = () => {
    calculateSettlements();
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">Loading settlements...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Settlements</h1>
            <p className="text-muted-foreground">Manage group balances and payments</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={calculateSettlements}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setAddBalanceOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Balance
          </Button>
        </div>
      </div>

      <BalanceSummary balances={balances} currency={groupCurrency} />
      
      <SettlementsList 
        settlements={settlements} 
        currency={groupCurrency}
        onSettleUp={handleSettleUp}
      />

      <SettlementHistory 
        groupId={groupId!} 
        currency={groupCurrency}
        profiles={profiles}
      />

      <SettleUpDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        settlement={selectedSettlement}
        groupId={groupId!}
        currency={groupCurrency}
        onSettled={handleSettled}
      />

      <AddBalanceDialog
        open={addBalanceOpen}
        onOpenChange={setAddBalanceOpen}
        groupId={groupId!}
        currency={groupCurrency}
        members={profiles}
        onBalanceAdded={handleSettled}
      />
    </div>
  );
}