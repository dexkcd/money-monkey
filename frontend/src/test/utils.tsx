import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { CategoriesProvider } from '../contexts/CategoriesContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { type } from '@testing-library/user-event/dist/cjs/utility/type.js';

// Mock providers for testing
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CategoriesProvider>
          <NotificationProvider>
            {children}
          </NotificationProvider>
        </CategoriesProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };

// Mock data factories
export const mockExpense = {
  id: 1,
  amount: 25.99,
  description: 'Coffee shop',
  category: 'Restaurants',
  date: '2024-01-15',
  receipt_url: null,
  ai_confidence: 0.95,
};

export const mockBudget = {
  id: 1,
  category: 'Restaurants',
  amount: 200,
  period_type: 'MONTHLY' as const,
  spent: 150,
  remaining: 50,
  start_date: '2024-01-01',
  end_date: '2024-01-31',
};

export const mockCategory = {
  id: 1,
  name: 'Restaurants',
  color: '#ef4444',
  is_default: true,
};

export const mockUser = {
  id: 1,
  email: 'test@example.com',
  created_at: '2024-01-01T00:00:00Z',
};

// Mock API responses
export const mockApiResponse = <T>(data: T) => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {},
});

// Helper to wait for async operations
export const waitForLoadingToFinish = () => 
  new Promise(resolve => setTimeout(resolve, 0));

// Mock file for upload testing
export const createMockFile = (name = 'test.jpg', type = 'image/jpeg') => {
  const file = new File(['test content'], name, { type });
  return file;
};

// Mock chart data
export const mockChartData = [
  { name: 'Jan', value: 400 },
  { name: 'Feb', value: 300 },
  { name: 'Mar', value: 200 },
  { name: 'Apr', value: 278 },
];

// Accessibility testing helper
export const axeConfig = {
  rules: {
    // Disable color-contrast rule for testing (can be flaky in jsdom)
    'color-contrast': { enabled: false },
  },
};

// Mock data for testing
export const mockExpense = {
  id: 1,
  amount: 25.99,
  description: 'Coffee shop',
  category_id: 1,
  expense_date: '2024-01-15',
  receipt_url: null,
  ai_confidence: 0.95,
};