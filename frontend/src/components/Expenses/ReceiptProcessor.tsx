import React, { useState } from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { expenseApi, FileUploadResponse } from '../../services/expenseApi';
import { Expense } from '../../types';
import { useCategories } from '../../contexts/CategoriesContext';

interface ReceiptProcessorProps {
  isOpen: boolean;
  onClose: () => void;
  onExpenseCreated: (expense: Expense) => void;
  file: File | null;
}

interface ProcessingState {
  stage: 'uploading' | 'processing' | 'review' | 'creating' | 'complete' | 'error';
  progress: number;
  message: string;
}

const ReceiptProcessor: React.FC<ReceiptProcessorProps> = ({
  isOpen,
  onClose,
  onExpenseCreated,
  file,
}) => {
  const [processingState, setProcessingState] = useState<ProcessingState>({
    stage: 'uploading',
    progress: 0,
    message: 'Preparing to upload...'
  });
  const [uploadResult, setUploadResult] = useState<FileUploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewData, setReviewData] = useState({
    amount: '',
    description: '',
    category_id: '',
    date: '',
  });
  const { categories } = useCategories();

  React.useEffect(() => {
    if (isOpen && file) {
      processReceipt();
    }
  }, [isOpen, file]);

  const processReceipt = async () => {
    if (!file) return;

    try {
      // Stage 1: Upload file
      setProcessingState({
        stage: 'uploading',
        progress: 25,
        message: 'Uploading receipt...'
      });

      const result = await expenseApi.uploadReceipt(file);
      setUploadResult(result);

      // Stage 2: Processing with AI
      setProcessingState({
        stage: 'processing',
        progress: 50,
        message: 'Processing receipt with AI...'
      });

      // Simulate processing delay (the backend handles this)
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (result.processing_result) {
        // Stage 3: Review extracted data
        setProcessingState({
          stage: 'review',
          progress: 75,
          message: 'Review extracted information'
        });

        // Find matching category by name
        const suggestedCategoryName = result.processing_result.suggested_category || 'Other';
        const matchingCategory = categories.find(c =>
          c.name.toLowerCase() === suggestedCategoryName.toLowerCase()
        );

        setReviewData({
          amount: result.processing_result.extracted_amount?.toString() || '',
          description: result.processing_result.extracted_merchant || '',
          category_id: matchingCategory?.id.toString() || '',
          date: result.processing_result.extracted_date || new Date().toISOString().split('T')[0],
        });
      } else {
        // If no processing result, still allow manual entry
        setProcessingState({
          stage: 'review',
          progress: 75,
          message: 'AI processing unavailable - please enter details manually'
        });

        // Find "Other" category as fallback
        const otherCategory = categories.find(c =>
          c.name.toLowerCase() === 'other' || c.name.toLowerCase() === 'uncategorized'
        );

        setReviewData({
          amount: '',
          description: '',
          category_id: otherCategory?.id.toString() || '',
          date: new Date().toISOString().split('T')[0],
        });
      }

    } catch (err: any) {
      console.error('Error processing receipt:', err);
      setError(err.response?.data?.detail || 'Failed to process receipt. Please try again.');
      setProcessingState({
        stage: 'error',
        progress: 0,
        message: 'Processing failed'
      });
    }
  };

  const handleReviewChange = (field: string, value: string) => {
    setReviewData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const createExpenseFromReceipt = async () => {
    if (!uploadResult) return;

    // Validate required fields
    // We no longer need to validate file_url since we're using the regular expense endpoint

    if (!reviewData.category_id || reviewData.category_id.trim() === '') {
      setError('Category is required. Please select a category.');
      return;
    }

    if (!reviewData.amount || parseFloat(reviewData.amount) <= 0) {
      setError('Valid amount is required. Please enter an amount greater than 0.');
      return;
    }

    try {
      setProcessingState({
        stage: 'creating',
        progress: 90,
        message: 'Creating expense...'
      });

      // Create expense using the regular endpoint with the selected category ID
      const expense = await expenseApi.createExpense({
        amount: parseFloat(reviewData.amount),
        description: reviewData.description || 'Receipt upload',
        category_id: parseInt(reviewData.category_id),
        expense_date: reviewData.date || new Date().toISOString().split('T')[0],
      });

      setProcessingState({
        stage: 'complete',
        progress: 100,
        message: 'Expense created successfully!'
      });

      // Wait a moment then notify parent
      setTimeout(() => {
        onExpenseCreated(expense);
        onClose();
      }, 1500);

    } catch (err: any) {
      console.error('Error creating expense:', err);

      // Provide more detailed error information
      let errorMessage = 'Failed to create expense. Please try again.';

      if (err.response?.data?.detail) {
        if (Array.isArray(err.response.data.detail)) {
          // Handle validation errors
          const validationErrors = err.response.data.detail.map((error: any) =>
            `${error.loc?.join('.')} - ${error.msg}`
          ).join(', ');
          errorMessage = `Validation error: ${validationErrors}`;
        } else {
          errorMessage = err.response.data.detail;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      setProcessingState({
        stage: 'error',
        progress: 0,
        message: 'Failed to create expense'
      });
    }
  };

  const retry = () => {
    setError(null);
    setUploadResult(null);
    setReviewData({
      amount: '',
      description: '',
      category_id: '',
      date: '',
    });
    processReceipt();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Processing Receipt
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {file?.name}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>{processingState.message}</span>
                <span>{processingState.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${processingState.stage === 'error' ? 'bg-red-500' : 'bg-indigo-600'
                    }`}
                  style={{ width: `${processingState.progress}%` }}
                />
              </div>
            </div>

            {/* Error State */}
            {processingState.stage === 'error' && (
              <div className="text-center py-4">
                <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500 mb-4" />
                <div className="text-red-600 mb-4">{error}</div>
                <button
                  onClick={retry}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <ArrowPathIcon className="h-4 w-4 mr-2" />
                  Try Again
                </button>
              </div>
            )}

            {/* Review Stage */}
            {processingState.stage === 'review' && uploadResult?.processing_result && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <CheckCircleIcon className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">
                        Receipt processed successfully!
                      </h3>
                      <div className="mt-2 text-sm text-blue-700">
                        <p>
                          Confidence: {Math.round(uploadResult.processing_result.confidence_score * 100)}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-900">
                    Review and edit the extracted information:
                  </h4>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Amount *</label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">$</span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={reviewData.amount}
                        onChange={(e) => handleReviewChange('amount', e.target.value)}
                        className="block w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <input
                      type="text"
                      value={reviewData.description}
                      onChange={(e) => handleReviewChange('description', e.target.value)}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Category *</label>
                    <select
                      required
                      value={reviewData.category_id}
                      onChange={(e) => handleReviewChange('category_id', e.target.value)}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    >
                      <option value="">Select a category</option>
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date</label>
                    <input
                      type="date"
                      value={reviewData.date}
                      onChange={(e) => handleReviewChange('date', e.target.value)}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Processing States */}
            {['uploading', 'processing', 'creating'].includes(processingState.stage) && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-sm text-gray-600">{processingState.message}</p>
              </div>
            )}

            {/* Complete State */}
            {processingState.stage === 'complete' && (
              <div className="text-center py-8">
                <CheckCircleIcon className="mx-auto h-12 w-12 text-green-500 mb-4" />
                <p className="text-sm text-gray-600">{processingState.message}</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            {processingState.stage === 'review' && (
              <>
                <button
                  onClick={createExpenseFromReceipt}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Create Expense
                </button>
                <button
                  onClick={onClose}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </>
            )}

            {processingState.stage === 'error' && (
              <button
                onClick={onClose}
                className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:w-auto sm:text-sm"
              >
                Close
              </button>
            )}

            {['uploading', 'processing', 'creating', 'complete'].includes(processingState.stage) && (
              <button
                onClick={onClose}
                disabled={processingState.stage !== 'complete'}
                className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingState.stage === 'complete' ? 'Done' : 'Cancel'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptProcessor;