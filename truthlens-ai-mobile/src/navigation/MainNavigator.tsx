import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainStackParamList } from './types';

import DashboardScreen from '../screens/DashboardScreen';
import HomeScreen from '../screens/HomeScreen';
import FakeNewsDetectionScreen from '../screens/FakeNewsDetectionScreen';
import ImageDeepfakeDetectionScreen from '../screens/ImageDeepfakeDetectionScreen';
import VideoDeepfakeDetectionScreen from '../screens/VideoDeepfakeDetectionScreen';
import ResultScreen from '../screens/ResultScreen';
import ExplanationScreen from '../screens/ExplanationScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ChatScreen from '../screens/ChatScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator<MainStackParamList>();

export default function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="FakeNewsDetection" component={FakeNewsDetectionScreen} />
      <Stack.Screen name="ImageDeepfakeDetection" component={ImageDeepfakeDetectionScreen} />
      <Stack.Screen name="VideoDeepfakeDetection" component={VideoDeepfakeDetectionScreen} />
      <Stack.Screen name="Result" component={ResultScreen} />
      <Stack.Screen name="Explanation" component={ExplanationScreen} />
      <Stack.Screen name="History" component={HistoryScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}
