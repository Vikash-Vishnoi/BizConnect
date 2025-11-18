import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import theme from '../../theme';

interface BadgeProps {
  label: string;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'default';
  size?: 'small' | 'medium';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'default',
  size = 'medium',
  style,
  textStyle,
}) => {
  return (
    <View style={[
      styles.badge,
      styles[`${variant}Badge`],
      styles[`${size}Badge`],
      style,
    ]}>
      <Text style={[
        styles.text,
        styles[`${variant}Text`],
        styles[`${size}Text`],
        textStyle,
      ]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.base,
    alignSelf: 'flex-start',
  },
  
  // Sizes
  smallBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  mediumBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
  },

  // Variants
  successBadge: {
    backgroundColor: theme.colors.successLight,
  },
  warningBadge: {
    backgroundColor: theme.colors.warningLight,
  },
  errorBadge: {
    backgroundColor: theme.colors.errorLight,
  },
  infoBadge: {
    backgroundColor: theme.colors.infoLight,
  },
  defaultBadge: {
    backgroundColor: theme.colors.divider,
  },

  // Text
  text: {
    ...theme.typography.captionMedium,
    fontWeight: '600',
  },
  smallText: {
    fontSize: 10,
    lineHeight: 14,
  },
  mediumText: {
    ...theme.typography.captionMedium,
  },

  successText: {
    color: theme.colors.success,
  },
  warningText: {
    color: theme.colors.warning,
  },
  errorText: {
    color: theme.colors.error,
  },
  infoText: {
    color: theme.colors.info,
  },
  defaultText: {
    color: theme.colors.textSecondary,
  },
});

export default Badge;
