import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { notificationService, type NotificationPermission } from '../services/notificationService';
import { notificationApi, type NotificationPreferences } from '../services/notificationApi';

interface NotificationContextType {
  // Permission and subscription state
  permission: NotificationPermission;
  isSubscribed: boolean;
  isSupported: boolean;
  isLoading: boolean;
  
  // Preferences
  preferences: NotificationPreferences | null;
  
  // Actions
  requestPermission: () => Promise<boolean>;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  updatePreferences: (updates: Partial<NotificationPreferences>) => Promise<void>;
  sendTestNotification: () => Promise<void>;
  
  // Error state
  error: string | null;
  clearError: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize notification state
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        setIsLoading(true);
        
        // Check if notifications are supported
        const supported = notificationService.isSupported();
        setIsSupported(supported);
        
        if (!supported) {
          setIsLoading(false);
          return;
        }

        // Get current permission status
        const currentPermission = notificationService.getPermissionStatus();
        setPermission(currentPermission);

        // Check subscription status
        const subscribed = await notificationService.isSubscribed();
        setIsSubscribed(subscribed);

        // Load preferences if user is authenticated
        try {
          const userPreferences = await notificationApi.getPreferences();
          setPreferences(userPreferences);
        } catch (error) {
          // User might not be authenticated yet
          console.log('Could not load notification preferences:', error);
        }

        // Setup message listener for service worker
        notificationService.setupMessageListener();

      } catch (error) {
        console.error('Failed to initialize notifications:', error);
        setError('Failed to initialize notifications');
      } finally {
        setIsLoading(false);
      }
    };

    initializeNotifications();
  }, []);

  const requestPermission = async (): Promise<boolean> => {
    try {
      setError(null);
      const newPermission = await notificationService.requestPermission();
      setPermission(newPermission);
      return newPermission === 'granted';
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to request permission';
      setError(errorMessage);
      return false;
    }
  };

  const subscribe = async (): Promise<boolean> => {
    try {
      setError(null);
      setIsLoading(true);

      // Request permission if not granted
      if (permission !== 'granted') {
        console.log('Requesting notification permission...');
        const permissionGranted = await requestPermission();
        if (!permissionGranted) {
          setIsLoading(false);
          return false;
        }
      }

      // Subscribe to push notifications
      console.log('Subscribing to push notifications...');
      const subscriptionInfo = await notificationService.subscribe();
      if (subscriptionInfo) {
        setIsSubscribed(true);
        console.log('Successfully subscribed to notifications');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Subscription error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to subscribe to notifications';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async (): Promise<boolean> => {
    try {
      setError(null);
      setIsLoading(true);

      const success = await notificationService.unsubscribe();
      if (success) {
        setIsSubscribed(false);
      }

      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to unsubscribe from notifications';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updatePreferences = async (updates: Partial<NotificationPreferences>): Promise<void> => {
    try {
      setError(null);
      const updatedPreferences = await notificationApi.updatePreferences(updates);
      setPreferences(updatedPreferences);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update preferences';
      setError(errorMessage);
      throw error;
    }
  };

  const sendTestNotification = async (): Promise<void> => {
    try {
      setError(null);
      await notificationApi.sendTestNotification({
        title: 'Test Notification',
        message: 'This is a test notification from Expense Tracker!',
        data: { type: 'test' }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send test notification';
      setError(errorMessage);
      throw error;
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value: NotificationContextType = {
    permission,
    isSubscribed,
    isSupported,
    isLoading,
    preferences,
    requestPermission,
    subscribe,
    unsubscribe,
    updatePreferences,
    sendTestNotification,
    error,
    clearError
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};