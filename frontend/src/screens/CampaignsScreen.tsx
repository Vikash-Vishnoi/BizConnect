import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '../types/navigation';
import type {Campaign, CampaignStatus} from '../types/campaign';
import {campaignAPI} from '../services/campaignService';
import CampaignCard from '../components/campaigns/CampaignCard';
import SearchBar from '../components/campaigns/SearchBar';
import Button from '../components/common/Button';
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

  useEffect(() => {
    loadCampaigns();
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
    emoji?: string,
  ) => {
    const isActive = statusFilter === value;
    return (
      <TouchableOpacity
        style={[styles.filterChip, isActive && styles.filterChipActive]}
        onPress={() => setStatusFilter(value)}
        activeOpacity={0.7}>
        {emoji && (
          <Text style={styles.filterEmoji}>{emoji}</Text>
        )}
        <Text
          style={[
            styles.filterText,
            isActive && styles.filterTextActive,
          ]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Text style={styles.emptyIcon}>🎯</Text>
      </View>
      <Text style={styles.emptyTitle}>No campaigns found</Text>
      <Text style={styles.emptyText}>
        {searchQuery || statusFilter !== 'all'
          ? 'Try adjusting your filters'
          : 'Create your first campaign to get started'}
      </Text>
      {!searchQuery && statusFilter === 'all' && (
        <Button
          title="Create Campaign"
          onPress={handleCreateCampaign}
          icon="plus"
          variant="primary"
          style={styles.emptyButton}
        />
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
          style={styles.header}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 0}}>
          <Text style={styles.headerTitle}>Campaigns</Text>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading campaigns...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {}
      <LinearGradient
        colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
        style={styles.header}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 0}}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            accessibilityLabel="Back">
            <Text style={styles.iconText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Campaigns</Text>
          {campaigns.length > 0 && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleCreateCampaign}
              activeOpacity={0.7}
              accessibilityLabel="Create Campaign">
              <Text style={styles.iconText}>＋</Text>
            </TouchableOpacity>
          )}
          {campaigns.length === 0 && <View style={{width: 44}} />}
        </View>
      </LinearGradient>

      {}
      <View style={styles.content}>
        {}
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search campaigns..."
        />

        {}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersContainer}
          contentContainerStyle={styles.filtersContent}>
          {renderFilterButton('All', 'all', '📋')}
          {renderFilterButton('Active', 'active', '▶️')}
          {renderFilterButton('Scheduled', 'scheduled', '⏰')}
          {renderFilterButton('Paused', 'paused', '⏸️')}
          {renderFilterButton('Completed', 'completed', '✅')}
          {renderFilterButton('Draft', 'draft', '✏️')}
          {renderFilterButton('Failed', 'failed', '❌')}
        </ScrollView>

        {}
        {filteredCampaigns.length > 0 && (
          <View style={styles.statsBar}>
            <Text style={styles.statsIcon}>🎯</Text>
            <Text style={styles.statsText}>
              {filteredCampaigns.length} campaign{filteredCampaigns.length !== 1 ? 's' : ''} found
            </Text>
          </View>
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
        <TouchableOpacity
          style={styles.fab}
          onPress={handleCreateCampaign}
          activeOpacity={0.8}
          accessibilityLabel="Create New Campaign">
          <LinearGradient
            colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
            style={styles.fabGradient}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}>
            <Text style={styles.fabIcon}>＋</Text>
          </LinearGradient>
        </TouchableOpacity>
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
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterIcon: {
    marginRight: theme.spacing.xs,
  },
  filterText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  filterTextActive: {
    color: theme.colors.textInverse,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.base,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  statsText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  filterEmoji: {
    fontSize: 14,
    marginRight: theme.spacing.xs,
  },
  emptyIcon: {
    fontSize: 64,
  },
  statsIcon: {
    fontSize: 16,
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
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabIcon: {
    fontSize: 32,
    color: theme.colors.textInverse,
    fontWeight: 'bold',
  },
});

export default CampaignsScreen;
