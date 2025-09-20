export interface ExpenseCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface ExpenseSplit {
  userId: string;
  amount: number;
  percentage?: number;
}

export interface Expense {
  id: string;
  amount: number;
  description: string;
  category: string;
  expense_date: string;
  paid_by: string;
  group_id: string;
  split_method: 'equal' | 'percentage' | 'custom';
  receipt_url?: string;
  created_at: string;
  updated_at: string;
}

export interface ExpenseWithParticipants extends Expense {
  participants: ExpenseSplit[];
}

export type SplitMethod = 'equal' | 'percentage' | 'custom';