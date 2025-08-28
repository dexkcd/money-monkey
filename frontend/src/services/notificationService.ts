import { notificationApi, type SubscriptionData } from './notificationApi';

export type NotificationPermission = 'default' | 'granted' | 'denied';

export interface PushSubscriptionInfo {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

class NotificationService {
  private vapidPublicKey: string | null = null;

  // Check if notifications are supported
  isSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
  }

  // Get current notification permission status
  getPermissionStatus(): NotificationPermission {
    if (!this.isSupported()) {
      return 'denied';
    }
    return Notification.permission as NotificationPermission;
  }

  // Request notification permission
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      throw new Error('Notifications are not supported in this browser');
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    try {
      // Add timeout to prevent hanging
      const permission = await Promise.race([
        Notification.requestPermission(),
        new Promise<NotificationPermission>((_, reject) => 
          setTimeout(() => reject(new Error('Permission request timed out')), 30000)
        )
      ]);
      return permission as NotificationPermission;
    } catch (error) {
      console.error('Permission request failed:', error);
      throw error;
    }
  }

  // Get VAPID public key from server
  private async getVapidPublicKey(): Promise<string> {
    if (!this.vapidPublicKey) {
      this.vapidPublicKey = await notificationApi.getVapidPublicKey();
    }
    return this.vapidPublicKey;
  }

  // Convert VAPID key to Uint8Array
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    try {
      // Remove any whitespace and ensure proper base64url format
      const cleanBase64 = base64String.trim();
      
      // Add padding if needed for base64url decoding
      const padding = '='.repeat((4 - cleanBase64.length % 4) % 4);
      const base64 = (cleanBase64 + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);

      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      
      console.log('Converted VAPID key:', {
        original: base64String,
        converted: outputArray,
        length: outputArray.length
      });
      
      return outputArray;
    } catch (error) {
      console.error('Failed to convert VAPID key:', error);
      throw new Error(`Invalid VAPID key format: ${error}`);
    }
  }

  // Subscribe to push notifications
  async subscribe(): Promise<PushSubscriptionInfo | null> {
    try {
      // Check permission
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;
      if (!registration) {
        throw new Error('Service worker not ready');
      }

      // Get VAPID public key
      const vapidPublicKey = await this.getVapidPublicKey();
      console.log('Retrieved VAPID public key:', vapidPublicKey);
      
      // Validate VAPID key format
      if (!vapidPublicKey || vapidPublicKey.length < 60) {
        throw new Error('Invalid VAPID public key received from server');
      }
      
      const applicationServerKey = this.urlBase64ToUint8Array(vapidPublicKey);
      
      // Validate converted key
      if (applicationServerKey.length !== 65) {
        throw new Error(`Invalid VAPID key length: expected 65 bytes, got ${applicationServerKey.length}`);
      }

      console.log('Subscribing with application server key:', applicationServerKey);

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      });

      // Extract subscription info
      const subscriptionInfo: PushSubscriptionInfo = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))),
          auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!)))
        }
      };

      // Send subscription to server
      const subscriptionData: SubscriptionData = {
        endpoint: subscriptionInfo.endpoint,
        p256dh_key: subscriptionInfo.keys.p256dh,
        auth_key: subscriptionInfo.keys.auth
      };

      await notificationApi.createSubscription(subscriptionData);

      console.log('Push notification subscription successful:', subscriptionInfo);
      return subscriptionInfo;

    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      throw error;
    }
  }

  // Unsubscribe from push notifications
  async unsubscribe(): Promise<boolean> {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const success = await subscription.unsubscribe();
        
        if (success) {
          // Get all subscriptions and deactivate the matching one
          const subscriptions = await notificationApi.getSubscriptions();
          const matchingSubscription = subscriptions.find(sub => sub.endpoint === subscription.endpoint);
          
          if (matchingSubscription) {
            await notificationApi.deactivateSubscription(matchingSubscription.id);
          }
        }

        return success;
      }

      return true;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      return false;
    }
  }

  // Check if user is currently subscribed
  async isSubscribed(): Promise<boolean> {
    try {
      if (!this.isSupported() || Notification.permission !== 'granted') {
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      return subscription !== null;
    } catch (error) {
      console.error('Failed to check subscription status:', error);
      return false;
    }
  }

  // Get current subscription info
  async getSubscription(): Promise<PushSubscriptionInfo | null> {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        return null;
      }

      return {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))),
          auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!)))
        }
      };
    } catch (error) {
      console.error('Failed to get subscription info:', error);
      return null;
    }
  }

  // Show a local notification (for testing)
  async showLocalNotification(title: string, options?: NotificationOptions): Promise<void> {
    if (Notification.permission !== 'granted') {
      throw new Error('Notification permission not granted');
    }

    const notification = new Notification(title, {
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      ...options
    });

    // Auto-close after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);
  }

  // Listen for messages from service worker
  setupMessageListener(): void {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('Received message from service worker:', event.data);
        
        if (event.data.type === 'NOTIFICATION_CLICKED') {
          // Handle notification click - navigate to appropriate page
          const targetUrl = event.data.targetUrl || '/';
          if (window.location.pathname !== targetUrl) {
            window.location.href = targetUrl;
          }
        }
      });
      
      // Handle service worker errors
      navigator.serviceWorker.addEventListener('error', (error) => {
        console.error('Service worker error:', error);
      });
    }
  }
}

export const notificationService = new NotificationService();