import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Animated
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import rbacService, { Role, Permission, GroupedPermissions } from '../services/rbacService';
import { colors } from '../theme';

interface RouteParams {
  role: Role;
}

const PermissionEditorScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { role: initialRole } = route.params as RouteParams;

  const [role, setRole] = useState<Role>(initialRole);
  const [allPermissions, setAllPermissions] = useState<GroupedPermissions>({});
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

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

    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      const [permissionsData, roleData] = await Promise.all([
        rbacService.getPermissions(),
        rbacService.getRole(role._id),
      ]);

      setAllPermissions(permissionsData);
      setRole(roleData);

      // Initialize selected permissions
      const permIds = new Set<string>();
      if (Array.isArray(roleData.permissions)) {
        roleData.permissions.forEach((perm: any) => {
          if (typeof perm === 'string') {
            permIds.add(perm);
          } else if (perm._id) {
            permIds.add(perm._id);
          }
        });
      }
      setSelectedPermissions(permIds);

      // Expand all categories by default
      setExpandedCategories(new Set(Object.keys(permissionsData)));
    } catch (error: any) {
      console.error('Error loading permissions:', error);
      Alert.alert('Error', 'Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const togglePermission = (permissionId: string) => {
    if (role.isSystemRole) {
      Alert.alert('Info', 'System role permissions cannot be modified');
      return;
    }

    const newSelected = new Set(selectedPermissions);
    if (newSelected.has(permissionId)) {
      newSelected.delete(permissionId);
    } else {
      newSelected.add(permissionId);
    }
    setSelectedPermissions(newSelected);
  };

  const selectAllInCategory = (category: string) => {
    if (role.isSystemRole) {
      Alert.alert('Info', 'System role permissions cannot be modified');
      return;
    }

    const categoryPermissions = allPermissions[category] || [];
    const newSelected = new Set(selectedPermissions);

    const allSelected = categoryPermissions.every(perm =>
      newSelected.has(perm._id)
    );

    if (allSelected) {
      // Deselect all in category
      categoryPermissions.forEach(perm => newSelected.delete(perm._id));
    } else {
      // Select all in category
      categoryPermissions.forEach(perm => newSelected.add(perm._id));
    }

    setSelectedPermissions(newSelected);
  };

  const handleSave = async () => {
    if (role.isSystemRole) {
      Alert.alert('Error', 'System role permissions cannot be modified');
      return;
    }

    try {
      setSaving(true);

      // Update role with new permissions
      await rbacService.updateRole(role._id, {
        permissions: Array.from(selectedPermissions),
      });

      Alert.alert('Success', 'Permissions updated successfully', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      console.error('Error saving permissions:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to update permissions'
      );
    } finally {
      setSaving(false);
    }
  };

  const getCategoryIcon = (category: string): string => {
    const icons: { [key: string]: string } = {
      campaigns: 'campaign',
      templates: 'description',
      conversations: 'chat',
      analytics: 'analytics',
      settings: 'settings',
      users: 'people',
      media: 'perm-media',
    };
    return icons[category] || 'folder';
  };

  const getCategoryColor = (category: string): string => {
    const colors: { [key: string]: string } = {
      campaigns: '#FF6347',
      templates: '#4682B4',
      conversations: '#32CD32',
      analytics: '#9370DB',
      settings: '#FFA500',
      users: '#DC143C',
      media: '#20B2AA',
    };
    return colors[category] || '#808080';
  };

  const formatCategoryName = (category: string): string => {
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const renderPermissionItem = (permission: Permission) => {
    const isSelected = selectedPermissions.has(permission._id);

    return (
      <TouchableOpacity
        key={permission._id}
        style={styles.permissionItem}
        onPress={() => togglePermission(permission._id)}
        disabled={role.isSystemRole}
      >
        <View style={styles.permissionInfo}>
          <Text style={styles.permissionName}>{permission.name}</Text>
          <Text style={styles.permissionDescription}>
            {permission.description}
          </Text>
          <Text style={styles.permissionCode}>{permission.code}</Text>
        </View>
        <Switch
          value={isSelected}
          onValueChange={() => togglePermission(permission._id)}
          disabled={role.isSystemRole}
          trackColor={{ false: '#D3D3D3', true: colors.primaryLight }}
          thumbColor={isSelected ? colors.primary : '#F4F4F4'}
        />
      </TouchableOpacity>
    );
  };

  const renderCategory = (category: string, permissions: Permission[]) => {
    const isExpanded = expandedCategories.has(category);
    const categoryColor = getCategoryColor(category);
    const categoryIcon = getCategoryIcon(category);
    const selectedCount = permissions.filter(p =>
      selectedPermissions.has(p._id)
    ).length;
    const totalCount = permissions.length;
    const allSelected = selectedCount === totalCount;

    return (
      <Animated.View
        key={category}
        style={[
          styles.categoryContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.categoryHeader}
          onPress={() => toggleCategory(category)}
        >
          <View style={styles.categoryLeft}>
            <View
              style={[
                styles.categoryIconContainer,
                { backgroundColor: categoryColor },
              ]}
            >
              <Icon name={categoryIcon} size={20} color="#FFFFFF" />
            </View>
            <View style={styles.categoryInfo}>
              <Text style={styles.categoryName}>
                {formatCategoryName(category)}
              </Text>
              <Text style={styles.categoryCount}>
                {selectedCount} of {totalCount} selected
              </Text>
            </View>
          </View>
          <View style={styles.categoryRight}>
            {!role.isSystemRole && (
              <TouchableOpacity
                style={styles.selectAllButton}
                onPress={() => selectAllInCategory(category)}
              >
                <Icon
                  name={allSelected ? 'check-box' : 'check-box-outline-blank'}
                  size={20}
                  color={colors.primary}
                />
              </TouchableOpacity>
            )}
            <Icon
              name={isExpanded ? 'expand-less' : 'expand-more'}
              size={24}
              color="#666"
            />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.permissionsList}>
            {permissions.map(permission => renderPermissionItem(permission))}
          </View>
        )}
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading permissions...</Text>
      </View>
    );
  }

  const totalPermissions = Object.values(allPermissions).reduce(
    (sum, perms) => sum + perms.length,
    0
  );
  const selectedCount = selectedPermissions.size;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>{role.name}</Text>
            <Text style={styles.headerSubtitle}>
              {selectedCount} of {totalPermissions} permissions
            </Text>
          </View>
        </View>

        {role.isSystemRole && (
          <View style={styles.systemRoleWarning}>
            <Icon name="lock" size={18} color="#FFA500" />
            <Text style={styles.systemRoleWarningText}>
              System role permissions are read-only
            </Text>
          </View>
        )}
      </LinearGradient>

      <ScrollView style={styles.scrollView}>
        {Object.entries(allPermissions).map(([category, permissions]) =>
          renderCategory(category, permissions)
        )}

        {Object.keys(allPermissions).length === 0 && (
          <View style={styles.emptyState}>
            <Icon name="security" size={64} color="#CCC" />
            <Text style={styles.emptyStateText}>No permissions available</Text>
          </View>
        )}
      </ScrollView>

      {!role.isSystemRole && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={saving}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Icon name="save" size={20} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 16,
    borderBottomWidth: 2,
    borderBottomColor: colors.primaryDark,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#E0E0E0',
    marginTop: 2,
  },
  systemRoleWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  systemRoleWarningText: {
    flex: 1,
    fontSize: 13,
    color: '#856404',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  categoryContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FAFAFA',
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  categoryCount: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  categoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectAllButton: {
    padding: 4,
  },
  permissionsList: {
    padding: 12,
  },
  permissionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FAFAFA',
    marginBottom: 8,
  },
  permissionInfo: {
    flex: 1,
    marginRight: 12,
  },
  permissionName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  permissionDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
    marginBottom: 4,
  },
  permissionCode: {
    fontSize: 11,
    color: '#999',
    fontFamily: 'monospace',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default PermissionEditorScreen;
