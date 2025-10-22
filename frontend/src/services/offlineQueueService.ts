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

  // Initialize the queue from storage
  async initialize(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
        this.notifyListeners();
      }

      // Listen to network changes
      NetInfo.addEventListener(state => {
        if (state.isConnected && this.queue.length > 0) {
          this.syncQueue();
        }
      });
    } catch (error) {
      console.error('Failed to initialize offline queue:', error);
    }
  }

  // Add message to queue
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

    // Try to send immediately if online
    const netInfo = await NetInfo.fetch();
    if (netInfo.isConnected) {
      this.syncQueue();
    }

    return message;
  }

  // Sync queue when online
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

    // Process each message
    for (let i = this.queue.length - 1; i >= 0; i--) {
      const message = this.queue[i];

      if (message.status === 'sending') {
        continue; // Skip already processing messages
      }

      try {
        // Update status to sending
        message.status = 'sending';
        await this.saveQueue();
        this.notifyListeners();

        // Attempt to send message
        await conversationAPI.sendMessage({
          conversationId: message.conversationId,
          content: message.text,
        });

        // Success - remove from queue
        this.queue.splice(i, 1);
        console.log(`Message ${message.id} sent successfully`);
      } catch (error) {
        console.error(`Failed to send message ${message.id}:`, error);

        // Increment retry count
        message.retryCount++;
        message.status = 'failed';

        // Remove if max retries exceeded
        if (message.retryCount >= MAX_RETRY_ATTEMPTS) {
          console.log(`Message ${message.id} exceeded max retries, removing from queue`);
          message.error = 'Max retry attempts exceeded';
          this.queue.splice(i, 1);
        } else {
          // Reset to pending for next retry
          message.status = 'pending';
        }
      }
    }

    await this.saveQueue();
    this.isSyncing = false;
    this.notifyListeners();

    console.log(`Sync complete. ${this.queue.length} messages remaining in queue`);
  }

  // Remove message from queue
  async removeFromQueue(messageId: string): Promise<void> {
    const index = this.queue.findIndex(m => m.id === messageId);
    if (index !== -1) {
      this.queue.splice(index, 1);
      await this.saveQueue();
      this.notifyListeners();
    }
  }

  // Clear entire queue
  async clearQueue(): Promise<void> {
    this.queue = [];
    await this.saveQueue();
    this.notifyListeners();
  }

  // Get queue state
  getState(): OfflineQueueState {
    return {
      messages: [...this.queue],
      isSyncing: this.isSyncing,
      lastSync: this.queue.length === 0 ? new Date().toISOString() : null,
    };
  }

  // Get pending message count
  getPendingCount(): number {
    return this.queue.filter(m => m.status === 'pending').length;
  }

  // Get failed message count
  getFailedCount(): number {
    return this.queue.filter(m => m.status === 'failed').length;
  }

  // Subscribe to queue changes
  subscribe(listener: (state: OfflineQueueState) => void): () => void {
    this.listeners.push(listener);
    listener(this.getState());

    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Save queue to storage
  private async saveQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  // Notify all listeners
  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach(listener => listener(state));
  }

  // Retry failed messages
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

  // Check if message is in queue
  isInQueue(conversationId: string, text: string): boolean {
    return this.queue.some(
      m => m.conversationId === conversationId && m.text === text
    );
  }
}

// Export singleton instance
export const offlineQueueService = new OfflineQueueService();
export default offlineQueueService;
