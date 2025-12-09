/**
 * Status Composer - Create 24-hour status updates (text/image/video)
 */

import React, { useState, useRef, useEffect } from 'react';
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
  Platform,
  Modal,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { launchImageLibrary } from 'react-native-image-picker';
import api from '../services/api';
import theme from '../theme';
import { RootStackParamList } from '../types/navigation';

type StatusComposerNavigationProp = NativeStackNavigationProp<RootStackParamList, 'StatusComposer'>;

const BACKGROUND_COLORS = [
  theme.colors.primary, // Primary Indigo
  theme.colors.primaryLight, // Light Indigo
  '#075E54', // Dark Green
  '#E91E63', // Pink
  '#9C27B0', // Purple
  '#673AB7', // Deep Purple
  '#3F51B5', // Indigo
  '#2196F3', // Blue
  '#00BCD4', // Cyan
  '#009688', // Teal
  '#4CAF50', // Green
  '#FF9800', // Orange
  '#FF5722', // Deep Orange
  '#795548', // Brown
  '#607D8B', // Blue Grey
  '#000000', // Black
];

const FONTS = [
  { value: 'default', label: 'Default', style: {} },
  { value: 'bold', label: 'Bold', style: { fontWeight: 'bold' as const } },
  { value: 'italic', label: 'Italic', style: { fontStyle: 'italic' as const } },
];

interface StatusComposerProps {}

interface SelectedMedia {
  uri: string;
  type: 'image' | 'video';
  fileName: string;
  fileSize: number;
}

