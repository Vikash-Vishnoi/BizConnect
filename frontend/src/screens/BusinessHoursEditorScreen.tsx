import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import theme from '../theme';

interface BusinessHours {
  [key: string]: {
    is_open: boolean;
    open_time: string;
    close_time: string;
  };
}

interface BusinessHoursEditorScreenProps {
  navigation: any;
}

export default function BusinessHoursEditorScreen({ navigation }: BusinessHoursEditorScreenProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [businessHours, setBusinessHours] = useState<BusinessHours>({
    MONDAY: { is_open: true, open_time: '09:00', close_time: '17:00' },
    TUESDAY: { is_open: true, open_time: '09:00', close_time: '17:00' },
    WEDNESDAY: { is_open: true, open_time: '09:00', close_time: '17:00' },
    THURSDAY: { is_open: true, open_time: '09:00', close_time: '17:00' },
    FRIDAY: { is_open: true, open_time: '09:00', close_time: '17:00' },
    SATURDAY: { is_open: false, open_time: '09:00', close_time: '17:00' },
    SUNDAY: { is_open: false, open_time: '09:00', close_time: '17:00' }
  });

  const days = [
    { key: 'MONDAY', label: 'Monday', icon: 'calendar-outline' },
    { key: 'TUESDAY', label: 'Tuesday', icon: 'calendar-outline' },
    { key: 'WEDNESDAY', label: 'Wednesday', icon: 'calendar-outline' },
    { key: 'THURSDAY', label: 'Thursday', icon: 'calendar-outline' },
    { key: 'FRIDAY', label: 'Friday', icon: 'calendar-outline' },
    { key: 'SATURDAY', label: 'Saturday', icon: 'calendar-weekend' },
    { key: 'SUNDAY', label: 'Sunday', icon: 'calendar-weekend' }
  ];

  useEffect(() => {
    loadBusinessHours();
  }, []);

  const loadBusinessHours = async () => {
    try {
      setLoading(true);
      // TODO: Call API to load business hours
      // const response = await profileService.getBusinessHours();
      // setBusinessHours(response.businessHours);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error: any) {
      console.error('Load business hours error:', error);
      Alert.alert('Error', 'Failed to load business hours');
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (day: string) => {
    setBusinessHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        is_open: !prev[day].is_open
      }
    }));
  };

  const updateTime = (day: string, timeType: 'open_time' | 'close_time', value: string) => {
    setBusinessHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [timeType]: value
      }
    }));
  };

  const adjustTime = (day: string, timeType: 'open_time' | 'close_time', adjustment: number) => {
    const currentTime = businessHours[day][timeType];
    const [hours, minutes] = currentTime.split(':').map(Number);
    
    let newMinutes = minutes + adjustment;
    let newHours = hours;

    if (newMinutes >= 60) {
      newMinutes -= 60;
      newHours += 1;
    } else if (newMinutes < 0) {
      newMinutes += 60;
      newHours -= 1;
    }

    if (newHours >= 24) newHours = 0;
    if (newHours < 0) newHours = 23;

    const newTime = `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
    updateTime(day, timeType, newTime);
  };

  const copyToAll = (day: string) => {
    const sourceHours = businessHours[day];
    const newHours: BusinessHours = {};
    
    days.forEach(d => {
      newHours[d.key] = { ...sourceHours };
    });

    setBusinessHours(newHours);
    Alert.alert('Success', `Copied ${days.find(d => d.key === day)?.label}'s hours to all days`);
  };

  const setAllClosed = () => {
    const newHours: BusinessHours = {};
    days.forEach(d => {
      newHours[d.key] = { ...businessHours[d.key], is_open: false };
    });
    setBusinessHours(newHours);
  };

  const setAllOpen = () => {
    const newHours: BusinessHours = {};
    days.forEach(d => {
      newHours[d.key] = { ...businessHours[d.key], is_open: true };
    });
    setBusinessHours(newHours);
  };

  const saveBusinessHours = async () => {
    try {
      setSaving(true);
      // TODO: Call API to save business hours
      // await profileService.updateBusinessHours(businessHours);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      Alert.alert('Success', 'Business hours updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      console.error('Save business hours error:', error);
      Alert.alert('Error', error.message || 'Failed to save business hours');
    } finally {
      setSaving(false);
    }
  };

  const renderTimeAdjuster = (day: string, timeType: 'open_time' | 'close_time', label: string) => {
    const time = businessHours[day][timeType];
    const isDisabled = !businessHours[day].is_open;

    return (
      <View style={styles.timeAdjuster}>
        <Text style={[styles.timeLabel, isDisabled && styles.disabledText]}>{label}</Text>
        <View style={styles.timeControls}>
          <TouchableOpacity
            style={[styles.timeButton, isDisabled && styles.disabledButton]}
            onPress={() => adjustTime(day, timeType, -15)}
            disabled={isDisabled}
          >
            <Icon name="minus" size={16} color={isDisabled ? theme.colors.border : theme.colors.primary} />
          </TouchableOpacity>
          
          <Text style={[styles.timeDisplay, isDisabled && styles.disabledText]}>{time}</Text>
          
          <TouchableOpacity
            style={[styles.timeButton, isDisabled && styles.disabledButton]}
            onPress={() => adjustTime(day, timeType, 15)}
            disabled={isDisabled}
          >
            <Icon name="plus" size={16} color={isDisabled ? theme.colors.border : theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderDayCard = (day: { key: string; label: string; icon: string }) => {
    const hours = businessHours[day.key];
    const isOpen = hours.is_open;

    return (
      <View key={day.key} style={styles.dayCard}>
        <View style={styles.dayHeader}>
          <View style={styles.dayTitleRow}>
            <Icon 
              name={day.icon} 
              size={24} 
              color={isOpen ? theme.colors.primary : theme.colors.textSecondary} 
            />
            <Text style={styles.dayLabel}>{day.label}</Text>
          </View>
          
          <View style={styles.dayActions}>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={() => copyToAll(day.key)}
            >
              <Icon name="content-copy" size={18} color={theme.colors.primary} />
            </TouchableOpacity>
            
            <Switch
              value={isOpen}
              onValueChange={() => toggleDay(day.key)}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary + '50' }}
              thumbColor={isOpen ? theme.colors.primary : theme.colors.textSecondary}
            />
          </View>
        </View>

        {isOpen ? (
          <View style={styles.timesContainer}>
            {renderTimeAdjuster(day.key, 'open_time', 'Opens')}
            {renderTimeAdjuster(day.key, 'close_time', 'Closes')}
          </View>
        ) : (
          <View style={styles.closedBanner}>
            <Icon name="close-circle-outline" size={20} color={theme.colors.textSecondary} />
            <Text style={styles.closedText}>Closed</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading business hours...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Business Hours</Text>
          <Text style={styles.subtitle}>
            Set your operating hours. Customers will see when you're available.
          </Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickButton} onPress={setAllOpen}>
            <Icon name="check-all" size={20} color={theme.colors.success} />
            <Text style={styles.quickButtonText}>Open All</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickButton} onPress={setAllClosed}>
            <Icon name="close-circle" size={20} color={theme.colors.error} />
            <Text style={styles.quickButtonText}>Close All</Text>
          </TouchableOpacity>
        </View>

        {/* Days List */}
        {days.map(day => renderDayCard(day))}

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Icon name="information-outline" size={20} color={theme.colors.info} />
          <Text style={styles.infoText}>
            Use the + and - buttons to adjust times in 15-minute intervals. 
            Tap the copy icon to apply a day's hours to all days.
          </Text>
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={saveBusinessHours}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Icon name="check" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Save Business Hours</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  scrollView: {
    flex: 1
  },
  content: {
    padding: 16,
    paddingBottom: 100
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: theme.colors.textSecondary
  },
  header: {
    marginBottom: 20
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20
  },
  quickButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.card,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  quickButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text
  },
  dayCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...theme.shadows.small
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  dayTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  dayLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text
  },
  dayActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  copyButton: {
    padding: 4
  },
  timesContainer: {
    flexDirection: 'row',
    gap: 16
  },
  timeAdjuster: {
    flex: 1
  },
  timeLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 8
  },
  timeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  timeButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center'
  },
  disabledButton: {
    backgroundColor: theme.colors.border + '30'
  },
  timeDisplay: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center'
  },
  disabledText: {
    color: theme.colors.textSecondary
  },
  closedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: theme.colors.border + '30',
    borderRadius: 8
  },
  closedText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textSecondary
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: theme.colors.info + '15',
    borderRadius: 8,
    padding: 12,
    gap: 8,
    marginTop: 8
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.text,
    lineHeight: 18
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 8
  },
  saveButtonDisabled: {
    opacity: 0.6
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
});
