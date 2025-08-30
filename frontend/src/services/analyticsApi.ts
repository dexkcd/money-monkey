import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface SpendingByCategory {
  category_id: number;
  category_name: string;
  category_color: string;
  total_amount: number;
  expense_count: number;
  percentage: number;
}

export interface MonthlySpending {
  month: string;
  year: number;
  total_amount: number;
  expense_count: number;
}

export interface SpendingTrend {
  period: string; // YYYY-MM format
  amount: number;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string[];
    borderColor?: string[];
  }[];
}

export interface AIRecommendation {
  title: string;
  description: string;
  category?: string;
  priority: 'high' | 'medium' | 'low';
  potential_savings?: number;
}

export interface RecommendationResponse {
  recommendations: AIRecommendation[];
  analysis_summary: string;
  generated_at: string;
}

export interface SpendingAnalytics {
  total_expenses: number;
  expense_count: number;
  average_expense: number;
  categories: SpendingByCategory[];
  monthly_trends: SpendingTrend[];
  date_range?: {
    start_date: string;
    end_date: string;
  };
}

class AnalyticsApiService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  async getSpendingAnalytics(startDate?: string, endDate?: string): Promise<SpendingAnalytics> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const response = await axios.get(
      `${API_BASE_URL}/api/v1/analytics/spending?${params.toString()}`,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async getSpendingByCategory(startDate?: string, endDate?: string): Promise<SpendingByCategory[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const response = await axios.get(
      `${API_BASE_URL}/api/v1/analytics/categories?${params.toString()}`,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async getSpendingTrends(monthsBack: number = 12): Promise<ChartData> {
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/analytics/trends?months_back=${monthsBack}`,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async getCategoryChartData(startDate?: string, endDate?: string): Promise<ChartData> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const response = await axios.get(
      `${API_BASE_URL}/api/v1/analytics/categories/chart?${params.toString()}`,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async getAIRecommendations(analysisMonths: number = 3): Promise<RecommendationResponse> {
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/analytics/recommendations?analysis_months=${analysisMonths}`,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async getBudgetComparison(month?: string) {
    const params = new URLSearchParams();
    if (month) params.append('month', month);

    const response = await axios.get(
      `${API_BASE_URL}/api/v1/analytics/budget-comparison?${params.toString()}`,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async getSpendingSummary(period: 'week' | 'month' | 'quarter' | 'year' = 'month') {
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/analytics/summary?period=${period}`,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }
}

export const analyticsApi = new AnalyticsApiService();