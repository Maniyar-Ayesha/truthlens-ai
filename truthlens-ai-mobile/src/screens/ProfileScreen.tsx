import React, { useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { globalStyles, colors, typography } from '../theme';
import { LinearGradient } from 'expo-linear-gradient';
import Button from '../components/Button';
import Card from '../components/Card';
import { AuthContext } from '../context/AuthContext';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../navigation/types';
import { ArrowLeft, User, Mail, Shield } from 'lucide-react-native';

type Props = NativeStackScreenProps<MainStackParamList, 'Profile'>;

export default function ProfileScreen({ navigation }: Props) {
  const { user, logout } = useContext(AuthContext);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  return (
    <LinearGradient colors={[colors.background.dark, colors.background.medium, colors.background.light]} style={globalStyles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft color={colors.text.primary} size={24} />
          </TouchableOpacity>
          <Text style={typography.h2}>Profile</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={[typography.h1, { fontSize: 48 }]}>{user?.name?.charAt(0) || 'U'}</Text>
          </View>
        </View>

        <Card style={styles.card}>
          <View style={styles.infoRow}>
            <User color={colors.text.secondary} size={20} />
            <View style={styles.infoTextContainer}>
              <Text style={typography.bodySmall}>Full Name</Text>
              <Text style={typography.body}>{user?.name || 'Unknown User'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Mail color={colors.text.secondary} size={20} />
            <View style={styles.infoTextContainer}>
              <Text style={typography.bodySmall}>Email Address</Text>
              <Text style={typography.body}>{user?.email || 'No email provided'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Shield color={colors.text.secondary} size={20} />
            <View style={styles.infoTextContainer}>
              <Text style={typography.bodySmall}>Account Type</Text>
              <Text style={typography.body}>Premium Member</Text>
            </View>
          </View>
        </Card>

        <Button 
          title="Edit Profile" 
          onPress={() => Alert.alert('Coming Soon', 'Edit profile will be available in the next update.')} 
          style={{ marginTop: 20 }} 
          variant="outline"
        />

        <Button 
          title="Logout" 
          onPress={handleLogout} 
          style={{ marginTop: 20 }} 
          variant="secondary"
        />

      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
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
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(59, 130, 246, 0.3)', // primary with opacity
  },
  card: {
    padding: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  infoTextContainer: {
    marginLeft: 15,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    width: '100%',
    marginVertical: 10,
  }
});
