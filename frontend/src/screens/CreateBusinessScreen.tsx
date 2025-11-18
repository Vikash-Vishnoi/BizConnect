/**
 * Create Business Screen
 * 
 * Allows users to create a new business and configure WhatsApp API credentials
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useBusiness } from '../contexts/BusinessContext';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import theme from '../theme';
import type { BusinessIndustry } from '../types/business';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateBusiness'>;

const INDUSTRIES: { value: BusinessIndustry; label: string; icon: string }[] = [
  { value: 'healthcare', label: 'Healthcare', icon: 'heart' },
  { value: 'retail', label: 'Retail', icon: 'shopping-bag' },
  { value: 'ecommerce', label: 'E-commerce', icon: 'shopping-cart' },
  { value: 'education', label: 'Education', icon: 'book' },
  { value: 'finance', label: 'Finance', icon: 'dollar-sign' },
  { value: 'realestate', label: 'Real Estate', icon: 'home' },
  { value: 'hospitality', label: 'Hospitality', icon: 'coffee' },
  { value: 'automotive', label: 'Automotive', icon: 'truck' },
  { value: 'other', label: 'Other', icon: 'more-horizontal' },
];

const CreateBusinessScreen: React.FC<Props> = ({ navigation }) => {
  const { createBusiness } = useBusiness();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  // Basic Info
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [industry, setIndustry] = useState<BusinessIndustry>('other');
  const [website, setWebsite] = useState('');

  // WhatsApp Config
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [wabaId, setWabaId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [verifyToken, setVerifyToken] = useState('');

  const handleNext = () => {
    if (step === 1) {
      if (!name.trim()) {
        Alert.alert('Required', 'Business name is required');
        return;
      }
      setStep(2);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    } else {
      navigation.goBack();
    }
  };

  const handleCreate = async () => {
    // Validate required fields
    if (!phoneNumberId.trim() || !wabaId.trim() || !accessToken.trim() || !appSecret.trim()) {
      Alert.alert('Required Fields', 'Phone Number ID, WABA ID, Access Token, and App Secret are required');
      return;
    }

    try {
      setLoading(true);

      await createBusiness({
        name: name.trim(),
        displayName: displayName.trim() || undefined,
        description: description.trim() || undefined,
        industry,
        website: website.trim() || undefined,
        whatsappConfig: {
          phoneNumberId: phoneNumberId.trim(),
          phoneNumber: phoneNumber.trim() || undefined,
          wabaId: wabaId.trim(),
          accessToken: accessToken.trim(),
          appSecret: appSecret.trim(),
          verifyToken: verifyToken.trim() || undefined,
          apiVersion: 'v22.0',
        },
      });

      Alert.alert(
        'Success',
        'Business created successfully! You can now start managing your WhatsApp conversations.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Main'),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create business');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Business</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.progressContainer}>
          <View style={[styles.progressStep, step >= 1 && styles.progressStepActive]}>
            <Text style={[styles.progressStepText, step >= 1 && styles.progressStepTextActive]}>1</Text>
          </View>
          <View style={[styles.progressLine, step >= 2 && styles.progressLineActive]} />
          <View style={[styles.progressStep, step >= 2 && styles.progressStepActive]}>
            <Text style={[styles.progressStepText, step >= 2 && styles.progressStepTextActive]}>2</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {step === 1 && (
          <View>
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>📋 Basic Information</Text>
              <Text style={styles.cardSubtitle}>Tell us about your business</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Business Name <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Acme Corporation"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Display Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Acme Corp"
                  value={displayName}
                  onChangeText={setDisplayName}
                  autoCapitalize="words"
                />
                <Text style={styles.hint}>Optional: Short name shown in the app</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Brief description of your business"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Website</Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://example.com"
                  value={website}
                  onChangeText={setWebsite}
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>
            </Card>

            <Card style={styles.card}>
              <Text style={styles.cardTitle}>🏢 Industry</Text>
              <Text style={styles.cardSubtitle}>Select your business category</Text>

              <View style={styles.industryGrid}>
                {INDUSTRIES.map((item) => (
                  <TouchableOpacity
                    key={item.value}
                    style={[
                      styles.industryItem,
                      industry === item.value && styles.industryItemActive,
                    ]}
                    onPress={() => setIndustry(item.value)}
                  >
                    <Icon
                      name={item.icon}
                      size={24}
                      color={industry === item.value ? theme.colors.primary : theme.colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.industryLabel,
                        industry === item.value && styles.industryLabelActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Card>

            <Button
              title="Next: WhatsApp Setup"
              onPress={handleNext}
              variant="primary"
              gradient
              disabled={!name.trim()}
              style={styles.button}
            />
          </View>
        )}

        {step === 2 && (
          <View>
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>💬 WhatsApp Business API</Text>
              <Text style={styles.cardSubtitle}>Configure your WhatsApp credentials</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Phone Number ID <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="123456789012345"
                  value={phoneNumberId}
                  onChangeText={setPhoneNumberId}
                  keyboardType="numeric"
                />
                <Text style={styles.hint}>From WhatsApp Business Platform</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+1234567890"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  WhatsApp Business Account ID <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="123456789012345"
                  value={wabaId}
                  onChangeText={setWabaId}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Access Token <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="EAAxxxxxxxxxxxxxxxxxx"
                  value={accessToken}
                  onChangeText={setAccessToken}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  App Secret <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={appSecret}
                  onChangeText={setAppSecret}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Webhook Verify Token</Text>
                <TextInput
                  style={styles.input}
                  placeholder="my_verify_token"
                  value={verifyToken}
                  onChangeText={setVerifyToken}
                  autoCapitalize="none"
                />
                <Text style={styles.hint}>Used for webhook verification</Text>
              </View>
            </Card>

            <Card style={styles.infoCard}>
              <Icon name="info" size={20} color={theme.colors.info} />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>Where to find these credentials?</Text>
                <Text style={styles.infoText}>
                  Go to Meta for Developers → WhatsApp → API Setup to find your Phone Number ID, WABA ID, and generate tokens.
                </Text>
              </View>
            </Card>

            <Button
              title={loading ? 'Creating Business...' : 'Create Business'}
              onPress={handleCreate}
              variant="primary"
              gradient
              disabled={loading}
              loading={loading}
              style={styles.button}
            />
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  placeholder: {
    width: 40,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressStep: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressStepActive: {
    backgroundColor: '#FFF',
  },
  progressStepText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  progressStepTextActive: {
    color: theme.colors.primary,
  },
  progressLine: {
    width: 60,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 10,
  },
  progressLineActive: {
    backgroundColor: '#FFF',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 8,
  },
  required: {
    color: theme.colors.error,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  industryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  industryItem: {
    width: '31.33%',
    aspectRatio: 1,
    margin: '1%',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  industryItemActive: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
    backgroundColor: theme.colors.primaryLight + '20',
  },
  industryLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },
  industryLabelActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.info + '10',
    borderColor: theme.colors.info,
    borderWidth: 1,
    marginBottom: 20,
    padding: 12,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  button: {
    marginBottom: 20,
  },
  bottomSpacing: {
    height: 40,
  },
});

export default CreateBusinessScreen;
