import { 
  UtensilsCrossed, 
  Home, 
  Plane, 
  Car, 
  ShoppingBag, 
  Gamepad2, 
  Heart, 
  GraduationCap,
  Briefcase,
  Phone,
  Shirt,
  Gift,
  Coffee,
  Fuel,
  Zap,
  Droplets,
  Wifi,
  HelpCircle
} from 'lucide-react';
import { ExpenseCategory } from '@/types/expense';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { id: 'food', name: 'Food & Dining', icon: 'UtensilsCrossed', color: 'hsl(var(--primary))' },
  { id: 'rent', name: 'Rent & Housing', icon: 'Home', color: 'hsl(var(--secondary))' },
  { id: 'travel', name: 'Travel', icon: 'Plane', color: 'hsl(var(--accent))' },
  { id: 'transport', name: 'Transportation', icon: 'Car', color: 'hsl(var(--chart-1))' },
  { id: 'shopping', name: 'Shopping', icon: 'ShoppingBag', color: 'hsl(var(--chart-2))' },
  { id: 'entertainment', name: 'Entertainment', icon: 'Gamepad2', color: 'hsl(var(--chart-3))' },
  { id: 'healthcare', name: 'Healthcare', icon: 'Heart', color: 'hsl(var(--chart-4))' },
  { id: 'education', name: 'Education', icon: 'GraduationCap', color: 'hsl(var(--chart-5))' },
  { id: 'business', name: 'Business', icon: 'Briefcase', color: 'hsl(var(--primary))' },
  { id: 'phone', name: 'Phone & Internet', icon: 'Phone', color: 'hsl(var(--secondary))' },
  { id: 'clothing', name: 'Clothing', icon: 'Shirt', color: 'hsl(var(--accent))' },
  { id: 'gifts', name: 'Gifts', icon: 'Gift', color: 'hsl(var(--chart-1))' },
  { id: 'coffee', name: 'Coffee & Bars', icon: 'Coffee', color: 'hsl(var(--chart-2))' },
  { id: 'fuel', name: 'Fuel', icon: 'Fuel', color: 'hsl(var(--chart-3))' },
  { id: 'utilities', name: 'Utilities', icon: 'Zap', color: 'hsl(var(--chart-4))' },
  { id: 'water', name: 'Water', icon: 'Droplets', color: 'hsl(var(--chart-5))' },
  { id: 'internet', name: 'Internet', icon: 'Wifi', color: 'hsl(var(--primary))' },
  { id: 'other', name: 'Other', icon: 'HelpCircle', color: 'hsl(var(--muted-foreground))' },
];

export const CATEGORY_ICONS = {
  UtensilsCrossed,
  Home,
  Plane,
  Car,
  ShoppingBag,
  Gamepad2,
  Heart,
  GraduationCap,
  Briefcase,
  Phone,
  Shirt,
  Gift,
  Coffee,
  Fuel,
  Zap,
  Droplets,
  Wifi,
  HelpCircle,
};

export const getCategoryById = (id: string): ExpenseCategory => {
  return EXPENSE_CATEGORIES.find(cat => cat.id === id) || EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];
};

export const getCategoryIcon = (iconName: string) => {
  return CATEGORY_ICONS[iconName as keyof typeof CATEGORY_ICONS] || HelpCircle;
};