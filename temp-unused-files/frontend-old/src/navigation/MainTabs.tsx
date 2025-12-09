import React from 'react';
import {View, Text, StyleSheet, Platform} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import type {BottomTabNavigationOptions} from '@react-navigation/bottom-tabs';
import InboxScreen from '../screens/InboxScreen';
import TemplatesScreen from '../screens/TemplatesScreen';
import CampaignsScreen from '../screens/CampaignsScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import MenuScreen from '../screens/MenuScreen';
import {useAuth} from '../contexts/AuthContext';
import {canAccessInbox, canManageTemplates, canManageCampaigns, canViewAnalytics} from '../utils/permissions';
import theme from '../theme';

const Tab = createBottomTabNavigator();

const MainTabs: React.FC = () => {
  const {user} = useAuth();

  // Filter tabs based on user permissions
  const showTemplates = user && canManageTemplates(user);
  const showCampaigns = user && canManageCampaigns(user);
  const showInbox = user && canAccessInbox(user);
  const showAnalytics = user && canViewAnalytics(user);

  return (
    <Tab.Navigator
      initialRouteName="InboxTab"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textTertiary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: {width: 0, height: -2},
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
        tabBarIconStyle: {
          marginBottom: -4,
        },
      }}>
      {showTemplates && (
        <Tab.Screen
          name="TemplatesTab"
          component={TemplatesScreen}
          options={{
            tabBarLabel: 'Templates',
            tabBarIcon: ({color}: {color: string}) => (
              <View style={styles.iconContainer}>
                <Text style={[styles.iconText, {color}]}>📝</Text>
              </View>
            ),
          }}
        />
      )}
      {showCampaigns && (
        <Tab.Screen
          name="CampaignsTab"
          component={CampaignsScreen}
          options={{
            tabBarLabel: 'Campaigns',
            tabBarIcon: ({color}: {color: string}) => (
              <View style={styles.iconContainer}>
                <Text style={[styles.iconText, {color}]}>📢</Text>
              </View>
            ),
          }}
        />
      )}
      {showInbox && (
        <Tab.Screen
          name="InboxTab"
          component={InboxScreen}
          options={{
            tabBarLabel: 'Inbox',
            tabBarIcon: ({color, focused}: {color: string; focused: boolean}) => (
              <View style={[styles.iconContainer, focused && styles.activeIcon]}>
                <Text style={[styles.iconText, {color}]}>💬</Text>
              </View>
            ),
          }}
        />
      )}
      {showAnalytics && (
        <Tab.Screen
          name="AnalyticsTab"
          component={AnalyticsScreen}
          options={{
            tabBarLabel: 'Analytics',
            tabBarIcon: ({color}: {color: string}) => (
              <View style={styles.iconContainer}>
                <Text style={[styles.iconText, {color}]}>📊</Text>
              </View>
            ),
          }}
        />
      )}
      <Tab.Screen
        name="MenuTab"
        component={MenuScreen}
        options={{
          tabBarLabel: 'Menu',
          tabBarIcon: ({color}: {color: string}) => (
            <View style={styles.iconContainer}>
              <Text style={[styles.iconText, {color}]}>☰</Text>
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 24,
  },
  activeIcon: {
    transform: [{scale: 1.1}],
  },
});

export default MainTabs;
