import api from './api';
import { Expense, Category, ApiResponse } from '../types';

export interface ExpenseFilters {
  skip?: number;
  limit?: number;
  category_id?: number;
  start_date?: string;
  end_date?: string;
  min_amount?: number;
  max_amount?: number;
  search?: string;
  sort_by?: 'expense_date' | 'amount' | 'created_at' | 'description';
  sort_order?: 'asc' | 'desc';
}

export interface ExpenseCreateRequest {
  amount: number;
  description?: string;
  category_id: number;
  expense_date: string;
}

export interface ExpenseUpdateRequest {
  amount?: number;
  description?: string;
  category_id?: number;
  expense_date?: string;
}

export interface FileUploadResponse {
  filename: string;
  file_url: string;
  file_size: number;
  content_type: string;
  processing_result?: {
    raw_text: string;
    extracted_amount?: number;
    extracted_date?: string;
    extracted_merchant?: string;
    suggested_category: string;
    confidence_score: number;
  };
}

export interface CategorySuggestionResponse {
  suggested_category: string;
}

// Expense API functions
export const expenseApi = {
  // Get expenses with filtering and sorting
  getExpenses: async (filters: ExpenseFilters = {}): Promise<Expense[]> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
    
    const response = await api.get(`/expenses?${params.toString()}`);
    return response.data;
  },

  // Get single expense
  getExpense: async (id: number): Promise<Expense> => {
    const response = await api.get(`/expenses/${id}`);
    return response.data;
  },

  // Create expense
  createExpense: async (expense: ExpenseCreateRequest, autoCategorize = false): Promise<Expense> => {
    const params = autoCategorize ? '?auto_categorize=true' : '';
    const url = `/expenses${params}`;
    
    // Debug logging
    console.log('Creating expense with URL:', url);
    console.log('Expense data:', expense);
    
    const response = await api.post(url, expense, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  },

  // Update expense
  updateExpense: async (id: number, expense: ExpenseUpdateRequest, autoCategorize = false): Promise<Expense> => {
    const params = autoCategorize ? '?auto_categorize=true' : '';
    const response = await api.put(`/expenses/${id}${params}`, expense);
    return response.data;
  },

  // Delete expense
  deleteExpense: async (id: number): Promise<void> => {
    await api.delete(`/expenses/${id}`);
  },

  // Upload receipt
  uploadReceipt: async (file: File): Promise<FileUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/expenses/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Create expense from receipt
  createExpenseFromReceipt: async (receiptData: {
    file_url: string;
    extracted_amount?: number;
    extracted_date?: string;
    extracted_merchant?: string;
    suggested_category: string;
    confidence_score: number;
  }): Promise<Expense> => {
    const formData = new FormData();
    Object.entries(receiptData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });
    
    const url = '/expenses/from-receipt';
    
    // Debug logging
    console.log('Creating expense from receipt with URL:', url);
    console.log('Receipt data:', receiptData);
    
    const response = await api.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Get category suggestion
  suggestCategory: async (description: string, amount?: number): Promise<CategorySuggestionResponse> => {
    const formData = new FormData();
    formData.append('description', description);
    if (amount !== undefined) {
      formData.append('amount', amount.toString());
    }
    
    const response = await api.post('/expenses/categorize', formData);
    return response.data;
  },

  // Get expense statistics
  getExpenseStats: async (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    const response = await api.get(`/expenses/stats?${params.toString()}`);
    return response.data;
  },
};

// Category API functions
export const categoryApi = {
  // Get all categories
  getCategories: async (): Promise<Category[]> => {
    const response = await api.get('/categories/');
    return response.data.categories;
  },

  // Get single category
  getCategory: async (id: number): Promise<Category> => {
    const response = await api.get(`/categories/${id}`);
    return response.data;
  },

  // Create category
  createCategory: async (category: { name: string; color?: string }): Promise<Category> => {
    const response = await api.post('/categories/', category);
    return response.data;
  },

  // Update category
  updateCategory: async (id: number, category: { name?: string; color?: string }): Promise<Category> => {
    const response = await api.put(`/categories/${id}`, category);
    return response.data;
  },

  // Delete category
  deleteCategory: async (id: number): Promise<void> => {
    await api.delete(`/categories/${id}`);
  },

  // Get default categories
  getDefaultCategories: async (): Promise<Category[]> => {
    const response = await api.get('/categories/default/list');
    return response.data;
  },

  // Get user categories
  getUserCategories: async (): Promise<Category[]> => {
    const response = await api.get('/categories/user/list');
    return response.data;
  },
};