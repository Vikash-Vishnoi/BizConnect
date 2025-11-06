/**
 * Tag Manager Component
 * 
 * Full tag management interface:
 * - View all tags
 * - Filter conversations by tag
 * - Rename, delete, merge tags
 * - Tag analytics
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import tagService, { Tag, TagAnalytics } from '../../services/tagService';
import TagChip from '../common/TagChip';
import { useToast } from '../../hooks/useToast';

interface TagManagerProps {
  visible: boolean;
  onClose: () => void;
  onTagSelected?: (tagName: string) => void;
}

export const TagManager: React.FC<TagManagerProps> = ({
  visible,
  onClose,
  onTagSelected
}) => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [analytics, setAnalytics] = useState<TagAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [selectedTagsForMerge, setSelectedTagsForMerge] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { showToast } = useToast();

  useEffect(() => {
    if (visible) {
      loadTags();
      loadAnalytics();
    }
  }, [visible]);

  const loadTags = async () => {
    try {
      setLoading(true);
      const result = await tagService.getAllTags();
      setTags(result.tags);
    } catch (error: any) {
      showToast(error.message || 'Failed to load tags', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      const result = await tagService.getTagAnalytics();
      setAnalytics(result.analytics);
    } catch (error: any) {
      console.error('Failed to load analytics:', error);
    }
  };

  const handleRenameTag = async () => {
    if (!selectedTag || !newTagName.trim()) {
      showToast('Please enter a new tag name', 'error');
      return;
    }

    try {
      setLoading(true);
      await tagService.renameTag(selectedTag.name, newTagName.trim());
      showToast(`Tag renamed from "${selectedTag.name}" to "${newTagName}"`, 'success');
      setShowRenameModal(false);
      setNewTagName('');
      setSelectedTag(null);
      loadTags();
    } catch (error: any) {
      showToast(error.message || 'Failed to rename tag', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTag = (tag: Tag) => {
    Alert.alert(
      'Delete Tag',
      `Are you sure you want to delete "${tag.name}"? This will remove it from ${tag.count} conversation(s).`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await tagService.deleteTag(tag.name);
              showToast(`Tag "${tag.name}" deleted`, 'success');
              loadTags();
              loadAnalytics();
            } catch (error: any) {
              showToast(error.message || 'Failed to delete tag', 'error');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleMergeTags = async () => {
    if (selectedTagsForMerge.length < 2) {
      showToast('Please select at least 2 tags to merge', 'error');
      return;
    }

    if (!newTagName.trim()) {
      showToast('Please enter a target tag name', 'error');
      return;
    }

    try {
      setLoading(true);
      const result = await tagService.mergeTags(selectedTagsForMerge, newTagName.trim());
      showToast(
        `Merged ${result.mergedTags.length} tags into "${result.targetTag}"`,
        'success'
      );
      setShowMergeModal(false);
      setNewTagName('');
      setSelectedTagsForMerge([]);
      loadTags();
      loadAnalytics();
    } catch (error: any) {
      showToast(error.message || 'Failed to merge tags', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleTagForMerge = (tagName: string) => {
    setSelectedTagsForMerge(prev =>
      prev.includes(tagName)
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    );
  };

  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderTagItem = ({ item }: { item: Tag }) => (
    <View style={styles.tagItem}>
      <TouchableOpacity
        style={styles.tagInfo}
        onPress={() => onTagSelected?.(item.name)}
      >
        <TagChip name={item.name} color={item.color} size="medium" />
        <View style={styles.tagStats}>
          <Text style={styles.tagCount}>{item.count} conversations</Text>
          <Text style={styles.tagLastUsed}>
            Last used: {new Date(item.lastUsed).toLocaleDateString()}
          </Text>
        </View>
      </TouchableOpacity>

      <View style={styles.tagActions}>
        <TouchableOpacity
          onPress={() => {
            setSelectedTag(item);
            setNewTagName(item.name);
            setShowRenameModal(true);
          }}
          style={styles.actionButton}
        >
          <Icon name="pencil" size={20} color="#3B82F6" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleDeleteTag(item)}
          style={styles.actionButton}
        >
          <Icon name="delete" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Icon name="close" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Tag Manager</Text>
          <TouchableOpacity onPress={() => setShowMergeModal(true)}>
            <Icon name="merge" size={24} color="#3B82F6" />
          </TouchableOpacity>
        </View>

        {/* Analytics */}
        {analytics && (
          <View style={styles.analyticsCard}>
            <View style={styles.analyticsRow}>
              <View style={styles.analyticItem}>
                <Text style={styles.analyticValue}>{analytics.totalUniqueTags}</Text>
                <Text style={styles.analyticLabel}>Total Tags</Text>
              </View>
              <View style={styles.analyticItem}>
                <Text style={styles.analyticValue}>{analytics.totalTaggedConversations}</Text>
                <Text style={styles.analyticLabel}>Tagged</Text>
              </View>
              <View style={styles.analyticItem}>
                <Text style={styles.analyticValue}>{analytics.tagCoverage}%</Text>
                <Text style={styles.analyticLabel}>Coverage</Text>
              </View>
            </View>
          </View>
        )}

        {/* Search */}
        <View style={styles.searchContainer}>
          <Icon name="magnify" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tags..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Tags List */}
        {loading ? (
          <ActivityIndicator size="large" color="#3B82F6" style={styles.loader} />
        ) : (
          <FlatList
            data={filteredTags}
            renderItem={renderTagItem}
            keyExtractor={item => item.name}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Icon name="tag-off" size={64} color="#D1D5DB" />
                <Text style={styles.emptyText}>No tags found</Text>
              </View>
            }
          />
        )}

        {/* Rename Modal */}
        <Modal visible={showRenameModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Rename Tag</Text>
              <Text style={styles.modalSubtitle}>
                Current: {selectedTag?.name}
              </Text>
              <TextInput
                style={styles.modalInput}
                placeholder="New tag name"
                value={newTagName}
                onChangeText={setNewTagName}
                autoFocus
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  onPress={() => setShowRenameModal(false)}
                  style={[styles.modalButton, styles.cancelButton]}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleRenameTag}
                  style={[styles.modalButton, styles.confirmButton]}
                >
                  <Text style={styles.confirmButtonText}>Rename</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Merge Modal */}
        <Modal visible={showMergeModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Merge Tags</Text>
              <Text style={styles.modalSubtitle}>
                Select tags to merge (min 2):
              </Text>
              
              <FlatList
                data={tags}
                keyExtractor={item => item.name}
                style={styles.mergeList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.mergeTagItem,
                      selectedTagsForMerge.includes(item.name) && styles.mergeTagSelected
                    ]}
                    onPress={() => toggleTagForMerge(item.name)}
                  >
                    <TagChip name={item.name} color={item.color} />
                    {selectedTagsForMerge.includes(item.name) && (
                      <Icon name="check" size={20} color="#10B981" />
                    )}
                  </TouchableOpacity>
                )}
              />

              <TextInput
                style={styles.modalInput}
                placeholder="Target tag name"
                value={newTagName}
                onChangeText={setNewTagName}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  onPress={() => {
                    setShowMergeModal(false);
                    setSelectedTagsForMerge([]);
                    setNewTagName('');
                  }}
                  style={[styles.modalButton, styles.cancelButton]}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleMergeTags}
                  style={[styles.modalButton, styles.confirmButton]}
                  disabled={selectedTagsForMerge.length < 2}
                >
                  <Text style={styles.confirmButtonText}>Merge</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000'
  },
  analyticsCard: {
    backgroundColor: '#FFF',
    padding: 16,
    marginBottom: 16
  },
  analyticsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around'
  },
  analyticItem: {
    alignItems: 'center'
  },
  analyticValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3B82F6'
  },
  analyticLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontSize: 14
  },
  listContent: {
    padding: 16
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8
  },
  tagInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center'
  },
  tagStats: {
    marginLeft: 12
  },
  tagCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000'
  },
  tagLastUsed: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2
  },
  tagActions: {
    flexDirection: 'row',
    gap: 8
  },
  actionButton: {
    padding: 8
  },
  loader: {
    marginTop: 40
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 16
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxHeight: '80%'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 16
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  cancelButton: {
    backgroundColor: '#F3F4F6'
  },
  cancelButtonText: {
    color: '#000',
    fontWeight: '600'
  },
  confirmButton: {
    backgroundColor: '#3B82F6'
  },
  confirmButtonText: {
    color: '#FFF',
    fontWeight: '600'
  },
  mergeList: {
    maxHeight: 200,
    marginBottom: 16
  },
  mergeTagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginBottom: 8
  },
  mergeTagSelected: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5'
  }
});

export default TagManager;
