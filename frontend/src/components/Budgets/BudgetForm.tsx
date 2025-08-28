import React, { useState, useEffect } from 'react';
import { useCategories } from '../../contexts/CategoriesContext';
import { budgetApi, BudgetCreate, BudgetPeriodGeneration } from '../../services/budgetApi';

interface BudgetFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const BudgetForm: React.FC<BudgetFormProps> = ({ onSuccess, onCancel }) => {
  const { categories } = useCategories();
  const [formData, setFormData] = useState<BudgetCreate>({
    category_id: 0,
    amount: 0,
    period_type: 'MONTHLY',
    start_date: '',
    end_date: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedPeriods, setGeneratedPeriods] = useState<BudgetPeriodGeneration[]>([]);
  const [selectedPeriodIndex, setSelectedPeriodIndex] = useState(0);
  const [useCustomDates, setUseCustomDates] = useState(false);

  // Generate periods when period type or custom dates toggle changes
  useEffect(() => {
    if (!useCustomDates) {
      generatePeriods();
    }
  }, [formData.period_type, useCustomDates]);

  // Set dates when period selection changes
  useEffect(() => {
    if (!useCustomDates && generatedPeriods.length > 0 && generatedPeriods[selectedPeriodIndex]) {
      const period = generatedPeriods[selectedPeriodIndex];
      setFormData(prev => ({
        ...prev,
        start_date: period.start_date,
        end_date: period.end_date,
      }));
    }
  }, [selectedPeriodIndex, generatedPeriods, useCustomDates]);

  const generatePeriods = async () => {
    try {
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      
      const periods = await budgetApi.generateBudgetPeriods({
        period_type: formData.period_type,
        start_date: startDate.toISOString().split('T')[0],
        num_periods: 6,
      });
      
      setGeneratedPeriods(periods);
      setSelectedPeriodIndex(0);
    } catch (err) {
      console.error('Failed to generate periods:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await budgetApi.createBudget(formData);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create budget');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'category_id' || name === 'amount' ? Number(value) : value,
    }));
  };

  const formatPeriodLabel = (period: BudgetPeriodGeneration) => {
    const startDate = new Date(period.start_date);
    const endDate = new Date(period.end_date);
    
    if (formData.period_type === 'MONTHLY') {
      return startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else {
      return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Budget</h3>
          
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Category Selection */}
            <div>
              <label htmlFor="category_id" className="block text-sm font-medium text-gray-700">
                Category
              </label>
              <select
                id="category_id"
                name="category_id"
                value={formData.category_id}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value={0}>Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Budget Amount */}
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                Budget Amount ($)
              </label>
              <input
                type="number"
                id="amount"
                name="amount"
                value={formData.amount || ''}
                onChange={handleInputChange}
                min="0.01"
                step="0.01"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="0.00"
              />
            </div>

            {/* Period Type */}
            <div>
              <label htmlFor="period_type" className="block text-sm font-medium text-gray-700">
                Period Type
              </label>
              <select
                id="period_type"
                name="period_type"
                value={formData.period_type}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="MONTHLY">Monthly</option>
                <option value="WEEKLY">Weekly</option>
              </select>
            </div>

            {/* Custom Dates Toggle */}
            <div className="flex items-center">
              <input
                id="useCustomDates"
                type="checkbox"
                checked={useCustomDates}
                onChange={(e) => setUseCustomDates(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="useCustomDates" className="ml-2 block text-sm text-gray-900">
                Use custom date range
              </label>
            </div>

            {/* Period Selection or Custom Dates */}
            {!useCustomDates && generatedPeriods.length > 0 ? (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Select Period
                </label>
                <select
                  value={selectedPeriodIndex}
                  onChange={(e) => setSelectedPeriodIndex(Number(e.target.value))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {generatedPeriods.map((period, index) => (
                    <option key={index} value={index}>
                      {formatPeriodLabel(period)}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="start_date" className="block text-sm font-medium text-gray-700">
                    Start Date
                  </label>
                  <input
                    type="date"
                    id="start_date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="end_date" className="block text-sm font-medium text-gray-700">
                    End Date
                  </label>
                  <input
                    type="date"
                    id="end_date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || formData.category_id === 0}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Budget'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BudgetForm;