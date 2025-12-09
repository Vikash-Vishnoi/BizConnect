import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import theme from '../../theme';

interface Props {
  onSend: (question: string, options: string[]) => Promise<void>;
  onCancel: () => void;
}

const PollComposer: React.FC<Props> = ({ onSend, onCancel }) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [sending, setSending] = useState(false);

  const addOption = () => {
    if (options.length >= 12) {
      Alert.alert('Limit Reached', 'Maximum 12 options allowed');
      return;
    }
    setOptions([...options, '']);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) {
      Alert.alert('Minimum Required', 'At least 2 options are required');
      return;
    }
    setOptions(options.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSend = async () => {
    // Validation
    if (!question.trim()) {
      Alert.alert('Error', 'Please enter a poll question');
      return;
    }

    if (question.length > 255) {
      Alert.alert('Error', 'Question must be 255 characters or less');
      return;
    }

    const validOptions = options.filter(opt => opt.trim());
    if (validOptions.length < 2) {
      Alert.alert('Error', 'At least 2 options are required');
      return;
    }

    for (const opt of validOptions) {
      if (opt.length > 20) {
        Alert.alert('Error', 'Each option must be 20 characters or less');
        return;
      }
    }

    try {
      setSending(true);
      await onSend(question, validOptions);
      Alert.alert('Success', 'Poll sent successfully');
      onCancel();
    } catch (error) {
      console.error('Poll send error:', error);
      Alert.alert('Error', 'Failed to send poll');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Create Poll</Text>
        <TouchableOpacity onPress={onCancel} disabled={sending}>
          <Icon name="x" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Question Input */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Poll Question <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.questionInput}
            value={question}
            onChangeText={setQuestion}
            placeholder="What would you like to ask?"
            placeholderTextColor={theme.colors.textTertiary}
            multiline
            maxLength={255}
            editable={!sending}
          />
          <Text style={styles.charCount}>{question.length}/255</Text>
        </View>

        {/* Options */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Options <Text style={styles.required}>*</Text>
            <Text style={styles.labelHint}> (2-12 options, max 20 chars each)</Text>
          </Text>
          {options.map((option, index) => (
            <View key={index} style={styles.optionRow}>
              <Text style={styles.optionNumber}>{index + 1}</Text>
              <TextInput
                style={styles.optionInput}
                value={option}
                onChangeText={(value) => updateOption(index, value)}
                placeholder={`Option ${index + 1}`}
                placeholderTextColor={theme.colors.textTertiary}
                maxLength={20}
                editable={!sending}
              />
              {options.length > 2 && (
                <TouchableOpacity
                  onPress={() => removeOption(index)}
                  style={styles.removeButton}
                  disabled={sending}>
                  <Icon name="trash-2" size={18} color={theme.colors.error} />
                </TouchableOpacity>
              )}
            </View>
          ))}

          {options.length < 12 && (
            <TouchableOpacity
              onPress={addOption}
              style={styles.addButton}
              disabled={sending}>
              <Icon name="plus-circle" size={20} color={theme.colors.primary} />
              <Text style={styles.addButtonText}>Add Option</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          onPress={onCancel}
          style={[styles.button, styles.cancelButton]}
          disabled={sending}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSend}
          style={[styles.button, styles.sendButton]}
          disabled={sending}>
          {sending ? (
            <ActivityIndicator size="small" color={theme.colors.textInverse} />
          ) : (
            <>
              <Icon name="send" size={18} color={theme.colors.textInverse} />
              <Text style={styles.sendButtonText}>Send Poll</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  headerTitle: {
    ...theme.typography.h5,
    color: theme.colors.text,
  },
  content: {
    flex: 1,
    padding: theme.spacing.base,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    ...theme.typography.label,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  required: {
    color: theme.colors.error,
  },
  labelHint: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '400',
  },
  questionInput: {
    ...theme.typography.body,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.base,
    padding: theme.spacing.sm,
    minHeight: 80,
    textAlignVertical: 'top',
    backgroundColor: theme.colors.surface,
  },
  charCount: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'right',
    marginTop: theme.spacing.xs,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  optionNumber: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    width: 24,
    fontWeight: '600',
  },
  optionInput: {
    ...theme.typography.body,
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.base,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  removeButton: {
    padding: theme.spacing.sm,
    marginLeft: theme.spacing.xs,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  addButtonText: {
    ...theme.typography.bodySmall,
    color: theme.colors.primary,
    marginLeft: theme.spacing.xs,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    padding: theme.spacing.base,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    gap: theme.spacing.sm,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.base,
    gap: theme.spacing.xs,
  },
  cancelButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelButtonText: {
    ...theme.typography.button,
    color: theme.colors.text,
  },
  sendButton: {
    backgroundColor: theme.colors.primary,
  },
  sendButtonText: {
    ...theme.typography.button,
    color: theme.colors.textInverse,
  },
});

export default PollComposer;
