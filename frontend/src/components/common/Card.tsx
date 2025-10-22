import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import theme from '../../theme';

// Icon to emoji mapping
const iconToEmoji: Record<string, string> = {
  'info': 'ℹ️',
  'alert-circle': '⚠️',
  'check-circle': '✅',
  'x-circle': '❌',
  'more-vertical': '⋮',
  'chevron-right': '›',
  'settings': '⚙️',
  'star': '⭐',
  'heart': '❤️',
  'bell': '🔔',
  'message-square': '💬',
  'user': '👤',
  'calendar': '📅',
  'file-text': '📄',
};

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'gradient';
  padding?: 'none' | 'small' | 'medium' | 'large';
  onPress?: () => void;
  style?: ViewStyle;
  header?: {
    title: string;
    subtitle?: string;
    icon?: string;
    action?: {
      icon: string;
      onPress: () => void;
    };
  };
  footer?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'medium',
  onPress,
  style,
  header,
  footer,
}) => {
  const getPadding = () => {
    switch (padding) {
      case 'none':
        return 0;
      case 'small':
        return theme.spacing.sm;
      case 'large':
        return theme.spacing.lg;
      default:
        return theme.spacing.base;
    }
  };

  const cardPadding = getPadding();

  const renderHeader = () => {
    if (!header) return null;

    const headerEmoji = header.icon ? (iconToEmoji[header.icon] || '📌') : null;
    const actionEmoji = header.action?.icon ? (iconToEmoji[header.action.icon] || '⋯') : null;

    return (
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {headerEmoji && (
            <View style={styles.headerIconContainer}>
              <Text style={[
                styles.headerIconEmoji,
                variant === 'gradient' && styles.headerIconEmojiGradient,
              ]}>
                {headerEmoji}
              </Text>
            </View>
          )}
          <View style={styles.headerText}>
            <Text style={[
              styles.headerTitle,
              variant === 'gradient' && styles.headerTitleGradient,
            ]}>
              {header.title}
            </Text>
            {header.subtitle && (
              <Text style={[
                styles.headerSubtitle,
                variant === 'gradient' && styles.headerSubtitleGradient,
              ]}>
                {header.subtitle}
              </Text>
            )}
          </View>
        </View>
        {header.action && actionEmoji && (
          <TouchableOpacity 
            onPress={header.action.onPress}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <Text style={[
              styles.actionEmoji,
              variant === 'gradient' && styles.actionEmojiGradient,
            ]}>
              {actionEmoji}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderContent = () => (
    <>
      {renderHeader()}
      <View style={header ? styles.contentWithHeader : undefined}>
        {children}
      </View>
      {footer && <View style={styles.footer}>{footer}</View>}
    </>
  );

  const containerStyle: ViewStyle = {
    padding: cardPadding,
  };

  if (variant === 'gradient') {
    return (
      <TouchableOpacity
        style={[styles.card, style]}
        onPress={onPress}
        disabled={!onPress}
        activeOpacity={onPress ? 0.8 : 1}>
        <LinearGradient
          colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
          style={[styles.gradientCard, containerStyle]}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}>
          {renderContent()}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  const cardStyleByVariant = () => {
    switch (variant) {
      case 'elevated':
        return styles.elevatedCard;
      case 'outlined':
        return styles.outlinedCard;
      default:
        return styles.defaultCard;
    }
  };

  const Wrapper = onPress ? TouchableOpacity : View;
  const wrapperProps = onPress
    ? {
        onPress,
        activeOpacity: 0.7,
      }
    : {};

  return (
    <Wrapper
      style={[styles.card, cardStyleByVariant(), containerStyle, style]}
      {...wrapperProps}>
      {renderContent()}
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  defaultCard: {
    backgroundColor: theme.colors.surface,
    ...theme.shadows.sm,
  },
  elevatedCard: {
    backgroundColor: theme.colors.surface,
    ...theme.shadows.lg,
  },
  outlinedCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  gradientCard: {
    borderRadius: theme.borderRadius.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIconContainer: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.base,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  headerIconEmoji: {
    fontSize: 20,
  },
  headerIconEmojiGradient: {
    opacity: 1,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    ...theme.typography.h4,
    color: theme.colors.text,
  },
  headerTitleGradient: {
    color: theme.colors.textInverse,
  },
  headerSubtitle: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  headerSubtitleGradient: {
    color: theme.colors.textInverse,
    opacity: 0.9,
  },
  actionEmoji: {
    fontSize: 20,
    color: theme.colors.textSecondary,
  },
  actionEmojiGradient: {
    color: theme.colors.textInverse,
  },
  contentWithHeader: {
    // Additional spacing if needed
  },
  footer: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
});

export default Card;
