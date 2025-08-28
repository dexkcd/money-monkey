import api from './api';

export interface BudgetPeriod {
  WEEKLY: 'WEEKLY';
  MONTHLY: 'MONTHLY';
}

export interface BudgetCreate {
  category_id: number;
  amount: number;
  period_type: 'WEEKLY' | 'MONTHLY';
  start_date: string;
  end_date: string;
}

export interface BudgetUpdate {
  category_id?: number;
  amount?: number;
  period_type?: 'WEEKLY' | 'MONTHLY';
  start_date?: string;
  end_date?: string;
}

export interface BudgetResponse {
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
  category?: {
    id: number;
    name: string;
    color: string;
    is_default: boolean;
  };
}

export interface BudgetSummary {
  total_budgets: number;
  total_budget_amount: number;
  total_spending: number;
  total_remaining: number;
  budgets_over_limit: number;
  budgets_near_limit: number;
}

export interface SpendingAggregation {
  category_id: number;
  category_name: string;
  total_spending: number;
  budget_amount?: number;
  remaining_amount?: number;
  percentage_used?: number;
  is_over_budget: boolean;
  is_near_limit: boolean;
}

export interface BudgetPeriodGeneration {
  start_date: string;
  end_date: string;
}

export const budgetApi = {
  // Create a new budget
  createBudget: async (budgetData: BudgetCreate): Promise<BudgetResponse> => {
    const response = await api.post('/budgets/', budgetData);
    return response.data;
  },

  // Get all budgets with optional filters
  getBudgets: async (params?: {
    category_id?: number;
    period_type?: 'WEEKLY' | 'MONTHLY';
    active_only?: boolean;
  }): Promise<BudgetResponse[]> => {
    const response = await api.get('/budgets/', { params });
    return response.data;
  },

  // Get budget summary
  getBudgetSummary: async (): Promise<BudgetSummary> => {
    const response = await api.get('/budgets/summary');
    return response.data;
  },

  // Get spending aggregation
  getSpendingAggregation: async (params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<SpendingAggregation[]> => {
    const response = await api.get('/budgets/spending-aggregation', { params });
    return response.data;
  },

  // Get budget alerts
  getBudgetAlerts: async () => {
    const response = await api.get('/budgets/alerts');
    return response.data;
  },

  // Generate budget periods
  generateBudgetPeriods: async (params: {
    period_type: 'WEEKLY' | 'MONTHLY';
    start_date: string;
    num_periods?: number;
  }): Promise<BudgetPeriodGeneration[]> => {
    const response = await api.get('/budgets/periods', { params });
    return response.data;
  },

  // Get specific budget
  getBudget: async (budgetId: number): Promise<BudgetResponse> => {
    const response = await api.get(`/budgets/${budgetId}`);
    return response.data;
  },

  // Update budget
  updateBudget: async (budgetId: number, budgetData: BudgetUpdate): Promise<BudgetResponse> => {
    const response = await api.put(`/budgets/${budgetId}`, budgetData);
    return response.data;
  },

  // Delete budget
  deleteBudget: async (budgetId: number): Promise<void> => {
    await api.delete(`/budgets/${budgetId}`);
  },
};