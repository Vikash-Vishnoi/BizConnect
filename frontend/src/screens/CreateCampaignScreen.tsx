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
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '../types/navigation';
import {campaignAPI} from '../services/campaignService';
import {templateService} from '../services/templateService';
import type {Template} from '../types/template';
import {EnhancedButton, EnhancedInput, Skeleton, SkeletonCard} from '../components/common';
import theme from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateCampaign'>;

const CreateCampaignScreen = ({navigation, route}: Props) => {
  const {edit, duplicate} = route.params || {};
  const isEditMode = !!edit;
  const isDuplicateMode = !!duplicate;
  const sourceCampaign = edit || duplicate;

  const [name, setName] = useState(sourceCampaign?.name || '');
  const [description, setDescription] = useState(sourceCampaign?.description || '');
  const [templateId, setTemplateId] = useState('');
  const [recipients, setRecipients] = useState('');
  const [recipientsList, setRecipientsList] = useState<Array<{phone: string; name: string}>>([]);
  const [currentPhone, setCurrentPhone] = useState('');
  const [currentName, setCurrentName] = useState('');
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const [nameError, setNameError] = useState('');
  const [descriptionError, setDescriptionError] = useState('');
  const [templateError, setTemplateError] = useState('');
  const [recipientsError, setRecipientsError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  useEffect(() => {
    loadTemplates();

    if (sourceCampaign) {
      if (isDuplicateMode) {
        setName(sourceCampaign.name + ' (Copy)');
      }

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
      const templateArray = Array.isArray(response) ? response : (response as any).templates || [];
      const approvedTemplates = templateArray.filter((t: Template) => t.status === 'approved');
      setTemplates(approvedTemplates);
    } catch (error) {
      console.error('Failed to load templates:', error);
      setTemplates([]);
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

    if (!templateId) {
      setTemplateError('Template is required');
      isValid = false;
    } else {
      setTemplateError('');
    }

    if (recipientsList.length === 0 && !recipients.trim()) {
      setRecipientsError('At least one recipient is required');
      isValid = false;
    } else {
      setRecipientsError('');
    }

    return isValid;
  };

  const validatePhoneNumber = (phone: string): boolean => {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // Must be exactly 10 digits
    return digits.length === 10;
  };

  const cleanPhoneNumber = (phone: string): string => {
    // Just return the 10-digit number, backend will add 91 prefix
    return phone.replace(/\D/g, '');
  };

  const handleAddRecipient = () => {
    if (!currentPhone.trim()) {
      setPhoneError('Phone number is required');
      return;
    }

    const cleanedPhone = cleanPhoneNumber(currentPhone.trim());
    
    if (!validatePhoneNumber(currentPhone)) {
      setPhoneError('Phone number must be exactly 10 digits');
      return;
    }

    if (recipientsList.some(r => r.phone === cleanedPhone)) {
      setPhoneError('This phone number is already added');
      return;
    }

    setRecipientsList([
      ...recipientsList,
      {
        phone: cleanedPhone,
        name: currentName.trim() || 'Unknown',
      },
    ]);

    setCurrentPhone('');
    setCurrentName('');
    setPhoneError('');
    setRecipientsError('');
  };

  const handleRemoveRecipient = (phone: string) => {
    setRecipientsList(recipientsList.filter(r => r.phone !== phone));
  };

  const handleImportCSV = async () => {
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.csv, DocumentPicker.types.plainText],
        copyTo: 'cachesDirectory',
      });

      if (result && result[0]) {
        const file = result[0];
        
        try {
          // Read the file content
          const filePath = file.fileCopyUri || file.uri;
          const fileContent = await RNFS.readFile(filePath, 'utf8');
          
          // Parse CSV
          const lines = fileContent.split('\n').filter(line => line.trim());
          
          // Skip header row if it contains "phone" or "name"
          const startIndex = lines[0].toLowerCase().includes('phone') ? 1 : 0;
          
          const parsedRecipients: Array<{phone: string; name: string}> = [];
          const errors: string[] = [];
          
          for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const parts = line.split(',').map(p => p.trim());
            if (parts.length >= 1) {
              const phone = parts[0];
              const name = parts[1] || 'Unknown';
              
              // Validate phone number (10 digits)
              const cleanedPhone = cleanPhoneNumber(phone);
              if (validatePhoneNumber(phone)) {
                // Check for duplicates
                if (!parsedRecipients.some(r => r.phone === cleanedPhone) &&
                    !recipientsList.some(r => r.phone === cleanedPhone)) {
                  parsedRecipients.push({
                    phone: cleanedPhone,
                    name: name,
                  });
                }
              } else {
                errors.push(`Line ${i + 1}: Invalid phone number "${phone}"`);
              }
            }
          }
          
          if (parsedRecipients.length > 0) {
            // Add to existing recipients
            setRecipientsList([...recipientsList, ...parsedRecipients]);
            
            let message = `✅ Imported ${parsedRecipients.length} recipient${parsedRecipients.length !== 1 ? 's' : ''}`;
            if (errors.length > 0) {
              message += `\n\n⚠️ ${errors.length} error${errors.length !== 1 ? 's' : ''}:\n${errors.slice(0, 3).join('\n')}`;
              if (errors.length > 3) {
                message += `\n... and ${errors.length - 3} more`;
              }
            }
            
            Alert.alert('CSV Import Complete', message);
          } else {
            Alert.alert('No Recipients', 'No valid recipients found in CSV file.\n\nExpected format:\nphone,name\n9876543210,Ram Kumar');
          }
          
        } catch (parseError) {
          console.error('CSV parse error:', parseError);
          Alert.alert('Parse Error', 'Failed to parse CSV file. Please check the format:\n\nphone,name\n9876543210,Ram Kumar');
        }
      }
    } catch (error) {
      if (DocumentPicker.isCancel(error)) {
        // User cancelled
        return;
      }
      console.error('CSV picker error:', error);
      Alert.alert('Error', 'Failed to pick CSV file');
    }
  };

  const handleCreate = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      let recipientList;

      if (recipientsList.length > 0) {
        recipientList = recipientsList.map(r => ({
          phoneNumber: r.phone,
          name: r.name,
          variables: {},
        }));
      } else {
        // Format comma-separated numbers
        const phoneNumbers = recipients
          .split(',')
          .map(phone => phone.trim())
          .filter(phone => phone.length > 0);
        
        recipientList = [];
        for (const phone of phoneNumbers) {
          const cleanedPhone = cleanPhoneNumber(phone);
          
          if (!validatePhoneNumber(phone)) {
            Alert.alert('Error', `Invalid phone number: ${phone}. Must be exactly 10 digits.`);
            setLoading(false);
            return;
          }
          
          recipientList.push({
            phoneNumber: cleanedPhone,
            name: null,
            variables: {},
          });
        }
      }

      if (recipientList.length === 0) {
        Alert.alert('Error', 'Please add at least one recipient');
        setLoading(false);
        return;
      }

      const campaignData: any = {
        name: name.trim(),
        description: description.trim(),
        templateId: templateId,
        recipients: recipientList,
        settings: {},
      };

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
      {}
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
        {}
        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerText}>
            📋 Fill in the campaign details below. You can start or schedule it
            after creation.
          </Text>
        </View>

        {}
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

        {/* Message Content - Template Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2️⃣ Select Template</Text>

          {loadingTemplates ? (
            <View style={{paddingVertical: theme.spacing.md}}>
              <Skeleton width="100%" height={40} />
            </View>
          ) : (
            <>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  Template <Text style={styles.required}>*</Text>
                </Text>
                {templates.length > 0 ? (
                  <>
                    <View style={styles.templateInfoBanner}>
                      <Text style={styles.templateInfoIcon}>✅</Text>
                      <Text style={styles.templateInfoText}>
                        {templates.length} approved template{templates.length !== 1 ? 's' : ''} available
                      </Text>
                    </View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.templatesScroll}>
                      {templates.map(template => (
                        <TouchableOpacity
                          key={template._id}
                          style={[
                            styles.templateChip,
                            templateId === template._id &&
                              styles.templateChipActive,
                          ]}
                          onPress={() => {
                            setTemplateId(template._id);
                            setTemplateError('');
                          }}>
                          <Text
                            style={[
                              styles.templateChipText,
                              templateId === template._id &&
                                styles.templateChipTextActive,
                            ]}>
                            ✅ {template.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </>
                ) : (
                  <View style={styles.noTemplatesWarning}>
                    <Text style={styles.noTemplatesIcon}>⚠️</Text>
                    <View style={styles.noTemplatesTextContainer}>
                      <Text style={styles.noTemplatesTitle}>No Approved Templates</Text>
                      <Text style={styles.noTemplatesMessage}>
                        You need to create and get templates approved before creating campaigns.
                      </Text>
                      <TouchableOpacity
                        style={styles.createTemplateButton}
                        onPress={() => {
                          Alert.alert(
                            'Create Template',
                            'Go to Templates screen to create and submit templates for approval.',
                            [
                              {text: 'Later', style: 'cancel'},
                              {text: 'Go to Templates', onPress: () => navigation.navigate('Templates')},
                            ]
                          );
                        }}>
                        <Text style={styles.createTemplateButtonText}>+ Create Template</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                {templateError ? (
                  <Text style={styles.errorText}>{templateError}</Text>
                ) : null}
              </View>
            </>
          )}
        </View>

        {/* Recipients Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3️⃣ Add Recipients</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Recipients <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.helperText}>
              📱 Enter 10-digit phone numbers only. Backend will add 91 prefix automatically.
            </Text>

            {}
            <View style={styles.addRecipientContainer}>
              <View style={styles.recipientInputRow}>
                <TextInput
                  style={[styles.recipientInput, styles.phoneInput, phoneError ? styles.inputError : null]}
                  value={currentPhone}
                  onChangeText={text => {
                    setCurrentPhone(text);
                    setPhoneError('');
                  }}
                  placeholder="10-digit number (e.g., 9876543210)"
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
              <View style={styles.recipientButtonsRow}>
                <TouchableOpacity
                  style={styles.addRecipientButton}
                  onPress={handleAddRecipient}
                  disabled={loading}>
                  <Text style={styles.addRecipientButtonText}>+ Add Recipient</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.csvImportButton}
                  onPress={handleImportCSV}
                  disabled={loading}>
                  <Icon name="upload" size={16} color="#25D366" />
                  <Text style={styles.csvImportButtonText}>Import CSV</Text>
                </TouchableOpacity>
              </View>
            </View>

            {}
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

            {}
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
                  placeholder="e.g., 9876543210, 9123456789"
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

        {/* Create Button */}
        <View style={{marginTop: theme.spacing.lg, marginBottom: theme.spacing.xl}}>
          <EnhancedButton
            title="✨ Create Campaign"
            onPress={handleCreate}
            loading={loading}
            disabled={loading}
            variant="primary"
            size="large"
            fullWidth
            gradient
          />
        </View>
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
  recipientButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  addRecipientButton: {
    flex: 1,
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
  csvImportButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 2,
    borderColor: '#25D366',
  },
  csvImportButtonText: {
    color: '#25D366',
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
  templateInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  templateInfoIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  templateInfoText: {
    fontSize: 13,
    color: '#2E7D32',
    fontWeight: '600',
  },
  noTemplatesWarning: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
  },
  noTemplatesIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  noTemplatesTextContainer: {
    flex: 1,
  },
  noTemplatesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E65100',
    marginBottom: 4,
  },
  noTemplatesMessage: {
    fontSize: 12,
    color: '#EF6C00',
    marginBottom: 12,
  },
  createTemplateButton: {
    backgroundColor: '#FF9800',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  createTemplateButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default CreateCampaignScreen;
