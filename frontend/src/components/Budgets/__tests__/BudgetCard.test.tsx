import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { render, mockBudget, axeConfig } from '../../../test/utils';
import BudgetCard from '../BudgetCard';

describe('BudgetCard', () => {
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();

  const defaultProps = {
    budget: {
      ...mockBudget,
      category: {
        id: 1,
        name: 'Restaurants',
        color: '#ef4444',
        is_default: true,
      },
      percentage_used: 75,
      current_spending: 150,
      remaining_amount: 50,
    },
    onEdit: mockOnEdit,
    onDelete: mockOnDelete,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render budget information correctly', () => {
      render(<BudgetCard {...defaultProps} />);
      
      expect(screen.getByText('Restaurants')).toBeInTheDocument();
      expect(screen.getByText('MONTHLY')).toBeInTheDocument();
      expect(screen.getByText('$200.00')).toBeInTheDocument();
      expect(screen.getByText('Spent: $150.00')).toBeInTheDocument();
      expect(screen.getByText('75.0%')).toBeInTheDocument();
      expect(screen.getByText('$50.00')).toBeInTheDocument();
    });

    it('should render category fallback when category name is missing', () => {
      const budgetWithoutCategory = {
        ...defaultProps.budget,
        category: null,
        category_id: 5,
      };
      
      render(<BudgetCard {...defaultProps} budget={budgetWithoutCategory} />);
      
      expect(screen.getByText('Category 5')).toBeInTheDocument();
    });

    it('should render formatted dates correctly', () => {
      render(<BudgetCard {...defaultProps} />);
      
      expect(screen.getByText(/Jan 1, 2024 - Jan 31, 2024/)).toBeInTheDocument();
    });

    it('should render category color indicator when available', () => {
      render(<BudgetCard {...defaultProps} />);
      
      const colorIndicator = document.querySelector('[style*="background-color: rgb(239, 68, 68)"]');
      expect(colorIndicator).toBeInTheDocument();
    });
  });

  describe('Status Indicators', () => {
    it('should show "On Track" status for low spending', () => {
      const budget = {
        ...defaultProps.budget,
        percentage_used: 50,
      };
      
      render(<BudgetCard {...defaultProps} budget={budget} />);
      
      expect(screen.getByText('On Track')).toBeInTheDocument();
      expect(screen.getByText('On Track')).toHaveClass('bg-green-100', 'text-green-800');
    });

    it('should show "Near Limit" status for high spending', () => {
      const budget = {
        ...defaultProps.budget,
        percentage_used: 85,
      };
      
      render(<BudgetCard {...defaultProps} budget={budget} />);
      
      expect(screen.getByText('Near Limit')).toBeInTheDocument();
      expect(screen.getByText('Near Limit')).toHaveClass('bg-yellow-100', 'text-yellow-800');
    });

    it('should show "Over Budget" status for exceeded spending', () => {
      const budget = {
        ...defaultProps.budget,
        percentage_used: 110,
        current_spending: 220,
        remaining_amount: -20,
      };
      
      render(<BudgetCard {...defaultProps} budget={budget} />);
      
      expect(screen.getByText('Over Budget')).toBeInTheDocument();
      expect(screen.getByText('Over Budget')).toHaveClass('bg-red-100', 'text-red-800');
    });
  });

  describe('Progress Bar', () => {
    it('should render progress bar with correct width', () => {
      render(<BudgetCard {...defaultProps} />);
      
      const progressBar = document.querySelector('.bg-yellow-500');
      expect(progressBar).toHaveStyle({ width: '75%' });
    });

    it('should cap progress bar at 100% for over-budget scenarios', () => {
      const budget = {
        ...defaultProps.budget,
        percentage_used: 150,
      };
      
      render(<BudgetCard {...defaultProps} budget={budget} />);
      
      const progressBar = document.querySelector('.bg-red-500');
      expect(progressBar).toHaveStyle({ width: '100%' });
    });

    it('should use green color for low spending', () => {
      const budget = {
        ...defaultProps.budget,
        percentage_used: 50,
      };
      
      render(<BudgetCard {...defaultProps} budget={budget} />);
      
      expect(document.querySelector('.bg-green-500')).toBeInTheDocument();
      expect(document.querySelector('.bg-green-100')).toBeInTheDocument();
    });

    it('should use yellow color for near-limit spending', () => {
      render(<BudgetCard {...defaultProps} />);
      
      expect(document.querySelector('.bg-yellow-500')).toBeInTheDocument();
      expect(document.querySelector('.bg-yellow-100')).toBeInTheDocument();
    });

    it('should use red color for over-budget spending', () => {
      const budget = {
        ...defaultProps.budget,
        percentage_used: 110,
      };
      
      render(<BudgetCard {...defaultProps} budget={budget} />);
      
      expect(document.querySelector('.bg-red-500')).toBeInTheDocument();
      expect(document.querySelector('.bg-red-100')).toBeInTheDocument();
    });
  });

  describe('Remaining Amount Display', () => {
    it('should show positive remaining amount in green', () => {
      render(<BudgetCard {...defaultProps} />);
      
      const remainingAmount = screen.getByText('$50.00');
      expect(remainingAmount).toHaveClass('text-green-600');
    });

    it('should show negative remaining amount in red with "over" text', () => {
      const budget = {
        ...defaultProps.budget,
        remaining_amount: -20,
      };
      
      render(<BudgetCard {...defaultProps} budget={budget} />);
      
      const remainingAmount = screen.getByText('$20.00 over');
      expect(remainingAmount).toHaveClass('text-red-600');
    });
  });

  describe('User Interactions', () => {
    it('should call onEdit when edit button is clicked', async () => {
      const user = userEvent.setup();
      render(<BudgetCard {...defaultProps} />);
      
      const editButton = screen.getByTitle('Edit budget');
      await user.click(editButton);
      
      expect(mockOnEdit).toHaveBeenCalledWith(defaultProps.budget);
    });

    it('should show delete confirmation when delete button is clicked', async () => {
      const user = userEvent.setup();
      render(<BudgetCard {...defaultProps} />);
      
      const deleteButton = screen.getByTitle('Delete budget');
      await user.click(deleteButton);
      
      expect(screen.getByText('Delete Budget')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to delete this budget/)).toBeInTheDocument();
    });

    it('should cancel delete when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<BudgetCard {...defaultProps} />);
      
      // Open delete confirmation
      const deleteButton = screen.getByTitle('Delete budget');
      await user.click(deleteButton);
      
      // Cancel deletion
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);
      
      expect(screen.queryByText('Delete Budget')).not.toBeInTheDocument();
      expect(mockOnDelete).not.toHaveBeenCalled();
    });

    it('should call onDelete when delete is confirmed', async () => {
      const user = userEvent.setup();
      render(<BudgetCard {...defaultProps} />);
      
      // Open delete confirmation
      const deleteButton = screen.getByTitle('Delete budget');
      await user.click(deleteButton);
      
      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: /delete/i });
      await user.click(confirmButton);
      
      expect(mockOnDelete).toHaveBeenCalledWith(defaultProps.budget.id);
      expect(screen.queryByText('Delete Budget')).not.toBeInTheDocument();
    });
  });

  describe('Currency Formatting', () => {
    it('should format currency amounts correctly', () => {
      const budget = {
        ...defaultProps.budget,
        amount: 1234.56,
        current_spending: 987.65,
        remaining_amount: 246.91,
      };
      
      render(<BudgetCard {...defaultProps} budget={budget} />);
      
      expect(screen.getByText('$1,234.56')).toBeInTheDocument();
      expect(screen.getByText('Spent: $987.65')).toBeInTheDocument();
      expect(screen.getByText('$246.91')).toBeInTheDocument();
    });

    it('should handle zero amounts correctly', () => {
      const budget = {
        ...defaultProps.budget,
        current_spending: 0,
        remaining_amount: 200,
        percentage_used: 0,
      };
      
      render(<BudgetCard {...defaultProps} budget={budget} />);
      
      expect(screen.getByText('Spent: $0.00')).toBeInTheDocument();
      expect(screen.getByText('0.0%')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing optional properties gracefully', () => {
      const minimalBudget = {
        id: 1,
        category_id: 1,
        amount: 200,
        period_type: 'MONTHLY' as const,
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        // Missing optional properties
      };
      
      render(<BudgetCard {...defaultProps} budget={minimalBudget} />);
      
      expect(screen.getByText('Category 1')).toBeInTheDocument();
      expect(screen.getByText('0.0%')).toBeInTheDocument();
      expect(screen.getByText('Spent: $0.00')).toBeInTheDocument();
    });

    it('should handle very large numbers correctly', () => {
      const budget = {
        ...defaultProps.budget,
        amount: 999999.99,
        current_spending: 123456.78,
        percentage_used: 12.35,
      };
      
      render(<BudgetCard {...defaultProps} budget={budget} />);
      
      expect(screen.getByText('$999,999.99')).toBeInTheDocument();
      expect(screen.getByText('Spent: $123,456.78')).toBeInTheDocument();
      expect(screen.getByText('12.4%')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<BudgetCard {...defaultProps} />);
      const results = await axe(container, axeConfig);
      expect(results).toHaveNoViolations();
    });

    it('should have proper button labels and titles', () => {
      render(<BudgetCard {...defaultProps} />);
      
      expect(screen.getByTitle('Edit budget')).toBeInTheDocument();
      expect(screen.getByTitle('Delete budget')).toBeInTheDocument();
      expect(screen.getByTitle('Restaurants')).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<BudgetCard {...defaultProps} />);
      
      // Tab to edit button
      await user.tab();
      expect(screen.getByTitle('Edit budget')).toHaveFocus();
      
      // Tab to delete button
      await user.tab();
      expect(screen.getByTitle('Delete budget')).toHaveFocus();
      
      // Press Enter to activate delete
      await user.keyboard('{Enter}');
      expect(screen.getByText('Delete Budget')).toBeInTheDocument();
    });

    it('should have proper modal accessibility when delete confirmation is shown', async () => {
      const user = userEvent.setup();
      render(<BudgetCard {...defaultProps} />);
      
      // Open delete confirmation
      const deleteButton = screen.getByTitle('Delete budget');
      await user.click(deleteButton);
      
      // Check modal structure
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });
  });
});