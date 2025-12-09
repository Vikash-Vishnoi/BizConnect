import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../types/navigation';
import {EnhancedCard, EnhancedButton} from '../components/common';
import LinearGradient from 'react-native-linear-gradient';
import theme from '../theme';
import {useAuth} from '../contexts/AuthContext';
import {
  canManageSettings,
  canManageTeam,
  canManageAutomations,
  canManageFlows,
  getUserTypeDisplayName,
  getUserTypeBadgeColor,
} from '../utils/permissions';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface MenuItem {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  color: string;
  screen: keyof RootStackParamList;
  badge?: number;
  requiresPermission?: (user: any) => boolean;
}

const MenuScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const {user, logout: authLogout} = useAuth();

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
  }, []);

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
            await authLogout();
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
          id: 'savedReplies',
          icon: '💬',
          title: 'Saved Replies',
          subtitle: 'Quick responses',
          color: '#10B981',
          screen: 'SavedReplies' as keyof RootStackParamList,
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
          requiresPermission: (u: any) => canManageFlows(u),
        },
      ],
    },
    {
      title: 'Reports',
      items: [
        {
          id: 'auditLogs',
          icon: '📋',
          title: 'Audit Logs',
          subtitle: 'Activity tracking',
          color: '#6B7280',
          screen: 'AuditLogs' as keyof RootStackParamList,
          requiresPermission: (u: any) => canManageSettings(u),
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
          requiresPermission: (u: any) => canManageTeam(u),
        },
        {
          id: 'privacy',
          icon: '🔒',
          title: 'Privacy & GDPR',
          subtitle: 'Data management',
          color: '#F59E0B',
          screen: 'Privacy' as keyof RootStackParamList,
          requiresPermission: (u: any) => canManageSettings(u),
        },
        {
          id: 'welcomeMessage',
          icon: '👋',
          title: 'Welcome Messages',
          subtitle: 'Auto-reply settings',
          color: '#8B5CF6',
          screen: 'WelcomeMessageSettings' as keyof RootStackParamList,
          requiresPermission: (u: any) => canManageSettings(u),
        },
      ],
    },
  ];

  // Filter menu sections based on permissions
  const filteredSections = menuSections
    .map(section => ({
      ...section,
      items: section.items.filter(item => {
        const menuItem = item as any;
        return !menuItem.requiresPermission || (user && menuItem.requiresPermission(user));
      }),
    }))
    .filter(section => section.items.length > 0);

  const renderMenuItem = (item: MenuItem) => (
    <EnhancedCard
      key={item.id}
      elevated
      onPress={() => navigation.navigate(item.screen as any)}
      style={styles.menuItem}>
      <View style={[styles.iconContainer, {backgroundColor: item.color + '15'}]}>
        <Text style={styles.iconText}>{item.icon}</Text>
      </View>
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>{item.title}</Text>
        <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </EnhancedCard>
  );

  const userName = user?.name || 'User';
  const userTypeLabel = user ? getUserTypeDisplayName(user.userType) : '';
  const userTypeBadgeColor = user ? getUserTypeBadgeColor(user.userType) : '#6B7280';

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.primaryDark]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.header}>
        <Text style={styles.greeting}>Hello, {userName}! 👋</Text>
        <View style={styles.userTypeContainer}>
          <View style={[styles.userTypeBadge, {backgroundColor: userTypeBadgeColor}]}>
            <Text style={styles.userTypeText}>{userTypeLabel}</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>Manage your WhatsApp Business</Text>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {filteredSections.map((section, index) => (
          <Animated.View
            key={index}
            style={[
              styles.section,
              {
                opacity: fadeAnim,
                transform: [{translateY: slideAnim}],
              },
            ]}
          >
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.items.map(renderMenuItem)}
          </Animated.View>
        ))}

        <View style={styles.buttonContainer}>
          <EnhancedButton
            title="Logout"
            variant="danger"
            icon={<Text style={{fontSize: 18}}>🚪</Text>}
            onPress={handleLogout}
            fullWidth
          />
        </View>

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
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 60,
    paddingBottom: theme.spacing.lg,
  },
  greeting: {
    ...theme.typography.h2,
    color: '#FFFFFF',
    marginBottom: theme.spacing.xs,
  },
  userTypeContainer: {
    marginBottom: theme.spacing.sm,
  },
  userTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  userTypeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  subtitle: {
    ...theme.typography.body,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.base,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  iconText: {
    fontSize: 24,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  itemSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  chevron: {
    fontSize: 24,
    color: theme.colors.textTertiary,
    marginLeft: theme.spacing.sm,
  },
  buttonContainer: {
    paddingHorizontal: theme.spacing.base,
    marginTop: theme.spacing.xxl,
    marginBottom: theme.spacing.base,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    paddingBottom: 40,
  },
  footerText: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
    marginBottom: theme.spacing.xs,
  },
  versionText: {
    ...theme.typography.caption,
    fontSize: 11,
    color: theme.colors.textTertiary,
  },
});

export default MenuScreen;
