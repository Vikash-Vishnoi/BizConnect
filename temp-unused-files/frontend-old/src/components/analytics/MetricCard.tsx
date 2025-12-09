import React from 'react';
import {View, Text, StyleSheet, ViewStyle} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import theme from '../../theme';

const iconToEmoji: Record<string, string> = {
  'target': '🎯',
  'activity': '📊',
  'send': '📤',
  'message-circle': '💬',
  'users': '👥',
  'trending-up': '📈',
  'trending-down': '📉',
  'check-circle': '✅',
  'file-text': '📄',
  'bar-chart-2': '📊',
  'mail': '📧',
  'eye': '👁',
  'clock': '⏰',
  'calendar': '📅',
};

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: string;
  iconColor?: string;
  backgroundColor?: string;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  style?: ViewStyle;
  variant?: 'default' | 'gradient' | 'outlined';
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon,
  iconColor = theme.colors.primary,
  backgroundColor = theme.colors.background,
  subtitle,
  trend,
  style,
  variant = 'default',
}) => {
  const emoji = iconToEmoji[icon] || '📊';
  const trendEmoji = trend?.isPositive ? '📈' : '📉';

  const renderContent = () => (
    <>
      <View style={styles.header}>
        <View style={[styles.iconContainer, {backgroundColor}]}>
          <Text style={styles.iconEmoji}>{emoji}</Text>
        </View>
        {trend && (
          <View style={[styles.trendContainer, trend.isPositive ? styles.trendPositive : styles.trendNegative]}>
            <Text style={styles.trendEmoji}>{trendEmoji}</Text>
            <Text
              style={[
                styles.trendText,
                {color: trend.isPositive ? theme.colors.success : theme.colors.error},
              ]}>
              {Math.abs(trend.value)}%
            </Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.value}>{value}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
    </>
  );

  if (variant === 'gradient') {
    return (
      <LinearGradient
        colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={[styles.container, styles.gradientContainer, style]}>
        <View style={styles.header}>
          <View style={styles.iconContainerGradient}>
            <Text style={styles.iconEmojiGradient}>{emoji}</Text>
          </View>
          {trend && (
            <View style={styles.trendContainerGradient}>
              <Text style={styles.trendEmojiGradient}>{trendEmoji}</Text>
              <Text style={styles.trendTextGradient}>
                {Math.abs(trend.value)}%
              </Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          <Text style={styles.titleGradient}>{title}</Text>
          <Text style={styles.valueGradient}>{value}</Text>
          {subtitle && <Text style={styles.subtitleGradient}>{subtitle}</Text>}
        </View>
      </LinearGradient>
    );
  }

  if (variant === 'outlined') {
    return (
      <View style={[styles.container, styles.outlinedContainer, style]}>
        {renderContent()}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.base,
    ...theme.shadows.md,
  },
  gradientContainer: {
    backgroundColor: 'transparent',
  },
  outlinedContainer: {
    borderWidth: 2,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerGradient: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.base,
  },
  trendPositive: {
    backgroundColor: theme.colors.successLight,
  },
  trendNegative: {
    backgroundColor: theme.colors.errorLight,
  },
  trendContainerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.base,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  trendText: {
    ...theme.typography.captionMedium,
    marginLeft: theme.spacing.xs,
  },
  trendTextGradient: {
    ...theme.typography.captionMedium,
    color: theme.colors.textInverse,
    marginLeft: theme.spacing.xs,
  },
  content: {
    gap: theme.spacing.xs,
  },
  title: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  titleGradient: {
    ...theme.typography.bodySmall,
    color: theme.colors.textInverse,
    opacity: 0.9,
    fontWeight: '500',
  },
  value: {
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  valueGradient: {
    ...theme.typography.h2,
    color: theme.colors.textInverse,
  },
  subtitle: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
  },
  subtitleGradient: {
    ...theme.typography.caption,
    color: theme.colors.textInverse,
    opacity: 0.8,
  },
  iconEmoji: {
    fontSize: 28,
  },
  iconEmojiGradient: {
    fontSize: 28,
  },
  trendEmoji: {
    fontSize: 14,
    marginRight: theme.spacing.xs,
  },
  trendEmojiGradient: {
    fontSize: 14,
    marginRight: theme.spacing.xs,
  },
});

export default MetricCard;
