import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { globalStyles, colors, typography } from '../theme';
import { LinearGradient } from 'expo-linear-gradient';

export default function ResetPasswordScreen({ navigation }: any) {
  return (
    <LinearGradient colors={[colors.background.dark, colors.background.medium, colors.background.light]} style={globalStyles.container}>
      <View style={[globalStyles.container, globalStyles.center]}>
        <Text style={typography.h2}>ResetPassword</Text>
      </View>
    </LinearGradient>
  );
}
