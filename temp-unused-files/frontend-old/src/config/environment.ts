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
    ios: 'BACKEND_URL/api', // iOS simulator uses localhost
    default: 'BACKEND_URL/api',
  }) as string,
  socketUrl: Platform.select({
    android: 'http://10.0.2.2:3000', // Android emulator socket connection
    ios: 'BACKEND_URL', // iOS simulator socket connection
    default: 'BACKEND_URL',
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

