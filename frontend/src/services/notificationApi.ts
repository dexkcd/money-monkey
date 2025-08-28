import api from './api';

export interface NotificationSubscription {
  id: number;
  user_id: number;
  endpoint: string;
  is_active: boolean;
  created_at: string;
}

export interface NotificationPreferences {
  id: number;
  user_id: number;
  budget_warnings_enabled: boolean;
  budget_exceeded_enabled: boolean;
  warning_threshold: number;
  created_at: string;
  updated_at: string;
}

export interface NotificationLog {
  id: number;
  user_id: number;
  notification_type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  sent_at: string;
  success: boolean;
  error_message?: string;
}

export interface SubscriptionData {
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
}

export interface PreferencesUpdate {
  budget_warnings_enabled?: boolean;
  budget_exceeded_enabled?: boolean;
  warning_threshold?: number;
}

export interface TestNotificationRequest {
  title: string;
  message: string;
  data?: Record<string, any>;
}

export interface VapidKeyResponse {
  vapid_public_key: string;
}

class NotificationApiService {
  // Get VAPID public key for push subscription
  async getVapidPublicKey(): Promise<string> {
    const response = await api.get<VapidKeyResponse>('/notifications/vapid-public-key');
    return response.data.vapid_public_key;
  }

  // Create or update notification subscription
  async createSubscription(subscriptionData: SubscriptionData): Promise<NotificationSubscription> {
    const response = await api.post<NotificationSubscription>('/notifications/subscriptions', subscriptionData);
    return response.data;
  }

  // Get all user subscriptions
  async getSubscriptions(): Promise<NotificationSubscription[]> {
    const response = await api.get<NotificationSubscription[]>('/notifications/subscriptions');
    return response.data;
  }

  // Deactivate a subscription
  async deactivateSubscription(subscriptionId: number): Promise<void> {
    await api.delete(`/notifications/subscriptions/${subscriptionId}`);
  }

  // Get notification preferences
  async getPreferences(): Promise<NotificationPreferences> {
    const response = await api.get<NotificationPreferences>('/notifications/preferences');
    return response.data;
  }

  // Update notification preferences
  async updatePreferences(preferences: PreferencesUpdate): Promise<NotificationPreferences> {
    const response = await api.put<NotificationPreferences>('/notifications/preferences', preferences);
    return response.data;
  }

  // Get notification logs
  async getLogs(limit: number = 50): Promise<NotificationLog[]> {
    const response = await api.get<NotificationLog[]>(`/notifications/logs?limit=${limit}`);
    return response.data;
  }

  // Send test notification
  async sendTestNotification(testRequest: TestNotificationRequest): Promise<{ message: string; sent_count: number }> {
    const response = await api.post<{ message: string; sent_count: number }>('/notifications/test', testRequest);
    return response.data;
  }

  // Check budget alerts manually
  async checkBudgetAlerts(): Promise<{
    message: string;
    alerts_found: number;
    notifications_sent: number;
    details: any[];
  }> {
    const response = await api.post('/notifications/check-budget-alerts');
    return response.data;
  }

  // Get budget status
  async getBudgetStatus(): Promise<any> {
    const response = await api.get('/notifications/budget-status');
    return response.data;
  }
}

export const notificationApi = new NotificationApiService();