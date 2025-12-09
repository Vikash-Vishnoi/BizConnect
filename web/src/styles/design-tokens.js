/**
 * ============================================
 * WHATSAPP MARKETING APP - DESIGN TOKENS
 * ============================================
 * 
 * JavaScript/JSON version of the design system
 * Use these tokens in your React components
 * 
 * USAGE:
 * import { colors, spacing, typography } from '@/styles/design-tokens';
 * style={{ color: colors.primary, padding: spacing.md }}
 */

export const colors = {
  // Primary Colors
  primary: '#5e69ee',
  primaryLight: '#7d86f2',
  primaryDark: '#4a52d9',
  primaryHover: '#4a52d9',
  
  // Secondary Colors
  secondary: '#39AFEA',
  secondaryLight: '#68c5f0',
  secondaryDark: '#2a9ad4',
  secondaryHover: '#2a9ad4',
  
  // Accent Colors
  accent: '#F4F4FB',
  accentLight: '#FFFFFF',
  accentDark: '#E8E8F5',
  
  // Neutral Colors
  background: '#FAFBFC',
  backgroundAlt: '#f8f9fa',
  surface: '#FFFFFF',
  overlay: 'rgba(15, 23, 42, 0.6)',
  
  // Text Colors
  text: '#0F172A',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  textInverse: '#FFFFFF',
  textMuted: '#94A3B8',
  
  // Border Colors
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  borderDark: '#CBD5E1',
  divider: '#F1F5F9',
  
  // Semantic Colors
  success: '#10B981',
  successLight: '#D1FAE5',
  successDark: '#059669',
  
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  warningDark: '#d97706',
  
  error: '#EF4444',
  errorLight: '#FEE2E2',
  errorDark: '#dc2626',
  
  info: '#39AFEA',
  infoLight: '#E0F2FE',
  infoDark: '#2563eb',
};

export const typography = {
  // Font Families
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif",
  fontFamilyMono: "'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Courier New', monospace",
  
  // Font Sizes
  fontSize: {
    xs: '11px',
    sm: '12px',
    base: '14px',
    md: '15px',
    lg: '16px',
    xl: '18px',
    '2xl': '20px',
    '3xl': '22px',
    '4xl': '24px',
    '5xl': '28px',
  },
  
  // Font Weights
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
  
  // Line Heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
  
  // Letter Spacing
  letterSpacing: {
    tight: '-0.5px',
    normal: '0',
    wide: '0.5px',
  },
};

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  base: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '40px',
  '3xl': '48px',
  '4xl': '64px',
  '5xl': '80px',
  '6xl': '96px',
};

export const borderRadius = {
  none: '0',
  sm: '4px',
  base: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  '2xl': '32px',
  full: '9999px',
};

export const shadows = {
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  base: '0 2px 4px 0 rgba(0, 0, 0, 0.1)',
  md: '0 3px 6px 0 rgba(0, 0, 0, 0.12)',
  lg: '0 4px 8px 0 rgba(0, 0, 0, 0.15)',
  xl: '0 6px 12px 0 rgba(0, 0, 0, 0.2)',
  '2xl': '0 8px 16px 0 rgba(0, 0, 0, 0.25)',
  '3xl': '0 12px 24px 0 rgba(0, 0, 0, 0.3)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
  outline: '0 0 0 3px rgba(94, 105, 238, 0.1)',
  outlineError: '0 0 0 3px rgba(239, 68, 68, 0.1)',
  outlineSuccess: '0 0 0 3px rgba(16, 185, 129, 0.1)',
};

export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  notification: 9999,
};

export const transitions = {
  fast: '150ms ease-in-out',
  base: '200ms ease-in-out',
  slow: '300ms ease-in-out',
  slower: '500ms ease-in-out',
  
  // Easing Functions
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easeSpring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
};

export const componentSizes = {
  // Button Heights
  button: {
    sm: '40px',
    md: '48px',
    lg: '56px',
  },
  
  // Input Heights
  input: {
    sm: '40px',
    md: '48px',
    lg: '56px',
  },
  
  // Icon Sizes
  icon: {
    xs: '16px',
    sm: '20px',
    md: '24px',
    lg: '32px',
    xl: '40px',
  },
  
  // Avatar Sizes
  avatar: {
    xs: '24px',
    sm: '32px',
    md: '40px',
    lg: '56px',
    xl: '80px',
  },
};

export const breakpoints = {
  xs: '480px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

export const containers = {
  xs: '480px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

export const gradients = {
  primary: 'linear-gradient(135deg, #5e69ee 0%, #4a52d9 100%)',
  secondary: 'linear-gradient(135deg, #39AFEA 0%, #2a9ad4 100%)',
  success: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
  warning: 'linear-gradient(135deg, #F59E0B 0%, #d97706 100%)',
  error: 'linear-gradient(135deg, #EF4444 0%, #dc2626 100%)',
  purple: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  blue: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
  surface: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
};

export const opacity = {
  disabled: 0.5,
  hover: 0.8,
  muted: 0.6,
  subtle: 0.1,
};

// Status/Badge Colors Map
export const statusColors = {
  success: colors.success,
  pending: colors.warning,
  failed: colors.error,
  active: colors.success,
  inactive: colors.textTertiary,
  approved: colors.success,
  rejected: colors.error,
  draft: colors.textSecondary,
  scheduled: colors.info,
  completed: colors.success,
  processing: colors.warning,
};

// Role Colors Map
export const roleColors = {
  owner: colors.primary,
  admin: colors.error,
  manager: colors.secondary,
  agent: colors.success,
  viewer: colors.textSecondary,
};

// Export all as default object
const designTokens = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  zIndex,
  transitions,
  componentSizes,
  breakpoints,
  containers,
  gradients,
  opacity,
  statusColors,
  roleColors,
};

export default designTokens;
