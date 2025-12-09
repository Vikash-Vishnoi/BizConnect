/**
 * Tag Selector Component
 * 
 * Allows adding/removing tags from a conversation
 * Shows existing tags and suggestions
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import tagService, { Tag } from '../../services/tagService';
import TagChip from './TagChip';
import { useToast } from '../../hooks/useToast';

interface TagSelectorProps {
  visible: boolean;
  onClose: () => void;
  conversationId: string;
  existingTags: string[];
  onTagsUpdated?: (tags: string[]) => void;
}

export const TagSelector: React.FC<TagSelectorProps> = ({
  visible,
  onClose,
  conversationId,
  existingTags,
  onTagsUpdated
}) => {
  const [tags, setTags] = useState<string[]>(existingTags);
  const [suggestions, setSuggestions] = useState<Tag[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [addingTag, setAddingTag] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    setTags(existingTags);
  }, [existingTags]);

  useEffect(() => {
    if (visible) {
      loadSuggestions();
    }
  }, [visible, searchQuery]);

  const loadSuggestions = async () => {
    try {
      setLoading(true);
      const result = await tagService.getTagSuggestions(searchQuery, 20);
      
      // Filter out tags already applied
      const filteredSuggestions = result.suggestions.filter(
        s => !tags.includes(s.name)
      );
      
      setSuggestions(filteredSuggestions);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = async (tagName: string) => {
    if (!tagName.trim()) {
      return;
    }

    if (tags.includes(tagName.toLowerCase().trim())) {
      showToast('Tag already added', 'info');
      return;
    }

    try {
      setAddingTag(true);
      const result = await tagService.addTagToConversation(conversationId, tagName);
      
      const newTags = result.conversation.tags || [];
      setTags(newTags);
      onTagsUpdated?.(newTags);
      
      setSearchQuery('');
      showToast('Tag added', 'success');
      
      // Reload suggestions
      loadSuggestions();
    } catch (error: any) {
      showToast(error.message || 'Failed to add tag', 'error');
    } finally {
      setAddingTag(false);
    }
  };

  const handleRemoveTag = async (tagName: string) => {
    try {
      const result = await tagService.removeTagFromConversation(conversationId, tagName);
      
      const newTags = result.conversation.tags || [];
      setTags(newTags);
      onTagsUpdated?.(newTags);
      
      showToast('Tag removed', 'success');
      
      // Reload suggestions
      loadSuggestions();
    } catch (error: any) {
      showToast(error.message || 'Failed to remove tag', 'error');
    }
  };

  const handleCreateNewTag = () => {
    if (searchQuery.trim()) {
      handleAddTag(searchQuery.trim());
    }
  };

  const renderSuggestion = ({ item }: { item: Tag }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handleAddTag(item.name)}
    >
      <TagChip name={item.name} color={item.color} size="medium" />
      <View style={styles.suggestionInfo}>
        <Text style={styles.suggestionCount}>{item.count} conversations</Text>
      </View>
      <Icon name="plus-circle" size={24} color="#10B981" />
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Manage Tags</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          {/* Current Tags */}
          {tags.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Current Tags</Text>
              <View style={styles.tagsContainer}>
                {tags.map(tag => {
                  // Find color from suggestions or generate default
                  const suggestion = suggestions.find(s => s.name === tag);
                  const color = suggestion?.color || '#3B82F6';
                  
                  return (
                    <TagChip
                      key={tag}
                      name={tag}
                      color={color}
                      size="medium"
                      onRemove={() => handleRemoveTag(tag)}
                    />
                  );
                })}
              </View>
            </View>
          )}

          {/* Search/Add Tag */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Add Tag</Text>
            <View style={styles.searchContainer}>
              <Icon name="magnify" size={20} color="#9CA3AF" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search or create tag..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
              />
              {searchQuery.trim() && !loading && (
                <TouchableOpacity
                  onPress={handleCreateNewTag}
                  disabled={addingTag}
                  style={styles.addButton}
                >
                  {addingTag ? (
                    <ActivityIndicator size="small" color="#10B981" />
                  ) : (
                    <Icon name="plus-circle" size={24} color="#10B981" />
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Suggestions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {searchQuery ? 'Search Results' : 'Suggested Tags'}
            </Text>
            
            {loading ? (
              <ActivityIndicator size="large" color="#3B82F6" style={styles.loader} />
            ) : suggestions.length > 0 ? (
              <FlatList
                data={suggestions}
                renderItem={renderSuggestion}
                keyExtractor={item => item.name}
                style={styles.suggestionsList}
              />
            ) : (
              <View style={styles.emptyState}>
                <Icon name="tag-off" size={48} color="#D1D5DB" />
                <Text style={styles.emptyText}>
                  {searchQuery ? 'No matching tags' : 'No suggestions'}
                </Text>
                {searchQuery && (
                  <Text style={styles.emptyHint}>
                    Tap the + button to create "{searchQuery}"
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  container: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000'
  },
  section: {
    padding: 16
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
    textTransform: 'uppercase'
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 14
  },
  addButton: {
    padding: 4
  },
  suggestionsList: {
    maxHeight: 300
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    marginBottom: 8
  },
  suggestionInfo: {
    flex: 1,
    marginLeft: 12
  },
  suggestionCount: {
    fontSize: 12,
    color: '#6B7280'
  },
  loader: {
    marginVertical: 20
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8
  },
  emptyHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    fontStyle: 'italic'
  }
});

export default TagSelector;
