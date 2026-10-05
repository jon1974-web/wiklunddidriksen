import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

export const PanelSectionLabel: React.FC<{ label: string }> = ({ label }) => {
  const { colors } = useTheme();
  return <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>;
};

const styles = StyleSheet.create({
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 4,
  },
});
