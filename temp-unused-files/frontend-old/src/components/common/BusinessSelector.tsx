// Business Selector - Dropdown for switching between businesses

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useBusiness } from '../contexts/BusinessContext';
import type { Business } from '../types/business';
import theme from '../theme';

interface BusinessSelectorProps {
  onCreateNew?: () => void;
  showCreateButton?: boolean;
}

const BusinessSelector: React.FC<BusinessSelectorProps> = ({
  onCreateNew,
  showCreateButton = true,
}) => {
  const { currentBusiness, businesses, loading, switchBusiness } = useBusiness();
  const [modalVisible, setModalVisible] = useState(false);
  const [switching, setSwitching] = useState(false);

  const handleSelectBusiness = async (business: Business) => {
    if (business._id === currentBusiness?._id) {
      setModalVisible(false);
      return;
    }

    try {
      setSwitching(true);
      await switchBusiness(business._id);
      setModalVisible(false);
    } catch (error) {
      console.error('Failed to switch business:', error);
    } finally {
      setSwitching(false);
    }
  };

  const handleCreateNew = () => {
    setModalVisible(false);
    onCreateNew?.();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }

  if (!currentBusiness) {
    return (
      <TouchableOpacity style={styles.emptyButton} onPress={handleCreateNew}>
        <Icon name="plus-circle" size={18} color={theme.colors.primary} />
        <Text style={styles.emptyText}>Create Business</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View>
      {/* Selector Button */}
      <TouchableOpacity
        style={styles.selector}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <View style={styles.selectorContent}>
          {currentBusiness.logo ? (
            <View style={styles.logo}>
              <Text style={styles.logoText}>
                {currentBusiness.displayName?.[0] || currentBusiness.name[0]}
              </Text>
            </View>
          ) : (
            <View style={styles.logoPlaceholder}>
              <Icon name="briefcase" size={16} color="#666" />
            </View>
          )}
          <View style={styles.businessInfo}>
            <Text style={styles.businessName} numberOfLines={1}>
              {currentBusiness.displayName || currentBusiness.name}
            </Text>
            <Text style={styles.businessDetail} numberOfLines={1}>
              {businesses.length} {businesses.length === 1 ? 'business' : 'businesses'}
            </Text>
          </View>
        </View>
        <Icon name="chevron-down" size={18} color="#666" />
      </TouchableOpacity>

      {/* Business Selection Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Switch Business</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="x" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Business List */}
            <FlatList
              data={businesses}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.businessItem,
                    item._id === currentBusiness._id && styles.businessItemActive,
                  ]}
                  onPress={() => handleSelectBusiness(item)}
                  disabled={switching}
                >
                  <View style={styles.businessItemContent}>
                    {item.logo ? (
                      <View style={styles.businessLogo}>
                        <Text style={styles.businessLogoText}>
                          {item.displayName?.[0] || item.name[0]}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.businessLogoPlaceholder}>
                        <Icon name="briefcase" size={20} color="#666" />
                      </View>
                    )}
                    <View style={styles.businessDetails}>
                      <Text style={styles.businessItemName} numberOfLines={1}>
                        {item.displayName || item.name}
                      </Text>
                      {item.whatsappConfig?.phoneNumber && (
                        <Text style={styles.businessPhone}>
                          {item.whatsappConfig.phoneNumber}
                        </Text>
                      )}
                    </View>
                  </View>
                  {item._id === currentBusiness._id && (
                    <Icon name="check" size={20} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              contentContainerStyle={styles.listContent}
            />

            {/* Create New Button */}
            {showCreateButton && onCreateNew && (
              <TouchableOpacity
                style={styles.createButton}
                onPress={handleCreateNew}
                disabled={switching}
              >
                <Icon name="plus-circle" size={20} color={theme.colors.primary} />
                <Text style={styles.createButtonText}>Create New Business</Text>
              </TouchableOpacity>
            )}

            {switching && (
              <View style={styles.switchingOverlay}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    paddingVertical: 8,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  logoText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  logoPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  businessInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  businessDetail: {
    fontSize: 12,
    color: '#666',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#F0FFF4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
  },
  emptyText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  listContent: {
    padding: 20,
  },
  businessItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
  },
  businessItemActive: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  businessItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  businessLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  businessLogoText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  businessLogoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  businessDetails: {
    flex: 1,
  },
  businessItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3,
  },
  businessPhone: {
    fontSize: 13,
    color: '#666',
  },
  separator: {
    height: 10,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    margin: 20,
    marginTop: 0,
    backgroundColor: '#F0FFF4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  createButtonText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  switchingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default BusinessSelector;
