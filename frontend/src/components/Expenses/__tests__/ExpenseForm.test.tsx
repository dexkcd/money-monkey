import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/react';
import ExpenseForm from '../ExpenseForm';
import { axe } from 'vitest-axe';

// Mock the API
vi.mock('../../../services/expenseApi', () => ({
  expenseApi: {
    createExpense: vi.fn(),
    updateExpense: vi.fn(),
    suggestCategory: vi.fn(),
  },
}));

// Mock the contexts
vi.mock('../../../contexts/CategoriesContext', () => ({
  useCategories: () => ({
    categories: [
      { id: 1, name: 'Restaurants', color: '#ef4444', is_default: true },
      { id: 2, name: 'Grocery', color: '#10b981', is_default: true },
      { id: 3, name: 'Housing', color: '#3b82f6', is_default: true },
    ],
  }),
}));

describe('ExpenseForm', () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSave: mockOnSave,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render create form when no expense provided', () => {
      render(<ExpenseForm {...defaultProps} />);
      
      expect(screen.getByRole('heading', { name: 'Add Expense' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add expense/i })).toBeInTheDocument();
    });

    it('should render edit form when expense provided', () => {
      render(<ExpenseForm {...defaultProps} expense={mockExpense} />);
      
      expect(screen.getByRole('heading', { name: 'Edit Expense' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /update expense/i })).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<ExpenseForm {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByRole('heading', { name: 'Add Expense' })).not.toBeInTheDocument();
    });

    it('should render all form fields', () => {
      render(<ExpenseForm {...defaultProps} />);
      
      expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
    });

    it('should render AI suggestion button', () => {
      render(<ExpenseForm {...defaultProps} />);
      
      const suggestButton = screen.getByTitle('Suggest category using AI');
      expect(suggestButton).toBeInTheDocument();
    });
  });

  describe('Form Initialization', () => {
    it('should initialize with empty values for new expense', () => {
      render(<ExpenseForm {...defaultProps} />);
      
      expect(screen.getByLabelText(/amount/i)).toHaveValue(null);
      expect(screen.getByLabelText(/description/i)).toHaveValue('');
      expect(screen.getByLabelText(/category/i)).toHaveValue('');
      expect(screen.getByLabelText(/date/i)).toHaveValue(new Date().toISOString().split('T')[0]);
    });

    it('should initialize with expense data when editing', () => {
      const expense = {
        ...mockExpense,
        amount: 25.99,
        description: 'Coffee shop',
        category_id: 1,
        expense_date: '2024-01-15',
      };

      render(<ExpenseForm {...defaultProps} expense={expense} />);
      
      expect(screen.getByLabelText(/amount/i)).toHaveValue(25.99);
      expect(screen.getByLabelText(/description/i)).toHaveValue('Coffee shop');
      expect(screen.getByLabelText(/category/i)).toHaveValue('1');
      expect(screen.getByLabelText(/date/i)).toHaveValue('2024-01-15');
    });

    it('should initialize with initial data when provided', () => {
      const initialData = {
        amount: 15.50,
        description: 'Lunch',
        category: 'Restaurants',
        date: '2024-01-10',
      };

      render(<ExpenseForm {...defaultProps} initialData={initialData} />);
      
      expect(screen.getByLabelText(/amount/i)).toHaveValue(15.5);
      expect(screen.getByLabelText(/description/i)).toHaveValue('Lunch');
      expect(screen.getByLabelText(/category/i)).toHaveValue('1'); // Restaurants category ID
      expect(screen.getByLabelText(/date/i)).toHaveValue('2024-01-10');
    });
  });

  describe('Form Validation', () => {
    it('should show error for empty amount', async () => {
      const user = userEvent.setup();
      render(<ExpenseForm {...defaultProps} />);
      
      const submitButton = screen.getByRole('button', { name: /add expense/i });
      await user.click(submitButton);
      
      expect(screen.getByText(/please enter a valid amount/i)).toBeInTheDocument();
    });

    it('should show error for negative amount', async () => {
      const user = userEvent.setup();
      render(<ExpenseForm {...defaultProps} />);
      
      const amountInput = screen.getByLabelText(/amount/i);
      await user.type(amountInput, '-10');
      
      const submitButton = screen.getByRole('button', { name: /add expense/i });
      await user.click(submitButton);
      
      expect(screen.getByText(/please enter a valid amount/i)).toBeInTheDocument();
    });

    it('should show error for missing category', async () => {
      const user = userEvent.setup();
      render(<ExpenseForm {...defaultProps} />);
      
      const amountInput = screen.getByLabelText(/amount/i);
      await user.type(amountInput, '25.99');
      
      const submitButton = screen.getByRole('button', { name: /add expense/i });
      await user.click(submitButton);
      
      expect(screen.getByText(/please select a category/i)).toBeInTheDocument();
    });

    it('should show error for future date', async () => {
      const user = userEvent.setup();
      render(<ExpenseForm {...defaultProps} />);
      
      const amountInput = screen.getByLabelText(/amount/i);
      const categorySelect = screen.getByLabelText(/category/i);
      const dateInput = screen.getByLabelText(/date/i);
      
      await user.type(amountInput, '25.99');
      await user.selectOptions(categorySelect, '1');
      
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      await user.type(dateInput, futureDate.toISOString().split('T')[0]);
      
      const submitButton = screen.getByRole('button', { name: /add expense/i });
      await user.click(submitButton);
      
      expect(screen.getByText(/expense date cannot be in the future/i)).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should create new expense successfully', async () => {
      const user = userEvent.setup();
      const mockCreatedExpense = { ...mockExpense, id: 123 };
      mockExpenseApi.createExpense.mockResolvedValue(mockCreatedExpense);
      
      render(<ExpenseForm {...defaultProps} />);
      
      // Fill form
      await user.type(screen.getByLabelText(/amount/i), '25.99');
      await user.type(screen.getByLabelText(/description/i), 'Coffee shop');
      await user.selectOptions(screen.getByLabelText(/category/i), '1');
      
      // Submit
      await user.click(screen.getByRole('button', { name: /add expense/i }));
      
      await waitFor(() => {
        expect(mockExpenseApi.createExpense).toHaveBeenCalledWith({
          amount: 25.99,
          description: 'Coffee shop',
          category_id: 1,
          expense_date: expect.any(String),
        }, false);
      });
      
      expect(mockOnSave).toHaveBeenCalledWith(mockCreatedExpense);
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should update existing expense successfully', async () => {
      const user = userEvent.setup();
      const mockUpdatedExpense = { ...mockExpense, description: 'Updated description' };
      mockExpenseApi.updateExpense.mockResolvedValue(mockUpdatedExpense);
      
      render(<ExpenseForm {...defaultProps} expense={mockExpense} />);
      
      // Update description
      const descriptionInput = screen.getByLabelText(/description/i);
      await user.clear(descriptionInput);
      await user.type(descriptionInput, 'Updated description');
      
      // Submit
      await user.click(screen.getByRole('button', { name: /update expense/i }));
      
      await waitFor(() => {
        expect(mockExpenseApi.updateExpense).toHaveBeenCalledWith(mockExpense.id, {
          amount: mockExpense.amount,
          description: 'Updated description',
          category_id: mockExpense.category_id,
          expense_date: mockExpense.expense_date,
        });
      });
      
      expect(mockOnSave).toHaveBeenCalledWith(mockUpdatedExpense);
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Network error';
      mockExpenseApi.createExpense.mockRejectedValue(new Error(errorMessage));
      
      render(<ExpenseForm {...defaultProps} />);
      
      // Fill form
      await user.type(screen.getByLabelText(/amount/i), '25.99');
      await user.selectOptions(screen.getByLabelText(/category/i), '1');
      
      // Submit
      await user.click(screen.getByRole('button', { name: /add expense/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/failed to save expense/i)).toBeInTheDocument();
      });
      
      expect(mockOnSave).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should show loading state during submission', async () => {
      const user = userEvent.setup();
      let resolvePromise: (value: any) => void;
      const promise = new Promise(resolve => { resolvePromise = resolve; });
      mockExpenseApi.createExpense.mockReturnValue(promise);
      
      render(<ExpenseForm {...defaultProps} />);
      
      // Fill form
      await user.type(screen.getByLabelText(/amount/i), '25.99');
      await user.selectOptions(screen.getByLabelText(/category/i), '1');
      
      // Submit
      await user.click(screen.getByRole('button', { name: /add expense/i }));
      
      // Check loading state
      expect(screen.getByText('Saving...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
      
      // Resolve promise
      resolvePromise!(mockExpense);
      
      await waitFor(() => {
        expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
      });
    });
  });

  describe('AI Category Suggestion', () => {
    it('should suggest category based on description', async () => {
      const user = userEvent.setup();
      mockExpenseApi.suggestCategory.mockResolvedValue({
        suggested_category: 'Restaurants',
        confidence: 0.95,
      });
      
      render(<ExpenseForm {...defaultProps} />);
      
      // Enter description
      await user.type(screen.getByLabelText(/description/i), 'Coffee shop');
      
      // Click suggest button
      const suggestButton = screen.getByTitle('Suggest category using AI');
      await user.click(suggestButton);
      
      await waitFor(() => {
        expect(mockExpenseApi.suggestCategory).toHaveBeenCalledWith('Coffee shop', undefined);
      });
      
      // Check that category was selected
      expect(screen.getByLabelText(/category/i)).toHaveValue('1');
    });

    it('should disable suggest button when description is empty', () => {
      render(<ExpenseForm {...defaultProps} />);
      
      const suggestButton = screen.getByTitle('Suggest category using AI');
      expect(suggestButton).toBeDisabled();
    });

    it('should show loading state during suggestion', async () => {
      const user = userEvent.setup();
      let resolvePromise: (value: any) => void;
      const promise = new Promise(resolve => { resolvePromise = resolve; });
      mockExpenseApi.suggestCategory.mockReturnValue(promise);
      
      render(<ExpenseForm {...defaultProps} />);
      
      // Enter description
      await user.type(screen.getByLabelText(/description/i), 'Coffee shop');
      
      // Click suggest button
      const suggestButton = screen.getByTitle('Suggest category using AI');
      await user.click(suggestButton);
      
      // Check loading state
      expect(suggestButton).toBeDisabled();
      
      // Resolve promise
      resolvePromise!({ suggested_category: 'Restaurants', confidence: 0.95 });
      
      await waitFor(() => {
        expect(suggestButton).not.toBeDisabled();
      });
    });
  });

  describe('User Interactions', () => {
    it('should close form when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<ExpenseForm {...defaultProps} />);
      
      const closeButton = screen.getByRole('button', { name: '' }); // X button
      await user.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close form when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<ExpenseForm {...defaultProps} />);
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close form when backdrop is clicked', async () => {
      const user = userEvent.setup();
      render(<ExpenseForm {...defaultProps} />);
      
      const backdrop = document.querySelector('.bg-gray-500');
      if (backdrop) {
        await user.click(backdrop);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      render(<ExpenseForm {...defaultProps} />);
      
      expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
    });

    it('should have proper ARIA attributes', () => {
      render(<ExpenseForm {...defaultProps} />);
      
      const submitButton = screen.getByRole('button', { name: /add expense/i });
      expect(submitButton).toHaveAttribute('type', 'submit');
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<ExpenseForm {...defaultProps} />);
      
      // Tab through form elements
      await user.tab();
      expect(screen.getByLabelText(/amount/i)).toHaveFocus();
      
      await user.tab();
      expect(screen.getByLabelText(/description/i)).toHaveFocus();
      
      await user.tab();
      expect(screen.getByTitle('Suggest category using AI')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByLabelText(/category/i)).toHaveFocus();
      
      await user.tab();
      expect(screen.getByLabelText(/date/i)).toHaveFocus();
    });
  });
});