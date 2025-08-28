import React, { useState, useEffect } from 'react';
import { useNotifications } from '../../contexts/NotificationContext';

const NotificationPreferences: React.FC = () => {
  const { preferences, updatePreferences, isLoading, error } = useNotifications();
  const [localPreferences, setLocalPreferences] = useState({
    budget_warnings_enabled: true,
    budget_exceeded_enabled: true,
    warning_threshold: 80
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Update local state when preferences are loaded
  useEffect(() => {
    if (preferences) {
      setLocalPreferences({
        budget_warnings_enabled: preferences.budget_warnings_enabled,
        budget_exceeded_enabled: preferences.budget_exceeded_enabled,
        warning_threshold: preferences.warning_threshold
      });
    }
  }, [preferences]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveSuccess(false);
      
      await updatePreferences(localPreferences);
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save preferences:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = (field: keyof typeof localPreferences) => {
    setLocalPreferences(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleThresholdChange = (value: number) => {
    setLocalPreferences(prev => ({
      ...prev,
      warning_threshold: value
    }));
  };

  if (isLoading && !preferences) {
    return (
      <div className="bg-white rounded-lg border p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Preferences</h3>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {saveSuccess && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-600">Preferences saved successfully!</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Budget Warning Notifications */}
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              id="budget-warnings"
              type="checkbox"
              checked={localPreferences.budget_warnings_enabled}
              onChange={() => handleToggle('budget_warnings_enabled')}
              className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
          </div>
          <div className="ml-3 text-sm">
            <label htmlFor="budget-warnings" className="font-medium text-gray-700">
              Budget Warning Notifications
            </label>
            <p className="text-gray-500">
              Get notified when you reach the warning threshold of your budget
            </p>
          </div>
        </div>

        {/* Budget Exceeded Notifications */}
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              id="budget-exceeded"
              type="checkbox"
              checked={localPreferences.budget_exceeded_enabled}
              onChange={() => handleToggle('budget_exceeded_enabled')}
              className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
          </div>
          <div className="ml-3 text-sm">
            <label htmlFor="budget-exceeded" className="font-medium text-gray-700">
              Budget Exceeded Notifications
            </label>
            <p className="text-gray-500">
              Get notified when you exceed your budget limits
            </p>
          </div>
        </div>

        {/* Warning Threshold */}
        <div>
          <label htmlFor="warning-threshold" className="block text-sm font-medium text-gray-700 mb-2">
            Warning Threshold: {localPreferences.warning_threshold}%
          </label>
          <div className="flex items-center space-x-4">
            <input
              id="warning-threshold"
              type="range"
              min="50"
              max="95"
              step="5"
              value={localPreferences.warning_threshold}
              onChange={(e) => handleThresholdChange(parseInt(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex space-x-2 text-xs text-gray-500">
              <span>50%</span>
              <span>75%</span>
              <span>95%</span>
            </div>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            You'll receive a warning when you've spent this percentage of your budget
          </p>
        </div>

        {/* Notification Examples */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Notification Examples</h4>
          <div className="space-y-2 text-sm text-gray-600">
            {localPreferences.budget_warnings_enabled && (
              <div className="flex items-start">
                <svg className="h-4 w-4 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span>
                  "Budget Warning: Restaurants - You've spent $240 ({localPreferences.warning_threshold}%) of your $300 budget"
                </span>
              </div>
            )}
            {localPreferences.budget_exceeded_enabled && (
              <div className="flex items-start">
                <svg className="h-4 w-4 text-red-500 mt-0.5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  "Budget Exceeded: Grocery - You've exceeded your $200 budget by $25"
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationPreferences;