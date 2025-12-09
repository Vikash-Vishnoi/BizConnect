import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
  Platform,
  Animated
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import theme from '../theme';
import api from '../services/api';

interface BusinessLocation {
  enabled: boolean;
  address: string;
  latitude: number | null;
  longitude: number | null;
  description: string;
  updatedAt: string | null;
}

export default function BusinessLocationEditorScreen({ navigation }: any) {
  const colors = theme.colors;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [location, setLocation] = useState<BusinessLocation>({
    enabled: false,
    address: '',
    latitude: null,
    longitude: null,
    description: '',
    updatedAt: null
  });

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

    fetchLocation();
  }, []);

  const fetchLocation = async () => {
    try {
      setLoading(true);
      const response = await api.get('/business-location');
      
      if (response.data.success) {
        setLocation(response.data.data);
      }
    } catch (error: any) {
      console.error('Error fetching location:', error);
      Alert.alert('Error', 'Failed to load business location');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      // Validate required fields if enabled
      if (location.enabled) {
        if (!location.address.trim()) {
          Alert.alert('Validation Error', 'Please enter a business address');
          return;
        }

        if (location.latitude === null || location.longitude === null) {
          Alert.alert(
            'Validation Error',
            'Please enter valid coordinates (latitude and longitude)'
          );
          return;
        }

        // Validate coordinate ranges
        if (location.latitude < -90 || location.latitude > 90) {
          Alert.alert('Validation Error', 'Latitude must be between -90 and 90');
          return;
        }

        if (location.longitude < -180 || location.longitude > 180) {
          Alert.alert('Validation Error', 'Longitude must be between -180 and 180');
          return;
        }
      }

      setSaving(true);

      const response = await api.put('/business-location', location);

      if (response.data.success) {
        Alert.alert('Success', 'Business location updated successfully', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('Error', response.data.message || 'Failed to update location');
      }
    } catch (error: any) {
      console.error('Error saving location:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to update business location'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    Alert.alert(
      'Clear Location',
      'Are you sure you want to clear all location data?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              const response = await api.delete('/business-location');

              if (response.data.success) {
                setLocation({
                  enabled: false,
                  address: '',
                  latitude: null,
                  longitude: null,
                  description: '',
                  updatedAt: null
                });
                Alert.alert('Success', 'Business location cleared');
              }
            } catch (error) {
              console.error('Error clearing location:', error);
              Alert.alert('Error', 'Failed to clear location');
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  const handleValidateCoordinates = async () => {
    if (location.latitude === null || location.longitude === null) {
      Alert.alert('Error', 'Please enter both latitude and longitude');
      return;
    }

    try {
      const response = await api.post('/business-location/validate-coordinates', {
        latitude: location.latitude,
        longitude: location.longitude
      });

      if (response.data.valid) {
        Alert.alert('Valid Coordinates', 'Coordinates are valid and can be used');
      } else {
        Alert.alert('Invalid Coordinates', response.data.errors?.join('\n') || 'Invalid coordinates');
      }
    } catch (error: any) {
      console.error('Error validating coordinates:', error);
      Alert.alert('Error', 'Failed to validate coordinates');
    }
  };

  const updateCoordinate = (type: 'latitude' | 'longitude', value: string) => {
    // Remove any non-numeric characters except decimal point and minus
    const cleaned = value.replace(/[^0-9.-]/g, '');
    
    // Parse to number or set to null if empty
    const numValue = cleaned === '' ? null : parseFloat(cleaned);
    
    setLocation(prev => ({
      ...prev,
      [type]: numValue
    }));
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Business Location</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading location...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Business Location</Text>
        <TouchableOpacity 
          onPress={handleSave} 
          disabled={saving}
          style={styles.saveButton}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Icon name="checkmark" size={24} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Enable Location Toggle */}
        <Animated.View
          style={[
            styles.section,
            { backgroundColor: colors.surface },
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.toggleRow}>
            <View style={styles.toggleLabelContainer}>
              <Icon name="location" size={24} color={colors.primary} />
              <View style={styles.toggleTextContainer}>
                <Text style={[styles.toggleLabel, { color: colors.text }]}>
                  Enable Location
                </Text>
                <Text style={[styles.toggleDescription, { color: colors.textSecondary }]}>
                  Show your business location in WhatsApp profile
                </Text>
              </View>
            </View>
            <Switch
              value={location.enabled}
              onValueChange={(value) => setLocation(prev => ({ ...prev, enabled: value }))}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={Platform.OS === 'ios' ? undefined : colors.surface}
            />
          </View>
        </Animated.View>

        {location.enabled && (
          <>
            {/* Address Input */}
            <View style={[styles.section, { backgroundColor: colors.surface }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                <Icon name="home" size={16} color={colors.primary} /> Business Address
              </Text>
              <TextInput
                style={[
                  styles.textArea,
                  { 
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text
                  }
                ]}
                placeholder="Enter your complete business address..."
                placeholderTextColor={colors.textSecondary}
                value={location.address}
                onChangeText={(text) => setLocation(prev => ({ ...prev, address: text }))}
                multiline
                numberOfLines={3}
              />
              <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                This address will be displayed in your WhatsApp Business profile
              </Text>
            </View>

            {/* Coordinates Section */}
            <View style={[styles.section, { backgroundColor: colors.surface }]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  <Icon name="navigate" size={16} color={colors.primary} /> Coordinates
                </Text>
                <TouchableOpacity 
                  onPress={handleValidateCoordinates}
                  style={[styles.validateButton, { backgroundColor: colors.primaryLight }]}
                >
                  <Icon name="checkmark-circle-outline" size={16} color={colors.primary} />
                  <Text style={[styles.validateButtonText, { color: colors.primary }]}>
                    Validate
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.coordinateRow}>
                <View style={styles.coordinateInput}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                    Latitude
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      { 
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        color: colors.text
                      }
                    ]}
                    placeholder="-90 to 90"
                    placeholderTextColor={colors.textSecondary}
                    value={location.latitude?.toString() || ''}
                    onChangeText={(text) => updateCoordinate('latitude', text)}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.coordinateInput}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                    Longitude
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      { 
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        color: colors.text
                      }
                    ]}
                    placeholder="-180 to 180"
                    placeholderTextColor={colors.textSecondary}
                    value={location.longitude?.toString() || ''}
                    onChangeText={(text) => updateCoordinate('longitude', text)}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={[styles.infoBox, { backgroundColor: colors.primaryLight }]}>
                <Icon name="information-circle" size={20} color={colors.primary} />
                <Text style={[styles.infoText, { color: colors.primary }]}>
                  Use Google Maps or other map services to find exact coordinates for your business
                </Text>
              </View>
            </View>

            {/* Description Input */}
            <View style={[styles.section, { backgroundColor: colors.surface }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                <Icon name="document-text" size={16} color={colors.primary} /> Description (Optional)
              </Text>
              <TextInput
                style={[
                  styles.textArea,
                  { 
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text
                  }
                ]}
                placeholder="Add a note about this location (e.g., 'Main office', 'Headquarters')..."
                placeholderTextColor={colors.textSecondary}
                value={location.description}
                onChangeText={(text) => setLocation(prev => ({ ...prev, description: text }))}
                multiline
                numberOfLines={2}
                maxLength={200}
              />
              <Text style={[styles.charCount, { color: colors.textSecondary }]}>
                {location.description.length}/200
              </Text>
            </View>

            {/* Last Updated */}
            {location.updatedAt && (
              <View style={[styles.section, { backgroundColor: colors.surface }]}>
                <Text style={[styles.lastUpdated, { color: colors.textSecondary }]}>
                  Last updated: {new Date(location.updatedAt).toLocaleString()}
                </Text>
              </View>
            )}

            {/* Clear Button */}
            <TouchableOpacity
              onPress={handleClear}
              style={[styles.clearButton, { borderColor: colors.error }]}
              disabled={saving}
            >
              <Icon name="trash-outline" size={20} color={colors.error} />
              <Text style={[styles.clearButtonText, { color: colors.error }]}>
                Clear All Location Data
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* Info Section */}
        {!location.enabled && (
          <View style={[styles.infoSection, { backgroundColor: colors.surface }]}>
            <Icon name="information-circle-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.infoTitle, { color: colors.text }]}>
              Enable Business Location
            </Text>
            <Text style={[styles.infoDescription, { color: colors.textSecondary }]}>
              Add your business location to help customers find you. Your address will be displayed in your WhatsApp Business profile.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
    borderBottomWidth: 1
  },
  backButton: {
    padding: 4,
    width: 40
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center'
  },
  headerRight: {
    width: 40
  },
  saveButton: {
    padding: 4,
    width: 40,
    alignItems: 'flex-end'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14
  },
  content: {
    flex: 1,
    padding: 16
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  toggleLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12
  },
  toggleTextContainer: {
    marginLeft: 12,
    flex: 1
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4
  },
  toggleDescription: {
    fontSize: 13,
    lineHeight: 18
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top'
  },
  helperText: {
    fontSize: 12,
    marginTop: 8,
    lineHeight: 16
  },
  coordinateRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12
  },
  coordinateInput: {
    flex: 1
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14
  },
  validateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4
  },
  validateButtonText: {
    fontSize: 13,
    fontWeight: '600'
  },
  infoBox: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    gap: 8
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4
  },
  lastUpdated: {
    fontSize: 12,
    textAlign: 'center'
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1.5,
    marginBottom: 24,
    gap: 8
  },
  clearButtonText: {
    fontSize: 15,
    fontWeight: '600'
  },
  infoSection: {
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8
  },
  infoDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20
  }
});
