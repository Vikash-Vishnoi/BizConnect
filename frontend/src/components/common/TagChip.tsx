/**
 * Tag Chip Component
 * 
 * Displays a tag with color and optional remove button
 * Used in conversation cards, tag lists, etc.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface TagChipProps {
  name: string;
  color?: string;
  onRemove?: () => void;
  onPress?: () => void;
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
}

export const TagChip: React.FC<TagChipProps> = ({
  name,
  color = '#3B82F6',
  onRemove,
  onPress,
  size = 'medium',
  disabled = false
}) => {
  const sizeStyles = {
    small: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      fontSize: 10
    },
    medium: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      fontSize: 12
    },
    large: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      fontSize: 14
    }
  };

  const iconSizes = {
    small: 12,
    medium: 14,
    large: 16
  };

  const content = (
    <View style={[
      styles.container,
      { backgroundColor: `${color}20`, borderColor: color },
      sizeStyles[size],
      disabled && styles.disabled
    ]}>
      <Text
        style={[
          styles.text,
          { color: color, fontSize: sizeStyles[size].fontSize }
        ]}
        numberOfLines={1}
      >
        {name}
      </Text>
      {onRemove && !disabled && (
        <TouchableOpacity
          onPress={onRemove}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          style={styles.removeButton}
        >
          <Icon name="close" size={iconSizes[size]} color={color} />
        </TouchableOpacity>
      )}
    </View>
  );

  if (onPress && !disabled) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 4,
    marginBottom: 4
  },
  text: {
    fontWeight: '600',
    maxWidth: 120
  },
  removeButton: {
    marginLeft: 4
  },
  disabled: {
    opacity: 0.5
  }
});

export default TagChip;
