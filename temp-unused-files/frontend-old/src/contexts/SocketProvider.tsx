import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import {AppState, AppStateStatus} from 'react-native';
import socketService from '../services/socketService';
import notificationService from '../services/notificationService';
import offlineQueueService from '../services/offlineQueueService';
import {
  SocketState,
  OfflineQueueState,
  CampaignProgressUpdate,
  NewMessageNotification,
  MessageUpdate,
  MessageReaction,
  MessageDeleted,
  TemplateStatusUpdate,
  AnalyticsUpdate,
} from '../types/realtime';

interface SocketContextValue {
  socketState: SocketState;
  offlineQueue: OfflineQueueState;
  connect: () => void;
  disconnect: () => void;
  onCampaignProgress: (
    handler: (data: CampaignProgressUpdate) => void
  ) => () => void;
  onNewMessage: (handler: (data: NewMessageNotification) => void) => () => void;
  onMessageUpdate: (handler: (data: MessageUpdate) => void) => () => void;
  onMessageReacted: (handler: (data: MessageReaction) => void) => () => void;
  onMessageDeleted: (handler: (data: MessageDeleted) => void) => () => void;
  onConversationStatusChanged: (
    handler: (data: { conversationId: string; status: string; previousStatus?: string }) => void
  ) => () => void;
  onConversationNew: (
    handler: (data: { conversation: any }) => void
  ) => () => void;
  onTemplateStatusUpdate: (
    handler: (data: TemplateStatusUpdate) => void
  ) => () => void;
  onAnalyticsUpdate: (handler: (data: AnalyticsUpdate) => void) => () => void;
}

const SocketContext = createContext<SocketContextValue | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({children}) => {
  const [socketState, setSocketState] = useState<SocketState>(
    socketService.getState()
  );
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueueState>({
    messages: [],
    isSyncing: false,
    lastSync: null,
  });

  useEffect(() => {
    const init = async () => {
      await notificationService.initialize();

      await offlineQueueService.initialize();

      try {
        await socketService.connect();
        if (__DEV__) {
          console.log('Socket connection initiated');
        }
      } catch (error) {
        console.error('Socket connection failed:', error);
      }
    };

    init();

    const unsubscribeSocket = socketService.subscribeToState(state => {
      setSocketState(state);
    });

    const unsubscribeQueue = offlineQueueService.subscribe(state => {
      setOfflineQueue(state);
    });

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange
    );

    return () => {
      unsubscribeSocket();
      unsubscribeQueue();
      subscription.remove();
      socketService.disconnect();
    };
  }, []);

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {

      offlineQueueService.syncQueue();
    } else if (nextAppState === 'background') {
      if (__DEV__) {
        console.log('App went to background');
      }
    }
  };

  useEffect(() => {
    socketService.on({
      onNewMessage: (data: NewMessageNotification) => {
        if (__DEV__) {
          console.log('New message received:', data);
        }

        notificationService.notifyNewMessage({
          conversationId: data.conversationId,
          from: data.from,
          message: data.text,
        });

        notificationService.incrementBadge();
      },

      onCampaignCompleted: (data: {campaignId: string; name?: string; stats?: any}) => {
        if (__DEV__) {
          console.log('Campaign completed:', data);
        }

        if (data.name && data.stats) {
          notificationService.notifyCampaignCompleted({
            campaignId: data.campaignId,
            campaignName: data.name,
            stats: data.stats,
          });
        }
      },

      onTemplateStatusUpdate: (data: TemplateStatusUpdate) => {
        if (__DEV__) {
          console.log('Template status updated:', data);
        }

        if (data.status === 'approved' || data.status === 'rejected') {
          notificationService.notifyTemplateStatus({
            templateId: data.templateId,
            templateName: 'Template',
            status: data.status,
            reason: data.reason,
          });
        }
      },

      onQualityScoreUpdate: (data: {score: number; status: string}) => {
        if (__DEV__) {
          console.log('Quality score updated:', data);
        }

        if (data.status === 'low') {
          notificationService.notifyQualityScore({
            score: data.score,
            status: data.status,
            message: `Your quality score is ${data.score}. Take action to improve delivery rates.`,
          });
        }
      },
    });

    return () => {
      socketService.off();
    };
  }, []);

  const connect = useCallback(() => {
    socketService.connect();
  }, []);

  const disconnect = useCallback(() => {
    socketService.disconnect();
  }, []);

  const onCampaignProgress = useCallback(
    (handler: (data: CampaignProgressUpdate) => void) => {
      socketService.on({onCampaignProgress: handler});
      return () => socketService.off('onCampaignProgress');
    },
    []
  );

  const onNewMessage = useCallback(
    (handler: (data: NewMessageNotification) => void) => {
      socketService.on({onNewMessage: handler});
      return () => socketService.off('onNewMessage');
    },
    []
  );

  const onMessageUpdate = useCallback(
    (handler: (data: MessageUpdate) => void) => {
      socketService.on({onMessageUpdate: handler});
      return () => socketService.off('onMessageUpdate');
    },
    []
  );

  const onMessageReacted = useCallback(
    (handler: (data: MessageReaction) => void) => {
      socketService.on({onMessageReacted: handler});
      return () => socketService.off('onMessageReacted');
    },
    []
  );

  const onMessageDeleted = useCallback(
    (handler: (data: MessageDeleted) => void) => {
      socketService.on({onMessageDeleted: handler});
      return () => socketService.off('onMessageDeleted');
    },
    []
  );

  const onConversationStatusChanged = useCallback(
    (handler: (data: { conversationId: string; status: string; previousStatus?: string }) => void) => {
      socketService.on({ onConversationStatusChanged: handler as any });
      return () => socketService.off('onConversationStatusChanged');
    },
    []
  );

  const onConversationNew = useCallback(
    (handler: (data: { conversation: any }) => void) => {
      socketService.on({ onConversationNew: handler as any });
      return () => socketService.off('onConversationNew');
    },
    []
  );

  const onTemplateStatusUpdate = useCallback(
    (handler: (data: TemplateStatusUpdate) => void) => {
      socketService.on({onTemplateStatusUpdate: handler});
      return () => socketService.off('onTemplateStatusUpdate');
    },
    []
  );

  const onAnalyticsUpdate = useCallback(
    (handler: (data: AnalyticsUpdate) => void) => {
      socketService.on({onAnalyticsUpdate: handler});
      return () => socketService.off('onAnalyticsUpdate');
    },
    []
  );

  const value: SocketContextValue = {
    socketState,
    offlineQueue,
    connect,
    disconnect,
    onCampaignProgress,
    onNewMessage,
    onMessageUpdate,
    onMessageReacted,
    onMessageDeleted,
    onConversationStatusChanged,
    onConversationNew,
    onTemplateStatusUpdate,
    onAnalyticsUpdate,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};

export default SocketProvider;
