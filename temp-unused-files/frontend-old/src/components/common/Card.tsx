import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import theme from '../../theme';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
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

    return (
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {header.icon && (
            <View style={styles.headerIconContainer}>
              <Icon
                name={header.icon}
                size={20}
                color={theme.colors.primary}
              />
            </View>
          )}
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>
              {header.title}
            </Text>
            {header.subtitle && (
              <Text style={styles.headerSubtitle}>
                {header.subtitle}
              </Text>
            )}
          </View>
        </View>
        {header.action && (
          <TouchableOpacity
            onPress={header.action.onPress}
            style={styles.actionButton}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <Icon
              name={header.action.icon}
              size={20}
              color={theme.colors.textSecondary}
            />
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
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  elevatedCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.md,
  },
  outlinedCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
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
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.base,
    backgroundColor: theme.colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    ...theme.typography.h4,
    color: theme.colors.text,
  },
  headerSubtitle: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.base,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentWithHeader: {
  },
  footer: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
});

export default Card;
