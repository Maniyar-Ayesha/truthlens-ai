import React, { useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { globalStyles, colors, typography } from '../theme';
import { LinearGradient } from 'expo-linear-gradient';
import Card from '../components/Card';
import { AuthContext } from '../context/AuthContext';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../navigation/types';
import { ShieldAlert, Image as ImageIcon, Video, Search, MessageSquare, History, Settings, LogOut } from 'lucide-react-native';

type Props = NativeStackScreenProps<MainStackParamList, 'Dashboard'>;

export default function DashboardScreen({ navigation }: Props) {
  const { user, logout } = useContext(AuthContext);
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  }, []);

  const ActionCard = ({ title, icon, onPress, color = colors.primary }: any) => (
    <TouchableOpacity style={styles.actionCard} onPress={onPress}>
      <Card style={[styles.actionCardInner, { borderColor: color }]}>
        {icon}
        <Text style={[typography.body, { marginTop: 10, textAlign: 'center', color: colors.text.primary }]}>{title}</Text>
      </Card>
    </TouchableOpacity>
  );

  return (
    <LinearGradient colors={[colors.background.dark, colors.background.medium, colors.background.light]} style={globalStyles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={typography.h2}>Hello, {user?.name?.split(' ')[0] || 'User'}</Text>
            <Text style={typography.bodySmall}>Welcome to TruthLens AI Dashboard</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <LogOut color={colors.error} size={24} />
          </TouchableOpacity>
        </View>

        <Card style={styles.trustScoreCard}>
          <Text style={typography.h3}>Average Trust Score</Text>
          <Text style={[typography.h1, { color: colors.success, fontSize: 48, marginTop: 10 }]}>92%</Text>
          <Text style={typography.bodySmall}>Based on your recent analyses</Text>
        </Card>

        <Text style={[typography.h3, { marginTop: 20, marginBottom: 10 }]}>Analysis Tools</Text>
        <View style={styles.grid}>
          <ActionCard 
            title="Fake News" 
            icon={<Search color={colors.primary} size={32} />} 
            onPress={() => navigation.navigate('FakeNewsDetection')}
          />
          <ActionCard 
            title="Image Deepfake" 
            icon={<ImageIcon color={colors.warning} size={32} />} 
            onPress={() => navigation.navigate('ImageDeepfakeDetection')}
            color={colors.warning}
          />
          <ActionCard 
            title="Video Deepfake" 
            icon={<Video color={colors.error} size={32} />} 
            onPress={() => navigation.navigate('VideoDeepfakeDetection')}
            color={colors.error}
          />
          <ActionCard 
            title="AI Chat" 
            icon={<MessageSquare color={colors.success} size={32} />} 
            onPress={() => navigation.navigate('Chat')}
            color={colors.success}
          />
        </View>

        <Text style={[typography.h3, { marginTop: 20, marginBottom: 10 }]}>Quick Links</Text>
        <View style={styles.grid}>
          <ActionCard 
            title="History" 
            icon={<History color={colors.text.secondary} size={32} />} 
            onPress={() => navigation.navigate('History')}
            color={colors.text.secondary}
          />
          <ActionCard 
            title="Settings" 
            icon={<Settings color={colors.text.secondary} size={32} />} 
            onPress={() => navigation.navigate('Settings')}
            color={colors.text.secondary}
          />
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    padding: 20,
    paddingTop: 50, // safe area approx
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoutBtn: {
    padding: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 50,
  },
  trustScoreCard: {
    alignItems: 'center',
    paddingVertical: 30,
    borderWidth: 2,
    borderColor: 'rgba(34, 197, 94, 0.3)', // success glow
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    marginBottom: 15,
  },
  actionCardInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 25,
    borderWidth: 1,
    borderBottomWidth: 4,
  }
});
