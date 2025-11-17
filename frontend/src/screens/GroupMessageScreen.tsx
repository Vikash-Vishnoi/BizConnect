import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import groupService, { Group } from '../services/groupService';
import { colors } from '../theme';

const GroupMessageScreen = () => {
  const navigation = useNavigation();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [groupSelectorVisible, setGroupSelectorVisible] = useState(false);
  
  // Message form state
  const [messageText, setMessageText] = useState('');
  const [groupIdInput, setGroupIdInput] = useState('');

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const data = await groupService.getGroups();
      setGroups(data);
    } catch (error: any) {
      console.error('Error loading groups:', error);
      Alert.alert('Error', 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const validateGroupId = (groupId: string): boolean => {
    // Format: 123456789-1234567890@g.us
    const groupIdRegex = /^\d+-\d+@g\.us$/;
    return groupIdRegex.test(groupId);
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    const groupId = selectedGroup?.groupId || groupIdInput;

    if (!groupId) {
      Alert.alert('Error', 'Please select a group or enter a group ID');
      return;
    }

    if (!validateGroupId(groupId)) {
      Alert.alert(
        'Invalid Group ID',
        'Group ID must be in format: 123456789-1234567890@g.us'
      );
      return;
    }

    try {
      setSending(true);
      await groupService.sendTextMessage(groupId, messageText);

      Alert.alert('Success', 'Message sent to group successfully');
      setMessageText('');
      await loadGroups(); // Refresh group list
    } catch (error: any) {
      console.error('Error sending message:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to send message to group'
      );
    } finally {
      setSending(false);
    }
  };

  const handleSelectGroup = (group: Group) => {
    setSelectedGroup(group);
    setGroupIdInput(''); // Clear manual input
    setGroupSelectorVisible(false);
  };

  const handleManualGroupId = () => {
    setSelectedGroup(null); // Clear group selection
    setGroupSelectorVisible(false);
  };

  const handleGetGroupInfo = async (groupId: string) => {
    try {
      const info = await groupService.getGroupInfo(groupId);
      
      Alert.alert(
        'Group Information',
        `Name: ${info.name}\n` +
        `Messages: ${info.messageCount}\n` +
        `Last Activity: ${info.lastMessageTime ? new Date(info.lastMessageTime).toLocaleString() : 'N/A'}\n` +
        `Source: ${info.source}`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert(
        'Info',
        error.response?.data?.suggestion || 'Group information not available'
      );
    }
  };

  const renderGroupItem = ({ item }: { item: Group }) => (
    <TouchableOpacity
      style={[
        styles.groupItem,
        selectedGroup?.groupId === item.groupId && styles.groupItemSelected,
      ]}
      onPress={() => handleSelectGroup(item)}
    >
      <View style={styles.groupIconContainer}>
        <Icon name="group" size={32} color={colors.primary} />
      </View>
      <View style={styles.groupInfo}>
        <Text style={styles.groupName}>{item.name}</Text>
        <Text style={styles.groupLastMessage} numberOfLines={1}>
          {item.lastMessage || 'No messages yet'}
        </Text>
        <Text style={styles.groupMeta}>
          {item.messageCount} messages
          {item.unreadCount > 0 && ` • ${item.unreadCount} unread`}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.infoButton}
        onPress={() => handleGetGroupInfo(item.groupId)}
      >
        <Icon name="info-outline" size={20} color={colors.primary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading groups...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Group Messages</Text>
          <Text style={styles.headerSubtitle}>
            {groups.length} {groups.length === 1 ? 'group' : 'groups'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={loadGroups}
        >
          <Icon name="refresh" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Group Selection Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Group</Text>
          
          {selectedGroup ? (
            <View style={styles.selectedGroupCard}>
              <View style={styles.selectedGroupInfo}>
                <Icon name="group" size={32} color={colors.primary} />
                <View style={styles.selectedGroupText}>
                  <Text style={styles.selectedGroupName}>
                    {selectedGroup.name}
                  </Text>
                  <Text style={styles.selectedGroupId}>
                    {selectedGroup.groupId}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.changeGroupButton}
                onPress={() => setGroupSelectorVisible(true)}
              >
                <Text style={styles.changeGroupText}>Change</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.selectGroupButton}
              onPress={() => setGroupSelectorVisible(true)}
            >
              <Icon name="group-add" size={24} color={colors.primary} />
              <Text style={styles.selectGroupText}>
                {groups.length > 0 ? 'Select from Groups' : 'No groups available'}
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.orDivider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Enter Group ID Manually</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 123456789-1234567890@g.us"
              value={groupIdInput}
              onChangeText={setGroupIdInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.hint}>
              Format: phone-number@g.us
            </Text>
          </View>
        </View>

        {/* Message Composer Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compose Message</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Message Text</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Type your message here..."
              value={messageText}
              onChangeText={setMessageText}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>
              {messageText.length} characters
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.sendButton, sending && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Icon name="send" size={20} color="#FFFFFF" />
                <Text style={styles.sendButtonText}>Send to Group</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Icon name="info" size={20} color={colors.primary} />
          <Text style={styles.infoText}>
            To send messages to groups, you need the group ID. Group IDs are in
            format: 123456789-1234567890@g.us. You'll receive this when messages
            are sent from the group.
          </Text>
        </View>
      </ScrollView>

      {/* Group Selector Modal */}
      <Modal
        visible={groupSelectorVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setGroupSelectorVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Group</Text>
              <TouchableOpacity onPress={() => setGroupSelectorVisible(false)}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {groups.length > 0 ? (
              <FlatList
                data={groups}
                renderItem={renderGroupItem}
                keyExtractor={item => item.groupId}
                style={styles.groupList}
              />
            ) : (
              <View style={styles.emptyState}>
                <Icon name="group" size={64} color="#CCC" />
                <Text style={styles.emptyStateText}>No groups found</Text>
                <Text style={styles.emptyStateSubtext}>
                  Groups will appear here when you receive messages from them
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.manualIdButton}
              onPress={handleManualGroupId}
            >
              <Icon name="edit" size={20} color={colors.primary} />
              <Text style={styles.manualIdButtonText}>
                Enter Group ID Manually
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  refreshButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  selectedGroupCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  selectedGroupInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectedGroupText: {
    marginLeft: 12,
    flex: 1,
  },
  selectedGroupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  selectedGroupId: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  changeGroupButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  changeGroupText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  selectGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  selectGroupText: {
    fontSize: 16,
    color: colors.primary,
    marginLeft: 8,
    fontWeight: '500',
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 0,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
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
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    fontStyle: 'italic',
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'right',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1976D2',
    lineHeight: 18,
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
  groupList: {
    maxHeight: 400,
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  groupItemSelected: {
    backgroundColor: '#F0F9FF',
  },
  groupIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  groupLastMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  groupMeta: {
    fontSize: 12,
    color: '#999',
  },
  infoButton: {
    padding: 8,
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
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  manualIdButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 8,
  },
  manualIdButtonText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
});

export default GroupMessageScreen;
