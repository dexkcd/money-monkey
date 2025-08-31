import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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

describe('ExpenseForm - Basic Tests', () => {
  const mockProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSave: vi.fn(),
  };

  it('should render when open', () => {
    render(<ExpenseForm {...mockProps} />);
    expect(screen.getByRole('heading', { name: 'Add Expense' })).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<ExpenseForm {...mockProps} isOpen={false} />);
    expect(screen.queryByRole('heading', { name: 'Add Expense' })).not.toBeInTheDocument();
  });

  it('should render form fields', () => {
    render(<ExpenseForm {...mockProps} />);
    
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
  });
});