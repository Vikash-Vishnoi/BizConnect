import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, Animated} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import {NetworkState, SocketState} from '../types/realtime';

interface ConnectionStatusProps {
  socketState: SocketState;
  style?: any;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  socketState,
  style,
}) => {
  const [networkState, setNetworkState] = useState<NetworkState>({
    isConnected: true,
    isInternetReachable: null,
    type: null,
  });
  const [slideAnim] = useState(new Animated.Value(-100));
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    // Subscribe to network state
    const unsubscribe = NetInfo.addEventListener(state => {
      setNetworkState({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
      });
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Show status bar when offline or socket disconnected
    const shouldShow =
      !networkState.isConnected ||
      (!socketState.isConnected && !socketState.isConnecting);

    if (shouldShow !== showStatus) {
      setShowStatus(shouldShow);
      Animated.spring(slideAnim, {
        toValue: shouldShow ? 0 : -100,
        useNativeDriver: true,
        tension: 65,
        friction: 10,
      }).start();
    }
  }, [networkState.isConnected, socketState.isConnected, socketState.isConnecting, showStatus, slideAnim]);

  const getStatusInfo = () => {
    if (!networkState.isConnected) {
      return {
        icon: '📡',
        text: 'No Internet Connection',
        color: '#EF4444',
        bgColor: '#FEE2E2',
      };
    }

    if (socketState.isConnecting) {
      return {
        icon: '⏳',
        text: 'Connecting...',
        color: '#F59E0B',
        bgColor: '#FEF3C7',
      };
    }

    if (!socketState.isConnected) {
      return {
        icon: '⚠️',
        text: 'Real-time updates unavailable',
        color: '#F59E0B',
        bgColor: '#FEF3C7',
      };
    }

    return {
      icon: '✓',
      text: 'Connected',
      color: '#10B981',
      bgColor: '#D1FAE5',
    };
  };

  if (!showStatus) {
    return null;
  }

  const status = getStatusInfo();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: status.bgColor,
          transform: [{translateY: slideAnim}],
        },
        style,
      ]}>
      <Text style={[styles.icon, {color: status.color}]}>{status.icon}</Text>
      <Text style={[styles.text, {color: status.color}]}>{status.text}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  icon: {
    fontSize: 16,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default React.memo(ConnectionStatus);
