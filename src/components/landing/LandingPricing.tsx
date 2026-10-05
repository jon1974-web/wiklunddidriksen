import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { BRAND_COLORS } from '../../constants/marketing';

export const LandingPricing: React.FC<{ onCtaPress?: () => void }> = ({ onCtaPress }) => {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();

  const tint = isDark ? BRAND_COLORS.blueLightTintDark : BRAND_COLORS.blueDarkTint;
  const border = isDark ? BRAND_COLORS.blueLightBorderDark : BRAND_COLORS.blueDarkBorder;
  const points = [
    t('landing.pricingPoint1'),
    t('landing.pricingPoint2'),
    t('landing.pricingPoint3'),
    t('landing.pricingPoint4'),
  ];

  return (
    <View style={styles.section}>
      <Text style={[styles.title, { color: colors.text }]}>{t('landing.pricingTitle')}</Text>
      <Text style={[styles.sub, { color: colors.textSecondary }]}>{t('landing.pricingSub')}</Text>
      <View style={[styles.card, { backgroundColor: tint, borderColor: border }]}>
        <View style={styles.left}>
          <Text style={[styles.tier, { color: colors.text }]}>{t('landing.pricingTier')}</Text>
          {points.map((point) => (
            <View key={point} style={styles.point}>
              <Text style={[styles.check, { color: BRAND_COLORS.blueDark }]}>✓</Text>
              <Text style={[styles.pointText, { color: colors.textSecondary }]}>{point}</Text>
            </View>
          ))}
        </View>
        <View style={styles.right}>
          <View style={styles.priceRow}>
            <Text style={[styles.price, { color: colors.text }]}>{t('desktop.priceFree')}</Text>
            <Text style={[styles.perMonth, { color: colors.textSecondary }]}>{t('landing.perMonthShort')}</Text>
          </View>
          {onCtaPress && (
            <TouchableOpacity
              style={[styles.cta, { backgroundColor: BRAND_COLORS.blueDark }]}
              onPress={onCtaPress}
              activeOpacity={0.8}
            >
              <Text style={styles.ctaText}>{t('common.startFree')}</Text>
            </TouchableOpacity>
          )}
          <Text style={[styles.noCard, { color: colors.textSecondary }]}>{t('landing.noCardRequired')}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginTop: 34,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  sub: {
    fontSize: 13.5,
    marginBottom: 16,
  },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
    flexDirection: 'row',
    gap: 24,
    alignItems: 'center',
  },
  left: {
    flex: 1,
  },
  tier: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 8,
  },
  point: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 3,
  },
  check: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 1,
  },
  pointText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  right: {
    alignItems: 'flex-end',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
  },
  price: {
    fontSize: 40,
    fontWeight: '800',
  },
  perMonth: {
    fontSize: 13,
    fontWeight: '600',
  },
  noCard: {
    fontSize: 12,
    marginTop: 8,
  },
  cta: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginTop: 12,
  },
  ctaText: {
    color: '#fff',
    fontSize: 14.5,
    fontWeight: '700',
  },
});
