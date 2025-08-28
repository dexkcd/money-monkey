import React, { useState, useEffect } from 'react';
import { BudgetForm, BudgetCard, BudgetSummary, EditBudgetForm } from '../components/Budgets';
import { budgetApi, BudgetResponse, BudgetSummary as BudgetSummaryType } from '../services/budgetApi';

const Budgets: React.FC = () => {
  const [budgets, setBudgets] = useState<BudgetResponse[]>([]);
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummaryType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetResponse | null>(null);
  const [filterPeriodType, setFilterPeriodType] = useState<'ALL' | 'WEEKLY' | 'MONTHLY'>('ALL');
  const [showActiveOnly, setShowActiveOnly] = useState(true);

  useEffect(() => {
    loadBudgets();
    loadBudgetSummary();
  }, [filterPeriodType, showActiveOnly]);

  const loadBudgets = async () => {
    try {
      setLoading(true);
      const params: any = {
        active_only: showActiveOnly,
      };
      
      if (filterPeriodType !== 'ALL') {
        params.period_type = filterPeriodType;
      }

      const budgetsData = await budgetApi.getBudgets(params);
      setBudgets(budgetsData);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load budgets');
    } finally {
      setLoading(false);
    }
  };

  const loadBudgetSummary = async () => {
    try {
      const summary = await budgetApi.getBudgetSummary();
      setBudgetSummary(summary);
    } catch (err) {
      console.error('Failed to load budget summary:', err);
    }
  };

  const handleDeleteBudget = async (budgetId: number) => {
    try {
      await budgetApi.deleteBudget(budgetId);
      loadBudgets();
      loadBudgetSummary();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete budget');
    }
  };

  // Debug logging
  console.log('Budgets page state:', { 
    showCreateForm,
    budgets: budgets.length,
    loading,
    error
  });

  if (loading && budgets.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Budgets</h1>
            <p className="mt-2 text-sm text-gray-700">
              Set and manage your spending limits
            </p>
          </div>
          <button
            onClick={() => {
              console.log('Header button clicked! Current showCreateForm:', showCreateForm);
              setShowCreateForm(true);
              console.log('setShowCreateForm(true) called from header');
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create Budget
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
          <button
            onClick={() => setError(null)}
            className="float-right text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

      {/* Budget Summary */}
      {budgetSummary && budgetSummary.total_budgets > 0 && (
        <BudgetSummary summary={budgetSummary} />
      )}

      {/* Filters */}
      <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Period Type:</label>
            <select
              value={filterPeriodType}
              onChange={(e) => setFilterPeriodType(e.target.value as 'ALL' | 'WEEKLY' | 'MONTHLY')}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="ALL">All</option>
              <option value="MONTHLY">Monthly</option>
              <option value="WEEKLY">Weekly</option>
            </select>
          </div>
          
          <div className="flex items-center">
            <input
              id="activeOnly"
              type="checkbox"
              checked={showActiveOnly}
              onChange={(e) => setShowActiveOnly(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="activeOnly" className="ml-2 text-sm text-gray-700">
              Show active budgets only
            </label>
          </div>
        </div>
      </div>

      {/* Budget List */}
      {budgets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {budgets.map((budget) => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              onEdit={setEditingBudget}
              onDelete={handleDeleteBudget}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {showActiveOnly ? 'No active budgets' : 'No budgets set'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {showActiveOnly 
                  ? 'You don\'t have any active budgets for the current period.'
                  : 'Create your first budget to start tracking your spending limits.'
                }
              </p>
              <div className="mt-6">
                <button
                  onClick={() => {
                    console.log('Content button clicked! Current showCreateForm:', showCreateForm);
                    setShowCreateForm(true);
                    console.log('setShowCreateForm(true) called from content');
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create Budget
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Budget Form */}
      {showCreateForm && (
        <BudgetForm
          onSuccess={() => {
            setShowCreateForm(false);
            loadBudgets();
            loadBudgetSummary();
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* Edit Budget Form */}
      {editingBudget && (
        <EditBudgetForm
          budget={editingBudget}
          onSuccess={() => {
            setEditingBudget(null);
            loadBudgets();
            loadBudgetSummary();
          }}
          onCancel={() => setEditingBudget(null)}
        />
      )}
    </div>
  );
};

export default Budgets;