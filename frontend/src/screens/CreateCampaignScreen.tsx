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
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '../types/navigation';
import {campaignAPI} from '../services/campaignService';
import {templateService} from '../services/templateService';
import type {Template} from '../types/template';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateCampaign'>;

const CreateCampaignScreen = ({navigation, route}: Props) => {
  const {edit, duplicate} = route.params || {};
  const isEditMode = !!edit;
  const isDuplicateMode = !!duplicate;
  const sourceCampaign = edit || duplicate;

  const [name, setName] = useState(sourceCampaign?.name || '');
  const [description, setDescription] = useState(sourceCampaign?.description || '');
  const [message, setMessage] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [recipients, setRecipients] = useState('');
  const [recipientsList, setRecipientsList] = useState<Array<{phone: string; name: string}>>([]);
  const [currentPhone, setCurrentPhone] = useState('');
  const [currentName, setCurrentName] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Validation errors
  const [nameError, setNameError] = useState('');
  const [descriptionError, setDescriptionError] = useState('');
  const [messageError, setMessageError] = useState('');
  const [recipientsError, setRecipientsError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  // Load approved templates
  useEffect(() => {
    loadTemplates();
    
    // Load source campaign data if editing or duplicating
    if (sourceCampaign) {
      if (isDuplicateMode) {
        setName(sourceCampaign.name + ' (Copy)');
      }
      
      // Load recipients
      if (sourceCampaign.recipients && Array.isArray(sourceCampaign.recipients)) {
        const loadedRecipients = sourceCampaign.recipients.map((r: any) => ({
          phone: r.phoneNumber || r.phone || '',
          name: r.name || 'Unknown',
        }));
        setRecipientsList(loadedRecipients);
      }
    }
  }, []);

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const response = await templateService.getTemplates();
      // Backend returns {templates: [...]} so extract the array
      const templateArray = Array.isArray(response) ? response : (response as any).templates || [];
      // Filter only approved templates
      const approvedTemplates = templateArray.filter((t: Template) => t.status === 'approved');
      setTemplates(approvedTemplates);
    } catch (error) {
      console.error('Failed to load templates:', error);
      setTemplates([]); // Set empty array on error
    } finally {
      setLoadingTemplates(false);
    }
  };

  const validateForm = (): boolean => {
    let isValid = true;

    if (!name.trim()) {
      setNameError('Campaign name is required');
      isValid = false;
    } else {
      setNameError('');
    }

    if (!description.trim()) {
      setDescriptionError('Description is required');
      isValid = false;
    } else {
      setDescriptionError('');
    }

    if (!message.trim() && !templateId) {
      setMessageError('Message or template is required');
      isValid = false;
    } else {
      setMessageError('');
    }

    if (recipientsList.length === 0 && !recipients.trim()) {
      setRecipientsError('At least one recipient is required');
      isValid = false;
    } else {
      setRecipientsError('');
    }

    return isValid;
  };

  const handleAddRecipient = () => {
    if (!currentPhone.trim()) {
      setPhoneError('Phone number is required');
      return;
    }

    // Simple phone validation (at least 10 digits)
    const phoneDigits = currentPhone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      setPhoneError('Phone number must be at least 10 digits');
      return;
    }

    // Check for duplicates
    if (recipientsList.some(r => r.phone === currentPhone.trim())) {
      setPhoneError('This phone number is already added');
      return;
    }

    // Add to list
    setRecipientsList([
      ...recipientsList,
      {
        phone: currentPhone.trim(),
        name: currentName.trim() || 'Unknown',
      },
    ]);

    // Clear inputs
    setCurrentPhone('');
    setCurrentName('');
    setPhoneError('');
    setRecipientsError('');
  };

  const handleRemoveRecipient = (phone: string) => {
    setRecipientsList(recipientsList.filter(r => r.phone !== phone));
  };

  const handleCreate = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Use recipients list if available, otherwise parse comma-separated
      let recipientList;
      
      if (recipientsList.length > 0) {
        recipientList = recipientsList.map(r => ({
          phoneNumber: r.phone,
          name: r.name,
          variables: {},
        }));
      } else {
        // Fallback to comma-separated input
        recipientList = recipients
          .split(',')
          .map(phone => phone.trim())
          .filter(phone => phone.length > 0)
          .map(phoneNumber => ({
            phoneNumber,
            name: null,
            variables: {},
          }));
      }

      if (recipientList.length === 0) {
        Alert.alert('Error', 'Please add at least one recipient');
        setLoading(false);
        return;
      }

      // Prepare campaign data
      const campaignData: any = {
        name: name.trim(),
        description: description.trim(),
        recipients: recipientList,
        settings: {},
      };

      // Add template or message
      if (templateId) {
        campaignData.templateId = templateId;
      } else {
        campaignData.message = message.trim();
      }

      // Add scheduling if provided
      if (scheduledDate.trim() && scheduledTime.trim()) {
        const scheduledFor = new Date(
          `${scheduledDate}T${scheduledTime}:00`,
        ).toISOString();
        campaignData.scheduledAt = scheduledFor;
      }

      await campaignAPI.createCampaign(campaignData);

      Alert.alert('Success', 'Campaign created successfully!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Back">
          <Text style={styles.iconText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Campaign</Text>
        <View style={{width: 40}} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerText}>
            📋 Fill in the campaign details below. You can start or schedule it
            after creation.
          </Text>
        </View>

        {/* Step 1: Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1️⃣ Basic Information</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Campaign Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, nameError ? styles.inputError : null]}
              value={name}
              onChangeText={text => {
                setName(text);
                setNameError('');
              }}
              placeholder="e.g., Health Check Reminder"
              placeholderTextColor="#999"
              editable={!loading}
            />
            {nameError ? (
              <Text style={styles.errorText}>{nameError}</Text>
            ) : null}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Description <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                descriptionError ? styles.inputError : null,
              ]}
              value={description}
              onChangeText={text => {
                setDescription(text);
                setDescriptionError('');
              }}
              placeholder="Describe the purpose of this campaign..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!loading}
            />
            {descriptionError ? (
              <Text style={styles.errorText}>{descriptionError}</Text>
            ) : null}
          </View>
        </View>

        {/* Step 2: Message Content */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2️⃣ Message Content</Text>

          {loadingTemplates ? (
            <ActivityIndicator color="#25D366" />
          ) : (
            <>
              {templates.length > 0 && (
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Template (Optional)</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.templatesScroll}>
                    <TouchableOpacity
                      style={[
                        styles.templateChip,
                        !templateId && styles.templateChipActive,
                      ]}
                      onPress={() => setTemplateId('')}>
                      <Text
                        style={[
                          styles.templateChipText,
                          !templateId && styles.templateChipTextActive,
                        ]}>
                        No Template
                      </Text>
                    </TouchableOpacity>
                    {templates.map(template => (
                      <TouchableOpacity
                        key={template._id}
                        style={[
                          styles.templateChip,
                          templateId === template._id &&
                            styles.templateChipActive,
                        ]}
                        onPress={() => setTemplateId(template._id)}>
                        <Text
                          style={[
                            styles.templateChipText,
                            templateId === template._id &&
                              styles.templateChipTextActive,
                          ]}>
                          {template.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {!templateId && (
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>
                    Message Text <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      styles.textArea,
                      messageError ? styles.inputError : null,
                    ]}
                    value={message}
                    onChangeText={text => {
                      setMessage(text);
                      setMessageError('');
                    }}
                    placeholder="Type your message here..."
                    placeholderTextColor="#999"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    editable={!loading}
                  />
                  {messageError ? (
                    <Text style={styles.errorText}>{messageError}</Text>
                  ) : null}
                </View>
              )}
            </>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Recipients <Text style={styles.required}>*</Text>
            </Text>
            
            {/* Add Recipient Form */}
            <View style={styles.addRecipientContainer}>
              <View style={styles.recipientInputRow}>
                <TextInput
                  style={[styles.recipientInput, styles.phoneInput, phoneError ? styles.inputError : null]}
                  value={currentPhone}
                  onChangeText={text => {
                    setCurrentPhone(text);
                    setPhoneError('');
                  }}
                  placeholder="Phone number (e.g., +1234567890)"
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                  editable={!loading}
                />
                <TextInput
                  style={[styles.recipientInput, styles.nameInput]}
                  value={currentName}
                  onChangeText={setCurrentName}
                  placeholder="Name (optional)"
                  placeholderTextColor="#999"
                  editable={!loading}
                />
              </View>
              {phoneError ? (
                <Text style={styles.errorText}>{phoneError}</Text>
              ) : null}
              <TouchableOpacity
                style={styles.addRecipientButton}
                onPress={handleAddRecipient}
                disabled={loading}>
                <Text style={styles.addRecipientButtonText}>+ Add Recipient</Text>
              </TouchableOpacity>
            </View>

            {/* Recipients List */}
            {recipientsList.length > 0 && (
              <View style={styles.recipientsListContainer}>
                <Text style={styles.recipientsListTitle}>
                  {recipientsList.length} Recipient{recipientsList.length !== 1 ? 's' : ''} Added:
                </Text>
                {recipientsList.map((recipient, index) => (
                  <View key={recipient.phone} style={styles.recipientItem}>
                    <View style={styles.recipientInfo}>
                      <Text style={styles.recipientNumber}>{index + 1}.</Text>
                      <View style={styles.recipientDetails}>
                        <Text style={styles.recipientName}>{recipient.name}</Text>
                        <Text style={styles.recipientPhone}>{recipient.phone}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRemoveRecipient(recipient.phone)}
                      style={styles.removeButton}>
                      <Text style={styles.removeButtonText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Fallback: Comma-separated input */}
            {recipientsList.length === 0 && (
              <View style={styles.inputContainer}>
                <Text style={styles.orText}>OR enter comma-separated numbers:</Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.textArea,
                    recipientsError ? styles.inputError : null,
                  ]}
                  value={recipients}
                  onChangeText={text => {
                    setRecipients(text);
                    setRecipientsError('');
                  }}
                  placeholder="e.g., +1234567890, +9876543210"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  editable={!loading}
                />
              </View>
            )}
            
            {recipientsError ? (
              <Text style={styles.errorText}>{recipientsError}</Text>
            ) : null}
          </View>
        </View>

        {/* Step 3: Scheduling (Optional) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3️⃣ Schedule (Optional)</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Date</Text>
            <TextInput
              style={styles.input}
              value={scheduledDate}
              onChangeText={setScheduledDate}
              placeholder="YYYY-MM-DD (e.g., 2025-01-25)"
              placeholderTextColor="#999"
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Time</Text>
            <TextInput
              style={styles.input}
              value={scheduledTime}
              onChangeText={setScheduledTime}
              placeholder="HH:MM (e.g., 09:00)"
              placeholderTextColor="#999"
              editable={!loading}
            />
          </View>

          <Text style={styles.helperText}>
            💡 Leave empty to save as draft. You can start the campaign manually later.
          </Text>
        </View>

        {/* Create Button */}
        <TouchableOpacity
          style={[styles.createButton, loading && styles.createButtonDisabled]}
          onPress={handleCreate}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.createButtonText}>✨ Create Campaign</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
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
  backButtonText: {
    fontSize: 28,
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
  infoBanner: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  infoBannerText: {
    fontSize: 13,
    color: '#1565C0',
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
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#f44336',
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    color: '#333',
  },
  textArea: {
    minHeight: 100,
  },
  inputError: {
    borderColor: '#f44336',
  },
  errorText: {
    color: '#f44336',
    fontSize: 12,
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  templatesScroll: {
    flexDirection: 'row',
    maxHeight: 50,
  },
  templateChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  templateChipActive: {
    backgroundColor: '#25D366',
    borderColor: '#25D366',
  },
  templateChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  templateChipTextActive: {
    color: '#fff',
  },
  createButton: {
    backgroundColor: '#25D366',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  iconText: {
    fontSize: 20,
    color: '#374151',
  },
  addRecipientContainer: {
    marginBottom: 16,
  },
  recipientInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  recipientInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    color: '#333',
  },
  phoneInput: {
    flex: 2,
  },
  nameInput: {
    flex: 1,
  },
  addRecipientButton: {
    backgroundColor: '#25D366',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  addRecipientButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  recipientsListContainer: {
    marginTop: 16,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 12,
  },
  recipientsListTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  recipientItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  recipientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  recipientNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginRight: 12,
    minWidth: 20,
  },
  recipientDetails: {
    flex: 1,
  },
  recipientName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  recipientPhone: {
    fontSize: 12,
    color: '#666',
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f44336',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  orText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginVertical: 8,
  },
});

export default CreateCampaignScreen;
