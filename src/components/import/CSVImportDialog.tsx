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
import { Upload, Download, FileText, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CSVImportDialogProps {
  groupId: string;
  groupMembers: Array<{ user_id: string; display_name: string; email?: string }>;
  onImportComplete: () => void;
}

export const CSVImportDialog = ({ groupId, groupMembers, onImportComplete }: CSVImportDialogProps) => {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const { toast } = useToast();

  const downloadTemplate = () => {
    const template = [
      ['date', 'description', 'amount', 'category', 'paid_by_email', 'split_method'],
      ['2024-01-15', 'Grocery shopping', '45.50', 'food', 'user@example.com', 'equal'],
      ['2024-01-16', 'Uber ride', '18.25', 'transport', 'user@example.com', 'equal'],
      ['2024-01-17', 'Restaurant dinner', '89.00', 'food', 'user@example.com', 'equal'],
    ];

    const csvContent = template.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'expense-import-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      toast({
        title: "Invalid file",
        description: "Please select a CSV file",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
    
    // Preview the file
    const reader = new FileReader();
    reader.onload = (event) => {
      const csv = event.target?.result as string;
      const lines = csv.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim());
      const rows = lines.slice(1, 6).map(line => {
        const values = line.split(',').map(v => v.trim());
        return headers.reduce((obj, header, index) => ({
          ...obj,
          [header]: values[index] || ''
        }), {});
      });
      setPreview(rows);
    };
    reader.readAsText(selectedFile);
  };

  const handleImport = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a CSV file to import",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const csv = event.target?.result as string;
        const lines = csv.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim());
        
        // Validate headers
        const requiredHeaders = ['date', 'description', 'amount', 'category', 'paid_by_email'];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        
        if (missingHeaders.length > 0) {
          toast({
            title: "Invalid CSV format",
            description: `Missing required columns: ${missingHeaders.join(', ')}`,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        const expenses = [];
        const participants = [];
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          const row = headers.reduce((obj, header, index) => ({
            ...obj,
            [header]: values[index] || ''
          }), {} as any);

          // Find user by email
          const paidByMember = groupMembers.find(m => m.email === row.paid_by_email);
          if (!paidByMember) {
            toast({
              title: "Invalid email",
              description: `Email ${row.paid_by_email} not found in group members`,
              variant: "destructive",
            });
            setLoading(false);
            return;
          }

          const expenseId = crypto.randomUUID();
          
          expenses.push({
            id: expenseId,
            amount: parseFloat(row.amount),
            description: row.description,
            category: row.category || 'other',
            expense_date: row.date,
            paid_by: paidByMember.user_id,
            group_id: groupId,
            split_method: row.split_method || 'equal',
          });

          // Add all group members as participants for equal split
          const splitAmount = parseFloat(row.amount) / groupMembers.length;
          groupMembers.forEach(member => {
            participants.push({
              expense_id: expenseId,
              user_id: member.user_id,
              amount_owed: splitAmount,
            });
          });
        }

        // Insert expenses
        const { error: expenseError } = await supabase
          .from('expenses')
          .insert(expenses);

        if (expenseError) throw expenseError;

        // Insert participants
        const { error: participantError } = await supabase
          .from('expense_participants')
          .insert(participants);

        if (participantError) throw participantError;

        toast({
          title: "Import successful",
          description: `Imported ${expenses.length} expenses`,
        });

        setFile(null);
        setPreview([]);
        setOpen(false);
        onImportComplete();
      };
      
      reader.readAsText(file);
    } catch (error) {
      console.error('Error importing CSV:', error);
      toast({
        title: "Import failed",
        description: "There was an error importing your expenses. Please check the format and try again.",
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
          <Upload className="h-4 w-4" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Import Expenses from CSV
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Your CSV file must include these columns: date, description, amount, category, paid_by_email, split_method (optional)
            </AlertDescription>
          </Alert>

          <div className="flex gap-3">
            <Button variant="outline" onClick={downloadTemplate} className="gap-2">
              <Download className="h-4 w-4" />
              Download Template
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="csv-file">Select CSV File</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
            />
          </div>

          {preview.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium">Preview (first 5 rows)</h3>
              <div className="border rounded-md overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        {Object.keys(preview[0]).map(header => (
                          <th key={header} className="px-3 py-2 text-left font-medium">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, index) => (
                        <tr key={index} className="border-t">
                          {Object.values(row).map((value: any, cellIndex) => (
                            <td key={cellIndex} className="px-3 py-2">
                              {value}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={!file || loading} 
              className="flex-1"
            >
              {loading ? 'Importing...' : 'Import Expenses'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};