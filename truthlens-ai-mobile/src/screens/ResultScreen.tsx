import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { globalStyles, colors, typography } from '../theme';
import { LinearGradient } from 'expo-linear-gradient';
import Card from '../components/Card';
import Button from '../components/Button';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../navigation/types';
import { ArrowLeft, CheckCircle, AlertTriangle } from 'lucide-react-native';

type Props = NativeStackScreenProps<MainStackParamList, 'Result'>;

export default function ResultScreen({ route, navigation }: Props) {
  const { type, data } = route.params;

  const isPositive = data.score >= 70;
  const iconColor = isPositive ? colors.success : colors.error;

  return (
    <LinearGradient colors={[colors.background.dark, colors.background.medium, colors.background.light]} style={globalStyles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.navigate('Dashboard')} style={styles.backBtn}>
            <ArrowLeft color={colors.text.primary} size={24} />
          </TouchableOpacity>
          <Text style={typography.h2}>Analysis Result</Text>
          <View style={{ width: 40 }} />
        </View>

        <Card style={[styles.card, { borderColor: iconColor, borderWidth: 2 }]}>
          <View style={styles.resultHeader}>
            {isPositive ? (
              <CheckCircle color={iconColor} size={64} />
            ) : (
              <AlertTriangle color={iconColor} size={64} />
            )}
            <Text style={[typography.h1, { color: iconColor, marginTop: 15, fontSize: 36 }]}>
              {data.score}%
            </Text>
            <Text style={[typography.h2, { color: iconColor, marginTop: 5 }]}>
              {data.label}
            </Text>
          </View>

          <View style={styles.divider} />

          <Text style={[typography.h3, { marginBottom: 10 }]}>Explanation</Text>
          <Text style={typography.body}>{data.explanation}</Text>

        </Card>

        <Button 
          title="View Full Report" 
          onPress={() => navigation.navigate('Explanation', { data })} 
          variant="outline"
          style={{ marginTop: 20 }}
        />
        
        <Button 
          title="New Analysis" 
          onPress={() => navigation.goBack()} 
          style={{ marginTop: 15 }}
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
  card: {
    padding: 30,
    alignItems: 'flex-start',
  },
  resultHeader: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    width: '100%',
    marginVertical: 20,
  }
});
