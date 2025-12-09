import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import theme from '../../theme';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightActions?: Array<{
    icon: string;
    onPress: () => void;
    badge?: number | string;
    badgeColor?: string;
  }>;
  variant?: 'solid' | 'primary';
  showBack?: boolean;
  style?: ViewStyle;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  onBack,
  rightActions = [],
  variant = 'primary',
  showBack = true,
  style,
}) => {
  const headerContent = (
    <View style={styles.headerContent}>
      <View style={styles.headerLeft}>
        {showBack && onBack && (
          <TouchableOpacity
            onPress={onBack}
            style={styles.backButton}
            activeOpacity={0.7}
            accessibilityLabel="Go Back">
            <Icon
              name="arrow-left"
              size={20}
              color={variant === 'primary' ? theme.colors.textInverse : theme.colors.text}
            />
          </TouchableOpacity>
        )}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>
      {rightActions.length > 0 && (
        <View style={styles.headerRight}>
          {rightActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              onPress={action.onPress}
              style={styles.actionButton}
              activeOpacity={0.7}
              accessibilityLabel={action.icon}>
              {action.badge !== undefined && (
                <View
                  style={[
                    styles.badge,
                    action.badgeColor && {backgroundColor: action.badgeColor},
                  ]}>
                  <Text style={styles.badgeText}>{action.badge}</Text>
                </View>
              )}
              <Icon
                name={action.icon}
                size={20}
                color={variant === 'primary' ? theme.colors.textInverse : theme.colors.text}
              />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  const headerStyle = variant === 'primary' ? styles.primaryHeader : styles.solidHeader;

  return (
    <View style={[styles.header, headerStyle, style]}>
      {headerContent}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingTop: 56,
    paddingBottom: theme.spacing.base,
    paddingHorizontal: theme.spacing.base,
    minHeight: 64,
  },
  primaryHeader: {
    backgroundColor: theme.colors.primary,
    ...theme.shadows.sm,
  },
  solidHeader: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.base,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.textInverse,
    fontWeight: '700',
  },
  subtitle: {
    ...theme.typography.bodySmall,
    color: theme.colors.textInverse,
    opacity: 0.85,
    marginTop: theme.spacing.xs / 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.base,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginLeft: theme.spacing.xs,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: theme.colors.error,
    borderRadius: theme.borderRadius.full,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    borderWidth: 2,
    borderColor: theme.colors.textInverse,
  },
  badgeText: {
    ...theme.typography.caption,
    color: theme.colors.textInverse,
    fontWeight: '700',
    fontSize: 10,
  },
});

export default AppHeader;

