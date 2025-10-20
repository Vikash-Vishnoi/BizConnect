import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../types/navigation';
import type {Template, TemplateStatus, TemplateCategory} from '../types/template';
import {templateService} from '../services/templateService';
import TemplateCard from '../components/templates/TemplateCard';
import {useFocusEffect} from '@react-navigation/native';

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

  // Load templates
  const loadTemplates = async (isRefreshing = false) => {
    try {
      if (isRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const data = await templateService.getTemplates();
      setTemplates(data);
      applyFilters(data, searchQuery, statusFilter, categoryFilter);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Apply filters
  const applyFilters = (
    data: Template[],
    search: string,
    status: TemplateStatus | 'all',
    category: TemplateCategory | 'all',
  ) => {
    let filtered = [...data];

    // Search filter
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

    // Status filter
    if (status !== 'all') {
      filtered = filtered.filter(t => t.status === status);
    }

    // Category filter
    if (category !== 'all') {
      filtered = filtered.filter(t => t.category === category);
    }

    setFilteredTemplates(filtered);
  };

  // Handle filter changes
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

  // Load templates on mount and when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadTemplates();
    }, []),
  );

  // Navigate to template details
  const handleTemplatePress = (template: Template) => {
    navigation.navigate('TemplateDetails', {templateId: template._id});
  };

  // Navigate to create template
  const handleCreateTemplate = () => {
    navigation.navigate('CreateTemplate');
  };

  // Render filter chip
  const FilterChip = ({
    label,
    active,
    onPress,
  }: {
    label: string;
    active: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      style={[styles.filterChip, active && styles.filterChipActive]}
      onPress={onPress}>
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Templates</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading templates...</Text>
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
        <Text style={styles.title}>Templates</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateTemplate}>
          <Text style={styles.createButtonText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={handleSearchChange}
          placeholder="Search templates..."
          placeholderTextColor="#9CA3AF"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearchChange('')}>
            <Text style={styles.clearIcon}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Status Filter */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Status:</Text>
        <View style={styles.filterChips}>
          <FilterChip
            label="All"
            active={statusFilter === 'all'}
            onPress={() => handleStatusFilter('all')}
          />
          <FilterChip
            label="Approved"
            active={statusFilter === 'approved'}
            onPress={() => handleStatusFilter('approved')}
          />
          <FilterChip
            label="Pending"
            active={statusFilter === 'pending'}
            onPress={() => handleStatusFilter('pending')}
          />
          <FilterChip
            label="Draft"
            active={statusFilter === 'draft'}
            onPress={() => handleStatusFilter('draft')}
          />
          <FilterChip
            label="Rejected"
            active={statusFilter === 'rejected'}
            onPress={() => handleStatusFilter('rejected')}
          />
        </View>
      </View>

      {/* Category Filter */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Category:</Text>
        <View style={styles.filterChips}>
          <FilterChip
            label="All"
            active={categoryFilter === 'all'}
            onPress={() => handleCategoryFilter('all')}
          />
          <FilterChip
            label="Utility"
            active={categoryFilter === 'UTILITY'}
            onPress={() => handleCategoryFilter('UTILITY')}
          />
          <FilterChip
            label="Marketing"
            active={categoryFilter === 'MARKETING'}
            onPress={() => handleCategoryFilter('MARKETING')}
          />
          <FilterChip
            label="Authentication"
            active={categoryFilter === 'AUTHENTICATION'}
            onPress={() => handleCategoryFilter('AUTHENTICATION')}
          />
        </View>
      </View>

      {/* Templates List */}
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
            colors={['#3B82F6']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>📝</Text>
            <Text style={styles.emptyTitle}>No Templates Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first template to get started'}
            </Text>
            {templates.length === 0 && (
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={handleCreateTemplate}>
                <Text style={styles.emptyButtonText}>Create Template</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Floating Action Button */}
      {filteredTemplates.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={handleCreateTemplate}
          activeOpacity={0.8}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
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
  createButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1F2937',
  },
  clearIcon: {
    fontSize: 18,
    color: '#9CA3AF',
    padding: 4,
  },
  filterSection: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  filterChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterChipText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    padding: 16,
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
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: '300',
  },
});

export default TemplatesScreen;
