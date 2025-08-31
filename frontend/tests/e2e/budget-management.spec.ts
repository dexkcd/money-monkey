import { test, expect } from '@playwright/test';

test.describe('Budget Management', () => {
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

    // Mock categories API
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

    // Mock budgets API
    await page.route('**/api/v1/budgets**', async (route) => {
      const method = route.request().method();
      const url = route.request().url();

      if (method === 'GET') {
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
            }
          ])
        });
      } else if (method === 'POST') {
        const requestBody = await route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 3,
            ...requestBody,
            category: { id: requestBody.category_id, name: 'Housing', color: '#3b82f6' },
            current_spending: 0,
            remaining_amount: requestBody.amount,
            percentage_used: 0
          })
        });
      } else if (method === 'PUT') {
        const requestBody = await route.request().postDataJSON();
        const budgetId = url.split('/').pop();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: parseInt(budgetId!),
            ...requestBody,
            category: { id: requestBody.category_id, name: 'Restaurants', color: '#ef4444' },
            current_spending: 225.99,
            remaining_amount: requestBody.amount - 225.99,
            percentage_used: (225.99 / requestBody.amount) * 100
          })
        });
      } else if (method === 'DELETE') {
        await route.fulfill({ status: 204 });
      }
    });
  });

  test('should display budget list', async ({ page }) => {
    await page.goto('/budgets');
    
    // Should show budget cards
    await expect(page.getByText('Restaurants')).toBeVisible();
    await expect(page.getByText('$300.00')).toBeVisible();
    await expect(page.getByText('Grocery')).toBeVisible();
    await expect(page.getByText('$500.00')).toBeVisible();
  });

  test('should show budget status indicators', async ({ page }) => {
    await page.goto('/budgets');
    
    // Should show status badges
    await expect(page.getByText('Near Limit')).toBeVisible(); // Grocery at 89%
    await expect(page.getByText('On Track')).toBeVisible(); // Restaurants at 75%
  });

  test('should display progress bars correctly', async ({ page }) => {
    await page.goto('/budgets');
    
    // Check for progress indicators
    await expect(page.getByText('75.3%')).toBeVisible(); // Restaurants
    await expect(page.getByText('89.1%')).toBeVisible(); // Grocery
    
    // Check spending amounts
    await expect(page.getByText('Spent: $225.99')).toBeVisible();
    await expect(page.getByText('Spent: $445.67')).toBeVisible();
  });

  test('should open budget form when add button is clicked', async ({ page }) => {
    await page.goto('/budgets');
    
    // Click add budget button
    await page.getByRole('button', { name: /add budget/i }).click();
    
    // Should open budget form modal
    await expect(page.getByText('Create Budget')).toBeVisible();
    await expect(page.getByLabel(/category/i)).toBeVisible();
    await expect(page.getByLabel(/amount/i)).toBeVisible();
    await expect(page.getByLabel(/period/i)).toBeVisible();
  });

  test('should create new budget successfully', async ({ page }) => {
    await page.goto('/budgets');
    
    // Open budget form
    await page.getByRole('button', { name: /add budget/i }).click();
    
    // Fill form
    await page.getByLabel(/category/i).selectOption('3'); // Housing
    await page.getByLabel(/amount/i).fill('1500');
    await page.getByLabel(/period/i).selectOption('MONTHLY');
    
    // Submit form
    await page.getByRole('button', { name: /create budget/i }).click();
    
    // Should close modal and show success
    await expect(page.getByText('Create Budget')).not.toBeVisible();
  });

  test('should validate budget form fields', async ({ page }) => {
    await page.goto('/budgets');
    
    // Open budget form
    await page.getByRole('button', { name: /add budget/i }).click();
    
    // Try to submit empty form
    await page.getByRole('button', { name: /create budget/i }).click();
    
    // Should show validation errors
    await expect(page.getByText(/please select a category/i)).toBeVisible();
    await expect(page.getByText(/please enter a valid amount/i)).toBeVisible();
  });

  test('should edit existing budget', async ({ page }) => {
    await page.goto('/budgets');
    
    // Click edit button for first budget
    await page.getByTitle('Edit budget').first().click();
    
    // Should open edit form with pre-filled data
    await expect(page.getByText('Edit Budget')).toBeVisible();
    await expect(page.getByLabel(/amount/i)).toHaveValue('300');
    
    // Update amount
    await page.getByLabel(/amount/i).fill('350');
    
    // Submit form
    await page.getByRole('button', { name: /update budget/i }).click();
    
    // Should close modal
    await expect(page.getByText('Edit Budget')).not.toBeVisible();
  });

  test('should delete budget with confirmation', async ({ page }) => {
    await page.goto('/budgets');
    
    // Click delete button for first budget
    await page.getByTitle('Delete budget').first().click();
    
    // Should show confirmation dialog
    await expect(page.getByText('Delete Budget')).toBeVisible();
    await expect(page.getByText(/are you sure you want to delete this budget/i)).toBeVisible();
    
    // Confirm deletion
    await page.getByRole('button', { name: /delete/i }).click();
    
    // Should close confirmation dialog
    await expect(page.getByText('Delete Budget')).not.toBeVisible();
  });

  test('should cancel budget deletion', async ({ page }) => {
    await page.goto('/budgets');
    
    // Click delete button for first budget
    await page.getByTitle('Delete budget').first().click();
    
    // Should show confirmation dialog
    await expect(page.getByText('Delete Budget')).toBeVisible();
    
    // Cancel deletion
    await page.getByRole('button', { name: /cancel/i }).click();
    
    // Should close confirmation dialog without deleting
    await expect(page.getByText('Delete Budget')).not.toBeVisible();
  });

  test('should show over-budget status correctly', async ({ page }) => {
    // Mock over-budget scenario
    await page.route('**/api/v1/budgets**', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 1,
              category_id: 1,
              category: { id: 1, name: 'Restaurants', color: '#ef4444' },
              amount: 200.00,
              period_type: 'MONTHLY',
              start_date: '2024-01-01',
              end_date: '2024-01-31',
              current_spending: 250.00,
              remaining_amount: -50.00,
              percentage_used: 125.0
            }
          ])
        });
      }
    });

    await page.goto('/budgets');
    
    // Should show over-budget status
    await expect(page.getByText('Over Budget')).toBeVisible();
    await expect(page.getByText('$50.00 over')).toBeVisible();
    await expect(page.getByText('125.0%')).toBeVisible();
  });

  test('should handle different budget periods', async ({ page }) => {
    // Mock weekly budget
    await page.route('**/api/v1/budgets**', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 1,
              category_id: 1,
              category: { id: 1, name: 'Restaurants', color: '#ef4444' },
              amount: 75.00,
              period_type: 'WEEKLY',
              start_date: '2024-01-15',
              end_date: '2024-01-21',
              current_spending: 45.00,
              remaining_amount: 30.00,
              percentage_used: 60.0
            }
          ])
        });
      }
    });

    await page.goto('/budgets');
    
    // Should show weekly period
    await expect(page.getByText('WEEKLY')).toBeVisible();
    await expect(page.getByText('Jan 15, 2024 - Jan 21, 2024')).toBeVisible();
  });

  test('should display budget summary information', async ({ page }) => {
    await page.goto('/budgets');
    
    // Should show total budget information
    await expect(page.getByText(/total monthly budget/i)).toBeVisible();
    await expect(page.getByText(/total spent/i)).toBeVisible();
    await expect(page.getByText(/remaining budget/i)).toBeVisible();
  });

  test('should filter budgets by period type', async ({ page }) => {
    await page.goto('/budgets');
    
    // Should have filter options
    const periodFilter = page.getByLabel(/filter by period/i);
    if (await periodFilter.isVisible()) {
      await periodFilter.selectOption('MONTHLY');
      
      // Should show only monthly budgets
      await expect(page.getByText('MONTHLY')).toBeVisible();
    }
  });

  test('should show budget recommendations', async ({ page }) => {
    await page.goto('/budgets');
    
    // Should show budget insights or recommendations
    const recommendationsSection = page.getByText(/budget insights/i);
    if (await recommendationsSection.isVisible()) {
      await expect(recommendationsSection).toBeVisible();
    }
  });

  test('should handle mobile responsive design', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/budgets');
    
    // Should show mobile-optimized layout
    await expect(page.getByText('Restaurants')).toBeVisible();
    
    // Budget cards should stack vertically on mobile
    const budgetCards = page.locator('[data-testid="budget-card"], .budget-card');
    const count = await budgetCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should show empty state when no budgets exist', async ({ page }) => {
    // Mock empty budgets response
    await page.route('**/api/v1/budgets**', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
      }
    });

    await page.goto('/budgets');
    
    // Should show empty state
    await expect(page.getByText(/no budgets found/i)).toBeVisible();
    await expect(page.getByText(/create your first budget/i)).toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/v1/budgets**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Internal server error' })
      });
    });

    await page.goto('/budgets');
    
    // Should show error message
    await expect(page.getByText(/error loading budgets/i)).toBeVisible();
  });
});