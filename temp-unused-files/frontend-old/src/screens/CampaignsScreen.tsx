import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '../types/navigation';
import type {Campaign, CampaignStatus} from '../types/campaign';
import {campaignAPI} from '../services/campaignService';
import CampaignCard from '../components/campaigns/CampaignCard';
import SearchBar from '../components/campaigns/SearchBar';
import Button from '../components/common/Button';
import {SkeletonList, EmptyState, EnhancedButton, AppHeader} from '../components/common';
import theme from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Campaigns'>;

const CampaignsScreen = ({navigation}: Props) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'all'>(
    'all',
  );
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    loadCampaigns();
    // Animate on mount
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    filterCampaigns();
  }, [campaigns, searchQuery, statusFilter]);

  const loadCampaigns = async () => {
    try {
      const response = await campaignAPI.getCampaigns();
      const campaignArray = Array.isArray(response) ? response : (response as any).campaigns || [];
      setCampaigns(campaignArray);
    } catch (error) {
      console.error('Failed to load campaigns:', error);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCampaigns();
    setRefreshing(false);
  };

  const filterCampaigns = () => {
    let filtered = [...campaigns];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        campaign =>
          campaign.name.toLowerCase().includes(query) ||
          campaign.description?.toLowerCase().includes(query),
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(campaign => campaign.status === statusFilter);
    }

    setFilteredCampaigns(filtered);
  };

  const handleCampaignPress = (campaign: Campaign) => {
    navigation.navigate('CampaignDetails', {campaignId: campaign._id});
  };

  const handleCreateCampaign = () => {
    navigation.navigate('CreateCampaign');
  };

  const renderFilterButton = (
    label: string,
    value: CampaignStatus | 'all',
    iconName?: string,
  ) => {
    const isActive = statusFilter === value;
    const chipScale = useRef(new Animated.Value(1)).current;
    
    const handlePress = () => {
      Animated.sequence([
        Animated.spring(chipScale, {
          toValue: 0.9,
          friction: 3,
          useNativeDriver: true,
        }),
        Animated.spring(chipScale, {
          toValue: 1,
          friction: 3,
          useNativeDriver: true,
        }),
      ]).start();
      setStatusFilter(value);
    };
    
    return (
      <Animated.View style={{transform: [{scale: chipScale}]}}>
        <TouchableOpacity
          style={[styles.filterChip, isActive && styles.filterChipActive]}
          onPress={handlePress}
          activeOpacity={0.9}>
          {iconName && (
            <Icon 
              name={iconName} 
              size={16} 
              color={isActive ? theme.colors.textInverse : theme.colors.textSecondary}
              style={styles.filterIcon}
            />
          )}
          <Text
            style={[
              styles.filterText,
              isActive && styles.filterTextActive,
            ]}>
            {label}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderEmpty = () => (
    <EmptyState
      icon="🎯"
      title="No campaigns found"
      description={
        searchQuery || statusFilter !== 'all'
          ? 'Try adjusting your filters'
          : 'Create your first campaign to get started'
      }
      action={
        !searchQuery && statusFilter === 'all' ? (
          <EnhancedButton
            title="Create Campaign"
            onPress={handleCreateCampaign}
            variant="primary"
            gradient
          />
        ) : undefined
      }
    />
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <AppHeader
          title="Campaigns"
          showBack={false}
        />
        <View style={styles.loadingContainer}>
          <SkeletonList count={5} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {}
      <AppHeader
        title="Campaigns"
        onBack={() => navigation.goBack()}
        rightActions={
          campaigns.length > 0
            ? [
                {
                  icon: 'plus',
                  onPress: handleCreateCampaign,
                },
              ]
            : []
        }
      />

      {}
      <View style={styles.content}>
        {}
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search campaigns..."
        />

        {}
        <Animated.View style={{opacity: fadeAnim}}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filtersContainer}
            contentContainerStyle={styles.filtersContent}>
            {renderFilterButton('All', 'all', 'apps')}
            {renderFilterButton('Active', 'active', 'play-circle')}
            {renderFilterButton('Scheduled', 'scheduled', 'clock-outline')}
            {renderFilterButton('Paused', 'paused', 'pause-circle')}
            {renderFilterButton('Completed', 'completed', 'check-circle')}
            {renderFilterButton('Draft', 'draft', 'file-document-outline')}
            {renderFilterButton('Failed', 'failed', 'alert-circle')}
          </ScrollView>
        </Animated.View>

        {}
        {filteredCampaigns.length > 0 && (
          <Animated.View 
            style={[
              styles.statsBarWrapper,
              {
                opacity: fadeAnim,
                transform: [{scale: scaleAnim}],
              },
            ]}>
            <LinearGradient
              colors={[theme.colors.primaryLight + '20', theme.colors.secondaryLight + '20']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
              style={styles.statsBar}>
              <View style={styles.statsIconContainer}>
                <Icon name="target" size={18} color={theme.colors.primary} />
              </View>
              <Text style={styles.statsText}>
                {filteredCampaigns.length} campaign{filteredCampaigns.length !== 1 ? 's' : ''} found
              </Text>
            </LinearGradient>
          </Animated.View>
        )}

        {}
        <FlatList
          data={filteredCampaigns}
          keyExtractor={item => item._id}
          renderItem={({item}) => (
            <CampaignCard
              campaign={item}
              onPress={() => handleCampaignPress(item)}
            />
          )}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          contentContainerStyle={
            filteredCampaigns.length === 0 && styles.listEmpty
          }
          showsVerticalScrollIndicator={false}
        />
      </View>

      {}
      {campaigns.length > 0 && (
        <Animated.View 
          style={[
            styles.fabWrapper,
            {
              opacity: fadeAnim,
              transform: [{scale: scaleAnim}],
            },
          ]}>
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.secondary]}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.fab}>
            <TouchableOpacity
              style={styles.fabButton}
              onPress={handleCreateCampaign}
              activeOpacity={0.85}
              accessibilityLabel="Create New Campaign">
              <Icon name="plus" size={28} color={theme.colors.textInverse} />
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingTop: 50,
    paddingBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.base,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...theme.typography.h2,
    color: theme.colors.textInverse,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.base,
  },
  filtersContainer: {
    marginBottom: theme.spacing.md,
    maxHeight: 44,
  },
  filtersContent: {
    paddingRight: theme.spacing.base,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    marginRight: theme.spacing.sm,
    borderWidth: 2,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
    ...theme.shadows.md,
  },
  filterIcon: {
    marginRight: theme.spacing.xs,
  },
  filterText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    fontWeight: '700',
  },
  filterTextActive: {
    color: theme.colors.textInverse,
  },
  statsBarWrapper: {
    marginBottom: theme.spacing.md,
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
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  statsText: {
    ...theme.typography.bodySmall,
    color: theme.colors.text,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  listEmpty: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xxxl,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  emptyTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  emptyButton: {
    minWidth: 200,
  },
  iconText: {
    fontSize: 20,
    color: theme.colors.textInverse,
  },
  fabWrapper: {
    position: 'absolute',
    bottom: 24,
    right: 24,
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

export default CampaignsScreen;
