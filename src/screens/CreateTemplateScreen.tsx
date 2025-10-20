import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../types/navigation';
import type {CreateTemplatePayload} from '../types/template';
import {templateService} from '../services/templateService';
import TemplateBuilder from '../components/templates/TemplateBuilder';
import TemplatePreview from '../components/templates/TemplatePreview';

type CreateTemplateScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'CreateTemplate'
>;

interface Props {
  navigation: CreateTemplateScreenNavigationProp;
}

const CreateTemplateScreen: React.FC<Props> = ({navigation}) => {
  const [activeTab, setActiveTab] = useState<'build' | 'preview'>('build');
  const [templateData, setTemplateData] = useState<CreateTemplatePayload | null>(
    null,
  );
  const [saving, setSaving] = useState(false);

  const handleSaveTemplate = async (template: CreateTemplatePayload) => {
    try {
      setSaving(true);
      const savedTemplate = await templateService.createTemplate(template);
      
      Alert.alert(
        'Success',
        'Template created successfully!',
        [
          {
            text: 'View Details',
            onPress: () => {
              navigation.replace('TemplateDetails', {
                templateId: savedTemplate._id,
              });
            },
          },
          {
            text: 'Back to Templates',
            onPress: () => {
              navigation.navigate('Templates');
            },
          },
        ],
      );
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'Failed to create template. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (templateData) {
      Alert.alert(
        'Discard Changes?',
        'Are you sure you want to discard your changes?',
        [
          {text: 'Keep Editing', style: 'cancel'},
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => navigation.goBack(),
          },
        ],
      );
    } else {
      navigation.goBack();
    }
  };

  const handlePreview = (template: CreateTemplatePayload) => {
    setTemplateData(template);
    setActiveTab('preview');
  };

  if (saving) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Creating template...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleCancel}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Create Template</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'build' && styles.tabActive]}
          onPress={() => setActiveTab('build')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'build' && styles.tabTextActive,
            ]}>
            🛠️ Build
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'preview' && styles.tabActive]}
          onPress={() => {
            if (!templateData) {
              Alert.alert(
                'No Preview Available',
                'Please build your template first to see the preview.',
              );
            } else {
              setActiveTab('preview');
            }
          }}
          disabled={!templateData}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'preview' && styles.tabTextActive,
              !templateData && styles.tabTextDisabled,
            ]}>
            👁️ Preview
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'build' ? (
        <TemplateBuilder
          initialData={templateData || undefined}
          onSave={handleSaveTemplate}
          onCancel={handleCancel}
        />
      ) : templateData ? (
        <View style={styles.previewContainer}>
          <TemplatePreview
            template={{
              _id: 'preview',
              name: templateData.name,
              category: templateData.category,
              status: 'draft',
              language: templateData.language,
              components: templateData.components,
            }}
          />
          <View style={styles.previewFooter}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setActiveTab('build')}>
              <Text style={styles.editButtonText}>← Edit Template</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.savePreviewButton}
              onPress={() => handleSaveTemplate(templateData)}>
              <Text style={styles.savePreviewButtonText}>Save Template</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 28,
    color: '#374151',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  placeholder: {
    width: 40,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#3B82F6',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#3B82F6',
  },
  tabTextDisabled: {
    opacity: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  previewContainer: {
    flex: 1,
  },
  previewFooter: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  editButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  savePreviewButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    marginLeft: 8,
  },
  savePreviewButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default CreateTemplateScreen;
