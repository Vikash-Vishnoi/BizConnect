import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import monitoringAPI from '../services/monitoringService';
import theme from '../theme';

const RateLimitDashboard: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

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
      <Text style={styles.title}>API Rate Limits</Text>
      <FlatList
        data={items}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.endpoint}>{item.endpoint || 'unknown'}</Text>
            <Text style={styles.meta}>{item.headers ? JSON.stringify(item.headers) : ''}</Text>
            <Text style={styles.time}>{new Date(item.createdAt).toLocaleString()}</Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: theme.colors.background,
  },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: {
    ...theme.typography.h5,
    marginBottom: 12,
  },
  row: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    marginBottom: 8,
  },
  endpoint: { fontWeight: '700', marginBottom: 6 },
  meta: { color: theme.colors.textSecondary, fontSize: 12 },
  time: { marginTop: 6, color: theme.colors.textSecondary, fontSize: 11 },
});

export default RateLimitDashboard;
