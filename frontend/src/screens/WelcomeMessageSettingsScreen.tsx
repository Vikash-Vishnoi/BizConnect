import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Switch,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '../types/navigation';
import {
  settingsService,
  WelcomeMessageConfig,
  Template,
} from '../services/settingsService';

type Props = NativeStackScreenProps<RootStackParamList, 'WelcomeMessageSettings'>;

const WelcomeMessageSettingsScreen = ({navigation}: Props) => {
  const [config, setConfig] = useState<WelcomeMessageConfig>({
    enabled: true,
    strategy: 'template',
    templateId: null,
    textMessage: 'Hello! 👋 Thank you for contacting us. We\'ve received your message and will respond shortly.',
    delay: 2000,
    businessHoursEnabled: false,
    businessHours: {},
    outsideHoursMessage: 'Hello! 👋 Thank you for contacting us. We\'re currently outside business hours but will respond when we\'re back.',
  });
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testPhone, setTestPhone] = useState('');

  useEffect(() => {
    loadConfig();
    loadTemplates();
  }, []);

  const loadConfig = async () => {
    try {
      const fetchedConfig = await settingsService.getWelcomeMessageConfig();
      if (fetchedConfig) {
        // Normalize templateId to string (backend might populate it as an object)
        const normalizedConfig = {
          ...fetchedConfig,
          templateId: 
            fetchedConfig.templateId && typeof fetchedConfig.templateId === 'object'
              ? (fetchedConfig.templateId as any)._id
              : fetchedConfig.templateId,
        };
        setConfig(normalizedConfig);
      }
    } catch (error: any) {
      console.error('Failed to load config:', error);
      Alert.alert('Error', error.message || 'Failed to load welcome message settings');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const fetchedTemplates = await settingsService.getWelcomeMessageTemplates();
      setTemplates(fetchedTemplates || []);
    } catch (error: any) {
      console.error('Failed to load templates:', error);
      Alert.alert('Error', error.message || 'Failed to load templates');
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await settingsService.updateWelcomeMessageConfig(config);
      Alert.alert('Success', 'Welcome message settings saved successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestMessage = async () => {
    if (!testPhone.trim()) {
      Alert.alert('Error', 'Please enter a phone number to test');
      return;
    }

    try {
      // Just clean and validate - backend will add 91 prefix
      const digits = testPhone.replace(/\D/g, '');
      
      // Validate exactly 10 digits
      if (digits.length !== 10) {
        Alert.alert('Error', 'Phone number must be exactly 10 digits');
        return;
      }
      
      // Send 10-digit number to backend
      await settingsService.testWelcomeMessage(digits);
      Alert.alert('Success', 'Test message sent successfully!');
      setTestPhone('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send test message');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#25D366" />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.iconText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Welcome Message</Text>
        <View style={{width: 40}} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Enable/Disable */}
        <View style={styles.section}>
          <View style={styles.switchRow}>
            <View style={styles.switchLabelContainer}>
              <Text style={styles.switchLabel}>Enable Welcome Messages</Text>
              <Text style={styles.switchHint}>
                Automatically greet first-time contacts
              </Text>
            </View>
            <Switch
              value={config.enabled}
              onValueChange={value => setConfig({...config, enabled: value})}
              trackColor={{false: '#D1D5DB', true: '#86EFAC'}}
              thumbColor={config.enabled ? '#25D366' : '#F3F4F6'}
            />
          </View>
        </View>

        {config.enabled && (
          <>
            {/* Strategy Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Message Type</Text>
              <View style={styles.radioGroup}>
                <TouchableOpacity
                  style={[
                    styles.radioOption,
                    config.strategy === 'template' && styles.radioOptionActive,
                  ]}
                  onPress={() => setConfig({...config, strategy: 'template'})}>
                  <View
                    style={[
                      styles.radio,
                      config.strategy === 'template' && styles.radioActive,
                    ]}
                  />
                  <View style={styles.radioLabelContainer}>
                    <Text style={styles.radioLabel}>📄 Template Message</Text>
                    <Text style={styles.radioHint}>
                      Use approved WhatsApp template (recommended)
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.radioOption,
                    config.strategy === 'text' && styles.radioOptionActive,
                  ]}
                  onPress={() => setConfig({...config, strategy: 'text'})}>
                  <View
                    style={[
                      styles.radio,
                      config.strategy === 'text' && styles.radioActive,
                    ]}
                  />
                  <View style={styles.radioLabelContainer}>
                    <Text style={styles.radioLabel}>💬 Text Message</Text>
                    <Text style={styles.radioHint}>Simple text message</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Template Selection */}
            {config.strategy === 'template' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Select Template</Text>
                {templates.length > 0 ? (
                  <>
                    {templates.map(template => (
                      <TouchableOpacity
                        key={template._id}
                        style={[
                          styles.templateOption,
                          config.templateId === template._id &&
                            styles.templateOptionActive,
                        ]}
                        onPress={() =>
                          setConfig({...config, templateId: template._id})
                        }>
                        <View
                          style={[
                            styles.radio,
                            config.templateId === template._id &&
                              styles.radioActive,
                          ]}
                        />
                        <View style={styles.templateInfo}>
                          <Text style={styles.templateName}>✅ {template.name}</Text>
                          <Text style={styles.templateMeta}>
                            {template.category} • {template.language}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </>
                ) : (
                  <View style={styles.noTemplatesBox}>
                    <Text style={styles.noTemplatesIcon}>⚠️</Text>
                    <Text style={styles.noTemplatesText}>
                      No approved templates available
                    </Text>
                    <TouchableOpacity
                      style={styles.createTemplateBtn}
                      onPress={() => navigation.navigate('Templates')}>
                      <Text style={styles.createTemplateBtnText}>
                        + Create Template
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* Text Message */}
            {config.strategy === 'text' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Message Text</Text>
                <TextInput
                  style={styles.textArea}
                  value={config.textMessage}
                  onChangeText={text => setConfig({...config, textMessage: text})}
                  placeholder="Enter your welcome message..."
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            )}

            {/* Delay */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Delay (seconds)</Text>
              <TextInput
                style={styles.input}
                value={String(config.delay / 1000)}
                onChangeText={text => {
                  const seconds = parseFloat(text) || 0;
                  setConfig({...config, delay: seconds * 1000});
                }}
                placeholder="2"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
              <Text style={styles.hint}>
                Wait time before sending welcome message
              </Text>
            </View>

            {/* Business Hours */}
            <View style={styles.section}>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Business Hours</Text>
                <Switch
                  value={config.businessHoursEnabled}
                  onValueChange={value =>
                    setConfig({...config, businessHoursEnabled: value})
                  }
                  trackColor={{false: '#D1D5DB', true: '#86EFAC'}}
                  thumbColor={config.businessHoursEnabled ? '#25D366' : '#F3F4F6'}
                />
              </View>
              {config.businessHoursEnabled && (
                <View style={styles.businessHoursHint}>
                  <Text style={styles.hint}>
                    Configure business hours and outside-hours message
                  </Text>
                </View>
              )}
            </View>

            {/* Test Message */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Test Welcome Message</Text>
              <Text style={styles.hint}>
                📱 Enter 10-digit phone number only. Backend will add 91 prefix automatically.
              </Text>
              <View style={styles.testRow}>
                <TextInput
                  style={[styles.input, styles.testInput]}
                  value={testPhone}
                  onChangeText={setTestPhone}
                  placeholder="9876543210"
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                />
                <TouchableOpacity style={styles.testButton} onPress={handleTestMessage}>
                  <Icon name="send" size={16} color="#fff" />
                  <Text style={styles.testButtonText}>Send</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>💾 Save Settings</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#25D366',
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 20,
    color: '#fff',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: 12,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  switchHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  radioGroup: {
    gap: 12,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  radioOptionActive: {
    borderColor: '#25D366',
    backgroundColor: '#F0FDF4',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
  },
  radioActive: {
    borderColor: '#25D366',
    backgroundColor: '#25D366',
  },
  radioLabelContainer: {
    flex: 1,
  },
  radioLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  radioHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  templateOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    marginBottom: 8,
  },
  templateOptionActive: {
    borderColor: '#25D366',
    backgroundColor: '#F0FDF4',
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  templateMeta: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  noTemplatesBox: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
  },
  noTemplatesIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  noTemplatesText: {
    fontSize: 14,
    color: '#E65100',
    marginBottom: 12,
    textAlign: 'center',
  },
  createTemplateBtn: {
    backgroundColor: '#FF9800',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  createTemplateBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    color: '#333',
  },
  textArea: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    color: '#333',
    minHeight: 100,
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  businessHoursHint: {
    marginTop: 8,
  },
  testRow: {
    flexDirection: 'row',
    gap: 8,
  },
  testInput: {
    flex: 1,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#25D366',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#25D366',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default WelcomeMessageSettingsScreen;
