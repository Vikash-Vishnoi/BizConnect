/**
 * Business Settings Screen
 * 
 * Manage business details, team members, and WhatsApp credentials
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useBusiness } from '../contexts/BusinessContext';
import { businessAPI } from '../services/businessService';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import theme from '../theme';
import type { Business, TeamMember } from '../types/business';

type Props = NativeStackScreenProps<RootStackParamList, 'BusinessSettings'>;

type TabType = 'details' | 'team' | 'credentials' | 'danger';

const BusinessSettingsScreen: React.FC<Props> = ({ navigation }) => {
  const { currentBusiness, updateBusiness, deleteBusiness, refreshBusinesses } = useBusiness();
  const [activeTab, setActiveTab] = useState<TabType>('details');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Details
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');

  // Team
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);

  // Credentials
  const [accessToken, setAccessToken] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [verifyToken, setVerifyToken] = useState('');

  useEffect(() => {
    if (currentBusiness) {
      setName(currentBusiness.name);
      setDisplayName(currentBusiness.displayName || '');
      setDescription(currentBusiness.description || '');
      setWebsite(currentBusiness.website || '');
      setTeam(currentBusiness.team || []);
    }
  }, [currentBusiness]);

  const handleSaveDetails = async () => {
    if (!currentBusiness) return;

    try {
      setSaving(true);
      await updateBusiness(currentBusiness._id, {
        name: name.trim(),
        displayName: displayName.trim() || undefined,
        description: description.trim() || undefined,
        website: website.trim() || undefined,
      });
      Alert.alert('Success', 'Business details updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update business');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCredentials = async () => {
    if (!currentBusiness) return;

    if (!accessToken.trim() && !appSecret.trim() && !verifyToken.trim()) {
      Alert.alert('Required', 'Please enter at least one credential to update');
      return;
    }

    try {
      setSaving(true);
      await businessAPI.updateCredentials(currentBusiness._id, {
        accessToken: accessToken.trim() || undefined,
        appSecret: appSecret.trim() || undefined,
        verifyToken: verifyToken.trim() || undefined,
      });
      Alert.alert('Success', 'Credentials updated successfully');
      setAccessToken('');
      setAppSecret('');
      setVerifyToken('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update credentials');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveTeamMember = async (userId: string) => {
    if (!currentBusiness) return;

    Alert.alert(
      'Remove Team Member',
      'Are you sure you want to remove this team member?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoadingTeam(true);
              await businessAPI.removeTeamMember(currentBusiness._id, userId);
              await refreshBusinesses();
              Alert.alert('Success', 'Team member removed');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to remove team member');
            } finally {
              setLoadingTeam(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteBusiness = async () => {
    if (!currentBusiness) return;

    Alert.alert(
      'Delete Business',
      'Are you sure you want to delete this business? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await deleteBusiness(currentBusiness._id);
              Alert.alert('Success', 'Business deleted successfully');
              navigation.navigate('Main');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete business');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (!currentBusiness) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Icon name="briefcase" size={64} color={theme.colors.textSecondary} />
          <Text style={styles.emptyText}>No business selected</Text>
        </View>
      </View>
    );
  }

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: 'details', label: 'Details', icon: 'info' },
    { key: 'team', label: 'Team', icon: 'users' },
    { key: 'credentials', label: 'API', icon: 'key' },
    { key: 'danger', label: 'Danger', icon: 'alert-triangle' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Business Settings</Text>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Icon
                name={tab.icon}
                size={18}
                color={activeTab === tab.key ? theme.colors.primary : theme.colors.textSecondary}
              />
              <Text
                style={[
                  styles.tabLabel,
                  activeTab === tab.key && styles.tabLabelActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'details' && (
          <View>
            <Card style={styles.card}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Business Name</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter business name"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Display Name</Text>
                <TextInput
                  style={styles.input}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Short name for display"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Business description"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Website</Text>
                <TextInput
                  style={styles.input}
                  value={website}
                  onChangeText={setWebsite}
                  placeholder="https://example.com"
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>

              <Button
                title={saving ? 'Saving...' : 'Save Changes'}
                onPress={handleSaveDetails}
                variant="primary"
                gradient
                disabled={saving}
                loading={saving}
              />
            </Card>

            <Card style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Phone Number</Text>
                <Text style={styles.infoValue}>
                  {currentBusiness.whatsappConfig.phoneNumber || 'Not set'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Phone Number ID</Text>
                <Text style={styles.infoValue}>
                  {currentBusiness.whatsappConfig.phoneNumberId}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Status</Text>
                <View style={[styles.statusBadge, { backgroundColor: theme.colors.success + '20' }]}>
                  <Text style={[styles.statusText, { color: theme.colors.success }]}>
                    {currentBusiness.status.toUpperCase()}
                  </Text>
                </View>
              </View>
            </Card>
          </View>
        )}

        {activeTab === 'team' && (
          <View>
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Team Members ({team.length})</Text>

              {loadingTeam ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : team.length === 0 ? (
                <Text style={styles.emptyText}>No team members yet</Text>
              ) : (
                team.map((member, index) => {
                  const user = typeof member.user === 'object' ? member.user : null;
                  return (
                    <View key={index} style={styles.teamMember}>
                      <View style={styles.teamMemberInfo}>
                        <View style={styles.avatar}>
                          <Text style={styles.avatarText}>
                            {user?.name?.[0]?.toUpperCase() || '?'}
                          </Text>
                        </View>
                        <View style={styles.teamMemberDetails}>
                          <Text style={styles.teamMemberName}>{user?.name || 'Unknown'}</Text>
                          <Text style={styles.teamMemberEmail}>{user?.email || ''}</Text>
                          <View style={styles.roleBadge}>
                            <Text style={styles.roleText}>{member.role.toUpperCase()}</Text>
                          </View>
                        </View>
                      </View>
                      {member.role !== 'owner' && (
                        <TouchableOpacity
                          onPress={() => handleRemoveTeamMember(typeof member.user === 'string' ? member.user : member.user._id)}
                          disabled={loadingTeam}
                        >
                          <Icon name="trash-2" size={20} color={theme.colors.error} />
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })
              )}
            </Card>

            <Button
              title="Add Team Member"
              onPress={() => Alert.alert('Coming Soon', 'Team member invitation will be available soon')}
              variant="outline"
              leftIcon="user-plus"
            />
          </View>
        )}

        {activeTab === 'credentials' && (
          <View>
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>🔐 WhatsApp API Credentials</Text>
              <Text style={styles.cardSubtitle}>
                Update your WhatsApp Business API credentials
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Access Token</Text>
                <TextInput
                  style={styles.input}
                  value={accessToken}
                  onChangeText={setAccessToken}
                  placeholder="Enter new access token"
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>App Secret</Text>
                <TextInput
                  style={styles.input}
                  value={appSecret}
                  onChangeText={setAppSecret}
                  placeholder="Enter new app secret"
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Verify Token</Text>
                <TextInput
                  style={styles.input}
                  value={verifyToken}
                  onChangeText={setVerifyToken}
                  placeholder="Enter new verify token"
                  autoCapitalize="none"
                />
              </View>

              <Button
                title={saving ? 'Updating...' : 'Update Credentials'}
                onPress={handleUpdateCredentials}
                variant="primary"
                gradient
                disabled={saving}
                loading={saving}
              />
            </Card>

            <Card style={styles.warningCard}>
              <Icon name="alert-circle" size={20} color={theme.colors.warning} />
              <View style={styles.warningContent}>
                <Text style={styles.warningTitle}>Important</Text>
                <Text style={styles.warningText}>
                  Only update these credentials if you've regenerated tokens in Meta for Developers. 
                  Invalid credentials will break your WhatsApp integration.
                </Text>
              </View>
            </Card>
          </View>
        )}

        {activeTab === 'danger' && (
          <View>
            <Card style={styles.dangerCard}>
              <Icon name="alert-triangle" size={32} color={theme.colors.error} />
              <Text style={styles.dangerTitle}>Danger Zone</Text>
              <Text style={styles.dangerText}>
                Deleting your business will permanently remove all associated data including 
                conversations, campaigns, templates, and analytics. This action cannot be undone.
              </Text>

              <Button
                title={loading ? 'Deleting...' : 'Delete Business'}
                onPress={handleDeleteBusiness}
                variant="outline"
                disabled={loading}
                loading={loading}
                style={styles.deleteButton}
              />
            </Card>
          </View>
        )}

        <View style={styles.bottomSpacing} />
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
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  placeholder: {
    width: 40,
  },
  tabsContainer: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingHorizontal: 10,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: theme.colors.primary,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginLeft: 6,
  },
  tabLabelActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  infoCard: {
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  infoLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  teamMember: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  teamMemberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  teamMemberDetails: {
    flex: 1,
  },
  teamMemberName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  teamMemberEmail: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: theme.colors.primaryLight + '30',
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  warningCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.warning + '10',
    borderColor: theme.colors.warning,
    borderWidth: 1,
    marginBottom: 20,
    padding: 16,
  },
  warningContent: {
    flex: 1,
    marginLeft: 12,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  warningText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  dangerCard: {
    alignItems: 'center',
    padding: 24,
    borderWidth: 2,
    borderColor: theme.colors.error,
    borderRadius: 12,
  },
  dangerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.error,
    marginTop: 16,
    marginBottom: 8,
  },
  dangerText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  deleteButton: {
    borderColor: theme.colors.error,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: 16,
  },
  bottomSpacing: {
    height: 40,
  },
});

export default BusinessSettingsScreen;
