import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import monitoringAPI from '../services/monitoringService';
import theme from '../theme';

const RateLimitDashboard: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const load = async () => {
    try {
      setLoading(true);
      const data = await monitoringAPI.getRateLimits();
      setItems(data);
    } catch (err) {
      console.error('Load rate limits error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    
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

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={{padding: theme.spacing.md}}>
          <SkeletonCard />
          <View style={{height: theme.spacing.md}} />
          <Skeleton width="100%" height={200} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.primaryDark]}
        style={styles.header}
      >
        <Icon name="speedometer" size={28} color={theme.colors.textInverse} />
        <Text style={styles.title}>API Rate Limits</Text>
      </LinearGradient>
      <FlatList
        data={items}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{translateY: slideAnim}],
            }}
          >
            <View style={styles.row}>
            <Text style={styles.endpoint}>{item.endpoint || 'unknown'}</Text>
            <Text style={styles.meta}>{item.headers ? JSON.stringify(item.headers) : ''}</Text>
            <Text style={styles.time}>{new Date(item.createdAt).toLocaleString()}</Text>
          </View>
          </Animated.View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(255,255,255,0.3)',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textInverse,
  },
  listContent: {
    padding: theme.spacing.md,
  },
  row: {
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
    ...theme.shadows.md,
  },
  endpoint: { fontWeight: '700', fontSize: 16, marginBottom: theme.spacing.sm, color: theme.colors.text },
  meta: { color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18 },
  time: { marginTop: theme.spacing.sm, color: theme.colors.textSecondary, fontSize: 11, fontWeight: '600' },
});

export default RateLimitDashboard;
