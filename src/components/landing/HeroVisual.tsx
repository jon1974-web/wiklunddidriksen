import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { BRAND, BRAND_COLORS, LANDING_SAMPLES } from '../../constants/marketing';

export const HeroVisual: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={[styles.frame, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.bar, { borderBottomColor: colors.border }]}>
        <View style={styles.dots}>
          <View style={[styles.dot, { backgroundColor: colors.border }]} />
          <View style={[styles.dot, { backgroundColor: colors.border }]} />
          <View style={[styles.dot, { backgroundColor: colors.border }]} />
        </View>
        <Text style={[styles.barTitle, { color: colors.textSecondary }]}>
          {BRAND.domain} — {t('tabs.events')}
        </Text>
      </View>
      <View style={styles.body}>
        {LANDING_SAMPLES.map((sample) => (
          <View key={sample.titleKey} style={[styles.row, { borderColor: colors.border }]}>
            <View style={[styles.rowIcon, { backgroundColor: sample.tint }]}>
              <Text style={styles.rowIconText}>{sample.icon}</Text>
            </View>
            <View style={styles.rowBody}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>{t(sample.titleKey)}</Text>
              <Text style={[styles.rowText, { color: colors.textSecondary }]}>{t(sample.textKey)}</Text>
            </View>
            {'spond' in sample && (
              <View style={styles.spondBadge}>
                <Text style={styles.spondText}>SPOND</Text>
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  frame: {
    marginTop: 26,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  barTitle: {
    fontSize: 11,
    marginLeft: 2,
  },
  body: {
    padding: 14,
    gap: 9,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 11,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconText: {
    fontSize: 18,
  },
  rowBody: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  rowText: {
    fontSize: 11.5,
  },
  spondBadge: {
    backgroundColor: BRAND_COLORS.blueDark,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginLeft: 'auto',
  },
  spondText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
});
