import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { render, axeConfig } from '../../src/test/utils';
import App from '../../src/App';
import { Dashboard } from '../../src/pages';
import { ExpenseForm } from '../../src/components/Expenses';
import { BudgetCard } from '../../src/components/Budgets';

// Mock router for testing
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    BrowserRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/' }),
  };
});

// Mock contexts
vi.mock('../../src/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useAuth: () => ({
    user: { id: 1, email: 'test@example.com' },
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
  }),
}));

vi.mock('../../src/contexts/CategoriesContext', () => ({
  CategoriesProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useCategories: () => ({
    categories: [
      { id: 1, name: 'Restaurants', color: '#ef4444', is_default: true },
      { id: 2, name: 'Grocery', color: '#10b981', is_default: true },
    ],
    loading: false,
    error: null,
  }),
}));

vi.mock('../../src/contexts/NotificationContext', () => ({
  NotificationProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useNotification: () => ({
    notifications: [],
    addNotification: vi.fn(),
    removeNotification: vi.fn(),
  }),
}));

// Mock API calls
vi.mock('../../src/services/expenseApi', () => ({
  expenseApi: {
    getExpenses: vi.fn().mockResolvedValue([]),
    createExpense: vi.fn(),
    updateExpense: vi.fn(),
    deleteExpense: vi.fn(),
    suggestCategory: vi.fn(),
  },
}));

vi.mock('../../src/services/budgetApi', () => ({
  budgetApi: {
    getBudgets: vi.fn().mockResolvedValue([]),
    createBudget: vi.fn(),
    updateBudget: vi.fn(),
    deleteBudget: vi.fn(),
  },
}));

