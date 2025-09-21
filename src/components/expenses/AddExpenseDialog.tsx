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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Plus, Calendar as CalendarIcon, Upload, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { EXPENSE_CATEGORIES, getCategoryIcon } from '@/data/categories';
import { SplitMethod } from '@/types/expense';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAIExpenseCategories } from '@/hooks/useAIExpenseCategories';

interface AddExpenseDialogProps {
  groupId: string;
  groupMembers: Array<{ id: string; display_name: string; user_id: string }>;
  onExpenseAdded: () => void;
}

export const AddExpenseDialog = ({ groupId, groupMembers, onExpenseAdded }: AddExpenseDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { categorizeExpense, loading: categorizingLoading } = useAIExpenseCategories();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('food');
  const [date, setDate] = useState<Date>(new Date());
  const [paidBy, setPaidBy] = useState('');
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('equal');
  const [participants, setParticipants] = useState<Record<string, boolean>>({});
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [percentages, setPercentages] = useState<Record<string, string>>({});
  const [receipt, setReceipt] = useState<File | null>(null);
  const { toast } = useToast();

  const handleDescriptionChange = async (value: string) => {
    setDescription(value);
    
    // Auto-categorize when description is meaningful and category isn't already set
    if (value.length > 3 && category === 'food') {
      const suggestedCategory = await categorizeExpense(value, parseFloat(amount));
      if (suggestedCategory && suggestedCategory !== 'other') {
        setCategory(suggestedCategory);
        toast({
          title: 'AI Suggestion',
          description: `Categorized as "${suggestedCategory}". You can change it if needed.`,
        });
      }
    }
  };

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setCategory('food');
    setDate(new Date());
    setPaidBy('');
    setSplitMethod('equal');
    setParticipants({});
    setCustomAmounts({});
    setPercentages({});
    setReceipt(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description || !paidBy) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const selectedParticipants = Object.keys(participants).filter(id => participants[id]);
      
      if (selectedParticipants.length === 0) {
        toast({
          title: "No participants",
          description: "Please select at least one participant",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      let receiptUrl = null;
      if (receipt) {
        const fileExt = receipt.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(`${crypto.randomUUID()}/${fileName}`, receipt);
        
        if (uploadError) throw uploadError;
        receiptUrl = fileName;
      }

      // Create expense
      const { data: expense, error: expenseError } = await supabase
        .from('expenses')
        .insert({
          amount: parseFloat(amount),
          description,
          category,
          expense_date: format(date, 'yyyy-MM-dd'),
          paid_by: paidBy,
          group_id: groupId,
          split_method: splitMethod,
          receipt_url: receiptUrl,
        })
        .select()
        .single();

      if (expenseError) throw expenseError;

      // Calculate participant amounts based on split method
      const totalAmount = parseFloat(amount);
      const participantData = selectedParticipants.map(userId => {
        let amountOwed = 0;
        
        if (splitMethod === 'equal') {
          amountOwed = totalAmount / selectedParticipants.length;
        } else if (splitMethod === 'custom') {
          amountOwed = parseFloat(customAmounts[userId] || '0');
        } else if (splitMethod === 'percentage') {
          const percentage = parseFloat(percentages[userId] || '0');
          amountOwed = (totalAmount * percentage) / 100;
        }

        return {
          expense_id: expense.id,
          user_id: userId,
          amount_owed: amountOwed,
        };
      });

      // Create participant records
      const { error: participantError } = await supabase
        .from('expense_participants')
        .insert(participantData);

      if (participantError) throw participantError;

      toast({
        title: "Expense added",
        description: "Your expense has been successfully added",
      });

      resetForm();
      setOpen(false);
      onExpenseAdded();
    } catch (error) {
      console.error('Error adding expense:', error);
      toast({
        title: "Error",
        description: "Failed to add expense. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const CategoryIcon = getCategoryIcon(EXPENSE_CATEGORIES.find(cat => cat.id === category)?.icon || 'HelpCircle');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Expense
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Expense</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <CategoryIcon className="h-4 w-4" />
                      {EXPENSE_CATEGORIES.find(cat => cat.id === category)?.name}
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((cat) => {
                    const Icon = getCategoryIcon(cat.icon);
                    return (
                      <SelectItem key={cat.id} value={cat.id}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {cat.name}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="What was this expense for?"
              value={description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              disabled={categorizingLoading}
              required
            />
            {categorizingLoading && (
              <p className="text-xs text-muted-foreground">AI is suggesting a category...</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(date) => date && setDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paidBy">Paid by *</Label>
              <Select value={paidBy} onValueChange={setPaidBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Who paid?" />
                </SelectTrigger>
                <SelectContent>
                  {groupMembers.map((member) => (
                    <SelectItem key={member.user_id} value={member.user_id}>
                      {member.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <Label>Split Method</Label>
            <RadioGroup value={splitMethod} onValueChange={(value) => setSplitMethod(value as SplitMethod)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="equal" id="equal" />
                <Label htmlFor="equal">Split equally</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="percentage" id="percentage" />
                <Label htmlFor="percentage">Split by percentage</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom">Custom amounts</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label>Participants</Label>
            {groupMembers.map((member) => (
              <div key={member.user_id} className="flex items-center gap-3 p-3 border rounded-lg">
                <input
                  type="checkbox"
                  checked={participants[member.user_id] || false}
                  onChange={(e) => setParticipants(prev => ({
                    ...prev,
                    [member.user_id]: e.target.checked
                  }))}
                  className="h-4 w-4"
                />
                <span className="flex-1">{member.display_name}</span>
                {participants[member.user_id] && splitMethod === 'custom' && (
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Amount"
                    className="w-24"
                    value={customAmounts[member.user_id] || ''}
                    onChange={(e) => setCustomAmounts(prev => ({
                      ...prev,
                      [member.user_id]: e.target.value
                    }))}
                  />
                )}
                {participants[member.user_id] && splitMethod === 'percentage' && (
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      className="w-20"
                      value={percentages[member.user_id] || ''}
                      onChange={(e) => setPercentages(prev => ({
                        ...prev,
                        [member.user_id]: e.target.value
                      }))}
                    />
                    <span>%</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Receipt (optional)</Label>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
              {receipt ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm">{receipt.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setReceipt(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div>
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setReceipt(e.target.files?.[0] || null)}
                    className="hidden"
                    id="receipt-upload"
                  />
                  <Label htmlFor="receipt-upload" className="cursor-pointer text-primary hover:underline">
                    Click to upload receipt
                  </Label>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Adding...' : 'Add Expense'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};