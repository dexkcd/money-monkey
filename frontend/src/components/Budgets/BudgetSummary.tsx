import React from 'react';
import { BudgetSummary as BudgetSummaryType } from '../../services/budgetApi';

interface BudgetSummaryProps {
  summary: BudgetSummaryType;
}

const BudgetSummary: React.FC<BudgetSummaryProps> = ({ summary }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const spendingPercentage = summary.total_budget_amount > 0 
    ? (summary.total_spending / summary.total_budget_amount) * 100 
    : 0;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Budget Overview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Total Budgets */}
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{summary.total_budgets}</div>
          <div className="text-sm text-gray-500">Active Budgets</div>
        </div>

        {/* Total Budget Amount */}
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {formatCurrency(summary.total_budget_amount)}
          </div>
          <div className="text-sm text-gray-500">Total Budget</div>
        </div>

        {/* Total Spending */}
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">
            {formatCurrency(summary.total_spending)}
          </div>
          <div className="text-sm text-gray-500">Total Spent</div>
        </div>

        {/* Remaining Amount */}
        <div className="text-center">
          <div className={`text-2xl font-bold ${
            summary.total_remaining < 0 ? 'text-red-600' : 'text-green-600'
          }`}>
            {formatCurrency(Math.abs(summary.total_remaining))}
            {summary.total_remaining < 0 && ' over'}
          </div>
          <div className="text-sm text-gray-500">
            {summary.total_remaining < 0 ? 'Over Budget' : 'Remaining'}
          </div>
        </div>
      </div>

      {/* Overall Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Overall Spending Progress</span>
          <span>{spendingPercentage.toFixed(1)}%</span>
        </div>
        <div className={`w-full rounded-full h-3 ${
          spendingPercentage >= 100 ? 'bg-red-100' :
          spendingPercentage >= 80 ? 'bg-yellow-100' :
          'bg-green-100'
        }`}>
          <div
            className={`h-3 rounded-full transition-all duration-300 ${
              spendingPercentage >= 100 ? 'bg-red-500' :
              spendingPercentage >= 80 ? 'bg-yellow-500' :
              'bg-green-500'
            }`}
            style={{ width: `${Math.min(spendingPercentage, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* Alert Summary */}
      {(summary.budgets_over_limit > 0 || summary.budgets_near_limit > 0) && (
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Alerts</h3>
          <div className="flex space-x-4 text-sm">
            {summary.budgets_over_limit > 0 && (
              <div className="flex items-center text-red-600">
                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                {summary.budgets_over_limit} over budget
              </div>
            )}
            {summary.budgets_near_limit > 0 && (
              <div className="flex items-center text-yellow-600">
                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {summary.budgets_near_limit} near limit
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetSummary;