import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';
import type {RootStackParamList} from '../types/navigation';
import type {Template} from '../types/template';
import {templateService} from '../services/templateService';
import TemplatePreview from '../components/templates/TemplatePreview';
import TemplateStatusBadge from '../components/templates/TemplateStatusBadge';

type TemplateDetailsScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'TemplateDetails'
>;

type TemplateDetailsScreenRouteProp = RouteProp<
  RootStackParamList,
  'TemplateDetails'
>;

interface Props {
  navigation: TemplateDetailsScreenNavigationProp;
  route: TemplateDetailsScreenRouteProp;
}

const TemplateDetailsScreen: React.FC<Props> = ({navigation, route}) => {
  const {templateId} = route.params;
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Load template details
  useEffect(() => {
    loadTemplate();
  }, [templateId]);

  const loadTemplate = async () => {
    try {
      setLoading(true);
      const data = await templateService.getTemplateById(templateId);
      setTemplate(data);
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'Failed to load template details',
        [
          {
            text: 'Go Back',
            onPress: () => navigation.goBack(),
          },
        ],
      );
    } finally {
      setLoading(false);
    }
  };

  // Submit template for approval
  const handleSubmitForApproval = () => {
    Alert.alert(
      'Submit for Approval',
      'Are you sure you want to submit this template for WhatsApp approval? Once submitted, you cannot edit it.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Submit',
          onPress: async () => {
            try {
              setSubmitting(true);
              const updatedTemplate = await templateService.submitTemplate(
                templateId,
              );
              setTemplate(updatedTemplate);
              Alert.alert(
                'Success',
                'Template submitted for approval. You will be notified once WhatsApp reviews it.',
              );
            } catch (error: any) {
              Alert.alert(
                'Error',
                error.message || 'Failed to submit template',
              );
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  };

  // Edit template (only for drafts)
  const handleEdit = () => {
    if (!template) return;

    Alert.alert(
      'Edit Template',
      'Edit functionality coming soon! For now, you can create a new template based on this one.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Create New',
          onPress: () => {
            navigation.navigate('CreateTemplate');
          },
        },
      ],
    );
  };

  // Delete template
  const handleDelete = () => {
    Alert.alert(
      'Delete Template',
      'Are you sure you want to delete this template? This action cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setSubmitting(true);
              await templateService.deleteTemplate(templateId);
              Alert.alert('Success', 'Template deleted successfully', [
                {
                  text: 'OK',
                  onPress: () => navigation.navigate('Templates'),
                },
              ]);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete template');
              setSubmitting(false);
            }
          },
        },
      ],
    );
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (loading || submitting) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Template Details</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>
            {loading ? 'Loading template...' : 'Processing...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!template) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Template Details</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Template not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Template Details</Text>
        <TouchableOpacity style={styles.menuButton} onPress={handleDelete}>
          <Text style={styles.menuButtonText}>🗑️</Text>
        </TouchableOpacity>
      </View>

      {/* Template Info Card */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.templateName}>{template.name}</Text>
          <TemplateStatusBadge status={template.status} />
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaItem}>
            <Text style={styles.metaLabel}>Category: </Text>
            {template.category}
          </Text>
          <Text style={styles.metaItem}>
            <Text style={styles.metaLabel}>Language: </Text>
            {template.language}
          </Text>
        </View>
        {template.createdAt && (
          <Text style={styles.dateText}>
            Created {formatDate(template.createdAt)}
          </Text>
        )}
        {template.updatedAt && template.updatedAt !== template.createdAt && (
          <Text style={styles.dateText}>
            Updated {formatDate(template.updatedAt)}
          </Text>
        )}
      </View>

      {/* Rejection Reason */}
      {template.status === 'rejected' && template.rejectionReason && (
        <View style={styles.rejectionCard}>
          <Text style={styles.rejectionTitle}>❌ Rejection Reason</Text>
          <Text style={styles.rejectionText}>{template.rejectionReason}</Text>
          <Text style={styles.rejectionHelp}>
            Please review WhatsApp's template guidelines and create a new template.
          </Text>
        </View>
      )}

      {/* Preview */}
      <View style={styles.previewSection}>
        <Text style={styles.sectionTitle}>Template Preview</Text>
        <TemplatePreview template={template} />
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        {template.status === 'draft' && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={handleEdit}>
              <Text style={styles.editButtonText}>✏️ Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.submitButton]}
              onPress={handleSubmitForApproval}>
              <Text style={styles.submitButtonText}>📤 Submit for Approval</Text>
            </TouchableOpacity>
          </>
        )}

        {template.status === 'pending' && (
          <View style={styles.pendingInfo}>
            <Text style={styles.pendingInfoText}>
              ⏳ This template is pending WhatsApp approval. You will be
              notified once it's reviewed.
            </Text>
          </View>
        )}

        {template.status === 'approved' && (
          <View style={styles.approvedInfo}>
            <Text style={styles.approvedInfoText}>
              ✅ This template is approved and ready to use in campaigns.
            </Text>
            <TouchableOpacity
              style={[styles.actionButton, styles.useButton]}
              onPress={() => {
                navigation.navigate('CreateCampaign');
              }}>
              <Text style={styles.useButtonText}>Use in Campaign</Text>
            </TouchableOpacity>
          </View>
        )}

        {template.status === 'rejected' && (
          <View style={styles.rejectedActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.createNewButton]}
              onPress={() => {
                navigation.navigate('CreateTemplate');
              }}>
              <Text style={styles.createNewButtonText}>Create New Template</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
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
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuButtonText: {
    fontSize: 20,
  },
  placeholder: {
    width: 40,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  templateName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
    marginRight: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metaItem: {
    fontSize: 14,
    color: '#6B7280',
  },
  metaLabel: {
    fontWeight: '600',
    color: '#374151',
  },
  dateText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  rejectionCard: {
    backgroundColor: '#FEE2E2',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  rejectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#991B1B',
    marginBottom: 8,
  },
  rejectionText: {
    fontSize: 14,
    color: '#991B1B',
    marginBottom: 8,
    lineHeight: 20,
  },
  rejectionHelp: {
    fontSize: 12,
    color: '#B91C1C',
    fontStyle: 'italic',
  },
  previewSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  actionButtons: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  actionButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  editButton: {
    backgroundColor: '#F3F4F6',
    marginBottom: 8,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  useButton: {
    backgroundColor: '#10B981',
    marginTop: 8,
  },
  useButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  createNewButton: {
    backgroundColor: '#3B82F6',
  },
  createNewButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  pendingInfo: {
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  pendingInfoText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  approvedInfo: {
    backgroundColor: '#D1FAE5',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  approvedInfoText: {
    fontSize: 14,
    color: '#065F46',
    lineHeight: 20,
    marginBottom: 8,
  },
  rejectedActions: {
    marginTop: 8,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
  },
});

export default TemplateDetailsScreen;
