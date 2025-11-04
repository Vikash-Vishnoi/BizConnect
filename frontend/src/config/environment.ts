import { Platform } from 'react-native';

interface EnvironmentConfig {
  apiBaseUrl: string;
  socketUrl: string;
  environment: 'development' | 'production';
}

const isDevelopment = __DEV__;

const developmentConfig: EnvironmentConfig = {
  apiBaseUrl: Platform.select({
    android: 'http://10.0.2.2:3000/api', // Android emulator uses 10.0.2.2 for localhost
    ios: 'http://localhost:3000/api', // iOS simulator uses localhost
    default: 'http://localhost:3000/api',
  }) as string,
  socketUrl: Platform.select({
    android: 'http://10.0.2.2:3000', // Android emulator socket connection
    ios: 'http://localhost:3000', // iOS simulator socket connection
    default: 'http://localhost:3000',
  }) as string,
  environment: 'development',
};

const productionConfig: EnvironmentConfig = {
  apiBaseUrl: 'https://your-production-url.com/api',
  socketUrl: 'https://your-production-url.com',
  environment: 'production',
};

export const config: EnvironmentConfig = isDevelopment
  ? developmentConfig
  : productionConfig;

export const isPhysicalDevice = !Platform.select({
  android: false,
  ios: false,
  default: true
});

