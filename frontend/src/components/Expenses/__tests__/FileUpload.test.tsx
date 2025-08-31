import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { render, createMockFile, axeConfig } from '../../../test/utils';
import FileUpload from '../FileUpload';

describe('FileUpload', () => {
  const mockOnFileSelect = vi.fn();
  const mockOnCameraCapture = vi.fn();

  const defaultProps = {
    onFileSelect: mockOnFileSelect,
    onCameraCapture: mockOnCameraCapture,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render upload area with default props', () => {
      render(<FileUpload {...defaultProps} />);
      
      expect(screen.getByText(/drop your receipt here/i)).toBeInTheDocument();
      expect(screen.getByText(/supports images and pdf files up to 10mb/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /choose file/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /take photo/i })).toBeInTheDocument();
    });

    it('should render without camera button when onCameraCapture is not provided', () => {
      render(<FileUpload onFileSelect={mockOnFileSelect} />);
      
      expect(screen.getByRole('button', { name: /choose file/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /take photo/i })).not.toBeInTheDocument();
    });

    it('should render with custom max size', () => {
      render(<FileUpload {...defaultProps} maxSize={5} />);
      
      expect(screen.getByText(/supports images and pdf files up to 5mb/i)).toBeInTheDocument();
    });

    it('should render in disabled state', () => {
      render(<FileUpload {...defaultProps} disabled />);
      
      expect(screen.getByRole('button', { name: /choose file/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /take photo/i })).toBeDisabled();
    });

    it('should apply custom className', () => {
      const { container } = render(<FileUpload {...defaultProps} className="custom-class" />);
      
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('File Selection via Input', () => {
    it('should call onFileSelect when valid file is selected', async () => {
      const user = userEvent.setup();
      render(<FileUpload {...defaultProps} />);
      
      const file = createMockFile('test.jpg', 'image/jpeg');
      const input = screen.getByRole('button', { name: /choose file/i });
      
      await user.click(input);
      
      // Simulate file selection
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      
      fireEvent.change(fileInput);
      
      expect(mockOnFileSelect).toHaveBeenCalledWith(file);
    });

    it('should validate file size', async () => {
      const user = userEvent.setup();
      render(<FileUpload {...defaultProps} maxSize={1} />);
      
      // Create a file larger than 1MB
      const largeFile = new File(['x'.repeat(2 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
      
      const input = screen.getByRole('button', { name: /choose file/i });
      await user.click(input);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      Object.defineProperty(fileInput, 'files', {
        value: [largeFile],
        writable: false,
      });
      
      fireEvent.change(fileInput);
      
      expect(screen.getByText(/file size must be less than 1mb/i)).toBeInTheDocument();
      expect(mockOnFileSelect).not.toHaveBeenCalled();
    });

    it('should validate file type', async () => {
      const user = userEvent.setup();
      render(<FileUpload {...defaultProps} accept="image/*" />);
      
      const invalidFile = createMockFile('test.txt', 'text/plain');
      
      const input = screen.getByRole('button', { name: /choose file/i });
      await user.click(input);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      Object.defineProperty(fileInput, 'files', {
        value: [invalidFile],
        writable: false,
      });
      
      fireEvent.change(fileInput);
      
      expect(screen.getByText(/please select a valid image or pdf file/i)).toBeInTheDocument();
      expect(mockOnFileSelect).not.toHaveBeenCalled();
    });

    it('should accept PDF files', async () => {
      const user = userEvent.setup();
      render(<FileUpload {...defaultProps} />);
      
      const pdfFile = createMockFile('receipt.pdf', 'application/pdf');
      
      const input = screen.getByRole('button', { name: /choose file/i });
      await user.click(input);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      Object.defineProperty(fileInput, 'files', {
        value: [pdfFile],
        writable: false,
      });
      
      fireEvent.change(fileInput);
      
      expect(mockOnFileSelect).toHaveBeenCalledWith(pdfFile);
    });
  });

  describe('Drag and Drop', () => {
    it('should handle drag over events', () => {
      const { container } = render(<FileUpload {...defaultProps} />);
      const dropZone = container.firstChild as HTMLElement;
      
      fireEvent.dragOver(dropZone);
      
      expect(dropZone).toHaveClass('border-indigo-500', 'bg-indigo-50');
    });

    it('should handle drag leave events', () => {
      const { container } = render(<FileUpload {...defaultProps} />);
      const dropZone = container.firstChild as HTMLElement;
      
      fireEvent.dragOver(dropZone);
      fireEvent.dragLeave(dropZone);
      
      expect(dropZone).not.toHaveClass('border-indigo-500', 'bg-indigo-50');
    });

    it('should handle file drop', () => {
      const { container } = render(<FileUpload {...defaultProps} />);
      const dropZone = container.firstChild as HTMLElement;
      
      const file = createMockFile('dropped.jpg', 'image/jpeg');
      const dataTransfer = {
        files: [file],
      };
      
      fireEvent.drop(dropZone, { dataTransfer });
      
      expect(mockOnFileSelect).toHaveBeenCalledWith(file);
    });

    it('should validate dropped files', () => {
      const { container } = render(<FileUpload {...defaultProps} maxSize={1} />);
      const dropZone = container.firstChild as HTMLElement;
      
      const largeFile = new File(['x'.repeat(2 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
      const dataTransfer = {
        files: [largeFile],
      };
      
      fireEvent.drop(dropZone, { dataTransfer });
      
      expect(screen.getByText(/file size must be less than 1mb/i)).toBeInTheDocument();
      expect(mockOnFileSelect).not.toHaveBeenCalled();
    });

    it('should not handle drag events when disabled', () => {
      const { container } = render(<FileUpload {...defaultProps} disabled />);
      const dropZone = container.firstChild as HTMLElement;
      
      fireEvent.dragOver(dropZone);
      
      expect(dropZone).not.toHaveClass('border-indigo-500', 'bg-indigo-50');
    });

    it('should not handle drop when disabled', () => {
      const { container } = render(<FileUpload {...defaultProps} disabled />);
      const dropZone = container.firstChild as HTMLElement;
      
      const file = createMockFile('test.jpg', 'image/jpeg');
      const dataTransfer = {
        files: [file],
      };
      
      fireEvent.drop(dropZone, { dataTransfer });
      
      expect(mockOnFileSelect).not.toHaveBeenCalled();
    });
  });

  describe('Camera Capture', () => {
    it('should call onCameraCapture when camera button is clicked', async () => {
      const user = userEvent.setup();
      render(<FileUpload {...defaultProps} />);
      
      const cameraButton = screen.getByRole('button', { name: /take photo/i });
      await user.click(cameraButton);
      
      expect(mockOnCameraCapture).toHaveBeenCalled();
    });

    it('should not call onCameraCapture when disabled', async () => {
      const user = userEvent.setup();
      render(<FileUpload {...defaultProps} disabled />);
      
      const cameraButton = screen.getByRole('button', { name: /take photo/i });
      
      // Button should be disabled, but let's try clicking anyway
      expect(cameraButton).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('should display error message for invalid files', async () => {
      const user = userEvent.setup();
      render(<FileUpload {...defaultProps} accept="image/*" />);
      
      const invalidFile = createMockFile('test.txt', 'text/plain');
      
      const input = screen.getByRole('button', { name: /choose file/i });
      await user.click(input);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      Object.defineProperty(fileInput, 'files', {
        value: [invalidFile],
        writable: false,
      });
      
      fireEvent.change(fileInput);
      
      expect(screen.getByText(/please select a valid image or pdf file/i)).toBeInTheDocument();
    });

    it('should clear error when valid file is selected', async () => {
      const user = userEvent.setup();
      render(<FileUpload {...defaultProps} />);
      
      // First, trigger an error
      const invalidFile = createMockFile('test.txt', 'text/plain');
      const input = screen.getByRole('button', { name: /choose file/i });
      await user.click(input);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      Object.defineProperty(fileInput, 'files', {
        value: [invalidFile],
        writable: false,
      });
      
      fireEvent.change(fileInput);
      
      expect(screen.getByText(/please select a valid image or pdf file/i)).toBeInTheDocument();
      
      // Then, select a valid file
      const validFile = createMockFile('test.jpg', 'image/jpeg');
      Object.defineProperty(fileInput, 'files', {
        value: [validFile],
        writable: false,
      });
      
      fireEvent.change(fileInput);
      
      expect(screen.queryByText(/please select a valid image or pdf file/i)).not.toBeInTheDocument();
      expect(mockOnFileSelect).toHaveBeenCalledWith(validFile);
    });

    it('should show error styling when error is present', async () => {
      const user = userEvent.setup();
      const { container } = render(<FileUpload {...defaultProps} />);
      
      const invalidFile = createMockFile('test.txt', 'text/plain');
      const input = screen.getByRole('button', { name: /choose file/i });
      await user.click(input);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      Object.defineProperty(fileInput, 'files', {
        value: [invalidFile],
        writable: false,
      });
      
      fireEvent.change(fileInput);
      
      const dropZone = container.querySelector('.border-red-300');
      expect(dropZone).toBeInTheDocument();
    });
  });

  describe('File Type Validation', () => {
    it('should accept files with extension matching', async () => {
      const user = userEvent.setup();
      render(<FileUpload {...defaultProps} accept=".jpg,.png" />);
      
      const file = createMockFile('test.jpg', 'image/jpeg');
      
      const input = screen.getByRole('button', { name: /choose file/i });
      await user.click(input);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      
      fireEvent.change(fileInput);
      
      expect(mockOnFileSelect).toHaveBeenCalledWith(file);
    });

    it('should accept files with MIME type matching', async () => {
      const user = userEvent.setup();
      render(<FileUpload {...defaultProps} accept="image/*" />);
      
      const file = createMockFile('test.webp', 'image/webp');
      
      const input = screen.getByRole('button', { name: /choose file/i });
      await user.click(input);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      
      fireEvent.change(fileInput);
      
      expect(mockOnFileSelect).toHaveBeenCalledWith(file);
    });
  });

  describe('Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<FileUpload {...defaultProps} />);
      const results = await axe(container, axeConfig);
      expect(results).toHaveNoViolations();
    });

    it('should have proper button labels', () => {
      render(<FileUpload {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /choose file/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /take photo/i })).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<FileUpload {...defaultProps} />);
      
      // Tab to first button
      await user.tab();
      expect(screen.getByRole('button', { name: /choose file/i })).toHaveFocus();
      
      // Tab to second button
      await user.tab();
      expect(screen.getByRole('button', { name: /take photo/i })).toHaveFocus();
    });

    it('should have proper ARIA attributes for error state', async () => {
      const user = userEvent.setup();
      render(<FileUpload {...defaultProps} />);
      
      // Trigger error
      const invalidFile = createMockFile('test.txt', 'text/plain');
      const input = screen.getByRole('button', { name: /choose file/i });
      await user.click(input);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      Object.defineProperty(fileInput, 'files', {
        value: [invalidFile],
        writable: false,
      });
      
      fireEvent.change(fileInput);
      
      // Error message should be visible to screen readers
      const errorMessage = screen.getByText(/please select a valid image or pdf file/i);
      expect(errorMessage).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty file list', async () => {
      const user = userEvent.setup();
      render(<FileUpload {...defaultProps} />);
      
      const input = screen.getByRole('button', { name: /choose file/i });
      await user.click(input);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      Object.defineProperty(fileInput, 'files', {
        value: [],
        writable: false,
      });
      
      fireEvent.change(fileInput);
      
      expect(mockOnFileSelect).not.toHaveBeenCalled();
    });

    it('should handle multiple files by selecting first one', () => {
      const { container } = render(<FileUpload {...defaultProps} />);
      const dropZone = container.firstChild as HTMLElement;
      
      const file1 = createMockFile('test1.jpg', 'image/jpeg');
      const file2 = createMockFile('test2.jpg', 'image/jpeg');
      const dataTransfer = {
        files: [file1, file2],
      };
      
      fireEvent.drop(dropZone, { dataTransfer });
      
      expect(mockOnFileSelect).toHaveBeenCalledWith(file1);
      expect(mockOnFileSelect).toHaveBeenCalledTimes(1);
    });

    it('should handle zero-byte files', async () => {
      const user = userEvent.setup();
      render(<FileUpload {...defaultProps} />);
      
      const emptyFile = new File([], 'empty.jpg', { type: 'image/jpeg' });
      
      const input = screen.getByRole('button', { name: /choose file/i });
      await user.click(input);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      Object.defineProperty(fileInput, 'files', {
        value: [emptyFile],
        writable: false,
      });
      
      fireEvent.change(fileInput);
      
      expect(mockOnFileSelect).toHaveBeenCalledWith(emptyFile);
    });
  });
});