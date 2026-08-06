import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { globalStyles, colors, typography } from '../theme';
import { LinearGradient } from 'expo-linear-gradient';
import Card from '../components/Card';
import apiClient from '../config/apiClient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../navigation/types';
import { ArrowLeft, Trash2 } from 'lucide-react-native';

type Props = NativeStackScreenProps<MainStackParamList, 'History'>;

export default function HistoryScreen({ navigation }: Props) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await apiClient.get('/api/history');
      if (response.data.success) {
        setHistory(response.data.history);
      }
    } catch (error: any) {
      console.log('Failed to fetch history, showing mock data for demo');
      setHistory([
        { id: 1, title: 'Political Speech Analysis', date: '2023-10-15', score: 85, type: 'Video Deepfake' },
        { id: 2, title: 'News Article Check', date: '2023-10-12', score: 92, type: 'Fake News' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <Card style={styles.historyCard}>
      <View style={styles.historyInfo}>
        <Text style={[typography.h3, { marginBottom: 5 }]}>{item.title}</Text>
        <Text style={typography.bodySmall}>{item.type} • {item.date}</Text>
      </View>
      <View style={styles.historyScore}>
        <Text style={[typography.h2, { color: item.score >= 70 ? colors.success : colors.error }]}>
          {item.score}%
        </Text>
      </View>
    </Card>
  );

  return (
    <LinearGradient colors={[colors.background.dark, colors.background.medium, colors.background.light]} style={globalStyles.container}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft color={colors.text.primary} size={24} />
          </TouchableOpacity>
          <Text style={typography.h2}>Analysis History</Text>
          <View style={{ width: 40 }} />
        </View>

        <FlatList
          data={history}
          keyExtractor={(item: any) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={
            !loading ? <Text style={[typography.body, { textAlign: 'center', marginTop: 50 }]}>No history found.</Text> : null
          }
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  backBtn: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 50,
  },
  historyCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    marginBottom: 15,
  },
  historyInfo: {
    flex: 1,
  },
  historyScore: {
    marginLeft: 15,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
