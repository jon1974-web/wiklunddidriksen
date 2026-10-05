import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { BRAND_COLORS } from '../../constants/marketing';

export const PricingCard: React.FC = () => {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();

  const tint = isDark ? BRAND_COLORS.blueLightTintDark : BRAND_COLORS.blueDarkTint;
  const border = isDark ? BRAND_COLORS.blueLightBorderDark : BRAND_COLORS.blueDarkBorder;

  return (
    <View style={[styles.card, { backgroundColor: tint, borderColor: border }]}>
      <View style={styles.tierRow}>
        <Text style={[styles.tier, { color: colors.text }]}>{t('desktop.tierFamily')}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{t('desktop.betaBadge')}</Text>
        </View>
      </View>
      <View style={styles.priceRow}>
        <Text style={[styles.price, { color: colors.text }]}>{t('desktop.priceFree')}</Text>
        <Text style={[styles.perMonth, { color: colors.textSecondary }]}>{t('desktop.perMonth')}</Text>
      </View>
      <Text style={[styles.fine, { color: colors.textSecondary }]}>{t('desktop.pricingFine')}</Text>
      <View style={[styles.cta, { backgroundColor: BRAND_COLORS.blueDark }]}>
        <Text style={styles.ctaText}>{t('common.startFree')}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tier: {
    fontSize: 15,
    fontWeight: '800',
  },
  badge: {
    backgroundColor: BRAND_COLORS.blueDark,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
    marginTop: 8,
  },
  price: {
    fontSize: 30,
    fontWeight: '800',
  },
  perMonth: {
    fontSize: 13,
    fontWeight: '600',
  },
  fine: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
    marginBottom: 12,
  },
  cta: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  ctaText: {
    color: '#fff',
    fontSize: 14.5,
    fontWeight: '700',
  },
});
