import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { BRAND_COLORS } from '../../constants/marketing';

const STEPS = [
  { n: '1', titleKey: 'landing.step1Title', textKey: 'landing.step1Text' },
  { n: '2', titleKey: 'landing.step2Title', textKey: 'landing.step2Text' },
  { n: '3', titleKey: 'landing.step3Title', textKey: 'landing.step3Text' },
];

export const GetStartedSteps: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={styles.section}>
      <Text style={[styles.title, { color: colors.text }]}>{t('landing.stepsTitle')}</Text>
      <View style={styles.row}>
        {STEPS.map((step) => (
          <View key={step.n} style={styles.step}>
            <View style={styles.numCircle}>
              <Text style={styles.numText}>{step.n}</Text>
            </View>
            <Text style={[styles.stepTitle, { color: colors.text }]}>{t(step.titleKey)}</Text>
            <Text style={[styles.stepText, { color: colors.textSecondary }]}>{t(step.textKey)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginTop: 26,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  step: {
    flexBasis: '30%',
    flexGrow: 1,
    alignItems: 'flex-start',
  },
  numCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: BRAND_COLORS.blueDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  numText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  stepTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    marginBottom: 3,
  },
  stepText: {
    fontSize: 12,
    lineHeight: 17,
  },
});
