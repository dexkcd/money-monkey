import React, { useState, useEffect, useCallback } from 'react';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon, 
  PencilIcon, 
  TrashIcon,
  ChevronUpDownIcon,
  ChevronUpIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import { Expense } from '../../types';
import { expenseApi, ExpenseFilters } from '../../services/expenseApi';
import { useCategories } from '../../contexts/CategoriesContext';

interface ExpenseListProps {
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (expense: Expense) => void;
  refreshTrigger?: number;
}

interface SortConfig {
  field: 'expense_date' | 'amount' | 'created_at' | 'description';
  direction: 'asc' | 'desc';
}

const ExpenseList: React.FC<ExpenseListProps> = ({
  onEditExpense,
  onDeleteExpense,
  refreshTrigger = 0,
}) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { categories } = useCategories();
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Sorting
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'expense_date',
    direction: 'desc'
  });

  const loadExpenses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const filters: ExpenseFilters = {
        sort_by: sortConfig.field,
        sort_order: sortConfig.direction,
      };

      if (searchTerm.trim()) {
        filters.search = searchTerm.trim();
      }
      if (selectedCategory) {
        filters.category_id = selectedCategory;
      }
      if (startDate) {
        filters.start_date = startDate;
      }
      if (endDate) {
        filters.end_date = endDate;
      }
      if (minAmount) {
        filters.min_amount = parseFloat(minAmount);
      }
      if (maxAmount) {
        filters.max_amount = parseFloat(maxAmount);
      }

      const expensesData = await expenseApi.getExpenses(filters);
      setExpenses(expensesData);
    } catch (err) {
      console.error('Error loading expenses:', err);
      setError('Failed to load expenses. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedCategory, startDate, endDate, minAmount, maxAmount, sortConfig]);

  // Load expenses when filters change or refresh is triggered
  useEffect(() => {
    loadExpenses();
  }, [loadExpenses, refreshTrigger]);

  const handleSort = (field: SortConfig['field']) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory(null);
    setStartDate('');
    setEndDate('');
    setMinAmount('');
    setMaxAmount('');
  };

  const getCategoryName = (categoryId: number) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'Unknown';
  };

  const getCategoryColor = (categoryId: number) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.color || '#6B7280';
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const SortIcon: React.FC<{ field: string }> = ({ field }) => {
    if (sortConfig.field !== field) {
      return <ChevronUpDownIcon className="h-4 w-4" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ChevronUpIcon className="h-4 w-4" />
      : <ChevronDownIcon className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="text-center py-12">
            <div className="text-red-600 mb-4">{error}</div>
            <button
              onClick={loadExpenses}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      {/* Search and Filter Controls */}
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div className="flex-1 min-w-0">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search expenses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <FunnelIcon className="h-4 w-4 mr-2" />
              Filters
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <select
                value={selectedCategory || ''}
                onChange={(e) => setSelectedCategory(e.target.value ? parseInt(e.target.value) : null)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div className="flex space-x-2">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700">Min Amount</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="$0.00"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700">Max Amount</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="$999.99"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div className="sm:col-span-2 lg:col-span-4">
              <button
                onClick={clearFilters}
                className="text-sm text-indigo-600 hover:text-indigo-500"
              >
                Clear all filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Expense List */}
      <div className="overflow-hidden">
        {expenses.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No expenses found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || selectedCategory || startDate || endDate || minAmount || maxAmount
                ? 'Try adjusting your filters or search terms.'
                : 'Upload a receipt or add an expense manually to get started.'
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('expense_date')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Date</span>
                      <SortIcon field="expense_date" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('description')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Description</span>
                      <SortIcon field="description" />
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('amount')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Amount</span>
                      <SortIcon field="amount" />
                    </div>
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(expense.expense_date)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="max-w-xs truncate">
                        {expense.description || 'No description'}
                      </div>
                      {expense.receipt_url && (
                        <div className="text-xs text-gray-500 mt-1">
                          📎 Receipt attached
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: getCategoryColor(expense.category_id) }}
                      >
                        {getCategoryName(expense.category_id)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatAmount(expense.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => onEditExpense(expense)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Edit expense"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDeleteExpense(expense)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete expense"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpenseList;