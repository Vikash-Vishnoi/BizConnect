import React, {useState} from 'react';
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
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '../types/navigation';
import {campaignAPI} from '../services/campaignService';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateCampaign'>;

const CreateCampaignScreen = ({navigation}: Props) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [templateId] = useState('template_001'); // Mock for now
  const [segmentId] = useState('segment_001'); // Mock for now
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [loading, setLoading] = useState(false);

  // Validation errors
  const [nameError, setNameError] = useState('');
  const [descriptionError, setDescriptionError] = useState('');
  const [dateError, setDateError] = useState('');

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

    if (!scheduledDate.trim() || !scheduledTime.trim()) {
      setDateError('Schedule date and time are required');
      isValid = false;
    } else {
      setDateError('');
    }

    return isValid;
  };

  const handleCreate = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Combine date and time into ISO string
      const scheduledFor = new Date(
        `${scheduledDate}T${scheduledTime}:00`,
      ).toISOString();

      const campaignData = {
        name: name.trim(),
        description: description.trim(),
        templateId,
        segmentId,
        scheduledFor,
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>←</Text>
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

        {/* Step 2: Template & Segment (Mock) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2️⃣ Template & Segment</Text>

          <View style={styles.mockInfo}>
            <Text style={styles.mockLabel}>📝 Template:</Text>
            <Text style={styles.mockValue}>Health Check Template</Text>
          </View>

          <View style={styles.mockInfo}>
            <Text style={styles.mockLabel}>👥 Patient Segment:</Text>
            <Text style={styles.mockValue}>
              Annual Checkup Due (Est. 50,000 patients)
            </Text>
          </View>

          <Text style={styles.mockNote}>
            💡 Template and segment selection will be added in next iteration
          </Text>
        </View>

        {/* Step 3: Scheduling */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3️⃣ Schedule</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Date <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, dateError ? styles.inputError : null]}
              value={scheduledDate}
              onChangeText={text => {
                setScheduledDate(text);
                setDateError('');
              }}
              placeholder="YYYY-MM-DD (e.g., 2024-01-25)"
              placeholderTextColor="#999"
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Time <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, dateError ? styles.inputError : null]}
              value={scheduledTime}
              onChangeText={text => {
                setScheduledTime(text);
                setDateError('');
              }}
              placeholder="HH:MM (e.g., 09:00)"
              placeholderTextColor="#999"
              editable={!loading}
            />
            {dateError ? (
              <Text style={styles.errorText}>{dateError}</Text>
            ) : null}
          </View>

          <Text style={styles.mockNote}>
            💡 Date/time picker will be added in next iteration
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
  mockInfo: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  mockLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    width: 120,
  },
  mockValue: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  mockNote: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 8,
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
});

export default CreateCampaignScreen;
