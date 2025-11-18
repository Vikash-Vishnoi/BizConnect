import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Share,
  Linking,
} from 'react-native';
import RNFS from 'react-native-fs';
import {
  requestDataExport,
  requestDataDeletion,
  getGDPRRequests,
  cancelGDPRRequest,
  downloadExport,
  DATA_TYPE_OPTIONS,
  DELETE_TYPE_OPTIONS,
  formatFileSize,
  formatDuration,
  getStatusColor,
  getStatusIcon,
  getRequestTypeIcon,
  getRequestTypeLabel,
  isExportExpired,
  getExpirationWarning,
  type GDPRRequest,
} from '../services/gdprService';
import { useToast } from '../hooks/useToast';
import {EnhancedButton, EnhancedCard, Skeleton, SkeletonCard, EmptyState} from '../components/common';
import theme from '../theme';

const PrivacyScreen = () => {
  const [activeTab, setActiveTab] = useState<'requests' | 'export' | 'delete'>('requests');
  const [requests, setRequests] = useState<GDPRRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDataTypes, setSelectedDataTypes] = useState<string[]>(['all']);
  const [selectedDeleteTypes, setSelectedDeleteTypes] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState<'JSON' | 'CSV' | 'PDF'>('JSON');
  const [deletionReason, setDeletionReason] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const response = await getGDPRRequests({ page: 1, limit: 50 });
      setRequests(response.requests);
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to load requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  };

  const handleExportRequest = async () => {
    if (selectedDataTypes.length === 0) {
      Alert.alert('Error', 'Please select at least one data type');
      return;
    }

    Alert.alert(
      'Confirm Export',
      `You are about to request an export of your data in ${exportFormat} format. You will receive a notification when it's ready (usually within a few minutes).`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request Export',
          onPress: async () => {
            try {
              setLoading(true);
              const response = await requestDataExport({
                dataTypes: selectedDataTypes,
                format: exportFormat,
              });
              showToast(response.message || 'Export request submitted', 'success');
              await loadRequests();
              setActiveTab('requests');
            } catch (error: any) {
              showToast(error.response?.data?.message || 'Failed to request export', 'error');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteRequest = async () => {
    if (selectedDeleteTypes.length === 0) {
      Alert.alert('Error', 'Please select at least one data type to delete');
      return;
    }

    if (!confirmPassword) {
      Alert.alert('Error', 'Please enter your password to confirm deletion');
      return;
    }

    Alert.alert(
      '⚠️ Warning: Data Deletion',
      'This action cannot be undone. Your selected data will be permanently deleted within 30 days. Are you absolutely sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const response = await requestDataDeletion({
                deleteDataTypes: selectedDeleteTypes,
                deletionReason,
                confirmPassword,
              });
              showToast(response.message || 'Deletion request submitted', 'success');
              await loadRequests();
              setActiveTab('requests');
              setConfirmPassword('');
              setDeletionReason('');
            } catch (error: any) {
              showToast(error.response?.data?.message || 'Failed to request deletion', 'error');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleCancelRequest = async (requestId: string) => {
    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel this request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          onPress: async () => {
            try {
              const response = await cancelGDPRRequest(requestId);
              showToast(response.message || 'Request cancelled', 'success');
              await loadRequests();
            } catch (error: any) {
              showToast(error.response?.data?.message || 'Failed to cancel request', 'error');
            }
          },
        },
      ]
    );
  };

  const handleDownload = async (request: GDPRRequest) => {
    if (!request._id) return;

    try {
      setDownloadingId(request._id);

      // Get API URL from environment or use default
      const API_URL = process.env.REACT_APP_API_URL || 'http://10.0.2.2:5000/api';
      const downloadUrl = `${API_URL}/gdpr/download/${request._id}`;
      
      // For mobile: Download file and share
      const fileName = `gdpr_export_${request._id}.${request.format?.toLowerCase()}`;
      const filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

      const downloadResult = await RNFS.downloadFile({
        fromUrl: downloadUrl,
        toFile: filePath,
      }).promise;

      if (downloadResult.statusCode === 200) {
        // Share the downloaded file
        const shareOptions = {
          title: 'GDPR Data Export',
          url: Platform.OS === 'android' ? `file://${filePath}` : filePath,
          type: request.format === 'PDF' ? 'application/pdf' : 
                request.format === 'JSON' ? 'application/json' : 
                'text/csv',
        };

        await Share.share(shareOptions);
        showToast('File ready to share', 'success');
      } else {
        throw new Error('Download failed');
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to download', 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  const toggleDataType = (type: string) => {
    if (type === 'all') {
      setSelectedDataTypes(['all']);
    } else {
      const newTypes = selectedDataTypes.includes(type)
        ? selectedDataTypes.filter(t => t !== type && t !== 'all')
        : [...selectedDataTypes.filter(t => t !== 'all'), type];
      setSelectedDataTypes(newTypes.length > 0 ? newTypes : ['all']);
    }
  };

  const toggleDeleteType = (type: string) => {
    if (type === 'all') {
      setSelectedDeleteTypes(['all']);
    } else {
      const newTypes = selectedDeleteTypes.includes(type)
        ? selectedDeleteTypes.filter(t => t !== type && t !== 'all')
        : [...selectedDeleteTypes.filter(t => t !== 'all'), type];
      setSelectedDeleteTypes(newTypes.length > 0 ? newTypes : []);
    }
  };

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
        onPress={() => setActiveTab('requests')}
      >
        <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
          📋 My Requests
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'export' && styles.activeTab]}
        onPress={() => setActiveTab('export')}
      >
        <Text style={[styles.tabText, activeTab === 'export' && styles.activeTabText]}>
          📥 Export Data
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'delete' && styles.activeTab]}
        onPress={() => setActiveTab('delete')}
      >
        <Text style={[styles.tabText, activeTab === 'delete' && styles.activeTabText]}>
          🗑️ Delete Data
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderRequestsList = () => (
    <ScrollView
      style={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>📜 Your GDPR Requests</Text>
        <Text style={styles.infoText}>
          View and manage your data export and deletion requests. Export files expire after 30 days.
        </Text>
      </View>

      {loading && !refreshing ? (
        <View style={{padding: theme.spacing.md}}>
          <SkeletonCard />
          <View style={{height: theme.spacing.md}} />
          <SkeletonCard />
        </View>
      ) : requests.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyTitle}>No Requests Yet</Text>
          <Text style={styles.emptyText}>
            You haven't made any data export or deletion requests.
          </Text>
        </View>
      ) : (
        requests.map(request => (
          <View key={request._id} style={styles.requestCard}>
            <View style={styles.requestHeader}>
              <View style={styles.requestType}>
                <Text style={styles.requestTypeIcon}>
                  {getRequestTypeIcon(request.requestType)}
                </Text>
                <Text style={styles.requestTypeText}>
                  {getRequestTypeLabel(request.requestType)}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) }]}>
                <Text style={styles.statusText}>
                  {getStatusIcon(request.status)} {request.status}
                </Text>
              </View>
            </View>

            <Text style={styles.requestDate}>
              Requested: {new Date(request.createdAt).toLocaleString()}
            </Text>

            {request.requestType === 'EXPORT' && request.status === 'COMPLETED' && (
              <>
                <View style={styles.exportInfo}>
                  <Text style={styles.exportInfoText}>
                    📄 Format: {request.format}
                  </Text>
                  <Text style={styles.exportInfoText}>
                    💾 Size: {formatFileSize(request.fileSize)}
                  </Text>
                </View>

                {request.expiresAt && (
                  <Text style={[
                    styles.expiryText,
                    isExportExpired(request.expiresAt) && styles.expiredText
                  ]}>
                    {isExportExpired(request.expiresAt)
                      ? '❌ Expired'
                      : `⏰ ${getExpirationWarning(request.expiresAt) || `Expires ${new Date(request.expiresAt).toLocaleDateString()}`}`
                    }
                  </Text>
                )}

                {!isExportExpired(request.expiresAt) && (
                  <TouchableOpacity
                    style={styles.downloadButton}
                    onPress={() => handleDownload(request)}
                    disabled={downloadingId === request._id}
                  >
                    {downloadingId === request._id ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <>
                        <Text style={styles.downloadButtonText}>⬇️ Download</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </>
            )}

            {request.requestType === 'DELETE' && request.status === 'COMPLETED' && (
              <View style={styles.deletionSummary}>
                <Text style={styles.deletionTitle}>Deleted Records:</Text>
                {Object.entries(request.deletedRecords || {}).map(([key, value]) => (
                  value > 0 && (
                    <Text key={key} style={styles.deletionItem}>
                      • {key}: {value}
                    </Text>
                  )
                ))}
              </View>
            )}

            {request.status === 'FAILED' && request.errorMessage && (
              <Text style={styles.errorText}>❌ Error: {request.errorMessage}</Text>
            )}

            {request.status === 'PENDING' && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => handleCancelRequest(request._id)}
              >
                <Text style={styles.cancelButtonText}>Cancel Request</Text>
              </TouchableOpacity>
            )}

            {request.startedAt && request.completedAt && (
              <Text style={styles.durationText}>
                ⏱️ Processing time: {formatDuration(request.startedAt, request.completedAt)}
              </Text>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );

  const renderExportTab = () => (
    <ScrollView style={styles.content}>
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>📥 Export Your Data</Text>
        <Text style={styles.infoText}>
          Request a copy of your personal data in compliance with GDPR Article 15. The export will be available for download for 30 days.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Data to Export</Text>
        <View style={styles.optionsGrid}>
          {DATA_TYPE_OPTIONS.map(option => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionCard,
                selectedDataTypes.includes(option.value) && styles.optionCardSelected
              ]}
              onPress={() => toggleDataType(option.value)}
            >
              <Text style={styles.optionIcon}>{option.icon}</Text>
              <Text style={styles.optionLabel}>{option.label}</Text>
              <Text style={styles.optionDescription}>{option.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Export Format</Text>
        <View style={styles.formatContainer}>
          {['JSON', 'CSV', 'PDF'].map((format) => (
            <TouchableOpacity
              key={format}
              style={[
                styles.formatButton,
                exportFormat === format && styles.formatButtonSelected
              ]}
              onPress={() => setExportFormat(format as any)}
            >
              <Text style={[
                styles.formatButtonText,
                exportFormat === format && styles.formatButtonTextSelected
              ]}>
                {format}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={{marginTop: theme.spacing.md, marginBottom: theme.spacing.lg}}>
        <EnhancedButton
          title="📥 Request Export"
          onPress={handleExportRequest}
          loading={loading}
          disabled={loading}
          variant="primary"
          size="large"
          fullWidth
          gradient
        />
      </View>

      <View style={styles.gdprInfo}>
        <Text style={styles.gdprInfoTitle}>🔒 GDPR Compliance</Text>
        <Text style={styles.gdprInfoText}>
          This export is provided under GDPR Article 15 (Right of Access). Your data will be processed securely and made available for download within 24 hours.
        </Text>
      </View>
    </ScrollView>
  );

  const renderDeleteTab = () => (
    <ScrollView style={styles.content}>
      <View style={[styles.infoBox, styles.warningBox]}>
        <Text style={styles.infoTitle}>⚠️ Delete Your Data</Text>
        <Text style={styles.infoText}>
          Request permanent deletion of your data in compliance with GDPR Article 17 (Right to Erasure). This action cannot be undone.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Data to Delete</Text>
        <View style={styles.optionsGrid}>
          {DELETE_TYPE_OPTIONS.map(option => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionCard,
                selectedDeleteTypes.includes(option.value) && styles.optionCardSelectedDelete
              ]}
              onPress={() => toggleDeleteType(option.value)}
            >
              <Text style={styles.optionIcon}>{option.icon}</Text>
              <Text style={styles.optionLabel}>{option.label}</Text>
              <Text style={styles.optionDescription}>{option.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reason for Deletion (Optional)</Text>
        <TextInput
          style={styles.textArea}
          value={deletionReason}
          onChangeText={setDeletionReason}
          placeholder="Tell us why you're deleting your data..."
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Confirm Password *</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Enter your password"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={styles.passwordToggle}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Text style={styles.passwordToggleText}>{showPassword ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{marginTop: theme.spacing.md, marginBottom: theme.spacing.lg}}>
        <EnhancedButton
          title="🗑️ Request Deletion"
          onPress={handleDeleteRequest}
          loading={loading}
          disabled={loading}
          variant="danger"
          size="large"
          fullWidth
        />
      </View>

      <View style={styles.gdprInfo}>
        <Text style={styles.gdprInfoTitle}>🔒 GDPR Compliance</Text>
        <Text style={styles.gdprInfoText}>
          This deletion is provided under GDPR Article 17 (Right to Erasure). Your data will be permanently deleted within 30 days. You can export your data before deletion.
        </Text>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {renderTabs()}
      {activeTab === 'requests' && renderRequestsList()}
      {activeTab === 'export' && renderExportTab()}
      {activeTab === 'delete' && renderDeleteTab()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
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
  activeTab: {
    borderBottomColor: '#6366F1',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#6366F1',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  infoBox: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#6366F1',
  },
  warningBox: {
    backgroundColor: '#FEF3C7',
    borderLeftColor: '#F59E0B',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionCard: {
    width: '31%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  optionCardSelected: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  optionCardSelectedDelete: {
    borderColor: '#EF4444',
    backgroundColor: '#FEE2E2',
  },
  optionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  optionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
    textAlign: 'center',
  },
  optionDescription: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
  },
  formatContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  formatButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  formatButtonSelected: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  formatButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  formatButtonTextSelected: {
    color: '#6366F1',
  },
  textArea: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    fontSize: 14,
    color: '#1F2937',
    textAlignVertical: 'top',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 14,
    color: '#1F2937',
  },
  passwordToggle: {
    padding: 12,
  },
  passwordToggleText: {
    fontSize: 20,
  },
  submitButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  gdprInfo: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  gdprInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  gdprInfoText: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },
  requestCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  requestType: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestTypeIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  requestTypeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  requestDate: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  exportInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 8,
  },
  exportInfoText: {
    fontSize: 12,
    color: '#4B5563',
  },
  expiryText: {
    fontSize: 12,
    color: '#F59E0B',
    marginBottom: 12,
  },
  expiredText: {
    color: '#EF4444',
  },
  downloadButton: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  downloadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  deletionSummary: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  deletionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  deletionItem: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 8,
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  durationText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'right',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});

export default PrivacyScreen;
