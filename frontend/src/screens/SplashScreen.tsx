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
import LinearGradient from 'react-native-linear-gradient';
import theme from '../theme';

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
          navigation.replace('Main');
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
    <LinearGradient
      colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
      start={{x: 0, y: 0}}
      end={{x: 1, y: 1}}
      style={styles.container}>
      <Animated.View style={[styles.content, {opacity: fadeAnim, transform: [{scale: fadeAnim}]}]}>
        {}
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>📱</Text>
        </View>

        {}
        <Text style={styles.title}>WhatsApp Marketing</Text>
        <Text style={styles.subtitle}>Business Communication Platform</Text>

        {}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.textInverse} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </Animated.View>

      {}
      <Text style={styles.version}>Version 1.0.0</Text>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    ...theme.shadows.lg,
  },
  icon: {
    fontSize: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.textInverse,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textInverse,
    marginBottom: theme.spacing.xxl,
    opacity: 0.9,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: theme.spacing.xl,
  },
  loadingText: {
    marginTop: theme.spacing.sm,
    fontSize: 14,
    color: theme.colors.textInverse,
    opacity: 0.8,
  },
  version: {
    position: 'absolute',
    bottom: theme.spacing.xl,
    fontSize: 12,
    color: theme.colors.textInverse,
    opacity: 0.7,
  },
});

export default SplashScreen;
