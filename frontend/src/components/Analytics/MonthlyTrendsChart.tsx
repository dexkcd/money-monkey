import React from 'react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { MonthlySpending, SpendingTrend } from '../../services/analyticsApi';

// Support both MonthlySpending and SpendingTrend formats
type TrendData = MonthlySpending | SpendingTrend;

interface MonthlyTrendsChartProps {
  data: TrendData[];
  loading?: boolean;
  chartType?: 'line' | 'bar' | 'area';
}

const MonthlyTrendsChart: React.FC<MonthlyTrendsChartProps> = ({
  data,
  loading,
  chartType = 'line'
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
        <p className="mt-2 text-sm text-gray-500">
          No trend data available
        </p>
      </div>
    );
  }

  // Prepare data for charts
  const chartData = data.map(item => {
    // Handle both MonthlySpending (month/year) and SpendingTrend (period) formats
    let monthLabel: string;
    let year: number;
    let month: string;
    
    if ('period' in item) {
      // SpendingTrend format: "2024-01"
      const [yearStr, monthStr] = item.period.split('-');
      year = parseInt(yearStr);
      const monthNum = parseInt(monthStr);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      month = monthNames[monthNum - 1];
      monthLabel = `${month} ${year}`;
    } else {
      // MonthlySpending format with separate month and year fields
      month = item.month?.substring(0, 3) || 'Unknown';
      year = item.year || new Date().getFullYear();
      monthLabel = `${month} ${year}`;
    }
    
    return {
      month: monthLabel,
      amount: Number(item.total_amount || item.amount || 0),
      count: item.expense_count || 0,
      fullMonth: month,
      year: year
    };
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          <p className="text-sm text-gray-600">
            Amount: <span className="font-medium text-blue-600">${Number(data.amount || 0).toFixed(2)}</span>
          </p>
          <p className="text-sm text-gray-600">
            Transactions: <span className="font-medium">{data.count}</span>
          </p>
          <p className="text-sm text-gray-600">
            Avg per transaction: <span className="font-medium">
              ${data.count > 0 ? (Number(data.amount || 0) / Number(data.count || 1)).toFixed(2) : '0.00'}
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  const maxAmount = Math.max(...chartData.map(item => item.amount));
  const avgAmount = chartData.length > 0 ? chartData.reduce((sum, item) => sum + item.amount, 0) / chartData.length : 0;

  return (
    <div className="space-y-4">
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'line' ? (
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="month" 
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                tickFormatter={(value) => `$${value}`}
                fontSize={12}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="amount" 
                stroke="#3b82f6" 
                strokeWidth={3}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
              />
            </LineChart>
          ) : chartType === 'area' ? (
            <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="month" 
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                tickFormatter={(value) => `$${value}`}
                fontSize={12}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="amount" 
                stroke="#3b82f6" 
                fill="#3b82f6"
                fillOpacity={0.2}
                strokeWidth={2}
              />
            </AreaChart>
          ) : (
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="month" 
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                tickFormatter={(value) => `$${value}`}
                fontSize={12}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="amount" 
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Summary info */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="text-gray-500">Total Months</div>
            <div className="font-medium text-lg">{chartData.length}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-500">Avg Monthly</div>
            <div className="font-medium text-lg text-blue-600">${Number(avgAmount || 0).toFixed(2)}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-500">Peak Month</div>
            <div className="font-medium text-lg text-green-600">${Number(maxAmount || 0).toFixed(2)}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthlyTrendsChart;