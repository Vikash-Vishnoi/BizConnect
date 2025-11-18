import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../types/navigation';
import type {Template, TemplateStatus, TemplateCategory} from '../types/template';
import {templateService} from '../services/templateService';
import TemplateCard from '../components/templates/TemplateCard';
import {useFocusEffect} from '@react-navigation/native';
import {SkeletonList, EmptyState, EnhancedButton} from '../components/common';
import theme from '../theme';
import Button from '../components/common/Button';

type TemplatesScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Templates'
>;

interface Props {
  navigation: TemplatesScreenNavigationProp;
}

const TemplatesScreen: React.FC<Props> = ({navigation}) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TemplateStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<TemplateCategory | 'all'>(
    'all',
  );

  const loadTemplates = async (isRefreshing = false) => {
    try {
      if (isRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const response = await templateService.getTemplates();
      const templateArray = Array.isArray(response) ? response : (response as any).templates || [];
      setTemplates(templateArray);
      applyFilters(templateArray, searchQuery, statusFilter, categoryFilter);
    } catch (error) {
      console.error('Failed to load templates:', error);
      setTemplates([]);
      setFilteredTemplates([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilters = (
    data: Template[],
    search: string,
    status: TemplateStatus | 'all',
    category: TemplateCategory | 'all',
  ) => {
    let filtered = [...data];

    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        t =>
          t.name.toLowerCase().includes(searchLower) ||
          t.components.some(c =>
            c.text?.toLowerCase().includes(searchLower),
          ),
      );
    }

    if (status !== 'all') {
      filtered = filtered.filter(t => t.status === status);
    }

    if (category !== 'all') {
      filtered = filtered.filter(t => t.category === category);
    }

    setFilteredTemplates(filtered);
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    applyFilters(templates, text, statusFilter, categoryFilter);
  };

  const handleStatusFilter = (status: TemplateStatus | 'all') => {
    setStatusFilter(status);
    applyFilters(templates, searchQuery, status, categoryFilter);
  };

  const handleCategoryFilter = (category: TemplateCategory | 'all') => {
    setCategoryFilter(category);
    applyFilters(templates, searchQuery, statusFilter, category);
  };

  useFocusEffect(
    useCallback(() => {
      loadTemplates();
    }, []),
  );

  const handleTemplatePress = (template: Template) => {
    if (!template._id) {
      console.error('Template ID is undefined:', template);
      return;
    }
    navigation.navigate('TemplateDetails', {templateId: template._id});
  };

  const handleCreateTemplate = () => {
    navigation.navigate('CreateTemplate');
  };

  const FilterChip = ({
    label,
    active,
    onPress,
    emoji,
  }: {
    label: string;
    active: boolean;
    onPress: () => void;
    emoji: string;
  }) => (
    <TouchableOpacity
      style={[styles.filterChip, active && styles.filterChipActive]}
      onPress={onPress}>
      <Text style={styles.filterEmoji}>{emoji}</Text>
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Back">
            <Text style={styles.iconText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Templates</Text>
          <View style={styles.placeholder} />
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <SkeletonList count={5} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {}
      <LinearGradient
        colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.iconText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Templates</Text>
        <View style={styles.placeholder} />
      </LinearGradient>

      {}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={handleSearchChange}
          placeholder="Search templates..."
          placeholderTextColor={theme.colors.textSecondary}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearchChange('')}>
            <Text style={styles.clearIcon}>×</Text>
          </TouchableOpacity>
        )}
      </View>

      {}
      <View style={styles.statsBar}>
        <Text style={styles.statsIcon}>📄</Text>
        <Text style={styles.statsText}>
          {filteredTemplates.length} {filteredTemplates.length === 1 ? 'template' : 'templates'} found
        </Text>
      </View>

      {}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Status:</Text>
        <View style={styles.filterChips}>
          <FilterChip
            label="All"
            emoji="📋"
            active={statusFilter === 'all'}
            onPress={() => handleStatusFilter('all')}
          />
          <FilterChip
            label="Approved"
            emoji="✅"
            active={statusFilter === 'approved'}
            onPress={() => handleStatusFilter('approved')}
          />
          <FilterChip
            label="Pending"
            emoji="⏰"
            active={statusFilter === 'pending'}
            onPress={() => handleStatusFilter('pending')}
          />
          <FilterChip
            label="Draft"
            emoji="✏️"
            active={statusFilter === 'draft'}
            onPress={() => handleStatusFilter('draft')}
          />
          <FilterChip
            label="Rejected"
            emoji="❌"
            active={statusFilter === 'rejected'}
            onPress={() => handleStatusFilter('rejected')}
          />
        </View>
      </View>

      {}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Category:</Text>
        <View style={styles.filterChips}>
          <FilterChip
            label="All"
            emoji="📋"
            active={categoryFilter === 'all'}
            onPress={() => handleCategoryFilter('all')}
          />
          <FilterChip
            label="Utility"
            emoji="🔧"
            active={categoryFilter === 'UTILITY'}
            onPress={() => handleCategoryFilter('UTILITY')}
          />
          <FilterChip
            label="Marketing"
            emoji="📈"
            active={categoryFilter === 'MARKETING'}
            onPress={() => handleCategoryFilter('MARKETING')}
          />
          <FilterChip
            label="Authentication"
            emoji="🛡️"
            active={categoryFilter === 'AUTHENTICATION'}
            onPress={() => handleCategoryFilter('AUTHENTICATION')}
          />
        </View>
      </View>

      {}
      <FlatList
        data={filteredTemplates}
        keyExtractor={item => item._id}
        renderItem={({item}) => (
          <TemplateCard template={item} onPress={handleTemplatePress} />
        )}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadTemplates(true)}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="📄"
            title="No Templates Found"
            description={
              searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first template to get started'
            }
            action={
              templates.length === 0 ? (
                <EnhancedButton
                  title="Create Template"
                  onPress={handleCreateTemplate}
                  variant="primary"
                  gradient
                />
              ) : undefined
            }
          />
        }
      />

      {}
      {filteredTemplates.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={handleCreateTemplate}
          activeOpacity={0.8}>
          <LinearGradient
            colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
            style={styles.fabGradient}>
            <Text style={[styles.iconText, {fontSize: 28}]}>＋</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.textInverse,
  },
  addButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    margin: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.base,
    ...theme.shadows.sm,
  },
  searchIcon: {
    marginRight: theme.spacing.xs,
    fontSize: 18,
  },
  clearIcon: {
    fontSize: 24,
    color: theme.colors.textSecondary,
  },
  statsIcon: {
    fontSize: 16,
  },
  filterEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  emptyIcon: {
    fontSize: 64,
  },
  searchInput: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    ...theme.typography.body,
    color: theme.colors.text,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.borderRadius.base,
    ...theme.shadows.sm,
  },
  statsText: {
    ...theme.typography.caption,
    color: theme.colors.text,
    marginLeft: theme.spacing.xs,
    fontWeight: '600',
  },
  filterSection: {
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  filterLabel: {
    ...theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    marginRight: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
    ...theme.shadows.sm,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
  },
  filterIcon: {
    marginRight: 4,
  },
  filterChipText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: theme.colors.textInverse,
  },
  listContainer: {
    padding: theme.spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.sm,
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  emptyContainer: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  emptyTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  emptySubtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    ...theme.shadows.lg,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 20,
    color: theme.colors.textInverse,
  },
});

export default TemplatesScreen;
