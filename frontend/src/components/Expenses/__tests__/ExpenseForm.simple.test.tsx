import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExpenseForm from '../ExpenseForm';

// Mock the contexts
vi.mock('../../../contexts/CategoriesContext', () => ({
  useCategories: () => ({
    categories: [
      { id: 1, name: 'Restaurants', color: '#ef4444', is_default: true },
      { id: 2, name: 'Grocery', color: '#10b981', is_default: true },
    ],
  }),
}));

// Mock the API
vi.mock('../../../services/expenseApi', () => ({
  expenseApi: {
    createExpense: vi.fn().mockResolvedValue({ id: 1, amount: 25.99 }),
    updateExpense: vi.fn().mockResolvedValue({ id: 1, amount: 25.99 }),
    suggestCategory: vi.fn().mockResolvedValue({ suggested_category: 'Restaurants', confidence: 0.95 }),
  },
}));

describe('ExpenseForm - Simple Tests', () => {
  const mockProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSave: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render form when open', () => {
      render(<ExpenseForm {...mockProps} />);
      expect(screen.getByRole('heading', { name: 'Add Expense' })).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(<ExpenseForm {...mockProps} isOpen={false} />);
      expect(screen.queryByRole('heading', { name: 'Add Expense' })).not.toBeInTheDocument();
    });

    it('should render all form fields', () => {
      render(<ExpenseForm {...mockProps} />);
      
      expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
    });

    it('should render submit and cancel buttons', () => {
      render(<ExpenseForm {...mockProps} />);
      
      expect(screen.getByRole('button', { name: /add expense/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
  });

  describe('Form Interactions', () => {
    it('should allow typing in amount field', async () => {
      const user = userEvent.setup();
      render(<ExpenseForm {...mockProps} />);
      
      const amountInput = screen.getByLabelText(/amount/i);
      await user.type(amountInput, '25.99');
      
      expect(amountInput).toHaveValue(25.99);
    });

    it('should allow typing in description field', async () => {
      const user = userEvent.setup();
      render(<ExpenseForm {...mockProps} />);
      
      const descriptionInput = screen.getByLabelText(/description/i);
      await user.type(descriptionInput, 'Coffee shop');
      
      expect(descriptionInput).toHaveValue('Coffee shop');
    });

    it('should allow selecting category', async () => {
      const user = userEvent.setup();
      render(<ExpenseForm {...mockProps} />);
      
      const categorySelect = screen.getByLabelText(/category/i);
      await user.selectOptions(categorySelect, '1');
      
      expect(categorySelect).toHaveValue('1');
    });

    it('should call onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<ExpenseForm {...mockProps} />);
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);
      
      expect(mockProps.onClose).toHaveBeenCalled();
    });
  });

  describe('Edit Mode', () => {
    const mockExpense = {
      id: 1,
      amount: 25.99,
      description: 'Coffee shop',
      category_id: 1,
      expense_date: '2024-01-15',
      receipt_url: null,
      ai_confidence: 0.95,
    };

    it('should render edit form when expense provided', () => {
      render(<ExpenseForm {...mockProps} expense={mockExpense} />);
      
      expect(screen.getByRole('heading', { name: 'Edit Expense' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /update expense/i })).toBeInTheDocument();
    });

    it('should pre-fill form with expense data', () => {
      render(<ExpenseForm {...mockProps} expense={mockExpense} />);
      
      expect(screen.getByLabelText(/amount/i)).toHaveValue(25.99);
      expect(screen.getByLabelText(/description/i)).toHaveValue('Coffee shop');
      expect(screen.getByLabelText(/category/i)).toHaveValue('1');
      expect(screen.getByLabelText(/date/i)).toHaveValue('2024-01-15');
    });
  });

  describe('AI Features', () => {
    it('should render AI suggestion button', () => {
      render(<ExpenseForm {...mockProps} />);
      
      const suggestButton = screen.getByTitle('Suggest category using AI');
      expect(suggestButton).toBeInTheDocument();
    });

    it('should disable AI button when description is empty', () => {
      render(<ExpenseForm {...mockProps} />);
      
      const suggestButton = screen.getByTitle('Suggest category using AI');
      expect(suggestButton).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      render(<ExpenseForm {...mockProps} />);
      
      expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
    });

    it('should have required field indicators', () => {
      render(<ExpenseForm {...mockProps} />);
      
      expect(screen.getByLabelText(/amount/i)).toHaveAttribute('required');
      expect(screen.getByLabelText(/category/i)).toHaveAttribute('required');
      expect(screen.getByLabelText(/date/i)).toHaveAttribute('required');
    });
  });
});