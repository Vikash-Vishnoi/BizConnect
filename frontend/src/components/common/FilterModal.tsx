import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import theme from '../../theme';

export interface ConversationFilters {
  statuses: string[];
  tags: string[];
  assignedAgents: string[];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  unreadOnly: boolean;
  hasTag: boolean;
  isAssigned: boolean;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: ConversationFilters) => void;
  availableTags: string[];
  availableAgents: Array<{id: string; name: string}>;
  currentFilters: ConversationFilters;
}

const FilterModal: React.FC<Props> = ({
  visible,
  onClose,
  onApply,
  availableTags,
  availableAgents,
  currentFilters,
}) => {
  const [filters, setFilters] = useState<ConversationFilters>(currentFilters);

  useEffect(() => {
    setFilters(currentFilters);
  }, [currentFilters, visible]);

  const statuses = [
    {id: 'active', label: 'Active', icon: '💬', color: theme.colors.success},
    {id: 'archived', label: 'Archived', icon: '📦', color: theme.colors.textTertiary},
    {id: 'closed', label: 'Closed', icon: '✓', color: theme.colors.textSecondary},
    {id: 'blocked', label: 'Blocked', icon: '🚫', color: theme.colors.error},
  ];

  const toggleStatus = (status: string) => {
    setFilters(prev => ({
      ...prev,
      statuses: prev.statuses.includes(status)
        ? prev.statuses.filter(s => s !== status)
        : [...prev.statuses, status],
    }));
  };

  const toggleTag = (tag: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  const toggleAgent = (agentId: string) => {
    setFilters(prev => ({
      ...prev,
      assignedAgents: prev.assignedAgents.includes(agentId)
        ? prev.assignedAgents.filter(a => a !== agentId)
        : [...prev.assignedAgents, agentId],
    }));
  };

  const handleClearAll = () => {
    setFilters({
      statuses: [],
      tags: [],
      assignedAgents: [],
      dateRange: {start: null, end: null},
      unreadOnly: false,
      hasTag: false,
      isAssigned: false,
    });
  };

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.statuses.length > 0) count++;
    if (filters.tags.length > 0) count++;
    if (filters.assignedAgents.length > 0) count++;
    if (filters.dateRange.start || filters.dateRange.end) count++;
    if (filters.unreadOnly) count++;
    if (filters.hasTag) count++;
    if (filters.isAssigned) count++;
    return count;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Filter Conversations</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="x" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* Status Filter */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Status</Text>
              <View style={styles.chipContainer}>
                {statuses.map(status => (
                  <TouchableOpacity
                    key={status.id}
                    style={[
                      styles.chip,
                      filters.statuses.includes(status.id) && styles.chipActive,
                      filters.statuses.includes(status.id) && {
                        backgroundColor: status.color + '20',
                        borderColor: status.color,
                      },
                    ]}
                    onPress={() => toggleStatus(status.id)}>
                    <Text style={styles.chipIcon}>{status.icon}</Text>
                    <Text
                      style={[
                        styles.chipText,
                        filters.statuses.includes(status.id) && {
                          color: status.color,
                        },
                      ]}>
                      {status.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Tags Filter */}
            {availableTags.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Tags</Text>
                <View style={styles.chipContainer}>
                  {availableTags.map(tag => (
                    <TouchableOpacity
                      key={tag}
                      style={[
                        styles.chip,
                        filters.tags.includes(tag) && styles.chipActive,
                      ]}
                      onPress={() => toggleTag(tag)}>
                      <Icon
                        name="tag"
                        size={14}
                        color={
                          filters.tags.includes(tag)
                            ? theme.colors.primary
                            : theme.colors.textSecondary
                        }
                      />
                      <Text
                        style={[
                          styles.chipText,
                          filters.tags.includes(tag) && styles.chipTextActive,
                        ]}>
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Assigned Agents Filter */}
            {availableAgents.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Assigned To</Text>
                <View style={styles.chipContainer}>
                  {availableAgents.map(agent => (
                    <TouchableOpacity
                      key={agent.id}
                      style={[
                        styles.chip,
                        filters.assignedAgents.includes(agent.id) &&
                          styles.chipActive,
                      ]}
                      onPress={() => toggleAgent(agent.id)}>
                      <Icon
                        name="user"
                        size={14}
                        color={
                          filters.assignedAgents.includes(agent.id)
                            ? theme.colors.primary
                            : theme.colors.textSecondary
                        }
                      />
                      <Text
                        style={[
                          styles.chipText,
                          filters.assignedAgents.includes(agent.id) &&
                            styles.chipTextActive,
                        ]}>
                        {agent.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Quick Filters */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Filters</Text>
              
              <View style={styles.switchRow}>
                <View style={styles.switchLabel}>
                  <Icon name="mail" size={18} color={theme.colors.primary} />
                  <Text style={styles.switchText}>Unread Only</Text>
                </View>
                <Switch
                  value={filters.unreadOnly}
                  onValueChange={value =>
                    setFilters(prev => ({...prev, unreadOnly: value}))
                  }
                  trackColor={{
                    false: theme.colors.border,
                    true: theme.colors.primary + '80',
                  }}
                  thumbColor={
                    filters.unreadOnly ? theme.colors.primary : theme.colors.surface
                  }
                />
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchLabel}>
                  <Icon name="tag" size={18} color={theme.colors.primary} />
                  <Text style={styles.switchText}>Has Tags</Text>
                </View>
                <Switch
                  value={filters.hasTag}
                  onValueChange={value =>
                    setFilters(prev => ({...prev, hasTag: value}))
                  }
                  trackColor={{
                    false: theme.colors.border,
                    true: theme.colors.primary + '80',
                  }}
                  thumbColor={
                    filters.hasTag ? theme.colors.primary : theme.colors.surface
                  }
                />
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchLabel}>
                  <Icon name="user-check" size={18} color={theme.colors.primary} />
                  <Text style={styles.switchText}>Is Assigned</Text>
                </View>
                <Switch
                  value={filters.isAssigned}
                  onValueChange={value =>
                    setFilters(prev => ({...prev, isAssigned: value}))
                  }
                  trackColor={{
                    false: theme.colors.border,
                    true: theme.colors.primary + '80',
                  }}
                  thumbColor={
                    filters.isAssigned ? theme.colors.primary : theme.colors.surface
                  }
                />
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.clearButton]}
              onPress={handleClearAll}>
              <Icon name="x-circle" size={18} color={theme.colors.textSecondary} />
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.applyButton]}
              onPress={handleApply}>
              <Icon name="check" size={18} color={theme.colors.textInverse} />
              <Text style={styles.applyButtonText}>
                Apply {getActiveFilterCount() > 0 && `(${getActiveFilterCount()})`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  content: {
    maxHeight: '75%',
  },
  section: {
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sectionTitle: {
    ...theme.typography.h4,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipActive: {
    backgroundColor: theme.colors.primary + '20',
    borderColor: theme.colors.primary,
  },
  chipIcon: {
    fontSize: 14,
  },
  chipText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  chipTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  switchLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  switchText: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  footer: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  clearButton: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  clearButtonText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  applyButton: {
    backgroundColor: theme.colors.primary,
  },
  applyButtonText: {
    ...theme.typography.body,
    color: theme.colors.textInverse,
    fontWeight: '600',
  },
});

export default FilterModal;
