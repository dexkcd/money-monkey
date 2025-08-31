import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses for consistent testing
    await page.route('**/api/v1/auth/**', async (route) => {
      const url = route.request().url();
      const method = route.request().method();
      
      if (method === 'POST' && url.includes('/login')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            access_token: 'mock-token',
            token_type: 'bearer',
            user: {
              id: 1,
              email: 'test@example.com',
              created_at: '2024-01-01T00:00:00Z'
            }
          })
        });
      } else if (method === 'POST' && url.includes('/register')) {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            access_token: 'mock-token',
            token_type: 'bearer',
            user: {
              id: 1,
              email: 'newuser@example.com',
              created_at: '2024-01-01T00:00:00Z'
            }
          })
        });
      }
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
        ])
      });
    });
  });

  test('should display login form by default', async ({ page }) => {
    await page.goto('/login');
    
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Fill login form
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password123');
    
    // Submit form
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/');
    await expect(page.getByText(/dashboard/i)).toBeVisible();
  });

  test('should show validation errors for invalid login', async ({ page }) => {
    // Mock failed login
    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          detail: 'Invalid email or password'
        })
      });
    });

    await page.goto('/login');
    
    // Fill invalid credentials
    await page.getByLabel(/email/i).fill('invalid@example.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    
    // Submit form
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Should show error message
    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
  });

  test('should navigate to register page', async ({ page }) => {
    await page.goto('/login');
    
    // Click register link
    await page.getByRole('link', { name: /sign up/i }).click();
    
    // Should navigate to register page
    await expect(page).toHaveURL('/register');
    await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();
  });

  test('should register new user successfully', async ({ page }) => {
    await page.goto('/register');
    
    // Fill registration form
    await page.getByLabel(/email/i).fill('newuser@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByLabel(/confirm password/i).fill('password123');
    
    // Submit form
    await page.getByRole('button', { name: /create account/i }).click();
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/');
    await expect(page.getByText(/dashboard/i)).toBeVisible();
  });

  test('should show password mismatch error', async ({ page }) => {
    await page.goto('/register');
    
    // Fill form with mismatched passwords
    await page.getByLabel(/email/i).fill('newuser@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByLabel(/confirm password/i).fill('differentpassword');
    
    // Submit form
    await page.getByRole('button', { name: /create account/i }).click();
    
    // Should show error
    await expect(page.getByText(/passwords do not match/i)).toBeVisible();
  });

  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/');
    
    // Should redirect to login page
    await expect(page).toHaveURL('/login');
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Wait for dashboard to load
    await expect(page).toHaveURL('/');
    
    // Click logout button
    await page.getByRole('button', { name: /logout/i }).click();
    
    // Should redirect to login page
    await expect(page).toHaveURL('/login');
  });

  test('should maintain authentication state on page refresh', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Wait for dashboard to load
    await expect(page).toHaveURL('/');
    
    // Refresh page
    await page.reload();
    
    // Should still be authenticated
    await expect(page).toHaveURL('/');
    await expect(page.getByText(/dashboard/i)).toBeVisible();
  });
});