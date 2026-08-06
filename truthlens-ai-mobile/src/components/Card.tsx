import React from 'react';
import { View, StyleProp, ViewStyle, StyleSheet } from 'react-native';
import { globalStyles } from '../theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export default function Card({ children, style }: CardProps) {
  return (
    <View style={[globalStyles.card, style]}>
      {children}
    </View>
  );
}
