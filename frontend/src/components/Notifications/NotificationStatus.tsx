import React from 'react';
import { useNotifications } from '../../contexts/NotificationContext';

const NotificationStatus: React.FC = () => {
  const { 
    permission, 
    isSubscribed, 
    isSupported, 
    isLoading, 
    subscribe, 
    unsubscribe, 
    sendTestNotification,
    error 
  } = useNotifications();

  if (!isSupported) {
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center">
          <svg className="h-5 w-5 text-gray-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636" />
          </svg>
          <span className="text-sm text-gray-600">Notifications not supported in this browser</span>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
          <span className="text-sm text-gray-600">Loading notification status...</span>
        </div>
      </div>
    );
  }

  const getStatusColor = () => {
    if (permission === 'denied') return 'text-red-600';
    if (permission === 'granted' && isSubscribed) return 'text-green-600';
    return 'text-yellow-600';
  };

  const getStatusIcon = () => {
    if (permission === 'denied') {
      return (
        <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636" />
        </svg>
      );
    }
    if (permission === 'granted' && isSubscribed) {
      return (
        <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
    return (
      <svg className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    );
  };

  const getStatusText = () => {
    if (permission === 'denied') return 'Notifications blocked';
    if (permission === 'granted' && isSubscribed) return 'Notifications enabled';
    if (permission === 'granted' && !isSubscribed) return 'Permission granted, not subscribed';
    return 'Notifications disabled';
  };

  const handleToggleSubscription = async () => {
    try {
      if (isSubscribed) {
        await unsubscribe();
      } else {
        await subscribe();
      }
    } catch (error) {
      console.error('Failed to toggle subscription:', error);
    }
  };

  const handleTestNotification = async () => {
    try {
      await sendTestNotification();
    } catch (error) {
      console.error('Failed to send test notification:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          {getStatusIcon()}
          <div className="ml-3">
            <h3 className="text-sm font-medium text-gray-900">Push Notifications</h3>
            <p className={`text-sm ${getStatusColor()}`}>{getStatusText()}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="flex space-x-3">
        {permission === 'granted' && (
          <>
            <button
              onClick={handleToggleSubscription}
              disabled={isLoading}
              className={`px-3 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                isSubscribed
                  ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
                  : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoading ? 'Processing...' : isSubscribed ? 'Disable' : 'Enable'}
            </button>
            
            {isSubscribed && (
              <button
                onClick={handleTestNotification}
                disabled={isLoading}
                className="px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send Test
              </button>
            )}
          </>
        )}

        {permission === 'denied' && (
          <p className="text-sm text-gray-500">
            Please enable notifications in your browser settings to receive budget alerts.
          </p>
        )}

        {permission === 'default' && (
          <button
            onClick={subscribe}
            disabled={isLoading}
            className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Processing...' : 'Enable Notifications'}
          </button>
        )}
      </div>
    </div>
  );
};

export default NotificationStatus;