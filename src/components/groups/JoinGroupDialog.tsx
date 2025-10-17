import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface JoinGroupDialogProps {
  onGroupJoined: () => void;
}

export const JoinGroupDialog = ({ onGroupJoined }: JoinGroupDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [groupCode, setGroupCode] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();

  const resetForm = () => {
    setGroupCode('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupCode.trim()) {
      toast({
        title: "Group code required",
        description: "Please enter a valid group code",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Find the group by code
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('id, name')
        .eq('group_code', groupCode.trim().toUpperCase())
        .single();

      if (groupError || !group) {
        toast({
          title: "Invalid group code",
          description: "No group found with this code. Please check and try again.",
          variant: "destructive",
        });
        return;
      }

      // Check if user is already a member
      const { data: existingMember, error: memberCheckError } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', group.id)
        .eq('user_id', user!.id)
        .maybeSingle();

      if (memberCheckError) throw memberCheckError;

      if (existingMember) {
        toast({
          title: "Already a member",
          description: `You're already part of ${group.name}`,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Add user to the group
      const { error: joinError } = await supabase
        .from('group_members')
        .insert({
          group_id: group.id,
          user_id: user!.id,
          role: 'member',
        });

      if (joinError) throw joinError;

      toast({
        title: "Successfully joined",
        description: `You've joined ${group.name}`,
      });

      resetForm();
      setOpen(false);
      onGroupJoined();
    } catch (error) {
      console.error('Error joining group:', error);
      toast({
        title: "Error",
        description: "Failed to join group. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <UserPlus className="h-4 w-4" />
          Join Group
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Join Existing Group</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="groupCode">Group Code *</Label>
            <Input
              id="groupCode"
              placeholder="Enter 6-character group code"
              value={groupCode}
              onChange={(e) => setGroupCode(e.target.value.toUpperCase())}
              maxLength={6}
              required
              className="uppercase font-mono text-lg tracking-widest"
            />
            <p className="text-sm text-muted-foreground">
              Ask your group admin for the group code
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading || groupCode.length !== 6} className="flex-1">
              {loading ? 'Joining...' : 'Join Group'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
