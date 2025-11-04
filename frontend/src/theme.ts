

export const colors = {
  primary: '#128C7E',
  primaryLight: '#25D366',
  primaryDark: '#075E54',

  secondary: '#34B7F1',
  accent: '#DCF8C6',

  background: '#F8FAFC',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.5)',

  text: '#1F2937',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textInverse: '#FFFFFF',

  border: '#E5E7EB',
  divider: '#F3F4F6',
  input: '#D1D5DB',

  success: '#10B981',
  successLight: '#D1FAE5',

  warning: '#F59E0B',
  warningLight: '#FEF3C7',

  error: '#EF4444',
  errorLight: '#FEE2E2',

  info: '#3B82F6',
  infoLight: '#DBEAFE',

  campaignActive: '#10B981',
  campaignScheduled: '#3B82F6',
  campaignPaused: '#F59E0B',
  campaignCompleted: '#6B7280',

  messageSent: '#DCF8C6',
  messageReceived: '#FFFFFF',
  messageDelivered: '#34B7F1',
  messageRead: '#25D366',
  messageFailed: '#EF4444',

  templateApproved: '#10B981',
  templatePending: '#F59E0B',
  templateRejected: '#EF4444',

  gradientStart: '#128C7E',
  gradientMiddle: '#1AA260',
  gradientEnd: '#25D366',

  chart: {
    primary: '#128C7E',
    secondary: '#34B7F1',
    tertiary: '#8B5CF6',
    quaternary: '#EC4899',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    gray: '#6B7280',
  },
};

export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
    letterSpacing: -0.2,
  },
  h4: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
    letterSpacing: -0.1,
  },
  h5: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 22,
  },

  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyMedium: {
    fontSize: 16,
    fontWeight: '500' as const,
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  bodySmallMedium: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
  },

  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  captionMedium: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
  },

  button: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
    letterSpacing: 0.3,
  },
  buttonSmall: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
    letterSpacing: 0.2,
  },

  label: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const borderRadius = {
  none: 0,
  sm: 4,
  base: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  base: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
};

export const animation = {
  duration: {
    fast: 150,
    base: 200,
    slow: 300,
    slower: 500,
  },
  easing: {
    linear: 'linear',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
};

export const layout = {
  screenPadding: spacing.base,

  cardMargin: spacing.md,
  cardPadding: spacing.base,

  listItemPadding: spacing.base,
  listItemSpacing: spacing.sm,

  buttonHeight: {
    small: 36,
    medium: 44,
    large: 52,
  },

  inputHeight: {
    small: 36,
    medium: 44,
    large: 52,
  },

  iconSize: {
    xs: 16,
    sm: 20,
    base: 24,
    md: 28,
    lg: 32,
    xl: 40,
  },

  avatarSize: {
    xs: 24,
    sm: 32,
    base: 40,
    md: 48,
    lg: 64,
    xl: 80,
  },
};

export const accessibility = {
  minTouchTarget: 44,

  contrastRatio: {
    normal: 4.5,
    large: 3,
  },
};

export const getGradient = () => ({
  colors: [colors.gradientStart, colors.gradientMiddle, colors.gradientEnd],
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
});

export const getStatusColor = (status: string): string => {
  const statusLower = status?.toLowerCase() || '';

  if (statusLower === 'active' || statusLower === 'approved' || statusLower === 'delivered' || statusLower === 'read') {
    return colors.success;
  }
  if (statusLower === 'scheduled' || statusLower === 'pending' || statusLower === 'sent') {
    return colors.info;
  }
  if (statusLower === 'paused' || statusLower === 'warning') {
    return colors.warning;
  }
  if (statusLower === 'completed' || statusLower === 'draft') {
    return colors.textSecondary;
  }
  if (statusLower === 'failed' || statusLower === 'rejected' || statusLower === 'error') {
    return colors.error;
  }

  return colors.textSecondary;
};

export const getStatusBackgroundColor = (status: string): string => {
  const statusLower = status?.toLowerCase() || '';

  if (statusLower === 'active' || statusLower === 'approved' || statusLower === 'delivered' || statusLower === 'read') {
    return colors.successLight;
  }
  if (statusLower === 'scheduled' || statusLower === 'pending' || statusLower === 'sent') {
    return colors.infoLight;
  }
  if (statusLower === 'paused' || statusLower === 'warning') {
    return colors.warningLight;
  }
  if (statusLower === 'failed' || statusLower === 'rejected' || statusLower === 'error') {
    return colors.errorLight;
  }

  return colors.divider;
};

export default {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  animation,
  layout,
  accessibility,
  getGradient,
  getStatusColor,
  getStatusBackgroundColor,
};
