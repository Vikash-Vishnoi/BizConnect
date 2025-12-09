import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  RefreshControl,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../types/navigation';
import type {Template, TemplateStatus, TemplateCategory} from '../types/template';
import {templateService} from '../services/templateService';
import TemplateCard from '../components/templates/TemplateCard';
import {useFocusEffect} from '@react-navigation/native';
import {SkeletonList, EmptyState, EnhancedButton, AppHeader} from '../components/common';
import theme from '../theme';
import Button from '../components/common/Button';
import {useAuth} from '../contexts/AuthContext';
import {canManageTemplates} from '../utils/permissions';

type TemplatesScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Templates'
>;

interface Props {
  navigation: TemplatesScreenNavigationProp;
}

const TemplatesScreen: React.FC<Props> = ({navigation}) => {
  const {user} = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TemplateStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<TemplateCategory | 'all'>(
    'all',
  );
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // Check if user can manage templates
  const canCreate = user && canManageTemplates(user);
  
  // Animate on mount
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

  const getStatusIcon = (status: string) => {
    switch(status.toLowerCase()) {
      case 'all': return 'apps';
      case 'approved': return 'check-circle';
      case 'pending': return 'clock-outline';
      case 'draft': return 'file-document-outline';
      case 'rejected': return 'close-circle';
      default: return 'file-text';
    }
  };
  
  const getCategoryIcon = (category: string) => {
    switch(category) {
      case 'All': return 'apps';
      case 'Utility': return 'tools';
      case 'Marketing': return 'bullhorn';
      case 'Authentication': return 'shield-check';
      default: return 'folder';
    }
  };
  
  const FilterChip = ({
    label,
    active,
    onPress,
    icon,
  }: {
    label: string;
    active: boolean;
    onPress: () => void;
    icon?: string;
  }) => {
    const chipScale = useRef(new Animated.Value(1)).current;
    
    const handlePress = () => {
      Animated.sequence([
        Animated.spring(chipScale, {
          toValue: 0.92,
          friction: 3,
          useNativeDriver: true,
        }),
        Animated.spring(chipScale, {
          toValue: 1,
          friction: 3,
          useNativeDriver: true,
        }),
      ]).start();
      onPress();
    };
    
    return (
      <Animated.View style={{transform: [{scale: chipScale}]}}>
        <TouchableOpacity
          style={[styles.filterChip, active && styles.filterChipActive]}
          onPress={handlePress}>
          {icon && (
            <Icon 
              name={icon} 
              size={14} 
              color={active ? theme.colors.textInverse : theme.colors.textSecondary}
              style={styles.filterChipIcon}
            />
          )}
          <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
            {label}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader
          title="Templates"
          onBack={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <SkeletonList count={5} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {}
      <AppHeader
        title="Templates"
        onBack={() => navigation.goBack()}
      />

      {}
      <Animated.View 
        style={[
          styles.searchWrapper,
          {
            opacity: fadeAnim,
            transform: [{translateY: slideAnim}],
          },
        ]}>
        <View style={styles.searchContainer}>
          <Icon name="magnify" size={20} color={theme.colors.primary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={handleSearchChange}
            placeholder="Search templates..."
            placeholderTextColor={theme.colors.textSecondary}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearchChange('')}>
              <Icon name="close-circle" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      <Animated.View 
        style={[
          styles.statsBarWrapper,
          {
            opacity: fadeAnim,
            transform: [{translateY: slideAnim}],
          },
        ]}>
        <LinearGradient
          colors={[theme.colors.infoLight + '30', theme.colors.primaryLight + '30']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 0}}
          style={styles.statsBar}>
          <View style={styles.statsIconContainer}>
            <Icon name="file-text" size={18} color={theme.colors.primary} />
          </View>
          <Text style={styles.statsText}>
            {filteredTemplates.length} {filteredTemplates.length === 1 ? 'template' : 'templates'} found
          </Text>
        </LinearGradient>
      </Animated.View>

      {}
      <Animated.View 
        style={[
          styles.filterSection,
          {
            opacity: fadeAnim,
          },
        ]}>
        <Text style={styles.filterLabel}>Status</Text>
        <View style={styles.filterChips}>
          <FilterChip
            label="All"
            active={statusFilter === 'all'}
            onPress={() => handleStatusFilter('all')}
            icon={getStatusIcon('All')}
          />
          <FilterChip
            label="Approved"
            active={statusFilter === 'approved'}
            onPress={() => handleStatusFilter('approved')}
            icon={getStatusIcon('Approved')}
          />
          <FilterChip
            label="Pending"
            active={statusFilter === 'pending'}
            onPress={() => handleStatusFilter('pending')}
            icon={getStatusIcon('Pending')}
          />
          <FilterChip
            label="Draft"
            active={statusFilter === 'draft'}
            onPress={() => handleStatusFilter('draft')}
            icon={getStatusIcon('Draft')}
          />
          <FilterChip
            label="Rejected"
            active={statusFilter === 'rejected'}
            onPress={() => handleStatusFilter('rejected')}
            icon={getStatusIcon('Rejected')}
          />
        </View>
      </Animated.View>

      {}
      <Animated.View 
        style={[
          styles.filterSection,
          {
            opacity: fadeAnim,
          },
        ]}>
        <Text style={styles.filterLabel}>Category</Text>
        <View style={styles.filterChips}>
          <FilterChip
            label="All"
            active={categoryFilter === 'all'}
            onPress={() => handleCategoryFilter('all')}
            icon={getCategoryIcon('All')}
          />
          <FilterChip
            label="Utility"
            active={categoryFilter === 'UTILITY'}
            onPress={() => handleCategoryFilter('UTILITY')}
            icon={getCategoryIcon('Utility')}
          />
          <FilterChip
            label="Marketing"
            active={categoryFilter === 'MARKETING'}
            onPress={() => handleCategoryFilter('MARKETING')}
            icon={getCategoryIcon('Marketing')}
          />
          <FilterChip
            label="Authentication"
            active={categoryFilter === 'AUTHENTICATION'}
            onPress={() => handleCategoryFilter('AUTHENTICATION')}
            icon={getCategoryIcon('Authentication')}
          />
        </View>
      </Animated.View>

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
            icon="file-text"
            title="No Templates Found"
            description={
              searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
                ? 'Try adjusting your filters'
                : canCreate
                ? 'Create your first template to get started'
                : 'No templates available yet'
            }
            action={
              templates.length === 0 && canCreate ? (
                <EnhancedButton
                  title="Create Template"
                  onPress={handleCreateTemplate}
                  variant="primary"
                />
              ) : undefined
            }
          />
        }
      />

      {}
      {filteredTemplates.length > 0 && canCreate && (
        <Animated.View 
          style={[
            styles.fabWrapper,
            {
              opacity: fadeAnim,
              transform: [{scale: fadeAnim}],
            },
          ]}>
          <LinearGradient
            colors={[theme.colors.secondary, theme.colors.accent]}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.fab}>
            <TouchableOpacity
              style={styles.fabButton}
              onPress={handleCreateTemplate}
              activeOpacity={0.85}>
              <Icon name="plus" size={28} color={theme.colors.textInverse} />
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
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
  searchWrapper: {
    marginHorizontal: theme.spacing.base,
    marginTop: theme.spacing.base,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 2,
    borderColor: theme.colors.border,
    ...theme.shadows.md,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  emptyIcon: {
    fontSize: 64,
  },
  searchInput: {
    flex: 1,
    paddingVertical: theme.spacing.xs,
    ...theme.typography.body,
    color: theme.colors.text,
  },
  statsBarWrapper: {
    marginHorizontal: theme.spacing.base,
    marginVertical: theme.spacing.sm,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
  },
  statsIconContainer: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  statsText: {
    ...theme.typography.bodySmall,
    color: theme.colors.text,
    fontWeight: '700',
  },
  filterSection: {
    paddingHorizontal: theme.spacing.base,
    marginBottom: theme.spacing.md,
  },
  filterLabel: {
    ...theme.typography.bodySmall,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
    ...theme.shadows.md,
  },
  filterChipIcon: {
    marginRight: theme.spacing.xs,
  },
  filterChipText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    fontWeight: '700',
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
  fabWrapper: {
    position: 'absolute',
    right: 24,
    bottom: 24,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    ...theme.shadows.xl,
  },
  fabButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default TemplatesScreen;
