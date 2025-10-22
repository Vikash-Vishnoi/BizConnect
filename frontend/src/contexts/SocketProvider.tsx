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

  // Initialize services
  useEffect(() => {
    const init = async () => {
      // Initialize notification service
      await notificationService.initialize();

      // Initialize offline queue
      await offlineQueueService.initialize();

      // Connect socket to backend server
      try {
        await socketService.connect();
        console.log('Socket connection initiated');
      } catch (error) {
        console.error('Socket connection failed:', error);
      }
    };

    init();

    // Subscribe to socket state changes
    const unsubscribeSocket = socketService.subscribeToState(state => {
      setSocketState(state);
    });

    // Subscribe to offline queue changes
    const unsubscribeQueue = offlineQueueService.subscribe(state => {
      setOfflineQueue(state);
    });

    // Handle app state changes (background/foreground)
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

  // Handle app state changes
  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      // App came to foreground
      // TODO: Uncomment when backend server is ready
      // if (!socketService.isConnected()) {
      //   socketService.connect();
      // }
      
      // Sync offline queue
      offlineQueueService.syncQueue();
    } else if (nextAppState === 'background') {
      // App went to background
      console.log('App went to background');
    }
  };

  // Setup socket event handlers
  useEffect(() => {
    socketService.on({
      onNewMessage: (data: NewMessageNotification) => {
        console.log('New message received:', data);
        
        // Show notification
        notificationService.notifyNewMessage({
          conversationId: data.conversationId,
          from: data.from,
          message: data.text,
        });

        // Increment badge
        notificationService.incrementBadge();
      },

      onCampaignCompleted: (data: {campaignId: string; name?: string; stats?: any}) => {
        console.log('Campaign completed:', data);
        
        // Show notification
        if (data.name && data.stats) {
          notificationService.notifyCampaignCompleted({
            campaignId: data.campaignId,
            campaignName: data.name,
            stats: data.stats,
          });
        }
      },

      onTemplateStatusUpdate: (data: TemplateStatusUpdate) => {
        console.log('Template status updated:', data);
        
        // Show notification for status changes
        if (data.status === 'approved' || data.status === 'rejected') {
          notificationService.notifyTemplateStatus({
            templateId: data.templateId,
            templateName: 'Template', // You might want to pass this from the event
            status: data.status,
            reason: data.reason,
          });
        }
      },

      onQualityScoreUpdate: (data: {score: number; status: string}) => {
        console.log('Quality score updated:', data);
        
        // Show alert if quality is low
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

  // Connection methods
  const connect = useCallback(() => {
    socketService.connect();
  }, []);

  const disconnect = useCallback(() => {
    socketService.disconnect();
  }, []);

  // Event subscription methods
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
    onTemplateStatusUpdate,
    onAnalyticsUpdate,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};

export default SocketProvider;
