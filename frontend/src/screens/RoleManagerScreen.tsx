import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import rbacService, { Role } from '../services/rbacService';
import { colors } from '../theme';

const RoleManagerScreen = () => {
  const navigation = useNavigation();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
  });
  const [formErrors, setFormErrors] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const data = await rbacService.getRoles();
      setRoles(data);
    } catch (error: any) {
      console.error('Error loading roles:', error);
      Alert.alert('Error', 'Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRoles();
    setRefreshing(false);
  }, []);

  const validateForm = (): boolean => {
    const errors = { name: '', description: '' };
    let isValid = true;

    if (!formData.name.trim()) {
      errors.name = 'Role name is required';
      isValid = false;
    }

    if (!formData.description.trim()) {
      errors.description = 'Description is required';
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  const handleCreateRole = async () => {
    if (!validateForm()) return;

    try {
      await rbacService.createRole({
        name: formData.name,
        code: formData.code || undefined,
        description: formData.description,
        permissions: [],
      });

      Alert.alert('Success', 'Role created successfully');
      setCreateModalVisible(false);
      resetForm();
      await loadRoles();
    } catch (error: any) {
      console.error('Error creating role:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to create role'
      );
    }
  };

  const handleEditRole = async () => {
    if (!validateForm() || !selectedRole) return;

    try {
      await rbacService.updateRole(selectedRole._id, {
        name: formData.name,
        description: formData.description,
      });

      Alert.alert('Success', 'Role updated successfully');
      setEditModalVisible(false);
      resetForm();
      await loadRoles();
    } catch (error: any) {
      console.error('Error updating role:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to update role'
      );
    }
  };

  const handleDeleteRole = (role: Role) => {
    if (role.isSystemRole) {
      Alert.alert('Error', 'System roles cannot be deleted');
      return;
    }

    Alert.alert(
      'Delete Role',
      `Are you sure you want to delete "${role.name}"?${
        role.userCount && role.userCount > 0
          ? ` This role is assigned to ${role.userCount} user(s).`
          : ''
      }`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await rbacService.deleteRole(role._id);
              Alert.alert('Success', 'Role deleted successfully');
              await loadRoles();
            } catch (error: any) {
              console.error('Error deleting role:', error);
              Alert.alert(
                'Error',
                error.response?.data?.error || 'Failed to delete role'
              );
            }
          },
        },
      ]
    );
  };

  const openCreateModal = () => {
    resetForm();
    setCreateModalVisible(true);
  };

  const openEditModal = (role: Role) => {
    if (role.isSystemRole) {
      Alert.alert('Info', 'System roles cannot be modified');
      return;
    }

    setSelectedRole(role);
    setFormData({
      name: role.name,
      code: role.code,
      description: role.description,
    });
    setEditModalVisible(true);
  };

  const resetForm = () => {
    setFormData({ name: '', code: '', description: '' });
    setFormErrors({ name: '', description: '' });
    setSelectedRole(null);
  };

  const navigateToPermissionEditor = (role: Role) => {
    navigation.navigate('PermissionEditor' as never, { role } as never);
  };

  const getRoleIcon = (code: string): string => {
    switch (code) {
      case 'super_admin':
        return 'admin-panel-settings';
      case 'admin':
        return 'manage-accounts';
      case 'manager':
        return 'supervisor-account';
      case 'agent':
        return 'support-agent';
      case 'viewer':
        return 'visibility';
      default:
        return 'group';
    }
  };

  const getRoleColor = (code: string): string => {
    switch (code) {
      case 'super_admin':
        return '#8B0000';
      case 'admin':
        return '#DC143C';
      case 'manager':
        return '#FF6347';
      case 'agent':
        return '#4682B4';
      case 'viewer':
        return '#808080';
      default:
        return colors.primary;
    }
  };

  const renderRoleCard = (role: Role) => {
    const permissionCount = Array.isArray(role.permissions)
      ? role.permissions.length
      : 0;
    const roleColor = getRoleColor(role.code);
    const roleIcon = getRoleIcon(role.code);

    return (
      <View key={role._id} style={styles.roleCard}>
        <View style={styles.roleHeader}>
          <View style={styles.roleHeaderLeft}>
            <View style={[styles.roleIconContainer, { backgroundColor: roleColor }]}>
              <Icon name={roleIcon} size={24} color="#FFFFFF" />
            </View>
            <View style={styles.roleInfo}>
              <View style={styles.roleTitleRow}>
                <Text style={styles.roleName}>{role.name}</Text>
                {role.isSystemRole && (
                  <View style={styles.systemBadge}>
                    <Text style={styles.systemBadgeText}>SYSTEM</Text>
                  </View>
                )}
                {role.isDefault && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeText}>DEFAULT</Text>
                  </View>
                )}
              </View>
              <Text style={styles.roleCode}>{role.code}</Text>
            </View>
          </View>
          {!role.isSystemRole && (
            <View style={styles.roleActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => openEditModal(role)}
              >
                <Icon name="edit" size={20} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleDeleteRole(role)}
              >
                <Icon name="delete" size={20} color="#DC143C" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Text style={styles.roleDescription}>{role.description}</Text>

        <View style={styles.roleStats}>
          <View style={styles.statItem}>
            <Icon name="security" size={18} color={colors.primary} />
            <Text style={styles.statText}>
              {permissionCount} {permissionCount === 1 ? 'Permission' : 'Permissions'}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Icon name="people" size={18} color={colors.primary} />
            <Text style={styles.statText}>
              {role.userCount || 0} {role.userCount === 1 ? 'User' : 'Users'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.viewPermissionsButton}
          onPress={() => navigateToPermissionEditor(role)}
        >
          <Icon name="lock" size={16} color={colors.primary} />
          <Text style={styles.viewPermissionsText}>
            {role.isSystemRole ? 'View Permissions' : 'Manage Permissions'}
          </Text>
          <Icon name="chevron-right" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderModal = (
    visible: boolean,
    onClose: () => void,
    onSubmit: () => void,
    title: string,
    submitText: string,
    isEdit: boolean = false
  ) => (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Role Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, formErrors.name && styles.inputError]}
                placeholder="e.g., Support Lead"
                value={formData.name}
                onChangeText={text => setFormData({ ...formData, name: text })}
              />
              {formErrors.name && (
                <Text style={styles.errorText}>{formErrors.name}</Text>
              )}
            </View>

            {!isEdit && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Code (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., support_lead (auto-generated if empty)"
                  value={formData.code}
                  onChangeText={text => setFormData({ ...formData, code: text })}
                  autoCapitalize="none"
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Description <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  formErrors.description && styles.inputError,
                ]}
                placeholder="Describe the role's purpose and responsibilities"
                value={formData.description}
                onChangeText={text =>
                  setFormData({ ...formData, description: text })
                }
                multiline
                numberOfLines={4}
              />
              {formErrors.description && (
                <Text style={styles.errorText}>{formErrors.description}</Text>
              )}
            </View>

            {!isEdit && (
              <View style={styles.infoBox}>
                <Icon name="info" size={20} color={colors.primary} />
                <Text style={styles.infoText}>
                  You can assign permissions to this role after creation.
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitButton} onPress={onSubmit}>
              <Text style={styles.submitButtonText}>{submitText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading roles...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Role Management</Text>
          <Text style={styles.subtitle}>
            {roles.length} {roles.length === 1 ? 'role' : 'roles'} available
          </Text>
        </View>
        <TouchableOpacity style={styles.createButton} onPress={openCreateModal}>
          <Icon name="add" size={20} color="#FFFFFF" />
          <Text style={styles.createButtonText}>Create Role</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {roles.map(role => renderRoleCard(role))}

        {roles.length === 0 && (
          <View style={styles.emptyState}>
            <Icon name="admin-panel-settings" size={64} color="#CCC" />
            <Text style={styles.emptyStateText}>No roles found</Text>
            <Text style={styles.emptyStateSubtext}>
              Create your first custom role to get started
            </Text>
          </View>
        )}
      </ScrollView>

      {renderModal(
        createModalVisible,
        () => setCreateModalVisible(false),
        handleCreateRole,
        'Create New Role',
        'Create Role'
      )}

      {renderModal(
        editModalVisible,
        () => setEditModalVisible(false),
        handleEditRole,
        'Edit Role',
        'Update Role',
        true
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
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  roleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  roleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  roleHeaderLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  roleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  roleInfo: {
    flex: 1,
  },
  roleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  roleName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  roleCode: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'monospace',
  },
  systemBadge: {
    backgroundColor: '#FFA500',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 4,
  },
  systemBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  defaultBadge: {
    backgroundColor: '#4682B4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  roleActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  roleDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  roleStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  viewPermissionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  viewPermissionsText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
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
  emptyStateSubtext: {
    fontSize: 14,
    color: '#CCC',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#DC143C',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#FAFAFA',
  },
  inputError: {
    borderColor: '#DC143C',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 12,
    color: '#DC143C',
    marginTop: 4,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1976D2',
    lineHeight: 18,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
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
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default RoleManagerScreen;
