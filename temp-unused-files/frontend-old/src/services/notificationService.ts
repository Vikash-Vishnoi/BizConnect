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

  async initialize(): Promise<void> {
    try {
      if (Platform.OS === 'android') {
        await this.createChannel();
      }

      await this.requestPermission();

      this.setupForegroundHandler();

      this.setupBackgroundHandler();
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }
  }

  private async createChannel(): Promise<void> {
    await notifee.createChannel({
      id: this.channelId,
      name: 'WhatsApp Marketing',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
    });
  }

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

      return permission;
    } catch (error) {
      console.error('Failed to request permission:', error);
      return {status: 'denied'};
    }
  }

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

  private setupForegroundHandler(): void {
    notifee.onForegroundEvent(async ({type, detail}) => {
      switch (type) {
        case EventType.DISMISSED:
          console.log('Notification dismissed', detail.notification);
          break;
        case EventType.PRESS:
          console.log('Notification pressed', detail.notification);
          this.handleNotificationPress(detail.notification);
          break;
      }
    });
  }

  private setupBackgroundHandler(): void {
    notifee.onBackgroundEvent(async ({type, detail}) => {
      console.log('Background notification event:', type, detail);

      if (type === EventType.PRESS) {
        this.handleNotificationPress(detail.notification);
      }
    });
  }

  private handleNotificationPress(notification?: Notification): void {
    if (!notification?.data) return;

    const data = notification.data;
    console.log('Handle notification press:', data);

  }

  subscribe(listener: (notification: PushNotification) => void): () => void {
    this.listeners.push(listener);

    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(notification: PushNotification): void {
    this.listeners.forEach(listener => listener(notification));
  }

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

  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await notifee.cancelNotification(notificationId);
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  }

  async cancelAllNotifications(): Promise<void> {
    try {
      await notifee.cancelAllNotifications();
    } catch (error) {
      console.error('Failed to cancel all notifications:', error);
    }
  }

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

  async setBadgeCount(count: number): Promise<void> {
    try {
      if (Platform.OS === 'ios') {
        await notifee.setBadgeCount(count);
      }
    } catch (error) {
      console.error('Failed to set badge count:', error);
    }
  }

  async incrementBadge(): Promise<void> {
    const current = await this.getBadgeCount();
    await this.setBadgeCount(current + 1);
  }

  async decrementBadge(): Promise<void> {
    const current = await this.getBadgeCount();
    await this.setBadgeCount(Math.max(0, current - 1));
  }
}

export const notificationService = new NotificationService();
export default notificationService;
