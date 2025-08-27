import React, { useState, useEffect, useCallback } from 'react';
import { XMarkIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { Expense } from '../../types';
import { expenseApi, ExpenseCreateRequest, ExpenseUpdateRequest } from '../../services/expenseApi';
import { useCategories } from '../../contexts/CategoriesContext';

interface ExpenseFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expense: Expense) => void;
  expense?: Expense | null; // null for create, Expense for edit
  initialData?: {
    amount?: number;
    description?: string;
    category?: string;
    date?: string;
  };
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({
  isOpen,
  onClose,
  onSave,
  expense = null,
  initialData,
}) => {
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    category_id: '',
    expense_date: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestingCategory, setSuggestingCategory] = useState(false);
  const { categories } = useCategories();

  const isEditing = expense !== null;

  // Initialize form data when modal opens or expense changes
  useEffect(() => {
    if (isOpen) {
      if (isEditing && expense) {
        // Editing existing expense
        setFormData({
          amount: expense.amount.toString(),
          description: expense.description || '',
          category_id: expense.category_id.toString(),
          expense_date: expense.expense_date,
        });
      } else if (initialData && categories.length > 0) {
        // Creating from initial data (e.g., from receipt processing)
        const suggestedCategory = categories.find(c => 
          c.name.toLowerCase() === initialData.category?.toLowerCase()
        );
        
        setFormData({
          amount: initialData.amount?.toString() || '',
          description: initialData.description || '',
          category_id: suggestedCategory?.id.toString() || '',
          expense_date: initialData.date || new Date().toISOString().split('T')[0],
        });
      } else {
        // Creating new expense
        setFormData({
          amount: '',
          description: '',
          category_id: '',
          expense_date: new Date().toISOString().split('T')[0],
        });
      }
      
      setError(null);
    }
  }, [isOpen, expense, initialData, isEditing]); // Removed categories from dependencies

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const suggestCategory = async () => {
    if (!formData.description.trim()) return;
    
    try {
      setSuggestingCategory(true);
      const amount = formData.amount ? parseFloat(formData.amount) : undefined;
      const suggestion = await expenseApi.suggestCategory(formData.description, amount);
      
      // Find matching category
      const matchingCategory = categories.find(c => 
        c.name.toLowerCase() === suggestion.suggested_category.toLowerCase()
      );
      
      if (matchingCategory) {
        setFormData(prev => ({
          ...prev,
          category_id: matchingCategory.id.toString()
        }));
      }
    } catch (err) {
      console.error('Error suggesting category:', err);
    } finally {
      setSuggestingCategory(false);
    }
  };

  const validateForm = (): string | null => {
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      return 'Please enter a valid amount';
    }
    if (!formData.category_id) {
      return 'Please select a category';
    }
    if (!formData.expense_date) {
      return 'Please select a date';
    }
    
    const expenseDate = new Date(formData.expense_date);
    const today = new Date();
    if (expenseDate > today) {
      return 'Expense date cannot be in the future';
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const expenseData = {
        amount: parseFloat(formData.amount),
        description: formData.description.trim() || undefined,
        category_id: parseInt(formData.category_id),
        expense_date: formData.expense_date,
      };

      let savedExpense: Expense;
      
      if (isEditing && expense) {
        // Update existing expense
        const updateData: ExpenseUpdateRequest = expenseData;
        savedExpense = await expenseApi.updateExpense(expense.id, updateData);
      } else {
        // Create new expense - explicitly use the regular createExpense method
        const createData: ExpenseCreateRequest = {
          amount: expenseData.amount,
          description: expenseData.description,
          category_id: expenseData.category_id,
          expense_date: expenseData.expense_date,
        };
        savedExpense = await expenseApi.createExpense(createData, false); // false = no auto-categorize
      }

      onSave(savedExpense);
      onClose();
    } catch (err: any) {
      console.error('Error saving expense:', err);
      // Provide more detailed error information
      let errorMessage = 'Failed to save expense. Please try again.';
      
      if (err.response?.data?.detail) {
        if (Array.isArray(err.response.data.detail)) {
          // Handle validation errors
          const validationErrors = err.response.data.detail.map((error: any) => 
            `${error.loc?.join('.')} - ${error.msg}`
          ).join(', ');
          errorMessage = `Validation error: ${validationErrors}`;
        } else {
          errorMessage = err.response.data.detail;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {isEditing ? 'Edit Expense' : 'Add Expense'}
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="text-sm text-red-600">{error}</div>
                </div>
              )}

              <div className="space-y-4">
                {/* Amount */}
                <div>
                  <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                    Amount *
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      type="number"
                      id="amount"
                      step="0.01"
                      min="0"
                      required
                      value={formData.amount}
                      onChange={(e) => handleInputChange('amount', e.target.value)}
                      className="block w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <input
                      type="text"
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      className="flex-1 block w-full border border-gray-300 rounded-l-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 px-3 py-2"
                      placeholder="Enter expense description..."
                    />
                    <button
                      type="button"
                      onClick={suggestCategory}
                      disabled={!formData.description.trim() || suggestingCategory}
                      className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Suggest category using AI"
                    >
                      <SparklesIcon className={`h-4 w-4 ${suggestingCategory ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Click the sparkle icon to get AI-powered category suggestions
                  </p>
                </div>

                {/* Category */}
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                    Category *
                  </label>
                  <select
                    id="category"
                    required
                    value={formData.category_id}
                    onChange={(e) => handleInputChange('category_id', e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  >
                    <option value="">Select a category</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div>
                  <label htmlFor="expense_date" className="block text-sm font-medium text-gray-700">
                    Date *
                  </label>
                  <input
                    type="date"
                    id="expense_date"
                    required
                    value={formData.expense_date}
                    onChange={(e) => handleInputChange('expense_date', e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm px-3 py-2"
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : (isEditing ? 'Update Expense' : 'Add Expense')}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ExpenseForm;