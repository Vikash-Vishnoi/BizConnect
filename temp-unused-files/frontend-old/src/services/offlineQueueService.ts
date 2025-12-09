import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import {QueuedMessage, OfflineQueueState} from '../types/realtime';
import {conversationAPI} from './conversationService';

const QUEUE_STORAGE_KEY = '@offline_queue';
const MAX_RETRY_ATTEMPTS = 3;

class OfflineQueueService {
  private queue: QueuedMessage[] = [];
  private isSyncing = false;
  private listeners: Array<(state: OfflineQueueState) => void> = [];

  async initialize(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
        this.notifyListeners();
      }

      NetInfo.addEventListener(state => {
        if (state.isConnected && this.queue.length > 0) {
          this.syncQueue();
        }
      });
    } catch (error) {
      console.error('Failed to initialize offline queue:', error);
    }
  }

  async addToQueue(
    conversationId: string,
    text: string
  ): Promise<QueuedMessage> {
    const message: QueuedMessage = {
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      conversationId,
      text,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      status: 'pending',
    };

    this.queue.push(message);
    await this.saveQueue();
    this.notifyListeners();

    const netInfo = await NetInfo.fetch();
    if (netInfo.isConnected) {
      this.syncQueue();
    }

    return message;
  }

  async syncQueue(): Promise<void> {
    if (this.isSyncing || this.queue.length === 0) {
      return;
    }

    this.isSyncing = true;
    this.notifyListeners();

    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      console.log('Cannot sync: No internet connection');
      this.isSyncing = false;
      this.notifyListeners();
      return;
    }

    console.log(`Syncing ${this.queue.length} queued messages...`);

    for (let i = this.queue.length - 1; i >= 0; i--) {
      const message = this.queue[i];

      if (message.status === 'sending') {
        continue;
      }

      try {
        message.status = 'sending';
        await this.saveQueue();
        this.notifyListeners();

        await conversationAPI.sendMessage({
          conversationId: message.conversationId,
          content: message.text,
        });

        this.queue.splice(i, 1);
        console.log(`Message ${message.id} sent successfully`);
      } catch (error) {
        console.error(`Failed to send message ${message.id}:`, error);

        message.retryCount++;
        message.status = 'failed';

        if (message.retryCount >= MAX_RETRY_ATTEMPTS) {
          console.log(`Message ${message.id} exceeded max retries, removing from queue`);
          message.error = 'Max retry attempts exceeded';
          this.queue.splice(i, 1);
        } else {
          message.status = 'pending';
        }
      }
    }

    await this.saveQueue();
    this.isSyncing = false;
    this.notifyListeners();

    console.log(`Sync complete. ${this.queue.length} messages remaining in queue`);
  }

  async removeFromQueue(messageId: string): Promise<void> {
    const index = this.queue.findIndex(m => m.id === messageId);
    if (index !== -1) {
      this.queue.splice(index, 1);
      await this.saveQueue();
      this.notifyListeners();
    }
  }

  async clearQueue(): Promise<void> {
    this.queue = [];
    await this.saveQueue();
    this.notifyListeners();
  }

  getState(): OfflineQueueState {
    return {
      messages: [...this.queue],
      isSyncing: this.isSyncing,
      lastSync: this.queue.length === 0 ? new Date().toISOString() : null,
    };
  }

  getPendingCount(): number {
    return this.queue.filter(m => m.status === 'pending').length;
  }

  getFailedCount(): number {
    return this.queue.filter(m => m.status === 'failed').length;
  }

  subscribe(listener: (state: OfflineQueueState) => void): () => void {
    this.listeners.push(listener);
    listener(this.getState());

    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private async saveQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach(listener => listener(state));
  }

  async retryFailed(): Promise<void> {
    const failedMessages = this.queue.filter(m => m.status === 'failed');
    failedMessages.forEach(m => {
      m.status = 'pending';
      m.retryCount = 0;
    });
    await this.saveQueue();
    this.notifyListeners();
    await this.syncQueue();
  }

  isInQueue(conversationId: string, text: string): boolean {
    return this.queue.some(
      m => m.conversationId === conversationId && m.text === text
    );
  }
}

export const offlineQueueService = new OfflineQueueService();
export default offlineQueueService;
