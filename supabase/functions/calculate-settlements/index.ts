import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Balance {
  userId: string;
  amount: number;
}

interface Settlement {
  from: string;
  to: string;
  amount: number;
}

// Optimize settlements using greedy algorithm to minimize transactions
function optimizeSettlements(balances: Balance[]): Settlement[] {
  const settlements: Settlement[] = [];
  
  // Separate debtors (negative balance) and creditors (positive balance)
  const debtors = balances.filter(b => b.amount < 0).map(b => ({ ...b }));
  const creditors = balances.filter(b => b.amount > 0).map(b => ({ ...b }));
  
  // Sort by absolute amount (largest first)
  debtors.sort((a, b) => a.amount - b.amount);
  creditors.sort((a, b) => b.amount - a.amount);
  
  let i = 0, j = 0;
  
  while (i < debtors.length && j < creditors.length) {
    const debt = Math.abs(debtors[i].amount);
    const credit = creditors[j].amount;
    
    const settleAmount = Math.min(debt, credit);
    
    settlements.push({
      from: debtors[i].userId,
      to: creditors[j].userId,
      amount: parseFloat(settleAmount.toFixed(2)),
    });
    
    debtors[i].amount += settleAmount;
    creditors[j].amount -= settleAmount;
    
    if (Math.abs(debtors[i].amount) < 0.01) i++;
    if (Math.abs(creditors[j].amount) < 0.01) j++;
  }
  
  return settlements;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { groupId } = await req.json();

    if (!groupId) {
      throw new Error('Group ID is required');
    }

    console.log('Calculating settlements for group:', groupId);

    // Get all expenses for the group
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select('id, amount, paid_by')
      .eq('group_id', groupId);

    if (expensesError) throw expensesError;

    // Get all expense participants
    const { data: participants, error: participantsError } = await supabase
      .from('expense_participants')
      .select('expense_id, user_id, amount_owed')
      .in('expense_id', expenses?.map(e => e.id) || []);

    if (participantsError) throw participantsError;

    // Get all settled settlements for the group
    const { data: settledSettlements, error: settlementsError } = await supabase
      .from('settlements')
      .select('from_user_id, to_user_id, amount')
      .eq('group_id', groupId)
      .eq('status', 'settled');

    if (settlementsError) throw settlementsError;

    // Calculate net balance for each user
    const balances = new Map<string, number>();

    // Add amounts paid by each user
    expenses?.forEach(expense => {
      const current = balances.get(expense.paid_by) || 0;
      balances.set(expense.paid_by, current + parseFloat(expense.amount));
    });

    // Subtract amounts owed by each user
    participants?.forEach(participant => {
      const current = balances.get(participant.user_id) || 0;
      balances.set(participant.user_id, current - parseFloat(participant.amount_owed));
    });

    // Adjust balances for already settled amounts
    settledSettlements?.forEach(settlement => {
      // The person who paid (from_user_id) gets credited back
      const fromCurrent = balances.get(settlement.from_user_id) || 0;
      balances.set(settlement.from_user_id, fromCurrent + parseFloat(settlement.amount));
      
      // The person who received (to_user_id) gets debited
      const toCurrent = balances.get(settlement.to_user_id) || 0;
      balances.set(settlement.to_user_id, toCurrent - parseFloat(settlement.amount));
    });

    // Convert to array format
    const balanceArray: Balance[] = Array.from(balances.entries()).map(([userId, amount]) => ({
      userId,
      amount: parseFloat(amount.toFixed(2)),
    }));

    // Calculate optimized settlements
    const optimizedSettlements = optimizeSettlements(balanceArray);

    console.log('Calculated settlements:', optimizedSettlements);

    return new Response(
      JSON.stringify({
        balances: balanceArray,
        settlements: optimizedSettlements,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error calculating settlements:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});