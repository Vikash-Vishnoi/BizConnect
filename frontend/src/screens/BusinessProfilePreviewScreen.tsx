import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import theme from '../theme';

interface BusinessProfile {
  about?: string;
  address?: string;
  description?: string;
  email?: string;
  profile_picture_url?: string;
  websites?: string[];
  vertical?: string;
}

interface BusinessHours {
  [key: string]: {
    is_open: boolean;
    open_time?: string;
    close_time?: string;
  };
}

interface BusinessProfilePreviewScreenProps {
  navigation: any;
}

export default function BusinessProfilePreviewScreen({ navigation }: BusinessProfilePreviewScreenProps) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [businessHours, setBusinessHours] = useState<BusinessHours | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      // TODO: Call API to load business profile
      // const profileResponse = await profileService.getBusinessProfile();
      // const hoursResponse = await profileService.getBusinessHours();
      // setProfile(profileResponse.profile);
      // setBusinessHours(hoursResponse.businessHours);
      
      // Simulate API call with mock data
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setProfile({
        about: 'Your trusted business partner 🚀',
        address: '123 Business Street, City, Country',
        description: 'We provide excellent services to help your business grow. Contact us today!',
        email: 'business@example.com',
        profile_picture_url: 'https://via.placeholder.com/150',
        websites: ['https://example.com', 'https://shop.example.com'],
        vertical: 'RETAIL'
      });
      
      setBusinessHours({
        MONDAY: { is_open: true, open_time: '09:00', close_time: '17:00' },
        TUESDAY: { is_open: true, open_time: '09:00', close_time: '17:00' },
        WEDNESDAY: { is_open: true, open_time: '09:00', close_time: '17:00' },
        THURSDAY: { is_open: true, open_time: '09:00', close_time: '17:00' },
        FRIDAY: { is_open: true, open_time: '09:00', close_time: '17:00' },
        SATURDAY: { is_open: false },
        SUNDAY: { is_open: false }
      });
    } catch (error: any) {
      console.error('Load profile error:', error);
      Alert.alert('Error', 'Failed to load business profile');
    } finally {
      setLoading(false);
    }
  };

  const getVerticalLabel = (vertical?: string) => {
    const verticals: { [key: string]: string } = {
      'RETAIL': 'Shopping and Retail',
      'AUTO': 'Automotive',
      'BEAUTY': 'Beauty, Spa and Salon',
      'APPAREL': 'Clothing and Apparel',
      'EDU': 'Education',
      'ENTERTAIN': 'Entertainment',
      'EVENT_PLAN': 'Event Planning and Service',
      'FINANCE': 'Finance and Banking',
      'GROCERY': 'Grocery',
      'GOVT': 'Government',
      'HOTEL': 'Hotel and Lodging',
      'HEALTH': 'Health',
      'NONPROFIT': 'Non-profit',
      'PROF_SERVICES': 'Professional Services',
      'TRAVEL': 'Travel and Transportation',
      'RESTAURANT': 'Restaurant',
      'OTHER': 'Other',
      'UNDEFINED': 'Undefined'
    };
    return verticals[vertical || 'UNDEFINED'] || 'Business';
  };

  const getDayLabel = (day: string) => {
    const labels: { [key: string]: string } = {
      'MONDAY': 'Mon',
      'TUESDAY': 'Tue',
      'WEDNESDAY': 'Wed',
      'THURSDAY': 'Thu',
      'FRIDAY': 'Fri',
      'SATURDAY': 'Sat',
      'SUNDAY': 'Sun'
    };
    return labels[day] || day;
  };

  const handleEmailPress = () => {
    if (profile?.email) {
      Linking.openURL(`mailto:${profile.email}`);
    }
  };

  const handleWebsitePress = (url: string) => {
    Linking.openURL(url);
  };

  const handleEditProfile = () => {
    Alert.alert('Edit Profile', 'Navigate to profile edit screen', [
      { text: 'OK' }
    ]);
  };

  const handleEditHours = () => {
    navigation.navigate('BusinessHoursEditor');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.emptyContainer}>
        <Icon name="store-off-outline" size={64} color={theme.colors.border} />
        <Text style={styles.emptyText}>No profile information available</Text>
        <TouchableOpacity style={styles.setupButton} onPress={handleEditProfile}>
          <Text style={styles.setupButtonText}>Setup Profile</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        {profile.profile_picture_url ? (
          <Image
            source={{ uri: profile.profile_picture_url }}
            style={styles.profileImage}
          />
        ) : (
          <View style={styles.profileImagePlaceholder}>
            <Icon name="store" size={48} color={theme.colors.primary} />
          </View>
        )}
        
        <View style={styles.profileInfo}>
          <Text style={styles.businessName}>Your Business</Text>
          <Text style={styles.category}>{getVerticalLabel(profile.vertical)}</Text>
          {profile.about && (
            <Text style={styles.about}>{profile.about}</Text>
          )}
        </View>

        <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
          <Icon name="pencil" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Description */}
      {profile.description && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="text" size={20} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Description</Text>
          </View>
          <Text style={styles.descriptionText}>{profile.description}</Text>
        </View>
      )}

      {/* Contact Information */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Icon name="information-outline" size={20} color={theme.colors.primary} />
          <Text style={styles.sectionTitle}>Contact Information</Text>
        </View>

        {profile.address && (
          <TouchableOpacity style={styles.contactItem}>
            <Icon name="map-marker" size={20} color={theme.colors.text} />
            <Text style={styles.contactText}>{profile.address}</Text>
          </TouchableOpacity>
        )}

        {profile.email && (
          <TouchableOpacity style={styles.contactItem} onPress={handleEmailPress}>
            <Icon name="email" size={20} color={theme.colors.text} />
            <Text style={[styles.contactText, styles.linkText]}>{profile.email}</Text>
          </TouchableOpacity>
        )}

        {profile.websites && profile.websites.length > 0 && (
          <>
            {profile.websites.map((website, index) => (
              <TouchableOpacity
                key={index}
                style={styles.contactItem}
                onPress={() => handleWebsitePress(website)}
              >
                <Icon name="web" size={20} color={theme.colors.text} />
                <Text style={[styles.contactText, styles.linkText]}>{website}</Text>
              </TouchableOpacity>
            ))}
          </>
        )}
      </View>

      {/* Business Hours */}
      {businessHours && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="clock-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Business Hours</Text>
            <TouchableOpacity style={styles.editIconButton} onPress={handleEditHours}>
              <Icon name="pencil" size={18} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.hoursGrid}>
            {Object.entries(businessHours).map(([day, hours]) => (
              <View key={day} style={styles.hourRow}>
                <Text style={styles.dayText}>{getDayLabel(day)}</Text>
                {hours.is_open && hours.open_time && hours.close_time ? (
                  <Text style={styles.hoursText}>
                    {hours.open_time} - {hours.close_time}
                  </Text>
                ) : (
                  <Text style={styles.closedText}>Closed</Text>
                )}
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actionsSection}>
        <TouchableOpacity style={styles.actionButton} onPress={handleEditProfile}>
          <Icon name="pencil-outline" size={24} color={theme.colors.primary} />
          <Text style={styles.actionButtonText}>Edit Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleEditHours}>
          <Icon name="clock-edit-outline" size={24} color={theme.colors.primary} />
          <Text style={styles.actionButtonText}>Edit Hours</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={loadProfile}>
          <Icon name="refresh" size={24} color={theme.colors.primary} />
          <Text style={styles.actionButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Info Box */}
      <View style={styles.infoBox}>
        <Icon name="information-outline" size={20} color={theme.colors.info} />
        <Text style={styles.infoText}>
          This is how your business appears to customers on WhatsApp. Keep your information up-to-date.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  content: {
    padding: 16,
    paddingBottom: 32
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: 32
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center'
  },
  setupButton: {
    marginTop: 24,
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8
  },
  setupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  profileHeader: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...theme.shadows.small
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center'
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center'
  },
  businessName: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4
  },
  category: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 8
  },
  about: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20
  },
  editButton: {
    padding: 8
  },
  section: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...theme.shadows.small
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8
  },
  sectionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text
  },
  editIconButton: {
    padding: 4
  },
  descriptionText: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 22
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8
  },
  contactText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text
  },
  linkText: {
    color: theme.colors.primary,
    textDecorationLine: 'underline'
  },
  hoursGrid: {
    gap: 8
  },
  hourRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    width: 50
  },
  hoursText: {
    fontSize: 14,
    color: theme.colors.text
  },
  closedText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontStyle: 'italic'
  },
  actionsSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16
  },
  actionButton: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.text,
    textAlign: 'center'
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: theme.colors.info + '15',
    borderRadius: 8,
    padding: 12,
    gap: 8
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.text,
    lineHeight: 18
  }
});
