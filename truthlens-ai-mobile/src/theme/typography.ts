import { StyleSheet } from 'react-native';

export const typography = StyleSheet.create({
  h1: {
    fontFamily: 'System', // We will load Poppins later
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  h2: {
    fontFamily: 'System',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  h3: {
    fontFamily: 'System',
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
  },
  body: {
    fontFamily: 'System',
    fontSize: 16,
    color: '#94a3b8',
  },
  bodySmall: {
    fontFamily: 'System',
    fontSize: 14,
    color: '#94a3b8',
  },
  button: {
    fontFamily: 'System',
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
