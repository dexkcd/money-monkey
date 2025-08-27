import React, { useState } from 'react';
import { PlusIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline';
import { Expense } from '../types';
import { expenseApi } from '../services/expenseApi';
import FileUpload from '../components/Expenses/FileUpload';
import CameraCapture from '../components/Expenses/CameraCapture';
import ExpenseList from '../components/Expenses/ExpenseList';
import ExpenseForm from '../components/Expenses/ExpenseForm';
import ReceiptProcessor from '../components/Expenses/ReceiptProcessor';
import DeleteConfirmation from '../components/Expenses/DeleteConfirmation';

const Expenses: React.FC = () => {
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showCameraCapture, setShowCameraCapture] = useState(false);
  const [showReceiptProcessor, setShowReceiptProcessor] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [processingFile, setProcessingFile] = useState<File | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleFileSelect = (file: File) => {
    setProcessingFile(file);
    setShowReceiptProcessor(true);
  };

  const handleCameraCapture = () => {
    setShowCameraCapture(true);
  };

  const handleCameraPhoto = (file: File) => {
    setShowCameraCapture(false);
    handleFileSelect(file);
  };

  const handleAddExpense = () => {
    setEditingExpense(null);
    setShowExpenseForm(true);
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setShowExpenseForm(true);
  };

  const handleDeleteExpense = (expense: Expense) => {
    setDeletingExpense(expense);
    setShowDeleteConfirmation(true);
  };

  const handleExpenseSaved = (expense: Expense) => {
    setShowExpenseForm(false);
    setEditingExpense(null);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleExpenseCreatedFromReceipt = (expense: Expense) => {
    setShowReceiptProcessor(false);
    setProcessingFile(null);
    setRefreshTrigger(prev => prev + 1);
  };

  const confirmDelete = async () => {
    if (!deletingExpense) return;

    try {
      setDeleteLoading(true);
      await expenseApi.deleteExpense(deletingExpense.id);
      setShowDeleteConfirmation(false);
      setDeletingExpense(null);
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error deleting expense:', error);
      // You might want to show an error toast here
    } finally {
      setDeleteLoading(false);
    }
  };

  const closeDeleteConfirmation = () => {
    if (!deleteLoading) {
      setShowDeleteConfirmation(false);
      setDeletingExpense(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
        <p className="mt-2 text-sm text-gray-700">
          Manage your expenses and upload receipts
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={handleAddExpense}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Expense
        </button>
      </div>

      {/* File Upload Section */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900">Upload Receipt</h3>
            <p className="mt-1 text-sm text-gray-500">
              Upload a receipt image or PDF to automatically extract expense information using AI
            </p>
          </div>
          
          <FileUpload
            onFileSelect={handleFileSelect}
            onCameraCapture={handleCameraCapture}
            accept="image/*,.pdf"
            maxSize={10}
          />
        </div>
      </div>

      {/* Expense List */}
      <ExpenseList
        onEditExpense={handleEditExpense}
        onDeleteExpense={handleDeleteExpense}
        refreshTrigger={refreshTrigger}
      />

      {/* Modals */}
      <ExpenseForm
        isOpen={showExpenseForm}
        onClose={() => {
          setShowExpenseForm(false);
          setEditingExpense(null);
        }}
        onSave={handleExpenseSaved}
        expense={editingExpense}
      />

      <CameraCapture
        isOpen={showCameraCapture}
        onClose={() => setShowCameraCapture(false)}
        onCapture={handleCameraPhoto}
      />

      <ReceiptProcessor
        isOpen={showReceiptProcessor}
        onClose={() => {
          setShowReceiptProcessor(false);
          setProcessingFile(null);
        }}
        onExpenseCreated={handleExpenseCreatedFromReceipt}
        file={processingFile}
      />

      <DeleteConfirmation
        isOpen={showDeleteConfirmation}
        onClose={closeDeleteConfirmation}
        onConfirm={confirmDelete}
        expense={deletingExpense}
        loading={deleteLoading}
      />
    </div>
  );
};

export default Expenses;