import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';
import theme from '../../theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outlined' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
  fullWidth = false,
}) => {
  const isDisabled = disabled || loading;

  const getButtonHeight = () => {
    switch (size) {
      case 'small':
        return theme.layout.buttonHeight.small;
      case 'large':
        return theme.layout.buttonHeight.large;
      default:
        return theme.layout.buttonHeight.medium;
    }
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle = size === 'small' ? theme.typography.buttonSmall : theme.typography.button;

    switch (variant) {
      case 'primary':
        return {...baseStyle, color: theme.colors.textInverse};
      case 'secondary':
        return {...baseStyle, color: theme.colors.primary};
      case 'outlined':
        return {...baseStyle, color: theme.colors.primary};
      case 'ghost':
        return {...baseStyle, color: theme.colors.primary};
      case 'danger':
        return {...baseStyle, color: theme.colors.textInverse};
      default:
        return baseStyle;
    }
  };

  const renderContent = () => (
    <>
      {loading && (
        <ActivityIndicator
          color={variant === 'outlined' || variant === 'ghost' ? theme.colors.primary : theme.colors.textInverse}
          size="small"
          style={styles.loader}
        />
      )}
      {!loading && icon && iconPosition === 'left' && (
        <Icon
          name={icon}
          size={size === 'small' ? 18 : 20}
          color={variant === 'outlined' || variant === 'ghost' ? theme.colors.primary : theme.colors.textInverse}
          style={styles.iconLeft}
        />
      )}
      {!loading && <Text style={[getTextStyle(), textStyle]}>{title}</Text>}
      {!loading && icon && iconPosition === 'right' && (
        <Icon
          name={icon}
          size={size === 'small' ? 18 : 20}
          color={variant === 'outlined' || variant === 'ghost' ? theme.colors.primary : theme.colors.textInverse}
          style={styles.iconRight}
        />
      )}
    </>
  );

  const containerStyle: ViewStyle = {
    height: getButtonHeight(),
    opacity: isDisabled ? 0.5 : 1,
    width: fullWidth ? '100%' : undefined,
  };

  if (variant === 'primary') {
    return (
      <TouchableOpacity
        style={[styles.wrapper, containerStyle, style]}
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.8}>
        <LinearGradient
          colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
          style={styles.gradientButton}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 0}}>
          {renderContent()}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  if (variant === 'danger') {
    return (
      <TouchableOpacity
        style={[styles.wrapper, containerStyle, style]}
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.8}>
        <LinearGradient
          colors={['#EF4444', '#DC2626']}
          style={styles.gradientButton}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 0}}>
          {renderContent()}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  if (variant === 'outlined') {
    return (
      <TouchableOpacity
        style={[styles.wrapper, styles.outlinedButton, containerStyle, style]}
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.7}>
        {renderContent()}
      </TouchableOpacity>
    );
  }

  if (variant === 'ghost') {
    return (
      <TouchableOpacity
        style={[styles.wrapper, styles.ghostButton, containerStyle, style]}
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.7}>
        {renderContent()}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.wrapper, styles.secondaryButton, containerStyle, style]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}>
      {renderContent()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: theme.borderRadius.base,
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  gradientButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    paddingHorizontal: theme.spacing.lg,
  },
  secondaryButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.lg,
  },
  outlinedButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
  },
  ghostButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: theme.spacing.lg,
  },
  loader: {
    marginRight: theme.spacing.sm,
  },
  iconLeft: {
    marginRight: theme.spacing.sm,
  },
  iconRight: {
    marginLeft: theme.spacing.sm,
  },
});

export default Button;
