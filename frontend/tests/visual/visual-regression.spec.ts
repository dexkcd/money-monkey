import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      localStorage.setItem('auth_token', 'mock-token');
      localStorage.setItem('user', JSON.stringify({
        id: 1,
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00Z'
      }));
    });

    // Mock API responses with consistent data for visual testing
    await page.route('**/api/v1/categories', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 1, name: 'Restaurants', color: '#ef4444', is_default: true },
          { id: 2, name: 'Grocery', color: '#10b981', is_default: true },
          { id: 3, name: 'Housing', color: '#3b82f6', is_default: true },
          { id: 4, name: 'Leisure', color: '#8b5cf6', is_default: true },
        ])
      });
    });

    await page.route('**/api/v1/expenses**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            amount: 25.99,
            description: 'Coffee shop visit',
            category_id: 1,
            expense_date: '2024-01-15',
            receipt_url: null,
            ai_confidence: 0.95,
            category: { id: 1, name: 'Restaurants', color: '#ef4444' }
          },
          {
            id: 2,
            amount: 145.67,
            description: 'Weekly grocery shopping',
            category_id: 2,
            expense_date: '2024-01-14',
            receipt_url: '/uploads/receipt_2.jpg',
            ai_confidence: 0.88,
            category: { id: 2, name: 'Grocery', color: '#10b981' }
          },
          {
            id: 3,
            amount: 1200.00,
            description: 'Monthly rent payment',
            category_id: 3,
            expense_date: '2024-01-01',
            receipt_url: null,
            ai_confidence: null,
            category: { id: 3, name: 'Housing', color: '#3b82f6' }
          }
        ])
      });
    });

    await page.route('**/api/v1/budgets**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            category_id: 1,
            category: { id: 1, name: 'Restaurants', color: '#ef4444' },
            amount: 300.00,
            period_type: 'MONTHLY',
            start_date: '2024-01-01',
            end_date: '2024-01-31',
            current_spending: 225.99,
            remaining_amount: 74.01,
            percentage_used: 75.33
          },
          {
            id: 2,
            category_id: 2,
            category: { id: 2, name: 'Grocery', color: '#10b981' },
            amount: 500.00,
            period_type: 'MONTHLY',
            start_date: '2024-01-01',
            end_date: '2024-01-31',
            current_spending: 445.67,
            remaining_amount: 54.33,
            percentage_used: 89.13
          },
          {
            id: 3,
            category_id: 3,
            category: { id: 3, name: 'Housing', color: '#3b82f6' },
            amount: 1500.00,
            period_type: 'MONTHLY',
            start_date: '2024-01-01',
            end_date: '2024-01-31',
            current_spending: 1200.00,
            remaining_amount: 300.00,
            percentage_used: 80.00
          }
        ])
      });
    });

    await page.route('**/api/v1/analytics/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          monthly_spending: [
            { month: '2023-10', total: 1850.45, categories: { 'Restaurants': 280.50, 'Grocery': 420.30, 'Housing': 1149.65 } },
            { month: '2023-11', total: 1920.33, categories: { 'Restaurants': 310.20, 'Grocery': 450.13, 'Housing': 1160.00 } },
            { month: '2023-12', total: 2100.88, categories: { 'Restaurants': 380.75, 'Grocery': 520.13, 'Housing': 1200.00 } },
            { month: '2024-01', total: 1871.66, categories: { 'Restaurants': 225.99, 'Grocery': 445.67, 'Housing': 1200.00 } }
          ],
          category_breakdown: [
            { category: 'Housing', amount: 1200.00, percentage: 64.1 },
            { category: 'Grocery', amount: 445.67, percentage: 23.8 },
            { category: 'Restaurants', amount: 225.99, percentage: 12.1 }
          ],
          ai_recommendations: [
            'Consider reducing restaurant spending by 15% to stay within budget',
            'Your grocery spending is approaching the monthly limit',
            'Great job staying consistent with housing expenses'
          ]
        })
      });
    });

    // Set consistent viewport and disable animations for stable screenshots
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `
    });
  });

  test('Dashboard page visual regression', async ({ page }) => {
    await page.goto('/');
    
    // Wait for content to load
    await page.waitForSelector('[data-testid="dashboard-content"], .dashboard, main');
    await page.waitForTimeout(1000); // Allow for any remaining async operations
    
    // Take full page screenshot
    await expect(page).toHaveScreenshot('dashboard-full-page.png', {
      fullPage: true,
      animations: 'disabled'
    });
    
    // Take viewport screenshot
    await expect(page).toHaveScreenshot('dashboard-viewport.png', {
      animations: 'disabled'
    });
  });

  test('Expenses page visual regression', async ({ page }) => {
    await page.goto('/expenses');
    
    // Wait for expense list to load
    await page.waitForSelector('[data-testid="expense-list"], .expense-item, table');
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveScreenshot('expenses-page.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('Budgets page visual regression', async ({ page }) => {
    await page.goto('/budgets');
    
    // Wait for budget cards to load
    await page.waitForSelector('[data-testid="budget-card"], .budget-card');
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveScreenshot('budgets-page.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('Analytics page visual regression', async ({ page }) => {
    await page.goto('/analytics');
    
    // Wait for charts to render
    await page.waitForSelector('canvas, svg, [data-testid="chart"]');
    await page.waitForTimeout(2000); // Charts may take longer to render
    
    await expect(page).toHaveScreenshot('analytics-page.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('Expense form modal visual regression', async ({ page }) => {
    await page.goto('/expenses');
    
    // Open expense form
    await page.getByRole('button', { name: /add expense/i }).click();
    await page.waitForSelector('[data-testid="expense-form"], .modal, form');
    
    await expect(page).toHaveScreenshot('expense-form-modal.png', {
      animations: 'disabled'
    });
  });

  test('Budget card states visual regression', async ({ page }) => {
    await page.goto('/budgets');
    await page.waitForSelector('[data-testid="budget-card"], .budget-card');
    
    // Screenshot individual budget cards in different states
    const budgetCards = page.locator('[data-testid="budget-card"], .budget-card').first();
    
    await expect(budgetCards).toHaveScreenshot('budget-card-normal.png', {
      animations: 'disabled'
    });
  });

  test('Mobile responsive visual regression', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    await page.waitForSelector('[data-testid="dashboard-content"], .dashboard, main');
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveScreenshot('dashboard-mobile.png', {
      fullPage: true,
      animations: 'disabled'
    });
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('dashboard-tablet.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('Dark mode visual regression', async ({ page }) => {
    // If your app supports dark mode, test it
    await page.emulateMedia({ colorScheme: 'dark' });
    
    await page.goto('/');
    await page.waitForSelector('[data-testid="dashboard-content"], .dashboard, main');
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveScreenshot('dashboard-dark-mode.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('Error states visual regression', async ({ page }) => {
    // Mock API error
    await page.route('**/api/v1/expenses**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Internal server error' })
      });
    });
    
    await page.goto('/expenses');
    await page.waitForSelector('[data-testid="error-message"], .error, .alert-error');
    
    await expect(page).toHaveScreenshot('expenses-error-state.png', {
      animations: 'disabled'
    });
  });

  test('Loading states visual regression', async ({ page }) => {
    // Mock slow API response
    await page.route('**/api/v1/expenses**', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });
    
    const responsePromise = page.waitForResponse('**/api/v1/expenses**');
    await page.goto('/expenses');
    
    // Capture loading state
    await page.waitForSelector('[data-testid="loading"], .loading, .spinner');
    await expect(page).toHaveScreenshot('expenses-loading-state.png', {
      animations: 'disabled'
    });
    
    // Wait for response to complete
    await responsePromise;
  });

  test('Form validation visual regression', async ({ page }) => {
    await page.goto('/expenses');
    
    // Open expense form
    await page.getByRole('button', { name: /add expense/i }).click();
    await page.waitForSelector('[data-testid="expense-form"], .modal, form');
    
    // Try to submit empty form to trigger validation
    await page.getByRole('button', { name: /add expense/i }).click();
    
    // Wait for validation errors to appear
    await page.waitForSelector('[data-testid="error"], .error, .text-red-600');
    
    await expect(page).toHaveScreenshot('expense-form-validation-errors.png', {
      animations: 'disabled'
    });
  });

  test('Charts and graphs visual regression', async ({ page }) => {
    await page.goto('/analytics');
    
    // Wait for all charts to render
    await page.waitForSelector('canvas, svg');
    await page.waitForTimeout(3000); // Give charts time to fully render
    
    // Screenshot individual chart components
    const chartContainer = page.locator('[data-testid="spending-chart"], .chart-container').first();
    if (await chartContainer.isVisible()) {
      await expect(chartContainer).toHaveScreenshot('spending-chart.png', {
        animations: 'disabled'
      });
    }
  });

  test('Notification states visual regression', async ({ page }) => {
    await page.goto('/notifications');
    await page.waitForSelector('[data-testid="notifications"], .notifications');
    
    await expect(page).toHaveScreenshot('notifications-page.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('Cross-browser consistency', async ({ page, browserName }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="dashboard-content"], .dashboard, main');
    await page.waitForTimeout(1000);
    
    // Take browser-specific screenshots for comparison
    await expect(page).toHaveScreenshot(`dashboard-${browserName}.png`, {
      animations: 'disabled'
    });
  });
});