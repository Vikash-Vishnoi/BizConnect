import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
  ViewStyle,
  TextStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import theme from '../../theme';

interface EnhancedButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'text' | 'danger';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  gradient?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const EnhancedButton: React.FC<EnhancedButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  icon,
  fullWidth = false,
  gradient = false,
  style,
  textStyle,
}) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const getButtonStyle = () => {
    const baseStyle = [
      styles.button,
      styles[`${size}Button`],
      styles[`${variant}Button`],
      fullWidth && styles.fullWidth,
      (disabled || loading) && styles.disabled,
      style,
    ];
    return baseStyle;
  };

  const getTextStyle = () => {
    return [
      styles.text,
      styles[`${size}Text`],
      styles[`${variant}Text`],
      (disabled || loading) && styles.disabledText,
      textStyle,
    ];
  };

  const buttonContent = (
    <>
      {loading && (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'text' ? theme.colors.primary : theme.colors.textInverse}
          style={styles.loader}
        />
      )}
      {!loading && icon && <>{icon}</>}
      <Text style={getTextStyle()}>{title}</Text>
    </>
  );

  if (gradient && variant === 'primary' && !disabled) {
    return (
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={1}
        style={[fullWidth && styles.fullWidth]}>
        <Animated.View style={{transform: [{scale: scaleAnim}]}}>
          <LinearGradient
            colors={[theme.colors.gradientStart, theme.colors.gradientMiddle, theme.colors.gradientEnd]}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            style={[
              styles.button,
              styles[`${size}Button`],
              styles.gradientButton,
              style,
            ]}>
            {buttonContent}
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      activeOpacity={1}
      style={[fullWidth && styles.fullWidth]}>
      <Animated.View style={[getButtonStyle(), {transform: [{scale: scaleAnim}]}]}>
        {buttonContent}
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.base,
    ...theme.shadows.sm,
  },
  fullWidth: {
    width: '100%',
  },
  
  // Sizes
  smallButton: {
    height: theme.layout.buttonHeight.small,
    paddingHorizontal: theme.spacing.base,
  },
  mediumButton: {
    height: theme.layout.buttonHeight.medium,
    paddingHorizontal: theme.spacing.lg,
  },
  largeButton: {
    height: theme.layout.buttonHeight.large,
    paddingHorizontal: theme.spacing.xl,
  },

  // Variants
  primaryButton: {
    backgroundColor: theme.colors.primary,
  },
  secondaryButton: {
    backgroundColor: theme.colors.secondary,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  textButton: {
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  dangerButton: {
    backgroundColor: theme.colors.error,
  },
  gradientButton: {
    backgroundColor: 'transparent',
  },

  // Text styles
  text: {
    ...theme.typography.button,
    textAlign: 'center',
  },
  smallText: {
    ...theme.typography.buttonSmall,
  },
  mediumText: {
    ...theme.typography.button,
  },
  largeText: {
    ...theme.typography.button,
    fontSize: 18,
  },

  primaryText: {
    color: theme.colors.textInverse,
  },
  secondaryText: {
    color: theme.colors.textInverse,
  },
  outlineText: {
    color: theme.colors.primary,
  },
  textText: {
    color: theme.colors.primary,
  },
  dangerText: {
    color: theme.colors.textInverse,
  },

  // States
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    opacity: 0.7,
  },

  loader: {
    marginRight: theme.spacing.sm,
  },
});

export default EnhancedButton;
