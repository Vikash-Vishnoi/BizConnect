import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../types/navigation';
import AsyncStorage from '@react-native-async-storage/async-storage';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface MenuItem {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  color: string;
  screen: keyof RootStackParamList;
  badge?: number;
}

const MenuScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [userName, setUserName] = useState('User');

  useEffect(() => {
    loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    try {
      const userJson = await AsyncStorage.getItem('user');
      if (userJson) {
        const user = JSON.parse(userJson);
        setUserName(user.name || 'User');
      }
    } catch (error) {
      console.error('Error loading user info:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.multiRemove(['token', 'user']);
            navigation.reset({
              index: 0,
              routes: [{name: 'Login'}],
            });
          },
        },
      ],
    );
  };

  const menuSections = [
    {
      title: 'Messaging',
      items: [
        {
          id: 'campaigns',
          icon: '📢',
          title: 'Campaigns',
          subtitle: 'Manage marketing campaigns',
          color: '#8B5CF6',
          screen: 'Campaigns' as keyof RootStackParamList,
        },
        {
          id: 'templates',
          icon: '📝',
          title: 'Templates',
          subtitle: 'Message templates',
          color: '#3B82F6',
          screen: 'Templates' as keyof RootStackParamList,
        },
        {
          id: 'savedReplies',
          icon: '💬',
          title: 'Saved Replies',
          subtitle: 'Quick responses',
          color: '#10B981',
          screen: 'SavedReplies' as keyof RootStackParamList,
        },
        {
          id: 'groups',
          icon: '👥',
          title: 'Group Messaging',
          subtitle: 'Send to WhatsApp groups',
          color: '#F59E0B',
          screen: 'GroupMessage' as keyof RootStackParamList,
        },
      ],
    },
    {
      title: 'Advanced Features',
      items: [
        {
          id: 'flows',
          icon: '🔄',
          title: 'Flows',
          subtitle: 'Interactive forms',
          color: '#EC4899',
          screen: 'FlowList' as keyof RootStackParamList,
        },
        {
          id: 'channels',
          icon: '📡',
          title: 'Channels',
          subtitle: 'Broadcast channels',
          color: '#6366F1',
          screen: 'Channels' as keyof RootStackParamList,
        },
      ],
    },
    {
      title: 'Analytics & Reports',
      items: [
        {
          id: 'analytics',
          icon: '📊',
          title: 'Analytics',
          subtitle: 'Performance insights',
          color: '#14B8A6',
          screen: 'Analytics' as keyof RootStackParamList,
        },
        {
          id: 'auditLogs',
          icon: '📋',
          title: 'Audit Logs',
          subtitle: 'Activity tracking',
          color: '#6B7280',
          screen: 'AuditLogs' as keyof RootStackParamList,
        },
      ],
    },
    {
      title: 'Settings & Management',
      items: [
        {
          id: 'roles',
          icon: '🔐',
          title: 'Roles & Permissions',
          subtitle: 'Team access control',
          color: '#EF4444',
          screen: 'RoleManager' as keyof RootStackParamList,
        },
        {
          id: 'privacy',
          icon: '🔒',
          title: 'Privacy & GDPR',
          subtitle: 'Data management',
          color: '#F59E0B',
          screen: 'Privacy' as keyof RootStackParamList,
        },
        {
          id: 'welcomeMessage',
          icon: '👋',
          title: 'Welcome Messages',
          subtitle: 'Auto-reply settings',
          color: '#8B5CF6',
          screen: 'WelcomeMessageSettings' as keyof RootStackParamList,
        },
      ],
    },
  ];

  const renderMenuItem = (item: MenuItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.menuItem}
      onPress={() => navigation.navigate(item.screen as any)}>
      <View style={[styles.iconContainer, {backgroundColor: item.color + '15'}]}>
        <Text style={styles.iconText}>{item.icon}</Text>
      </View>
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>{item.title}</Text>
        <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
      {item.badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {userName}! 👋</Text>
          <Text style={styles.subtitle}>Manage your WhatsApp Business</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {menuSections.map((section, index) => (
          <View key={index} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionContent}>
              {section.items.map(renderMenuItem)}
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>WhatsApp Business Platform</Text>
          <Text style={styles.versionText}>Version 3.7.0</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 24,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  itemSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  chevron: {
    fontSize: 24,
    color: '#D1D5DB',
    marginLeft: 8,
  },
  badge: {
    position: 'absolute',
    top: 12,
    right: 40,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 32,
    marginBottom: 16,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EF4444',
    gap: 8,
  },
  logoutIcon: {
    fontSize: 20,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  versionText: {
    fontSize: 11,
    color: '#D1D5DB',
  },
});

export default MenuScreen;
