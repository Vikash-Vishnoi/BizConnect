import notifee, {
  AndroidImportance,
  EventType,
  Notification,
} from '@notifee/react-native';
import {Platform} from 'react-native';
import {
  PushNotification,
  NotificationPermission,
  NotificationType,
} from '../types/realtime';
import {storageService} from './storage';

class NotificationService {
  private channelId = 'whatsapp-marketing-channel';
  private listeners: Array<(notification: PushNotification) => void> = [];

  // Initialize notification service
  async initialize(): Promise<void> {
    try {
      // Create notification channel for Android
      if (Platform.OS === 'android') {
        await this.createChannel();
      }

      // Request permissions
      await this.requestPermission();

      // Setup foreground notification handler
      this.setupForegroundHandler();

      // Setup background notification handler
      this.setupBackgroundHandler();
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }
  }

  // Create Android notification channel
  private async createChannel(): Promise<void> {
    await notifee.createChannel({
      id: this.channelId,
      name: 'WhatsApp Marketing',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
    });
  }

  // Request notification permission
  async requestPermission(): Promise<NotificationPermission> {
    try {
      const settings = await notifee.requestPermission();
      
      const status =
        settings.authorizationStatus === 1
          ? 'granted'
          : settings.authorizationStatus === 2
          ? 'denied'
          : 'default';

      const permission: NotificationPermission = {status};

      // Store permission status would go here if needed

      return permission;
    } catch (error) {
      console.error('Failed to request permission:', error);
      return {status: 'denied'};
    }
  }

  // Check permission status
  async getPermission(): Promise<NotificationPermission> {
    try {
      const settings = await notifee.getNotificationSettings();
      const status =
        settings.authorizationStatus === 1
          ? 'granted'
          : settings.authorizationStatus === 2
          ? 'denied'
          : 'default';

      return {status};
    } catch (error) {
      console.error('Failed to get permission:', error);
      return {status: 'default'};
    }
  }

  // Display local notification
  async displayNotification(
    notification: Partial<PushNotification>
  ): Promise<string | void> {
    try {
      const permission = await this.getPermission();
      
      if (permission.status !== 'granted') {
        console.warn('Notification permission not granted');
        return;
      }

      const notificationId = await notifee.displayNotification({
        title: notification.title,
        body: notification.body,
        android: {
          channelId: this.channelId,
          importance: AndroidImportance.HIGH,
          pressAction: {
            id: 'default',
          },
          smallIcon: 'ic_launcher',
        },
        ios: {
          sound: 'default',
        },
        data: notification.data,
      });

      // Notify listeners
      this.notifyListeners({
        id: notificationId,
        type: (notification.type as NotificationType) || 'new_message',
        title: notification.title || '',
        body: notification.body || '',
        data: notification.data,
        timestamp: new Date().toISOString(),
        read: false,
      });

      return notificationId;
    } catch (error) {
      console.error('Failed to display notification:', error);
    }
  }

  // Setup foreground notification handler
  private setupForegroundHandler(): void {
    notifee.onForegroundEvent(async ({type, detail}) => {
      switch (type) {
        case EventType.DISMISSED:
          console.log('Notification dismissed', detail.notification);
          break;
        case EventType.PRESS:
          console.log('Notification pressed', detail.notification);
          // Handle notification tap
          this.handleNotificationPress(detail.notification);
          break;
      }
    });
  }

  // Setup background notification handler
  private setupBackgroundHandler(): void {
    notifee.onBackgroundEvent(async ({type, detail}) => {
      console.log('Background notification event:', type, detail);
      
      if (type === EventType.PRESS) {
        this.handleNotificationPress(detail.notification);
      }
    });
  }

  // Handle notification press
  private handleNotificationPress(notification?: Notification): void {
    if (!notification?.data) return;

    const data = notification.data;
    console.log('Handle notification press:', data);

    // You can navigate to specific screens based on notification type
    // This will be implemented in the SocketProvider
  }

  // Subscribe to notifications
  subscribe(listener: (notification: PushNotification) => void): () => void {
    this.listeners.push(listener);
    
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notify all listeners
  private notifyListeners(notification: PushNotification): void {
    this.listeners.forEach(listener => listener(notification));
  }

  // Show new message notification
  async notifyNewMessage(data: {
    conversationId: string;
    from: string;
    message: string;
  }): Promise<void> {
    await this.displayNotification({
      type: 'new_message',
      title: `New message from ${data.from}`,
      body: data.message,
      data: {
        type: 'new_message',
        conversationId: data.conversationId,
      },
    });
  }

  // Show campaign completed notification
  async notifyCampaignCompleted(data: {
    campaignId: string;
    campaignName: string;
    stats: {sent: number; delivered: number};
  }): Promise<void> {
    await this.displayNotification({
      type: 'campaign_completed',
      title: 'Campaign Completed',
      body: `${data.campaignName}: ${data.stats.delivered}/${data.stats.sent} messages delivered`,
      data: {
        type: 'campaign_completed',
        campaignId: data.campaignId,
      },
    });
  }

  // Show template status notification
  async notifyTemplateStatus(data: {
    templateId: string;
    templateName: string;
    status: 'approved' | 'rejected';
    reason?: string;
  }): Promise<void> {
    await this.displayNotification({
      type: data.status === 'approved' ? 'template_approved' : 'template_rejected',
      title: `Template ${data.status === 'approved' ? 'Approved' : 'Rejected'}`,
      body: data.status === 'approved'
        ? `${data.templateName} is now ready to use`
        : `${data.templateName}: ${data.reason || 'See details for more info'}`,
      data: {
        type: data.status === 'approved' ? 'template_approved' : 'template_rejected',
        templateId: data.templateId,
      },
    });
  }

  // Show quality score alert
  async notifyQualityScore(data: {
    score: number;
    status: string;
    message: string;
  }): Promise<void> {
    if (data.status === 'low' || data.status === 'medium') {
      await this.displayNotification({
        type: 'quality_score_alert',
        title: 'Quality Score Alert',
        body: data.message,
        data: {
          type: 'quality_score_alert',
          score: data.score,
        },
      });
    }
  }

  // Cancel notification
  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await notifee.cancelNotification(notificationId);
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  }

  // Cancel all notifications
  async cancelAllNotifications(): Promise<void> {
    try {
      await notifee.cancelAllNotifications();
    } catch (error) {
      console.error('Failed to cancel all notifications:', error);
    }
  }

  // Get badge count
  async getBadgeCount(): Promise<number> {
    try {
      if (Platform.OS === 'ios') {
        return await notifee.getBadgeCount();
      }
      return 0;
    } catch (error) {
      console.error('Failed to get badge count:', error);
      return 0;
    }
  }

  // Set badge count
  async setBadgeCount(count: number): Promise<void> {
    try {
      if (Platform.OS === 'ios') {
        await notifee.setBadgeCount(count);
      }
    } catch (error) {
      console.error('Failed to set badge count:', error);
    }
  }

  // Increment badge count
  async incrementBadge(): Promise<void> {
    const current = await this.getBadgeCount();
    await this.setBadgeCount(current + 1);
  }

  // Decrement badge count
  async decrementBadge(): Promise<void> {
    const current = await this.getBadgeCount();
    await this.setBadgeCount(Math.max(0, current - 1));
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;
