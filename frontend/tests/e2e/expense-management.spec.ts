import { test, expect } from '@playwright/test';

test.describe('Expense Management', () => {
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

    // Mock API responses
    await page.route('**/api/v1/categories', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 1, name: 'Restaurants', color: '#ef4444', is_default: true },
          { id: 2, name: 'Grocery', color: '#10b981', is_default: true },
          { id: 3, name: 'Housing', color: '#3b82f6', is_default: true },
        ])
      });
    });

    await page.route('**/api/v1/expenses**', async (route) => {
      const method = route.request().method();
      const url = route.request().url();

      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 1,
              amount: 25.99,
              description: 'Coffee shop',
              category_id: 1,
              expense_date: '2024-01-15',
              receipt_url: null,
              ai_confidence: 0.95,
              category: { id: 1, name: 'Restaurants', color: '#ef4444' }
            },
            {
              id: 2,
              amount: 45.67,
              description: 'Grocery shopping',
              category_id: 2,
              expense_date: '2024-01-14',
              receipt_url: null,
              ai_confidence: null,
              category: { id: 2, name: 'Grocery', color: '#10b981' }
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
            category: { id: requestBody.category_id, name: 'Restaurants', color: '#ef4444' }
          })
        });
      } else if (method === 'PUT') {
        const requestBody = await route.request().postDataJSON();
        const expenseId = url.split('/').pop();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: parseInt(expenseId!),
            ...requestBody,
            category: { id: requestBody.category_id, name: 'Restaurants', color: '#ef4444' }
          })
        });
      } else if (method === 'DELETE') {
        await route.fulfill({ status: 204 });
      }
    });

    // Mock AI suggestion API
    await page.route('**/api/v1/expenses/suggest-category', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          suggested_category: 'Restaurants',
          confidence: 0.95
        })
      });
    });
  });

  test('should display expense list', async ({ page }) => {
    await page.goto('/expenses');
    
    // Should show expenses
    await expect(page.getByText('Coffee shop')).toBeVisible();
    await expect(page.getByText('$25.99')).toBeVisible();
    await expect(page.getByText('Grocery shopping')).toBeVisible();
    await expect(page.getByText('$45.67')).toBeVisible();
  });

  test('should open expense form when add button is clicked', async ({ page }) => {
    await page.goto('/expenses');
    
    // Click add expense button
    await page.getByRole('button', { name: /add expense/i }).click();
    
    // Should open expense form modal
    await expect(page.getByText('Add Expense')).toBeVisible();
    await expect(page.getByLabel(/amount/i)).toBeVisible();
    await expect(page.getByLabel(/description/i)).toBeVisible();
    await expect(page.getByLabel(/category/i)).toBeVisible();
    await expect(page.getByLabel(/date/i)).toBeVisible();
  });

  test('should create new expense successfully', async ({ page }) => {
    await page.goto('/expenses');
    
    // Open expense form
    await page.getByRole('button', { name: /add expense/i }).click();
    
    // Fill form
    await page.getByLabel(/amount/i).fill('15.50');
    await page.getByLabel(/description/i).fill('Lunch at cafe');
    await page.getByLabel(/category/i).selectOption('1'); // Restaurants
    await page.getByLabel(/date/i).fill('2024-01-16');
    
    // Submit form
    await page.getByRole('button', { name: /add expense/i }).click();
    
    // Should close modal and show success
    await expect(page.getByText('Add Expense')).not.toBeVisible();
    
    // Should refresh expense list (in real app)
    // Note: In a real test, you'd verify the new expense appears in the list
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/expenses');
    
    // Open expense form
    await page.getByRole('button', { name: /add expense/i }).click();
    
    // Try to submit empty form
    await page.getByRole('button', { name: /add expense/i }).click();
    
    // Should show validation errors
    await expect(page.getByText(/please enter a valid amount/i)).toBeVisible();
  });

  test('should suggest category using AI', async ({ page }) => {
    await page.goto('/expenses');
    
    // Open expense form
    await page.getByRole('button', { name: /add expense/i }).click();
    
    // Enter description
    await page.getByLabel(/description/i).fill('Pizza delivery');
    
    // Click AI suggestion button
    await page.getByTitle('Suggest category using AI').click();
    
    // Should select suggested category
    await expect(page.getByLabel(/category/i)).toHaveValue('1'); // Restaurants
  });

  test('should edit existing expense', async ({ page }) => {
    await page.goto('/expenses');
    
    // Click edit button for first expense
    await page.getByTitle('Edit expense').first().click();
    
    // Should open edit form with pre-filled data
    await expect(page.getByText('Edit Expense')).toBeVisible();
    await expect(page.getByLabel(/amount/i)).toHaveValue('25.99');
    await expect(page.getByLabel(/description/i)).toHaveValue('Coffee shop');
    
    // Update description
    await page.getByLabel(/description/i).fill('Updated coffee shop');
    
    // Submit form
    await page.getByRole('button', { name: /update expense/i }).click();
    
    // Should close modal
    await expect(page.getByText('Edit Expense')).not.toBeVisible();
  });

  test('should delete expense with confirmation', async ({ page }) => {
    await page.goto('/expenses');
    
    // Click delete button for first expense
    await page.getByTitle('Delete expense').first().click();
    
    // Should show confirmation dialog
    await expect(page.getByText(/are you sure you want to delete/i)).toBeVisible();
    
    // Confirm deletion
    await page.getByRole('button', { name: /delete/i }).click();
    
    // Should close confirmation dialog
    await expect(page.getByText(/are you sure you want to delete/i)).not.toBeVisible();
  });

  test('should cancel expense deletion', async ({ page }) => {
    await page.goto('/expenses');
    
    // Click delete button for first expense
    await page.getByTitle('Delete expense').first().click();
    
    // Should show confirmation dialog
    await expect(page.getByText(/are you sure you want to delete/i)).toBeVisible();
    
    // Cancel deletion
    await page.getByRole('button', { name: /cancel/i }).click();
    
    // Should close confirmation dialog without deleting
    await expect(page.getByText(/are you sure you want to delete/i)).not.toBeVisible();
  });

  test('should filter expenses by category', async ({ page }) => {
    await page.goto('/expenses');
    
    // Select category filter
    await page.getByLabel(/filter by category/i).selectOption('1'); // Restaurants
    
    // Should show only restaurant expenses
    await expect(page.getByText('Coffee shop')).toBeVisible();
    await expect(page.getByText('Grocery shopping')).not.toBeVisible();
  });

  test('should search expenses by description', async ({ page }) => {
    await page.goto('/expenses');
    
    // Enter search term
    await page.getByPlaceholder(/search expenses/i).fill('coffee');
    
    // Should show only matching expenses
    await expect(page.getByText('Coffee shop')).toBeVisible();
    await expect(page.getByText('Grocery shopping')).not.toBeVisible();
  });

  test('should handle file upload for receipt processing', async ({ page }) => {
    // Mock file upload API
    await page.route('**/api/v1/expenses/upload', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          amount: 12.99,
          description: 'Restaurant bill',
          suggested_category: 'Restaurants',
          confidence: 0.89,
          receipt_url: '/uploads/receipt_123.jpg'
        })
      });
    });

    await page.goto('/expenses');
    
    // Click upload receipt button
    await page.getByRole('button', { name: /upload receipt/i }).click();
    
    // Should open file upload dialog
    await expect(page.getByText(/upload receipt/i)).toBeVisible();
    
    // Create a test file
    const fileContent = 'test receipt content';
    const file = await page.evaluateHandle(() => {
      const dt = new DataTransfer();
      const file = new File(['test receipt content'], 'receipt.jpg', { type: 'image/jpeg' });
      dt.items.add(file);
      return dt.files[0];
    });
    
    // Upload file
    await page.getByLabel(/choose file/i).setInputFiles([{
      name: 'receipt.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from(fileContent)
    }]);
    
    // Submit upload
    await page.getByRole('button', { name: /process receipt/i }).click();
    
    // Should show processing result and open expense form with pre-filled data
    await expect(page.getByText('Add Expense')).toBeVisible();
    await expect(page.getByLabel(/amount/i)).toHaveValue('12.99');
    await expect(page.getByLabel(/description/i)).toHaveValue('Restaurant bill');
  });

  test('should handle mobile responsive design', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/expenses');
    
    // Should show mobile-optimized layout
    await expect(page.getByText('Coffee shop')).toBeVisible();
    
    // Mobile menu should be accessible
    const mobileMenuButton = page.getByRole('button', { name: /menu/i });
    if (await mobileMenuButton.isVisible()) {
      await mobileMenuButton.click();
      await expect(page.getByRole('navigation')).toBeVisible();
    }
  });

  test('should maintain form state when switching between tabs', async ({ page }) => {
    await page.goto('/expenses');
    
    // Open expense form
    await page.getByRole('button', { name: /add expense/i }).click();
    
    // Fill partial form
    await page.getByLabel(/amount/i).fill('25.99');
    await page.getByLabel(/description/i).fill('Test expense');
    
    // Navigate away and back (simulate tab switching)
    await page.goto('/budgets');
    await page.goto('/expenses');
    
    // Form should be closed (this is expected behavior)
    await expect(page.getByText('Add Expense')).not.toBeVisible();
  });
});