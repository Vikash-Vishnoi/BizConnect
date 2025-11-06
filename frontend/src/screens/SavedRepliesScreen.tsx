import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../types/navigation';
import {
  savedRepliesAPI,
  type SavedReply,
  type CreateSavedReplyData,
} from '../services/savedRepliesService';
import theme from '../theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type CategoryType = 'all' | 'greeting' | 'support' | 'sales' | 'closing' | 'faq' | 'other';

const CATEGORIES = [
  { id: 'all', label: 'All', icon: '📋' },
  { id: 'greeting', label: 'Greeting', icon: '👋' },
  { id: 'support', label: 'Support', icon: '🛠️' },
  { id: 'sales', label: 'Sales', icon: '💰' },
  { id: 'closing', label: 'Closing', icon: '👋' },
  { id: 'faq', label: 'FAQ', icon: '❓' },
  { id: 'other', label: 'Other', icon: '📝' },
];

const SavedRepliesScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [savedReplies, setSavedReplies] = useState<SavedReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryType>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingReply, setEditingReply] = useState<SavedReply | null>(null);

  // Form state
  const [formShortcut, setFormShortcut] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formCategory, setFormCategory] = useState<CategoryType>('other');

  useEffect(() => {
    loadSavedReplies();
  }, [activeCategory, searchQuery]);

  const loadSavedReplies = async () => {
    try {
      setLoading(true);
      const response = await savedRepliesAPI.getAll({
        category: activeCategory === 'all' ? undefined : activeCategory,
        search: searchQuery || undefined,
      });
      setSavedReplies(response.data || []);
    } catch (error) {
      console.error('Error loading saved replies:', error);
      Alert.alert('Error', 'Failed to load saved replies');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setFormShortcut('');
    setFormMessage('');
    setFormCategory('other');
    setEditingReply(null);
    setShowCreateModal(true);
  };

  const openEditModal = (reply: SavedReply) => {
    setFormShortcut(reply.shortcut);
    setFormMessage(reply.message);
    setFormCategory(reply.category as CategoryType);
    setEditingReply(reply);
    setShowCreateModal(true);
  };

  const handleSave = async () => {
    if (!formShortcut.trim()) {
      Alert.alert('Error', 'Please enter a shortcut');
      return;
    }

    if (!formMessage.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    try {
      if (editingReply) {
        // Update existing
        await savedRepliesAPI.update(editingReply._id, {
          shortcut: formShortcut.trim(),
          message: formMessage.trim(),
          category: formCategory === 'all' ? 'other' : formCategory,
        });
        Alert.alert('Success', 'Saved reply updated');
      } else {
        // Create new
        await savedRepliesAPI.create({
          shortcut: formShortcut.trim(),
          message: formMessage.trim(),
          category: formCategory === 'all' ? 'other' : formCategory,
        });
        Alert.alert('Success', 'Saved reply created');
      }

      setShowCreateModal(false);
      loadSavedReplies();
    } catch (error: any) {
      console.error('Error saving reply:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to save reply');
    }
  };

  const handleDelete = (reply: SavedReply) => {
    Alert.alert(
      'Delete Reply',
      `Are you sure you want to delete "${reply.shortcut}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await savedRepliesAPI.delete(reply._id);
              Alert.alert('Success', 'Saved reply deleted');
              loadSavedReplies();
            } catch (error) {
              console.error('Error deleting reply:', error);
              Alert.alert('Error', 'Failed to delete reply');
            }
          },
        },
      ],
    );
  };

  const renderReplyItem = ({item}: {item: SavedReply}) => (
    <View style={styles.replyCard}>
      <View style={styles.replyHeader}>
        <View style={styles.shortcutContainer}>
          <Text style={styles.shortcutText}>/{item.shortcut}</Text>
          <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.category) }]}>
            <Text style={styles.categoryText}>
              {CATEGORIES.find(c => c.id === item.category)?.icon} {item.category}
            </Text>
          </View>
        </View>
        <View style={styles.replyActions}>
          <TouchableOpacity onPress={() => openEditModal(item)} style={styles.actionButton}>
            <Icon name="edit-2" size={16} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionButton}>
            <Icon name="trash-2" size={16} color={theme.colors.error} />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.replyMessage} numberOfLines={3}>
        {item.message}
      </Text>
      <View style={styles.replyFooter}>
        <Text style={styles.usageText}>
          <Icon name="zap" size={12} color={theme.colors.textSecondary} /> Used {item.usageCount} times
        </Text>
        {item.lastUsedAt && (
          <Text style={styles.lastUsedText}>
            Last: {new Date(item.lastUsedAt).toLocaleDateString()}
          </Text>
        )}
      </View>
    </View>
  );

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      greeting: '#4CAF50',
      support: '#2196F3',
      sales: '#FF9800',
      closing: '#9C27B0',
      faq: '#00BCD4',
      other: '#607D8B',
    };
    return colors[category] || colors.other;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color={theme.colors.textInverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Saved Replies</Text>
          <TouchableOpacity onPress={openCreateModal} style={styles.addButton}>
            <Icon name="plus" size={24} color={theme.colors.textInverse} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color={theme.colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search shortcuts or messages..."
          placeholderTextColor={theme.colors.textSecondary}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="x" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContainer}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.categoryChip,
              activeCategory === cat.id && styles.categoryChipActive,
            ]}
            onPress={() => setActiveCategory(cat.id as CategoryType)}>
            <Text
              style={[
                styles.categoryChipText,
                activeCategory === cat.id && styles.categoryChipTextActive,
              ]}>
              {cat.icon} {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Results */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : savedReplies.length === 0 ? (
        <View style={styles.centerContainer}>
          <Icon name="message-square" size={64} color={theme.colors.textTertiary} />
          <Text style={styles.emptyTitle}>No Saved Replies</Text>
          <Text style={styles.emptyText}>
            {searchQuery
              ? 'No replies match your search'
              : 'Create your first saved reply to get started'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={savedReplies}
          keyExtractor={item => item._id}
          renderItem={renderReplyItem}
          contentContainerStyle={styles.listContainer}
        />
      )}

      {/* Create/Edit Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreateModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingReply ? 'Edit Reply' : 'Create New Reply'}
              </Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Icon name="x" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Shortcut *</Text>
              <TextInput
                style={styles.input}
                value={formShortcut}
                onChangeText={setFormShortcut}
                placeholder="e.g., hello, thanks, faq1"
                placeholderTextColor={theme.colors.textSecondary}
              />

              <Text style={styles.label}>Category *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.categoryPickerContainer}>
                  {CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.categoryPickerChip,
                        formCategory === cat.id && styles.categoryPickerChipActive,
                      ]}
                      onPress={() => setFormCategory(cat.id as CategoryType)}>
                      <Text
                        style={[
                          styles.categoryPickerText,
                          formCategory === cat.id && styles.categoryPickerTextActive,
                        ]}>
                        {cat.icon} {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <Text style={styles.label}>Message *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formMessage}
                onChangeText={setFormMessage}
                placeholder="Enter your message..."
                placeholderTextColor={theme.colors.textSecondary}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>
                {formMessage.length}/4096 characters
              </Text>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowCreateModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSave}>
                <Text style={styles.saveButtonText}>
                  {editingReply ? 'Update' : 'Create'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...theme.typography.h2,
    color: theme.colors.textInverse,
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: theme.borderRadius.full,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    margin: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  searchInput: {
    flex: 1,
    ...theme.typography.body,
    color: theme.colors.text,
    padding: 0,
  },
  categoryScroll: {
    maxHeight: 50,
  },
  categoryContainer: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    marginRight: theme.spacing.sm,
  },
  categoryChipActive: {
    backgroundColor: theme.colors.primary,
  },
  categoryChipText: {
    ...theme.typography.bodySmall,
    color: theme.colors.text,
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: theme.colors.textInverse,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  listContainer: {
    padding: theme.spacing.md,
  },
  replyCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
  },
  replyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  shortcutContainer: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  shortcutText: {
    ...theme.typography.h4,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  categoryText: {
    ...theme.typography.caption,
    color: theme.colors.textInverse,
    fontWeight: '600',
  },
  replyActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  actionButton: {
    padding: theme.spacing.xs,
  },
  replyMessage: {
    ...theme.typography.body,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    lineHeight: 20,
  },
  replyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  usageText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  lastUsedText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  modalBody: {
    padding: theme.spacing.md,
  },
  label: {
    ...theme.typography.bodySmall,
    color: theme.colors.text,
    fontWeight: '600',
    marginBottom: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    ...theme.typography.body,
    color: theme.colors.text,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'right',
    marginTop: theme.spacing.xs,
  },
  categoryPickerContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginVertical: theme.spacing.xs,
  },
  categoryPickerChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  categoryPickerChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  categoryPickerText: {
    ...theme.typography.bodySmall,
    color: theme.colors.text,
  },
  categoryPickerTextActive: {
    color: theme.colors.textInverse,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  modalButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelButtonText: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
  },
  saveButtonText: {
    ...theme.typography.body,
    color: theme.colors.textInverse,
    fontWeight: '600',
  },
});

export default SavedRepliesScreen;
