

export const colors = {
  // Brand color palette - Industry Standard
  primary: '#5e69ee', // Main brand color (60% usage) - backgrounds, main elements
  primaryLight: '#8891f2', // Lighter variant
  primaryDark: '#4a54d1', // Darker variant for depth

  secondary: '#39AFEA', // Secondary brand color (30% usage) - 2nd level elements, text
  secondaryLight: '#6ec5f0', // Light secondary
  secondaryDark: '#2a8abd', // Dark secondary

  accent: '#F4F4FB', // Accent color (10% usage) - CTAs and accent touches
  accentLight: '#FFFFFF', // Light accent (pure white)
  accentDark: '#e8e8f5', // Slightly darker accent

  background: '#F9FAFB', // Off-white - clean minimal background
  surface: '#FFFFFF', // Pure white - cards and elevated surfaces
  card: '#FFFFFF', // Card background
  overlay: 'rgba(94, 105, 238, 0.15)', // Brand color overlay for modals

  text: '#1F2937', // Charcoal - primary text
  textSecondary: '#6B7280', // Gray - secondary text
  textTertiary: '#9CA3AF', // Light gray - tertiary text
  textInverse: '#FFFFFF', // White text for dark backgrounds

  border: '#E5E7EB', // Subtle border color
  divider: '#F3F4F6', // Divider lines
  input: '#D1D5DB', // Input border default
  inputFocus: '#5e69ee', // Input border when focused (brand primary)

  success: '#10B981', // Emerald - success states
  successLight: '#D1FAE5', // Light emerald background
  successDark: '#059669', // Dark emerald

  warning: '#F59E0B', // Amber - warning states
  warningLight: '#FEF3C7', // Light amber background
  warningDark: '#D97706', // Dark amber

  error: '#EF4444', // Red - error states
  errorLight: '#FEE2E2', // Light red background
  errorDark: '#DC2626', // Dark red

  info: '#39AFEA', // Sky blue - info states (matches secondary)
  infoLight: '#E0F2FE', // Light sky blue background
  infoDark: '#2a8abd', // Dark sky blue

  // Status colors for campaigns and templates
  campaignActive: '#10B981',
  campaignScheduled: '#39AFEA',
  campaignPaused: '#F59E0B',
  campaignCompleted: '#6B7280',

  // Message colors - clean, professional
  messageSent: '#EEF0FF', // Light brand primary background
  messageReceived: '#FFFFFF', // White background
  messageDelivered: '#E0F2FE', // Light blue
  messageRead: '#D1FAE5', // Light emerald
  messageFailed: '#FEE2E2', // Light red

  templateApproved: '#10B981',
  templatePending: '#F59E0B',
  templateRejected: '#EF4444',

  // Gradient support - Brand colors
  gradientStart: '#5e69ee', // Primary
  gradientMiddle: '#39AFEA', // Secondary
  gradientEnd: '#2a8abd', // Secondary dark

  chart: {
    primary: '#5e69ee', // Brand primary
    secondary: '#39AFEA', // Brand secondary
    tertiary: '#8891f2', // Light primary
    quaternary: '#10B981', // Emerald
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    gray: '#6B7280',
  },
};

export const typography = {
  h1: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 22,
    fontWeight: '600' as const,
    lineHeight: 30,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 26,
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
    fontWeight: '500' as const,
    lineHeight: 16,
  },
  captionMedium: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
  },

  button: {
    fontSize: 15,
    fontWeight: '600' as const,
    lineHeight: 22,
    letterSpacing: 0.5,
  },
  buttonSmall: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
    letterSpacing: 0.3,
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
  xxl: 32,
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
    small: 40,
    medium: 48,
    large: 56,
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
