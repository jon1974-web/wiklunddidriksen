import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { BRAND_COLORS } from '../../constants/marketing';

interface AdSlotProps {
  height?: number;
}

export const AdSlot: React.FC<AdSlotProps> = ({ height = 120 }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.slot,
        {
          height,
          borderColor: BRAND_COLORS.blueDarkBorder,
          backgroundColor: BRAND_COLORS.blueDarkTint,
        },
      ]}
    >
      <Text style={styles.icon}>📢</Text>
      <Text style={[styles.title, { color: colors.textSecondary }]}>{t('desktop.adTitle')}</Text>
      <Text style={[styles.sub, { color: colors.textSecondary }]}>{t('desktop.adSub')}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  slot: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  icon: {
    fontSize: 16,
    marginBottom: 6,
  },
  title: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  sub: {
    fontSize: 10.5,
    marginTop: 3,
    opacity: 0.8,
  },
});
