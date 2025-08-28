import React, { useState } from 'react';
import NotificationPermissionPrompt from '../components/Notifications/NotificationPermissionPrompt';
import NotificationStatus from '../components/Notifications/NotificationStatus';
import NotificationPreferences from '../components/Notifications/NotificationPreferences';
import NotificationLogs from '../components/Notifications/NotificationLogs';
import { useNotifications } from '../contexts/NotificationContext';

const Notifications: React.FC = () => {
  const { permission, isSupported } = useNotifications();
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(true);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
        <p className="mt-2 text-gray-600">
          Manage your notification preferences and stay informed about your budget status.
        </p>
      </div>

      {/* Permission Prompt */}
      {isSupported && permission !== 'granted' && showPermissionPrompt && (
        <NotificationPermissionPrompt onDismiss={() => setShowPermissionPrompt(false)} />
      )}

      {/* Notification Status */}
      <NotificationStatus />

      {/* Notification Preferences - Only show if notifications are supported and permission is granted */}
      {isSupported && permission === 'granted' && (
        <NotificationPreferences />
      )}

      {/* Notification History - Only show if notifications are supported */}
      {isSupported && (
        <NotificationLogs />
      )}

      {/* Help Section */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 mb-3">About Notifications</h3>
        <div className="space-y-3 text-sm text-blue-800">
          <p>
            <strong>Budget Warnings:</strong> Get notified when you reach a certain percentage of your budget limit.
            This helps you stay aware of your spending before you exceed your budget.
          </p>
          <p>
            <strong>Budget Exceeded:</strong> Receive immediate alerts when you go over your budget limits.
            This helps you take quick action to get back on track.
          </p>
          <p>
            <strong>Notification Requirements:</strong> To receive notifications, you need to:
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Use a supported browser (Chrome, Firefox, Safari, Edge)</li>
            <li>Grant notification permission when prompted</li>
            <li>Keep the website tab open or have the app installed as a PWA</li>
            <li>Have an active internet connection</li>
          </ul>
        </div>
      </div>

      {/* Troubleshooting */}
      {isSupported && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Troubleshooting</h3>
          <div className="space-y-3 text-sm text-gray-700">
            <div>
              <strong>Not receiving notifications?</strong>
              <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                <li>Check that notifications are enabled in your browser settings</li>
                <li>Make sure you're subscribed to notifications (green status above)</li>
                <li>Verify your notification preferences are enabled</li>
                <li>Try sending a test notification to verify everything is working</li>
              </ul>
            </div>
            <div>
              <strong>Notifications stopped working?</strong>
              <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                <li>Try disabling and re-enabling notifications</li>
                <li>Clear your browser cache and cookies</li>
                <li>Check if you accidentally blocked notifications for this site</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;