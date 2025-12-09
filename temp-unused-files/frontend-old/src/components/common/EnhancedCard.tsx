import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  Animated,
} from 'react-native';
import theme from '../../theme';

interface EnhancedCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  elevated?: boolean;
  bordered?: boolean;
  noPadding?: boolean;
}

const EnhancedCard: React.FC<EnhancedCardProps> = ({
  children,
  style,
  onPress,
  elevated = true,
  bordered = false,
  noPadding = false,
}) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
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

  const cardStyle = [
    styles.card,
    elevated && theme.shadows.md,
    bordered && styles.bordered,
    noPadding && styles.noPadding,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}>
        <Animated.View style={[cardStyle, {transform: [{scale: scaleAnim}]}]}>
          {children}
        </Animated.View>
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.base,
    marginBottom: theme.spacing.md,
  },
  bordered: {
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  noPadding: {
    padding: 0,
  },
});

export default EnhancedCard;
