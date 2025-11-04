import React, {useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../types/navigation';
import {storageService} from '../services/storage';
import {authAPI} from '../services/api';

type SplashScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Splash'
>;

interface Props {
  navigation: SplashScreenNavigationProp;
}

const SplashScreen: React.FC<Props> = ({navigation}) => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await storageService.getToken();
      const rememberMe = await storageService.getRememberMe();

      await new Promise(resolve => setTimeout(resolve, 1500));

      if (token && rememberMe) {
        try {
          const user = await authAPI.me();
          navigation.replace('Dashboard', {user});
        } catch (error) {
          console.log('Token validation failed:', error);
          await storageService.clearAuth();
          navigation.replace('Login');
        }
      } else {
        await storageService.clearAuth();
        navigation.replace('Login');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      navigation.replace('Login');
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, {opacity: fadeAnim}]}>
        {}
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>📱</Text>
        </View>

        {}
        <Text style={styles.title}>WhatsApp Marketing</Text>
        <Text style={styles.subtitle}>Business Communication Platform</Text>

        {}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#25D366" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </Animated.View>

      {}
      <Text style={styles.version}>Version 1.0.0</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 20,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#25D366',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#999',
  },
  version: {
    position: 'absolute',
    bottom: 30,
    fontSize: 12,
    color: '#999',
  },
});

export default SplashScreen;
