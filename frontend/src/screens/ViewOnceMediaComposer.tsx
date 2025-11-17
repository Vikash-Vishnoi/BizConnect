/**
 * ✅ FEATURE 26: VIEW ONCE MEDIA COMPOSER
 * 
 * Screen for sending view-once media (images/videos that disappear after viewing)
 * WhatsApp Cloud API Feature: Ephemeral Media
 * 
 * Features:
 * - Select image or video from device
 * - Add optional caption (max 1024 chars)
 * - Send as view-once message
 * - Visual indicator that media will disappear after viewing
 * 
 * @version 1.0.0
 * @date November 2025
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import api from '../services/api';
import theme from '../theme';
import { RootStackParamList } from '../types/navigation';

type ViewOnceMediaComposerRouteProp = RouteProp<RootStackParamList, 'ViewOnceMediaComposer'>;
type ViewOnceMediaComposerNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ViewOnceMediaComposer'>;

interface ViewOnceMediaComposerProps {}

interface SelectedMedia {
  uri: string;
  type: 'image' | 'video';
  fileName: string;
  fileSize: number;
}

const ViewOnceMediaComposer: React.FC<ViewOnceMediaComposerProps> = () => {
  const navigation = useNavigation<ViewOnceMediaComposerNavigationProp>();
  const route = useRoute<ViewOnceMediaComposerRouteProp>();
  const { phoneNumber, conversationId } = route.params || {};

  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia | null>(null);
  const [caption, setCaption] = useState('');
  const [sending, setSending] = useState(false);

  const handleSelectMedia = async (mediaType: 'image' | 'video') => {
    try {
      const result = await launchImageLibrary({
        mediaType: mediaType === 'image' ? 'photo' : 'video',
        quality: 1,
        selectionLimit: 1,
      });

      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        Alert.alert('Error', result.errorMessage || 'Failed to select media');
        return;
      }

      const asset = result.assets?.[0];
      if (asset && asset.uri) {
        setSelectedMedia({
          uri: asset.uri,
          type: mediaType,
          fileName: asset.fileName || `${mediaType}_${Date.now()}`,
          fileSize: asset.fileSize || 0
        });
      }
    } catch (error) {
      console.error('Select media error:', error);
      Alert.alert('Error', 'Failed to select media');
    }
  };

  const uploadMedia = async (): Promise<string | null> => {
    if (!selectedMedia) return null;

    try {
      const formData = new FormData();
      formData.append('file', {
        uri: selectedMedia.uri,
        type: selectedMedia.type === 'image' ? 'image/jpeg' : 'video/mp4',
        name: selectedMedia.fileName
      } as any);

      const response = await api.post('/media/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success && response.data.mediaId) {
        return response.data.mediaId;
      }

      return null;
    } catch (error: any) {
      console.error('Upload media error:', error);
      throw new Error(error.response?.data?.error || 'Failed to upload media');
    }
  };

  const handleSend = async () => {
    if (!selectedMedia) {
      Alert.alert('No Media', 'Please select an image or video first');
      return;
    }

    if (!phoneNumber) {
      Alert.alert('Error', 'No recipient phone number provided');
      return;
    }

    Alert.alert(
      '👁️ Send View-Once Media?',
      `This ${selectedMedia.type} will disappear after ${phoneNumber} views it once.\n\nThis action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Send',
          style: 'default',
          onPress: async () => {
            setSending(true);
            try {
              // Upload media first
              const mediaId = await uploadMedia();
              
              if (!mediaId) {
                throw new Error('Failed to upload media');
              }

              // Send as view-once media
              const response = await api.post('/view-once/send', {
                phoneNumber: phoneNumber,
                mediaType: selectedMedia.type,
                mediaId: mediaId,
                caption: caption.trim() || undefined
              });

              if (response.data.success) {
                Alert.alert(
                  'Sent! 👁️',
                  `View-once ${selectedMedia.type} sent successfully`,
                  [
                    {
                      text: 'OK',
                      onPress: () => navigation.goBack()
                    }
                  ]
                );
              } else {
                throw new Error(response.data.error || 'Failed to send');
              }
            } catch (error: any) {
              console.error('Send view-once media error:', error);
              Alert.alert(
                'Send Failed',
                error.message || 'Failed to send view-once media'
              );
            } finally {
              setSending(false);
            }
          }
        }
      ]
    );
  };

  const handleRemoveMedia = () => {
    setSelectedMedia(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>View Once Media</Text>
          <Text style={styles.headerSubtitle}>Disappears after viewing</Text>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Info Box */}
        <View style={styles.infoBox}>
          <Icon name="eye-off" size={24} color={theme.colors.primary} />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>Privacy Feature</Text>
            <Text style={styles.infoText}>
              Media sent with view-once will disappear after the recipient views it.
              Perfect for sharing sensitive information privately.
            </Text>
          </View>
        </View>

        {/* Media Selection */}
        {!selectedMedia ? (
          <View style={styles.selectionContainer}>
            <Text style={styles.sectionTitle}>Select Media</Text>
            
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => handleSelectMedia('image')}
            >
              <Icon name="image" size={32} color={theme.colors.primary} />
              <Text style={styles.selectButtonText}>Select Photo</Text>
              <Text style={styles.selectButtonSubtext}>JPEG, PNG</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => handleSelectMedia('video')}
            >
              <Icon name="video" size={32} color={theme.colors.primary} />
              <Text style={styles.selectButtonText}>Select Video</Text>
              <Text style={styles.selectButtonSubtext}>MP4, MOV</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.mediaPreviewContainer}>
            <View style={styles.mediaPreviewHeader}>
              <Text style={styles.sectionTitle}>Selected Media</Text>
              <TouchableOpacity onPress={handleRemoveMedia}>
                <Icon name="close-circle" size={24} color={theme.colors.error} />
              </TouchableOpacity>
            </View>

            {/* Media Preview */}
            {selectedMedia.type === 'image' ? (
              <Image source={{ uri: selectedMedia.uri }} style={styles.imagePreview} />
            ) : (
              <View style={styles.videoPreview}>
                <Icon name="video" size={64} color={theme.colors.primary} />
                <Text style={styles.videoPreviewText}>Video Selected</Text>
              </View>
            )}

            {/* Media Info */}
            <View style={styles.mediaInfo}>
              <View style={styles.mediaInfoRow}>
                <Icon name="file" size={16} color={theme.colors.textSecondary} />
                <Text style={styles.mediaInfoText}>{selectedMedia.fileName}</Text>
              </View>
              <View style={styles.mediaInfoRow}>
                <Icon name="database" size={16} color={theme.colors.textSecondary} />
                <Text style={styles.mediaInfoText}>{formatFileSize(selectedMedia.fileSize)}</Text>
              </View>
              <View style={styles.mediaInfoRow}>
                <Icon name="eye-off" size={16} color={theme.colors.primary} />
                <Text style={[styles.mediaInfoText, styles.viewOnceText]}>
                  Will disappear after viewing
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Caption Input */}
        {selectedMedia && (
          <View style={styles.captionContainer}>
            <Text style={styles.sectionTitle}>Caption (Optional)</Text>
            <TextInput
              style={styles.captionInput}
              placeholder="Add a caption..."
              placeholderTextColor={theme.colors.textSecondary}
              value={caption}
              onChangeText={setCaption}
              multiline
              maxLength={1024}
              editable={!sending}
            />
            <Text style={styles.charCount}>{caption.length}/1024</Text>
          </View>
        )}

        {/* Send Button */}
        {selectedMedia && (
          <TouchableOpacity
            style={[styles.sendButton, sending && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Icon name="send" size={20} color="#fff" />
                <Text style={styles.sendButtonText}>Send View-Once Media</Text>
              </>
            )}
          </TouchableOpacity>
        )}
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    ...Platform.select({
      ios: {
        paddingTop: 50,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primaryLight,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  selectionContainer: {
    marginBottom: 24,
  },
  selectButton: {
    backgroundColor: theme.colors.surface,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 8,
  },
  selectButtonSubtext: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  mediaPreviewContainer: {
    marginBottom: 24,
  },
  mediaPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  imagePreview: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
  },
  videoPreview: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPreviewText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: 12,
  },
  mediaInfo: {
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  mediaInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  mediaInfoText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 8,
    flex: 1,
  },
  viewOnceText: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  captionContainer: {
    marginBottom: 24,
  },
  captionInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: theme.colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  charCount: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'right',
    marginTop: 8,
  },
  sendButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
});

export default ViewOnceMediaComposer;
