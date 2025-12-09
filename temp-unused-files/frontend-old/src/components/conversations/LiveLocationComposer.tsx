import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import theme from '../../theme';

const { width } = Dimensions.get('window');

interface LiveLocationComposerProps {
  onSend: (data: LiveLocationData) => Promise<void>;
  onClose: () => void;
  initialLocation?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
}

interface LiveLocationData {
  latitude: number;
  longitude: number;
  name: string;
  address: string;
  duration: number; // in seconds
}

// Duration presets (in seconds)
const DURATIONS = [
  { label: '15 minutes', value: 900, icon: 'clock-fast' },
  { label: '1 hour', value: 3600, icon: 'clock-outline' },
  { label: '2 hours', value: 7200, icon: 'clock-time-two-outline' },
  { label: '4 hours', value: 14400, icon: 'clock-time-four-outline' },
  { label: '8 hours', value: 28800, icon: 'clock-time-eight-outline' }
];

const LiveLocationComposer: React.FC<LiveLocationComposerProps> = ({
  onSend,
  onClose,
  initialLocation
}) => {
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(900); // Default: 15 minutes
  
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    name: string;
    address: string;
  }>({
    latitude: initialLocation?.latitude || 0,
    longitude: initialLocation?.longitude || 0,
    name: initialLocation?.name || '',
    address: initialLocation?.address || ''
  });

  const [hasLocation, setHasLocation] = useState(!!initialLocation);

  useEffect(() => {
    // If no initial location, try to get current location
    if (!initialLocation) {
      getCurrentLocation();
    }
  }, []);

  const getCurrentLocation = async () => {
    try {
      setGettingLocation(true);

      // Request location permission
      if (Platform.OS === 'android') {
        // Note: Add react-native-geolocation-service for production
        // For now, using mock location
        Alert.alert(
          'Location Access',
          'This feature requires location permissions. Please enable location access in your device settings.',
          [{ text: 'OK' }]
        );
      }

      // Mock location for development
      // In production, use Geolocation.getCurrentPosition()
      const mockLocation = {
        latitude: 40.7128, // New York City
        longitude: -74.0060,
        name: 'Current Location',
        address: 'New York, NY, USA'
      };

      setLocation(mockLocation);
      setHasLocation(true);
    } catch (error) {
      console.error('Get location error:', error);
      Alert.alert('Error', 'Failed to get current location');
    } finally {
      setGettingLocation(false);
    }
  };

  const handleDurationSelect = (duration: number) => {
    setSelectedDuration(duration);
  };

  const handleSend = async () => {
    if (!hasLocation || !location.latitude || !location.longitude) {
      Alert.alert('Error', 'Please select a location first');
      return;
    }

    try {
      setLoading(true);

      const data: LiveLocationData = {
        latitude: location.latitude,
        longitude: location.longitude,
        name: location.name || 'Live Location',
        address: location.address || '',
        duration: selectedDuration
      };

      await onSend(data);
      onClose();
    } catch (error: any) {
      console.error('Send live location error:', error);
      Alert.alert('Error', error.message || 'Failed to start live location sharing');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };

  const getExpiryTime = (): string => {
    const now = new Date();
    const expiry = new Date(now.getTime() + selectedDuration * 1000);
    
    return expiry.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Icon name="close" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Share Live Location</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Icon name="information" size={20} color={theme.colors.info} />
          <Text style={styles.infoBannerText}>
            Your location will be shared in real-time for the selected duration
          </Text>
        </View>

        {/* Location Preview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Location</Text>
          
          {gettingLocation ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Getting your location...</Text>
            </View>
          ) : hasLocation ? (
            <View style={styles.locationCard}>
              <View style={styles.locationHeader}>
                <Icon name="map-marker" size={32} color={theme.colors.primary} />
                <View style={styles.locationInfo}>
                  <Text style={styles.locationName}>
                    {location.name || 'Live Location'}
                  </Text>
                  {location.address && (
                    <Text style={styles.locationAddress}>{location.address}</Text>
                  )}
                </View>
              </View>

              <View style={styles.coordinatesContainer}>
                <View style={styles.coordinateRow}>
                  <Icon name="latitude" size={16} color={theme.colors.textSecondary} />
                  <Text style={styles.coordinateLabel}>Latitude:</Text>
                  <Text style={styles.coordinateValue}>
                    {location.latitude.toFixed(6)}
                  </Text>
                </View>
                <View style={styles.coordinateRow}>
                  <Icon name="longitude" size={16} color={theme.colors.textSecondary} />
                  <Text style={styles.coordinateLabel}>Longitude:</Text>
                  <Text style={styles.coordinateValue}>
                    {location.longitude.toFixed(6)}
                  </Text>
                </View>
              </View>

              {/* Map Placeholder */}
              <View style={styles.mapPlaceholder}>
                <Icon name="map" size={48} color={theme.colors.textTertiary} />
                <Text style={styles.mapPlaceholderText}>Map Preview</Text>
                <Text style={styles.mapNote}>
                  (Integrate react-native-maps for live preview)
                </Text>
              </View>

              <TouchableOpacity
                style={styles.refreshButton}
                onPress={getCurrentLocation}
                disabled={gettingLocation}
              >
                <Icon name="refresh" size={18} color={theme.colors.primary} />
                <Text style={styles.refreshButtonText}>Refresh Location</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.getLocationButton}
              onPress={getCurrentLocation}
              disabled={gettingLocation}
            >
              <Icon name="crosshairs-gps" size={24} color="#fff" />
              <Text style={styles.getLocationButtonText}>Get Current Location</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Duration Selection */}
        {hasLocation && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sharing Duration</Text>
            <Text style={styles.sectionSubtitle}>
              Choose how long you want to share your live location
            </Text>

            <View style={styles.durationsGrid}>
              {DURATIONS.map((duration) => (
                <TouchableOpacity
                  key={duration.value}
                  style={[
                    styles.durationCard,
                    selectedDuration === duration.value && styles.durationCardSelected
                  ]}
                  onPress={() => handleDurationSelect(duration.value)}
                >
                  <Icon
                    name={duration.icon}
                    size={28}
                    color={
                      selectedDuration === duration.value
                        ? theme.colors.primary
                        : theme.colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.durationLabel,
                      selectedDuration === duration.value && styles.durationLabelSelected
                    ]}
                  >
                    {duration.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Sharing Info */}
        {hasLocation && (
          <View style={styles.sharingInfo}>
            <View style={styles.sharingInfoRow}>
              <Icon name="timer-sand" size={20} color={theme.colors.success} />
              <View style={styles.sharingInfoContent}>
                <Text style={styles.sharingInfoLabel}>Duration:</Text>
                <Text style={styles.sharingInfoValue}>
                  {formatDuration(selectedDuration)}
                </Text>
              </View>
            </View>

            <View style={styles.sharingInfoRow}>
              <Icon name="clock-end" size={20} color={theme.colors.warning} />
              <View style={styles.sharingInfoContent}>
                <Text style={styles.sharingInfoLabel}>Expires at:</Text>
                <Text style={styles.sharingInfoValue}>{getExpiryTime()}</Text>
              </View>
            </View>

            <View style={styles.sharingInfoRow}>
              <Icon name="update" size={20} color={theme.colors.info} />
              <View style={styles.sharingInfoContent}>
                <Text style={styles.sharingInfoLabel}>Updates:</Text>
                <Text style={styles.sharingInfoValue}>Real-time</Text>
              </View>
            </View>
          </View>
        )}

        {/* Privacy Notice */}
        {hasLocation && (
          <View style={styles.privacyNotice}>
            <Icon name="shield-lock" size={20} color={theme.colors.textTertiary} />
            <Text style={styles.privacyText}>
              Location updates will stop automatically after the selected duration or
              when you manually stop sharing.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      {hasLocation && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sendButton, loading && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={loading || !hasLocation}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Icon name="send" size={20} color="#fff" />
                <Text style={styles.sendButtonText}>Start Sharing</Text>
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
    backgroundColor: theme.colors.background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface
  },
  closeButton: {
    padding: 4
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text
  },
  placeholder: {
    width: 32
  },
  content: {
    flex: 1
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    margin: 16,
    backgroundColor: theme.colors.info + '15',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.info
  },
  infoBannerText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    color: theme.colors.info,
    lineHeight: 18
  },
  section: {
    padding: 16
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4
  },
  sectionSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 16
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: theme.colors.textSecondary
  },
  locationCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    ...theme.shadows.sm
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  locationInfo: {
    flex: 1,
    marginLeft: 12
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4
  },
  locationAddress: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18
  },
  coordinatesContainer: {
    marginBottom: 16
  },
  coordinateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6
  },
  coordinateLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginLeft: 8,
    width: 70
  },
  coordinateValue: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'
  },
  mapPlaceholder: {
    height: 180,
    backgroundColor: theme.colors.card,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  mapPlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textTertiary
  },
  mapNote: {
    marginTop: 4,
    fontSize: 11,
    color: theme.colors.textTertiary,
    fontStyle: 'italic'
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed'
  },
  refreshButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.primary
  },
  getLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    ...theme.shadows.sm
  },
  getLocationButtonText: {
    marginLeft: 10,
    fontSize: 15,
    fontWeight: '600',
    color: '#fff'
  },
  durationsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6
  },
  durationCard: {
    width: (width - 56) / 2,
    margin: 6,
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    ...theme.shadows.sm
  },
  durationCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '10'
  },
  durationLabel: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    textAlign: 'center'
  },
  durationLabelSelected: {
    color: theme.colors.primary,
    fontWeight: '600'
  },
  sharingInfo: {
    margin: 16,
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    ...theme.shadows.sm
  },
  sharingInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border
  },
  sharingInfoContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginLeft: 12
  },
  sharingInfoLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary
  },
  sharingInfoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text
  },
  privacyNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: theme.colors.card,
    borderRadius: 8
  },
  privacyText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 12,
    color: theme.colors.textTertiary,
    lineHeight: 18
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text
  },
  sendButton: {
    flex: 2,
    marginLeft: 8,
    paddingVertical: 14,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.md
  },
  sendButtonDisabled: {
    opacity: 0.5
  },
  sendButtonText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '600',
    color: '#fff'
  }
});

export default LiveLocationComposer;
