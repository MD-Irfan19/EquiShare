import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Settlement } from '@/types/settlement';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface SettleUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settlement: Settlement | null;
  groupId: string;
  currency: string;
  onSettled: () => void;
}

export function SettleUpDialog({ open, onOpenChange, settlement, groupId, currency, onSettled }: SettleUpDialogProps) {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSettle = async () => {
    if (!settlement) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('settlements')
        .insert({
          group_id: groupId,
          from_user_id: settlement.from,
          to_user_id: settlement.to,
          amount: settlement.amount,
          currency,
          status: 'settled',
          settled_at: new Date().toISOString(),
          notes: notes || null,
        });

      if (error) throw error;

      toast({
        title: 'Settlement Recorded',
        description: `${settlement.fromName} paid ${currency} ${settlement.amount.toFixed(2)} to ${settlement.toName}`,
      });

      onSettled();
      onOpenChange(false);
      setNotes('');
    } catch (error: any) {
      console.error('Error recording settlement:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to record settlement',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!settlement) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settle Up</DialogTitle>
          <DialogDescription>
            Record a payment between group members
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm text-muted-foreground">Payment Details</p>
            <p className="text-lg font-semibold mt-1">
              {settlement.fromName} pays {currency} {settlement.amount.toFixed(2)} to {settlement.toName}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this payment..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSettle} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Mark as Settled
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}