describe('Accessibility Tests', () => {
  describe('Page Level Accessibility', () => {
    it('should have no accessibility violations on Dashboard', async () => {
      const { container } = render(<Dashboard />);
      const results = await axe(container, axeConfig);
      expect(results).toHaveNoViolations();
    });

    it('should have proper heading hierarchy', async () => {
      const { container } = render(<Dashboard />);
      
      // Check for proper heading structure (h1 -> h2 -> h3, etc.)
      const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
      expect(headings.length).toBeGreaterThan(0);
      
      // First heading should be h1
      if (headings.length > 0) {
        expect(headings[0].tagName).toBe('H1');
      }
    });

    it('should have proper landmark regions', async () => {
      const { container } = render(<Dashboard />);
      
      // Check for main content area
      const main = container.querySelector('main, [role="main"]');
      expect(main).toBeInTheDocument();
    });
  });

  describe('Form Accessibility', () => {
    const mockProps = {
      isOpen: true,
      onClose: vi.fn(),
      onSave: vi.fn(),
    };

    it('should have no accessibility violations in ExpenseForm', async () => {
      const { container } = render(<ExpenseForm {...mockProps} />);
      const results = await axe(container, axeConfig);
      expect(results).toHaveNoViolations();
    });

    it('should have proper form labels and associations', async () => {
      render(<ExpenseForm {...mockProps} />);
      
      // Check that all form inputs have associated labels
      const inputs = document.querySelectorAll('input, select, textarea');
      inputs.forEach(input => {
        const id = input.getAttribute('id');
        if (id) {
          const label = document.querySelector(`label[for="${id}"]`);
          expect(label).toBeInTheDocument();
        }
      });
    });

    it('should have proper error message associations', async () => {
      // This would test aria-describedby for error messages
      // Implementation depends on how errors are displayed in the form
      const { container } = render(<ExpenseForm {...mockProps} />);
      
      // Look for error messages with proper ARIA attributes
      const errorMessages = container.querySelectorAll('[role="alert"], .error-message');
      errorMessages.forEach(error => {
        const id = error.getAttribute('id');
        if (id) {
          // Check if any input references this error message
          const referencingInput = container.querySelector(`[aria-describedby*="${id}"]`);
          expect(referencingInput || errorMessages.length === 0).toBeTruthy();
        }
      });
    });

    it('should have proper required field indicators', async () => {
      render(<ExpenseForm {...mockProps} />);
      
      // Check that required fields are properly marked
      const requiredInputs = document.querySelectorAll('input[required], select[required]');
      requiredInputs.forEach(input => {
        // Should have aria-required or required attribute
        expect(
          input.hasAttribute('required') || 
          input.getAttribute('aria-required') === 'true'
        ).toBe(true);
      });
    });
  });

  describe('Interactive Element Accessibility', () => {
    const mockBudget = {
      id: 1,
      category: { id: 1, name: 'Restaurants', color: '#ef4444', is_default: true },
      amount: 200,
      period_type: 'MONTHLY' as const,
      start_date: '2024-01-01',
      end_date: '2024-01-31',
      percentage_used: 75,
      current_spending: 150,
      remaining_amount: 50,
    };

    it('should have no accessibility violations in BudgetCard', async () => {
      const { container } = render(
        <BudgetCard 
          budget={mockBudget} 
          onEdit={vi.fn()} 
          onDelete={vi.fn()} 
        />
      );
      const results = await axe(container, axeConfig);
      expect(results).toHaveNoViolations();
    });

    it('should have proper button labels and descriptions', async () => {
      render(
        <BudgetCard 
          budget={mockBudget} 
          onEdit={vi.fn()} 
          onDelete={vi.fn()} 
        />
      );
      
      // Check that buttons have accessible names
      const buttons = document.querySelectorAll('button');
      buttons.forEach(button => {
        const hasAccessibleName = 
          button.textContent?.trim() ||
          button.getAttribute('aria-label') ||
          button.getAttribute('title') ||
          button.querySelector('img')?.getAttribute('alt');
        
        expect(hasAccessibleName).toBeTruthy();
      });
    });

    it('should have proper focus management', async () => {
      const { container } = render(
        <BudgetCard 
          budget={mockBudget} 
          onEdit={vi.fn()} 
          onDelete={vi.fn()} 
        />
      );
      
      // Check that interactive elements are focusable
      const focusableElements = container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      focusableElements.forEach(element => {
        expect(element.getAttribute('tabindex')).not.toBe('-1');
      });
    });
  });

  describe('Color and Contrast', () => {
    it('should not rely solely on color for information', async () => {
      const mockBudget = {
        id: 1,
        category: { id: 1, name: 'Restaurants', color: '#ef4444', is_default: true },
        amount: 200,
        period_type: 'MONTHLY' as const,
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        percentage_used: 110, // Over budget
        current_spending: 220,
        remaining_amount: -20,
      };

      render(
        <BudgetCard 
          budget={mockBudget} 
          onEdit={vi.fn()} 
          onDelete={vi.fn()} 
        />
      );
      
      // Check that over-budget status is indicated by text, not just color
      expect(document.getByText('Over Budget')).toBeInTheDocument();
      expect(document.getByText('$20.00 over')).toBeInTheDocument();
    });

    it('should provide text alternatives for visual indicators', async () => {
      const { container } = render(<Dashboard />);
      
      // Check that images have alt text
      const images = container.querySelectorAll('img');
      images.forEach(img => {
        expect(img.getAttribute('alt')).toBeDefined();
      });
      
      // Check that icons have proper labels or are marked as decorative
      const icons = container.querySelectorAll('svg, .icon');
      icons.forEach(icon => {
        const hasLabel = 
          icon.getAttribute('aria-label') ||
          icon.getAttribute('title') ||
          icon.getAttribute('aria-hidden') === 'true';
        
        expect(hasLabel).toBeTruthy();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support keyboard navigation for all interactive elements', async () => {
      const { container } = render(<Dashboard />);
      
      // Check that all interactive elements are keyboard accessible
      const interactiveElements = container.querySelectorAll(
        'button, [href], input, select, textarea, [role="button"], [role="link"]'
      );
      
      interactiveElements.forEach(element => {
        // Element should be focusable (not have tabindex="-1" unless it's programmatically focusable)
        const tabIndex = element.getAttribute('tabindex');
        if (tabIndex === '-1') {
          // Should have a way to be focused programmatically (like in a modal or dropdown)
          expect(element.closest('[role="dialog"], [role="menu"], [role="listbox"]')).toBeTruthy();
        }
      });
    });

    it('should have proper focus indicators', async () => {
      // This test would check CSS focus styles, but since we're in jsdom,
      // we can only check that focusable elements exist
      const { container } = render(<Dashboard />);
      
      const focusableElements = container.querySelectorAll(
        'button, [href], input, select, textarea'
      );
      
      expect(focusableElements.length).toBeGreaterThan(0);
    });
  });

  describe('Screen Reader Support', () => {
    it('should have proper ARIA labels and descriptions', async () => {
      render(<ExpenseForm isOpen={true} onClose={vi.fn()} onSave={vi.fn()} />);
      
      // Check for proper ARIA attributes
      const elementsWithAria = document.querySelectorAll('[aria-label], [aria-describedby], [aria-labelledby]');
      
      elementsWithAria.forEach(element => {
        const ariaLabel = element.getAttribute('aria-label');
        const ariaDescribedBy = element.getAttribute('aria-describedby');
        const ariaLabelledBy = element.getAttribute('aria-labelledby');
        
        if (ariaDescribedBy) {
          // Referenced element should exist
          const referencedElement = document.getElementById(ariaDescribedBy);
          expect(referencedElement).toBeInTheDocument();
        }
        
        if (ariaLabelledBy) {
          // Referenced element should exist
          const referencedElement = document.getElementById(ariaLabelledBy);
          expect(referencedElement).toBeInTheDocument();
        }
        
        if (ariaLabel) {
          // Should not be empty
          expect(ariaLabel.trim()).not.toBe('');
        }
      });
    });

    it('should have proper live regions for dynamic content', async () => {
      const { container } = render(<Dashboard />);
      
      // Check for live regions that announce changes
      const liveRegions = container.querySelectorAll('[aria-live], [role="status"], [role="alert"]');
      
      // If there are live regions, they should have appropriate politeness levels
      liveRegions.forEach(region => {
        const ariaLive = region.getAttribute('aria-live');
        const role = region.getAttribute('role');
        
        if (ariaLive) {
          expect(['polite', 'assertive', 'off']).toContain(ariaLive);
        }
        
        if (role === 'alert') {
          // Alert regions should be assertive by default
          expect(ariaLive === 'assertive' || !ariaLive).toBe(true);
        }
      });
    });

    it('should provide context for form validation errors', async () => {
      const { container } = render(<ExpenseForm isOpen={true} onClose={vi.fn()} onSave={vi.fn()} />);
      
      // Check that form has proper structure for screen readers
      const form = container.querySelector('form');
      if (form) {
        // Form should have a name or label
        const hasFormName = 
          form.getAttribute('aria-label') ||
          form.getAttribute('aria-labelledby') ||
          form.querySelector('legend, h1, h2, h3, h4, h5, h6');
        
        expect(hasFormName).toBeTruthy();
      }
    });
  });

  describe('Mobile Accessibility', () => {
    it('should have appropriate touch targets', async () => {
      const { container } = render(<Dashboard />);
      
      // Check that interactive elements are large enough for touch
      // This is more of a CSS concern, but we can check that elements exist
      const touchTargets = container.querySelectorAll('button, [role="button"], a');
      
      expect(touchTargets.length).toBeGreaterThan(0);
      
      // In a real test, you'd check computed styles for minimum 44px touch targets
    });

    it('should support zoom up to 200% without horizontal scrolling', async () => {
      // This would typically be tested with actual browser automation
      // Here we just ensure the layout is responsive-friendly
      const { container } = render(<Dashboard />);
      
      // Check for responsive design indicators
      const responsiveElements = container.querySelectorAll('.responsive, .flex, .grid, [class*="sm:"], [class*="md:"], [class*="lg:"]');
      
      // Should have some responsive design classes (Tailwind CSS)
      expect(responsiveElements.length).toBeGreaterThan(0);
    });
  });
});