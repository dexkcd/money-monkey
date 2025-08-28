// Common type definitions for the application

export interface User {
  id: number;
  email: string;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  color: string;
  is_default: boolean;
  user_id?: number;
}

export interface Expense {
  id: number;
  user_id: number;
  amount: number;
  description: string;
  category_id: number;
  expense_date: string;
  receipt_url?: string;
  ai_confidence?: number;
  created_at: string;
  updated_at: string;
  category?: Category;
}

export interface Budget {
  id: number;
  user_id: number;
  category_id: number;
  amount: number;
  period_type: 'WEEKLY' | 'MONTHLY';
  start_date: string;
  end_date: string;
  current_spending?: number;
  remaining_amount?: number;
  percentage_used?: number;
  created_at?: string;
  category?: Category;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  detail: string;
  status_code: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}