import React from 'react';
import {View, Text, StyleSheet, Platform} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import type {BottomTabNavigationOptions} from '@react-navigation/bottom-tabs';
import InboxScreen from '../screens/InboxScreen';
import ActivityScreen from '../screens/ActivityScreen';
import MenuScreen from '../screens/MenuScreen';

const Tab = createBottomTabNavigator();

const MainTabs: React.FC = () => {
  return (
    <Tab.Navigator
      initialRouteName="InboxTab"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#25D366',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
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
          fontSize: 12,
          fontWeight: '600',
        },
        tabBarIconStyle: {
          marginBottom: -4,
        },
      }}>
      <Tab.Screen
        name="ActivityTab"
        component={ActivityScreen}
        options={{
          tabBarLabel: 'Activity',
          tabBarIcon: ({color}: {color: string; size: number}) => (
            <View style={styles.iconContainer}>
              <Text style={[styles.iconText, {color}]}>📊</Text>
            </View>
          ),
        }}
      />
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
      <Tab.Screen
        name="MenuTab"
        component={MenuScreen}
        options={{
          tabBarLabel: 'Menu',
          tabBarIcon: ({color}: {color: string; size: number}) => (
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
