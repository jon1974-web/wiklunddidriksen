import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { LANDING_FEATURES } from '../../constants/marketing';

export const FeatureBento: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={styles.section}>
      <Text style={[styles.title, { color: colors.text }]}>{t('landing.featuresTitle')}</Text>
      <Text style={[styles.sub, { color: colors.textSecondary }]}>{t('landing.featuresSub')}</Text>
      <View style={styles.grid}>
        {LANDING_FEATURES.map((feature) => (
          <View key={feature.titleKey} style={[styles.tile, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.tileIcon, { backgroundColor: feature.tint }]}>
              <Text style={styles.tileIconText}>{feature.icon}</Text>
            </View>
            <Text style={[styles.tileTitle, { color: colors.text }]}>{t(feature.titleKey)}</Text>
            <Text style={[styles.tileText, { color: colors.textSecondary }]}>{t(feature.textKey)}</Text>
          </View>
        ))}
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tile: {
    flexBasis: '23%',
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'flex-start',
  },
  tileIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  tileIconText: {
    fontSize: 17,
  },
  tileTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    marginBottom: 3,
  },
  tileText: {
    fontSize: 12,
    lineHeight: 17,
  },
});
