import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface AddBalanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  currency: string;
  members: Array<{ user_id: string; display_name?: string; email?: string }>;
  onBalanceAdded: () => void;
}

export function AddBalanceDialog({
  open,
  onOpenChange,
  groupId,
  currency,
  members,
  onBalanceAdded,
}: AddBalanceDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fromUserId, setFromUserId] = useState<string>('');
  const [toUserId, setToUserId] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  const handleAddBalance = async () => {
    if (!fromUserId || !toUserId || !amount) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    if (fromUserId === toUserId) {
      toast({
        title: 'Error',
        description: 'Cannot add balance to yourself',
        variant: 'destructive',
      });
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({
        title: 'Error',
        description: 'Please enter a valid amount',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('settlements').insert({
        group_id: groupId,
        from_user_id: fromUserId,
        to_user_id: toUserId,
        amount: numAmount,
        currency: currency,
        status: 'settled',
        settled_at: new Date().toISOString(),
        notes: notes || 'Manual balance adjustment',
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Balance added successfully',
      });

      // Reset form
      setFromUserId('');
      setToUserId('');
      setAmount('');
      setNotes('');
      
      onOpenChange(false);
      onBalanceAdded();
    } catch (error: any) {
      console.error('Error adding balance:', error);
      toast({
        title: 'Error',
        description: 'Failed to add balance',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Manual Balance</DialogTitle>
          <DialogDescription>
            Record a direct payment or balance adjustment between group members
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="from-user">From (Payer)</Label>
            <Select value={fromUserId} onValueChange={setFromUserId}>
              <SelectTrigger id="from-user">
                <SelectValue placeholder="Select payer" />
              </SelectTrigger>
              <SelectContent>
                {members.map((member) => (
                  <SelectItem key={member.user_id} value={member.user_id}>
                    {member.display_name || member.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="to-user">To (Receiver)</Label>
            <Select value={toUserId} onValueChange={setToUserId}>
              <SelectTrigger id="to-user">
                <SelectValue placeholder="Select receiver" />
              </SelectTrigger>
              <SelectContent>
                {members.map((member) => (
                  <SelectItem key={member.user_id} value={member.user_id}>
                    {member.display_name || member.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount ({currency})</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
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
          <Button onClick={handleAddBalance} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              'Add Balance'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
