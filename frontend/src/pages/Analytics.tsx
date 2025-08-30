import React, { useState, useEffect } from 'react';
import { analyticsApi, SpendingByCategory, SpendingTrend, AIRecommendation, RecommendationResponse } from '../services/analyticsApi';
import SpendingByCategoryChart from '../components/Analytics/SpendingByCategoryChart';
import MonthlyTrendsChart from '../components/Analytics/MonthlyTrendsChart';
import AIRecommendations from '../components/Analytics/AIRecommendations';

const Analytics: React.FC = () => {
  const [categoryData, setCategoryData] = useState<SpendingByCategory[]>([]);
  const [trendsData, setTrendsData] = useState<SpendingTrend[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationResponse | null>(null);
  const [loading, setLoading] = useState({
    categories: true,
    trends: true,
    recommendations: true
  });
  const [error, setError] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area'>('line');
  const [categoryChartType, setCategoryChartType] = useState<'pie' | 'bar'>('pie');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    try {
      setError(null);
      
      // Load spending by category
      setLoading(prev => ({ ...prev, categories: true }));
      const categories = await analyticsApi.getSpendingByCategory(
        dateRange.startDate || undefined,
        dateRange.endDate || undefined
      );
      setCategoryData(categories);
      setLoading(prev => ({ ...prev, categories: false }));

      // Load spending trends
      setLoading(prev => ({ ...prev, trends: true }));
      const analytics = await analyticsApi.getSpendingAnalytics(
        dateRange.startDate || undefined,
        dateRange.endDate || undefined
      );
      setTrendsData(analytics.monthly_trends);
      setLoading(prev => ({ ...prev, trends: false }));

      // Load AI recommendations
      setLoading(prev => ({ ...prev, recommendations: true }));
      const recommendationsData = await analyticsApi.getAIRecommendations(3);
      setRecommendations(recommendationsData);
      setLoading(prev => ({ ...prev, recommendations: false }));

    } catch (err: any) {
      console.error('Failed to load analytics data:', err);
      setError(err.response?.data?.detail || 'Failed to load analytics data');
      setLoading({
        categories: false,
        trends: false,
        recommendations: false
      });
    }
  };

  const handleDateRangeChange = (field: 'startDate' | 'endDate', value: string) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const applyDateFilter = () => {
    loadAnalyticsData();
  };

  const clearDateFilter = () => {
    setDateRange({ startDate: '', endDate: '' });
    setTimeout(() => {
      loadAnalyticsData();
    }, 100);
  };

  const totalSpending = categoryData.reduce((sum, category) => sum + Number(category.total_amount || 0), 0);
  const totalTransactions = categoryData.reduce((sum, category) => sum + Number(category.expense_count || 0), 0);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="mt-2 text-sm text-gray-700">
          View your spending insights and trends
        </p>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Filter by Date Range
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div>
              <label htmlFor="start-date" className="block text-sm font-medium text-gray-700">
                Start Date
              </label>
              <input
                type="date"
                id="start-date"
                value={dateRange.startDate}
                onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="end-date" className="block text-sm font-medium text-gray-700">
                End Date
              </label>
              <input
                type="date"
                id="end-date"
                value={dateRange.endDate}
                onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={applyDateFilter}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Apply Filter
              </button>
            </div>
            <div className="flex items-end">
              <button
                onClick={clearDateFilter}
                className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Clear Filter
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Spending</dt>
                  <dd className="text-lg font-medium text-gray-900">${Number(totalSpending).toFixed(2)}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Transactions</dt>
                  <dd className="text-lg font-medium text-gray-900">{totalTransactions}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Average Transaction</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    ${totalTransactions > 0 ? (Number(totalSpending) / Number(totalTransactions)).toFixed(2) : '0.00'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div className="flex">
            <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading analytics</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Spending by Category */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Spending by Category
              </h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCategoryChartType('pie')}
                  className={`px-3 py-1 text-sm rounded-md ${
                    categoryChartType === 'pie'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Pie
                </button>
                <button
                  onClick={() => setCategoryChartType('bar')}
                  className={`px-3 py-1 text-sm rounded-md ${
                    categoryChartType === 'bar'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Bar
                </button>
              </div>
            </div>
            <SpendingByCategoryChart 
              data={categoryData} 
              loading={loading.categories} 
              chartType={categoryChartType}
            />
          </div>
        </div>

        {/* Monthly Trends */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Monthly Trends
              </h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => setChartType('line')}
                  className={`px-3 py-1 text-sm rounded-md ${
                    chartType === 'line'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Line
                </button>
                <button
                  onClick={() => setChartType('area')}
                  className={`px-3 py-1 text-sm rounded-md ${
                    chartType === 'area'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Area
                </button>
                <button
                  onClick={() => setChartType('bar')}
                  className={`px-3 py-1 text-sm rounded-md ${
                    chartType === 'bar'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Bar
                </button>
              </div>
            </div>
            <MonthlyTrendsChart 
              data={trendsData} 
              loading={loading.trends} 
              chartType={chartType}
            />
          </div>
        </div>
      </div>

      {/* AI Recommendations */}
      <div className="mt-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              AI Recommendations
            </h3>
            <AIRecommendations 
              recommendations={recommendations?.recommendations || []}
              loading={loading.recommendations}
              analysisSummary={recommendations?.analysis_summary}
              generatedAt={recommendations?.generated_at}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;