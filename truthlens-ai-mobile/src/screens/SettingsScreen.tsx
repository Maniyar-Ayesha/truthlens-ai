import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { globalStyles, colors, typography } from '../theme';
import { LinearGradient } from 'expo-linear-gradient';
import Card from '../components/Card';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../navigation/types';
import { ArrowLeft, Moon, Bell, Shield, Info, LogOut } from 'lucide-react-native';
import Constants from 'expo-constants';

type Props = NativeStackScreenProps<MainStackParamList, 'Settings'>;

export default function SettingsScreen({ navigation }: Props) {
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);

  return (
    <LinearGradient colors={[colors.background.dark, colors.background.medium, colors.background.light]} style={globalStyles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft color={colors.text.primary} size={24} />
          </TouchableOpacity>
          <Text style={typography.h2}>Settings</Text>
          <View style={{ width: 40 }} />
        </View>

        <Text style={[typography.h3, { marginBottom: 10, marginLeft: 5 }]}>Preferences</Text>
        <Card style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Moon color={colors.text.primary} size={24} />
              <Text style={[typography.body, styles.settingText]}>Dark Mode</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>
          
          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Bell color={colors.text.primary} size={24} />
              <Text style={[typography.body, styles.settingText]}>Push Notifications</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>
        </Card>

        <Text style={[typography.h3, { marginTop: 25, marginBottom: 10, marginLeft: 5 }]}>About</Text>
        <Card style={styles.card}>
          <TouchableOpacity style={styles.settingRow} onPress={() => Alert.alert('Privacy Policy', 'This would open the privacy policy.')}>
            <View style={styles.settingInfo}>
              <Shield color={colors.text.primary} size={24} />
              <Text style={[typography.body, styles.settingText]}>Privacy Policy</Text>
            </View>
          </TouchableOpacity>
          
          <View style={styles.divider} />

          <TouchableOpacity style={styles.settingRow} onPress={() => Alert.alert('About', 'TruthLens AI - Unveiling the truth.')}>
            <View style={styles.settingInfo}>
              <Info color={colors.text.primary} size={24} />
              <Text style={[typography.body, styles.settingText]}>About TruthLens AI</Text>
            </View>
          </TouchableOpacity>
        </Card>

        <Text style={[typography.bodySmall, { textAlign: 'center', marginTop: 40, color: colors.text.muted }]}>
          App Version {Constants.expoConfig?.version || '1.0.0'}
        </Text>

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
  card: {
    padding: 10,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    marginLeft: 15,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    width: '100%',
  }
});
