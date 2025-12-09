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

interface CTAButton {
  type: 'PHONE_NUMBER' | 'URL';
  title: string;
  phone_number?: string;
  url?: string;
}

interface Props {
  onSend: (bodyText: string, ctaButtons: CTAButton[]) => Promise<void>;
  onCancel: () => void;
}

const CTAComposer: React.FC<Props> = ({ onSend, onCancel }) => {
  const [bodyText, setBodyText] = useState('');
  const [buttons, setButtons] = useState<CTAButton[]>([
    { type: 'URL', title: '', url: '' }
  ]);
  const [sending, setSending] = useState(false);

  const addButton = () => {
    if (buttons.length >= 2) {
      Alert.alert('Limit Reached', 'Maximum 2 CTA buttons allowed');
      return;
    }
    setButtons([...buttons, { type: 'URL', title: '', url: '' }]);
  };

  const removeButton = (index: number) => {
    if (buttons.length <= 1) {
      Alert.alert('Minimum Required', 'At least 1 button is required');
      return;
    }
    setButtons(buttons.filter((_, i) => i !== index));
  };

  const updateButton = (index: number, field: keyof CTAButton, value: any) => {
    const newButtons = [...buttons];
    newButtons[index] = { ...newButtons[index], [field]: value };
    setButtons(newButtons);
  };

  const handleSend = async () => {
    // Validation
    if (!bodyText.trim()) {
      Alert.alert('Error', 'Please enter a message text');
      return;
    }

    for (const btn of buttons) {
      if (!btn.title.trim()) {
        Alert.alert('Error', 'All buttons must have a title');
        return;
      }
      if (btn.title.length > 20) {
        Alert.alert('Error', 'Button titles must be 20 characters or less');
        return;
      }
      if (btn.type === 'PHONE_NUMBER') {
        if (!btn.phone_number || !btn.phone_number.match(/^\+?[1-9]\d{1,14}$/)) {
          Alert.alert('Error', 'Invalid phone number format (use international format, e.g., +1234567890)');
          return;
        }
      }
      if (btn.type === 'URL') {
        if (!btn.url || !btn.url.match(/^https?:\/\/.+/)) {
          Alert.alert('Error', 'Invalid URL format (must start with http:// or https://)');
          return;
        }
      }
    }

    try {
      setSending(true);
      await onSend(bodyText, buttons);
      Alert.alert('Success', 'CTA message sent successfully');
      onCancel();
    } catch (error) {
      console.error('CTA send error:', error);
      Alert.alert('Error', 'Failed to send CTA message');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Create CTA Message</Text>
        <TouchableOpacity onPress={onCancel} disabled={sending}>
          <Icon name="x" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Message Text Input */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Message Text <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.messageInput}
            value={bodyText}
            onChangeText={setBodyText}
            placeholder="Enter your message..."
            placeholderTextColor={theme.colors.textTertiary}
            multiline
            maxLength={1000}
            editable={!sending}
          />
          <Text style={styles.charCount}>{bodyText.length}/1000</Text>
        </View>

        {/* CTA Buttons */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Action Buttons <Text style={styles.required}>*</Text>
            <Text style={styles.labelHint}> (1-2 buttons)</Text>
          </Text>

          {buttons.map((button, index) => (
            <View key={index} style={styles.buttonCard}>
              <View style={styles.buttonHeader}>
                <Text style={styles.buttonNumber}>Button {index + 1}</Text>
                {buttons.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removeButton(index)}
                    style={styles.removeButton}
                    disabled={sending}>
                    <Icon name="trash-2" size={18} color={theme.colors.error} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Button Type Selector */}
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    button.type === 'URL' && styles.typeButtonActive
                  ]}
                  onPress={() => updateButton(index, 'type', 'URL')}
                  disabled={sending}>
                  <Icon
                    name="link"
                    size={16}
                    color={button.type === 'URL' ? theme.colors.textInverse : theme.colors.text}
                  />
                  <Text
                    style={[
                      styles.typeButtonText,
                      button.type === 'URL' && styles.typeButtonTextActive
                    ]}>
                    URL
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    button.type === 'PHONE_NUMBER' && styles.typeButtonActive
                  ]}
                  onPress={() => updateButton(index, 'type', 'PHONE_NUMBER')}
                  disabled={sending}>
                  <Icon
                    name="phone"
                    size={16}
                    color={button.type === 'PHONE_NUMBER' ? theme.colors.textInverse : theme.colors.text}
                  />
                  <Text
                    style={[
                      styles.typeButtonText,
                      button.type === 'PHONE_NUMBER' && styles.typeButtonTextActive
                    ]}>
                    Phone
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Button Title */}
              <TextInput
                style={styles.input}
                value={button.title}
                onChangeText={(value) => updateButton(index, 'title', value)}
                placeholder="Button title (max 20 chars)"
                placeholderTextColor={theme.colors.textTertiary}
                maxLength={20}
                editable={!sending}
              />
              <Text style={styles.inputCharCount}>{button.title.length}/20</Text>

              {/* URL or Phone Number Input */}
              {button.type === 'URL' ? (
                <TextInput
                  style={styles.input}
                  value={button.url}
                  onChangeText={(value) => updateButton(index, 'url', value)}
                  placeholder="https://example.com"
                  placeholderTextColor={theme.colors.textTertiary}
                  keyboardType="url"
                  autoCapitalize="none"
                  editable={!sending}
                />
              ) : (
                <TextInput
                  style={styles.input}
                  value={button.phone_number}
                  onChangeText={(value) => updateButton(index, 'phone_number', value)}
                  placeholder="+1234567890"
                  placeholderTextColor={theme.colors.textTertiary}
                  keyboardType="phone-pad"
                  editable={!sending}
                />
              )}
            </View>
          ))}

          {buttons.length < 2 && (
            <TouchableOpacity
              onPress={addButton}
              style={styles.addButton}
              disabled={sending}>
              <Icon name="plus-circle" size={20} color={theme.colors.primary} />
              <Text style={styles.addButtonText}>Add Button</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Icon name="info" size={16} color={theme.colors.primary} />
          <Text style={styles.infoText}>
            CTA buttons let customers take action directly from WhatsApp, like visiting your
            website or calling your business.
          </Text>
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
              <Text style={styles.sendButtonText}>Send Message</Text>
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
  messageInput: {
    ...theme.typography.body,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.base,
    padding: theme.spacing.sm,
    minHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: theme.colors.surface,
  },
  charCount: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'right',
    marginTop: theme.spacing.xs,
  },
  buttonCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.base,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  buttonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  buttonNumber: {
    ...theme.typography.label,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  removeButton: {
    padding: theme.spacing.xs,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    gap: theme.spacing.xs,
  },
  typeButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  typeButtonText: {
    ...theme.typography.bodySmall,
    color: theme.colors.text,
    fontWeight: '600',
  },
  typeButtonTextActive: {
    color: theme.colors.textInverse,
  },
  input: {
    ...theme.typography.body,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.base,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    marginBottom: theme.spacing.xs,
  },
  inputCharCount: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'right',
    marginBottom: theme.spacing.xs,
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
  infoBox: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.base,
    padding: theme.spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
    gap: theme.spacing.sm,
  },
  infoText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    flex: 1,
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

export default CTAComposer;
