import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { globalStyles, colors, typography } from '../theme';
import { LinearGradient } from 'expo-linear-gradient';
import Input from '../components/Input';
import Button from '../components/Button';
import Card from '../components/Card';
import apiClient from '../config/apiClient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/types';
import { ArrowLeft } from 'lucide-react-native';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post('/api/auth/forgot-password', { email });
      if (response.data.success) {
        Alert.alert('Success', 'Password reset instructions sent to your email.');
        navigation.goBack();
      } else {
        Alert.alert('Error', response.data.message || 'Failed to request reset.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={[colors.background.dark, colors.background.medium, colors.background.light]} style={globalStyles.container}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft color={colors.text.primary} size={24} />
          </TouchableOpacity>
        </View>

        <Text style={[typography.h2, { marginBottom: 10 }]}>Forgot Password</Text>
        <Text style={[typography.body, { marginBottom: 30 }]}>Enter your email to receive reset instructions</Text>

        <Card>
          <Input
            label="Email Address"
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <Button title="Reset Password" onPress={handleReset} loading={loading} style={{ marginTop: 20 }} />
        </Card>
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
    marginBottom: 30,
  },
  backBtn: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 50,
  },
});
