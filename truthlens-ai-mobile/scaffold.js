const fs = require('fs');
const path = require('path');

const screens = [
  'Splash', 'Login', 'Signup', 'ForgotPassword', 'ResetPassword',
  'Dashboard', 'Home', 'Loader', 'Result', 'Explanation',
  'History', 'Profile', 'Chat', 'Settings',
  'FakeNewsDetection', 'ImageDeepfakeDetection', 'VideoDeepfakeDetection'
];

const dir = path.join(__dirname, 'src', 'screens');

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

screens.forEach(screen => {
  const content = `import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { globalStyles, colors, typography } from '../theme';
import { LinearGradient } from 'expo-linear-gradient';

export default function ${screen}Screen({ navigation }: any) {
  return (
    <LinearGradient colors={[colors.background.dark, colors.background.medium, colors.background.light]} style={globalStyles.container}>
      <View style={[globalStyles.container, globalStyles.center]}>
        <Text style={typography.h2}>${screen}</Text>
      </View>
    </LinearGradient>
  );
}
`;
  fs.writeFileSync(path.join(dir, `${screen}Screen.tsx`), content);
});

console.log('Screens scaffolded');
