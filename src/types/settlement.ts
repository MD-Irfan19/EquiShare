export interface Balance {
  userId: string;
  amount: number;
  display_name?: string;
  email?: string;
}

export interface Settlement {
  from: string;
  to: string;
  amount: number;
  fromName?: string;
  toName?: string;
}

export interface SettlementRecord {
  id: string;
  group_id: string;
  from_user_id: string;
  to_user_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'settled';
  settled_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}