import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

interface CollapsibleSectionProps {
  title: string;
  storageKey: string;
  children: React.ReactNode;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, storageKey, children }) => {
  const { colors } = useTheme();
  const [open, setOpen] = useState<boolean>(() => {
    try {
      return typeof localStorage !== 'undefined' && localStorage.getItem(`fampad.panel.${storageKey}`) === '1';
    } catch {
      return false;
    }
  });

  const toggle = () => {
    const next = !open;
    setOpen(next);
    try {
      localStorage.setItem(`fampad.panel.${storageKey}`, next ? '1' : '0');
    } catch {}
  };

  return (
    <View>
      <TouchableOpacity style={styles.header} onPress={toggle} activeOpacity={0.7}>
        <Text style={[styles.title, { color: colors.textSecondary }]}>{title}</Text>
        <Text style={[styles.chevron, { color: colors.textSecondary }]}>{open ? '▾' : '▸'}</Text>
      </TouchableOpacity>
      {open && <View style={styles.content}>{children}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  chevron: {
    fontSize: 12,
    fontWeight: '700',
  },
  content: {
    paddingBottom: 6,
  },
});