const StatusComposer: React.FC<StatusComposerProps> = () => {
  const navigation = useNavigation<StatusComposerNavigationProp>();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const [statusType, setStatusType] = useState<'text' | 'image' | 'video' | null>(null);
  const [content, setContent] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia | null>(null);
  const [backgroundColor, setBackgroundColor] = useState(theme.colors.primary);
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [selectedFont, setSelectedFont] = useState('default');
  const [privacy, setPrivacy] = useState<'all' | 'contacts' | 'selected'>('all');
  const [posting, setPosting] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleSelectType = (type: 'text' | 'image' | 'video') => {
    setStatusType(type);
    if (type === 'text') {
      setSelectedMedia(null);
    }
  };

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
        setStatusType(mediaType);
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

  const handlePost = async () => {
    if (!statusType) {
      Alert.alert('Select Type', 'Please select a status type first');
      return;
    }

    if (statusType === 'text' && !content.trim()) {
      Alert.alert('Empty Status', 'Please enter some text for your status');
      return;
    }

    if ((statusType === 'image' || statusType === 'video') && !selectedMedia) {
      Alert.alert('No Media', 'Please select media for your status');
      return;
    }

    Alert.alert(
      'Post Status',
      'Your status will be visible for 24 hours and then disappear automatically.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Post',
          style: 'default',
          onPress: async () => {
            setPosting(true);
            try {
              let mediaId = null;
              let mediaUrl = null;

              // Upload media if needed
              if (selectedMedia) {
                mediaId = await uploadMedia();
                mediaUrl = selectedMedia.uri;
                
                if (!mediaId) {
                  throw new Error('Failed to upload media');
                }
              }

              // Create status
              const response = await api.post('/status', {
                type: statusType,
                content: content.trim() || undefined,
                mediaId: mediaId,
                mediaUrl: mediaUrl,
                mediaType: statusType === 'text' ? undefined : statusType,
                backgroundColor: statusType === 'text' ? backgroundColor : undefined,
                textColor: statusType === 'text' ? textColor : undefined,
                font: statusType === 'text' ? selectedFont : undefined,
                privacy: privacy
              });

              if (response.data.success) {
                Alert.alert(
                  'Status Posted',
                  'Your status will expire in 24 hours',
                  [
                    {
                      text: 'OK',
                      onPress: () => navigation.goBack()
                    }
                  ]
                );
              } else {
                throw new Error(response.data.error || 'Failed to post status');
              }
            } catch (error: any) {
              console.error('Post status error:', error);
              Alert.alert(
                'Post Failed',
                error.message || 'Failed to post status'
              );
            } finally {
              setPosting(false);
            }
          }
        }
      ]
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const selectedFontStyle = FONTS.find(f => f.value === selectedFont)?.style || {};

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={theme.colors.textInverse} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Create Status</Text>
          <Text style={styles.headerSubtitle}>Expires in 24 hours</Text>
        </View>
        {statusType && (
          <TouchableOpacity onPress={handlePost} disabled={posting}>
            <Text style={[styles.postButton, posting && styles.postButtonDisabled]}>
              {posting ? 'Posting...' : 'Post'}
            </Text>
          </TouchableOpacity>
        )}
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Info Box */}
        <Animated.View 
          style={[
            styles.infoBox,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Icon name="clock-outline" size={24} color={theme.colors.primary} />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>24-Hour Status</Text>
            <Text style={styles.infoText}>
              Share updates that disappear after 24 hours. Choose text, photos, or videos.
            </Text>
          </View>
        </Animated.View>

        {/* Type Selection */}
        {!statusType && (
          <Animated.View 
            style={[
              styles.typeSelectionContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.sectionTitle}>Select Status Type</Text>
            
            <TouchableOpacity
              style={styles.typeButton}
              onPress={() => handleSelectType('text')}
            >
              <Icon name="text" size={32} color={theme.colors.primary} />
              <Text style={styles.typeButtonText}>Text Status</Text>
              <Text style={styles.typeButtonSubtext}>Share thoughts with styled text</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.typeButton}
              onPress={() => handleSelectMedia('image')}
            >
              <Icon name="image" size={32} color={theme.colors.primary} />
              <Text style={styles.typeButtonText}>Photo Status</Text>
              <Text style={styles.typeButtonSubtext}>Share a moment with image</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.typeButton}
              onPress={() => handleSelectMedia('video')}
            >
              <Icon name="video" size={32} color={theme.colors.primary} />
              <Text style={styles.typeButtonText}>Video Status</Text>
              <Text style={styles.typeButtonSubtext}>Share video clips</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Text Status Editor */}
        {statusType === 'text' && (
          <Animated.View 
            style={[
              styles.textEditorContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.editorHeader}>
              <Text style={styles.sectionTitle}>Text Status</Text>
              <TouchableOpacity onPress={() => setStatusType(null)}>
                <Icon name="close-circle" size={24} color={theme.colors.error} />
              </TouchableOpacity>
            </View>

            {/* Background Color Picker */}
            <View style={styles.colorSection}>
              <Text style={styles.subsectionTitle}>Background Color</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorScroll}>
                {BACKGROUND_COLORS.map(color => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      backgroundColor === color && styles.colorOptionSelected
                    ]}
                    onPress={() => setBackgroundColor(color)}
                  >
                    {backgroundColor === color && (
                      <Icon name="check" size={20} color="#fff" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Font Style */}
            <View style={styles.fontSection}>
              <Text style={styles.subsectionTitle}>Font Style</Text>
              <View style={styles.fontOptions}>
                {FONTS.map(font => (
                  <TouchableOpacity
                    key={font.value}
                    style={[
                      styles.fontOption,
                      selectedFont === font.value && styles.fontOptionSelected
                    ]}
                    onPress={() => setSelectedFont(font.value)}
                  >
                    <Text style={[styles.fontOptionText, font.style]}>{font.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Text Preview */}
            <View style={[styles.textPreview, { backgroundColor }]}>
              <TextInput
                style={[
                  styles.textInput,
                  { color: textColor },
                  selectedFontStyle
                ]}
                placeholder="Type your status..."
                placeholderTextColor="rgba(255,255,255,0.6)"
                value={content}
                onChangeText={setContent}
                multiline
                maxLength={5000}
                editable={!posting}
              />
            </View>
            <Text style={styles.charCount}>{content.length}/5000</Text>
          </Animated.View>
        )}

        {/* Media Status Editor */}
        {(statusType === 'image' || statusType === 'video') && selectedMedia && (
          <Animated.View 
            style={[
              styles.mediaEditorContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.editorHeader}>
              <Text style={styles.sectionTitle}>{statusType === 'image' ? 'Photo' : 'Video'} Status</Text>
              <TouchableOpacity onPress={() => {
                setStatusType(null);
                setSelectedMedia(null);
              }}>
                <Icon name="close-circle" size={24} color={theme.colors.error} />
              </TouchableOpacity>
            </View>

            {/* Media Preview */}
            {statusType === 'image' ? (
              <Image source={{ uri: selectedMedia.uri }} style={styles.mediaPreview} />
            ) : (
              <View style={styles.videoPreviewBox}>
                <Icon name="video" size={64} color={theme.colors.primary} />
                <Text style={styles.videoPreviewText}>Video Selected</Text>
                <Text style={styles.videoPreviewSubtext}>{formatFileSize(selectedMedia.fileSize)}</Text>
              </View>
            )}

            {/* Caption Input */}
            <View style={styles.captionContainer}>
              <Text style={styles.subsectionTitle}>Caption (Optional)</Text>
              <TextInput
                style={styles.captionInput}
                placeholder="Add a caption..."
                placeholderTextColor={theme.colors.textSecondary}
                value={content}
                onChangeText={setContent}
                multiline
                maxLength={5000}
                editable={!posting}
              />
              <Text style={styles.charCount}>{content.length}/5000</Text>
            </View>
          </Animated.View>
        )}

        {/* Privacy Settings */}
        {statusType && (
          <Animated.View 
            style={[
              styles.privacyContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.sectionTitle}>Privacy</Text>
            
            <TouchableOpacity
              style={[styles.privacyOption, privacy === 'all' && styles.privacyOptionSelected]}
              onPress={() => setPrivacy('all')}
            >
              <Icon 
                name={privacy === 'all' ? 'radiobox-marked' : 'radiobox-blank'} 
                size={24} 
                color={privacy === 'all' ? theme.colors.primary : theme.colors.textSecondary}
              />
              <View style={styles.privacyText}>
                <Text style={styles.privacyTitle}>Share with Everyone</Text>
                <Text style={styles.privacySubtext}>All your contacts can view</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.privacyOption, privacy === 'contacts' && styles.privacyOptionSelected]}
              onPress={() => setPrivacy('contacts')}
            >
              <Icon 
                name={privacy === 'contacts' ? 'radiobox-marked' : 'radiobox-blank'} 
                size={24} 
                color={privacy === 'contacts' ? theme.colors.primary : theme.colors.textSecondary}
              />
              <View style={styles.privacyText}>
                <Text style={styles.privacyTitle}>My Contacts</Text>
                <Text style={styles.privacySubtext}>Only people in your contacts</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.privacyOption, privacy === 'selected' && styles.privacyOptionSelected]}
              onPress={() => setPrivacy('selected')}
            >
              <Icon 
                name={privacy === 'selected' ? 'radiobox-marked' : 'radiobox-blank'} 
                size={24} 
                color={privacy === 'selected' ? theme.colors.primary : theme.colors.textSecondary}
              />
              <View style={styles.privacyText}>
                <Text style={styles.privacyTitle}>Selected Contacts</Text>
                <Text style={styles.privacySubtext}>Choose specific people</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
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
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primaryDark,
    ...theme.shadows.md,
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
    fontWeight: '700',
    color: theme.colors.textInverse,
  },
  headerSubtitle: {
    fontSize: 12,
    color: theme.colors.textInverse,
    marginTop: 2,
    opacity: 0.9,
  },
  postButton: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textInverse,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  postButtonDisabled: {
    opacity: 0.5,
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
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  typeSelectionContainer: {
    marginBottom: 24,
  },
  typeButton: {
    backgroundColor: theme.colors.surface,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 8,
  },
  typeButtonSubtext: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  textEditorContainer: {
    marginBottom: 24,
  },
  editorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  colorSection: {
    marginBottom: 16,
  },
  colorScroll: {
    flexDirection: 'row',
  },
  colorOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: theme.colors.primary,
    borderWidth: 3,
  },
  fontSection: {
    marginBottom: 16,
  },
  fontOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  fontOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  fontOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  fontOptionText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  textPreview: {
    minHeight: 250,
    borderRadius: 12,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    width: '100%',
    fontSize: 20,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  charCount: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'right',
    marginTop: 8,
  },
  mediaEditorContainer: {
    marginBottom: 24,
  },
  mediaPreview: {
    width: '100%',
    height: 400,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    marginBottom: 16,
  },
  videoPreviewBox: {
    width: '100%',
    height: 400,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  videoPreviewText: {
    fontSize: 16,
    color: theme.colors.text,
    marginTop: 12,
  },
  videoPreviewSubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  captionContainer: {
    marginTop: 8,
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
  privacyContainer: {
    marginBottom: 24,
  },
  privacyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  privacyOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  privacyText: {
    marginLeft: 12,
    flex: 1,
  },
  privacyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  privacySubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});

export default StatusComposer;
