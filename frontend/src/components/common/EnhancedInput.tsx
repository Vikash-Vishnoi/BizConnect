import React, {useState, useRef} from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  TextInputProps,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import theme from '../../theme';

interface EnhancedInputProps extends TextInputProps {
  label: string;
  error?: string;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
}

export const EnhancedInput: React.FC<EnhancedInputProps> = ({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  inputStyle,
  value,
  secureTextEntry,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const animatedLabel = useRef(new Animated.Value(value ? 1 : 0)).current;

  const handleFocus = () => {
    setIsFocused(true);
    Animated.spring(animatedLabel, {
      toValue: 1,
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (!value) {
      Animated.spring(animatedLabel, {
        toValue: 0,
        useNativeDriver: false,
      }).start();
    }
  };

  const labelTop = animatedLabel.interpolate({
    inputRange: [0, 1],
    outputRange: [18, -8],
  });

  const labelFontSize = animatedLabel.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 12],
  });

  const borderColor = error
    ? theme.colors.error
    : isFocused
    ? theme.colors.primary
    : theme.colors.border;

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  const shouldShowPasswordToggle = secureTextEntry && value;
  const actualRightIcon = shouldShowPasswordToggle
    ? isPasswordVisible
      ? 'eye-off'
      : 'eye'
    : rightIcon;

  const handleRightIconPress = shouldShowPasswordToggle
    ? togglePasswordVisibility
    : onRightIconPress;

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={[styles.inputContainer, {borderColor}]}>
        <Animated.Text
          style={[
            styles.label,
            {
              top: labelTop,
              fontSize: labelFontSize,
              color: error
                ? theme.colors.error
                : isFocused
                ? theme.colors.primary
                : theme.colors.textTertiary,
            },
          ]}>
          {label}
        </Animated.Text>

        <View style={styles.inputWrapper}>
          {leftIcon && (
            <Icon
              name={leftIcon}
              size={20}
              color={isFocused ? theme.colors.primary : theme.colors.textTertiary}
              style={styles.leftIcon}
            />
          )}

          <TextInput
            style={[
              styles.input,
              leftIcon && styles.inputWithLeftIcon,
              (actualRightIcon || shouldShowPasswordToggle) && styles.inputWithRightIcon,
              inputStyle,
            ]}
            value={value}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholderTextColor={theme.colors.textTertiary}
            secureTextEntry={secureTextEntry && !isPasswordVisible}
            {...props}
          />

          {(actualRightIcon || shouldShowPasswordToggle) && (
            <TouchableOpacity
              onPress={handleRightIconPress}
              style={styles.rightIcon}
              disabled={!handleRightIconPress}>
              <Icon
                name={actualRightIcon || ''}
                size={20}
                color={isFocused ? theme.colors.primary : theme.colors.textTertiary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.base,
  },
  inputContainer: {
    position: 'relative',
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    height: 56,
  },
  label: {
    position: 'absolute',
    left: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 4,
    zIndex: 1,
    ...theme.typography.body,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  input: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
    ...theme.typography.body,
    color: theme.colors.text,
    paddingTop: 8,
  },
  inputWithLeftIcon: {
    paddingLeft: theme.spacing.sm,
  },
  inputWithRightIcon: {
    paddingRight: theme.spacing.sm,
  },
  leftIcon: {
    marginLeft: theme.spacing.md,
  },
  rightIcon: {
    padding: theme.spacing.sm,
    marginRight: theme.spacing.sm,
  },
  error: {
    ...theme.typography.caption,
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
    marginLeft: theme.spacing.md,
  },
});

export default EnhancedInput;
