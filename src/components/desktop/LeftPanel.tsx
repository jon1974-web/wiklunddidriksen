import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { PanelSectionLabel } from './PanelSectionLabel';
import { VideoIntroCard } from './VideoIntroCard';
import { PricingCard } from './PricingCard';
import { DESKTOP_BENEFITS } from '../../constants/marketing';

const BenefitRow: React.FC<{ icon: string; title: string; text: string }> = ({ icon, title, text }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.benefit}>
      <View style={[styles.benefitIcon, { backgroundColor: colors.border }]}>
        <Text style={styles.benefitIconText}>{icon}</Text>
      </View>
      <View style={styles.benefitBody}>
        <Text style={[styles.benefitTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.benefitText, { color: colors.textSecondary }]}>{text}</Text>
      </View>
    </View>
  );
};

export const LeftPanel: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.brandRow}>
        <Image source={require('../../../assets/icon.png')} style={styles.logo} />
        <View style={styles.brandText}>
          <Text style={styles.wordmark}>
            <Text style={{ color: colors.accent }}>fam</Text>
            <Text style={{ color: colors.text }}>pad</Text>
          </Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>{t('desktop.tagline')}</Text>
        </View>
      </View>

      <PanelSectionLabel label={t('desktop.watchSection')} />
      <VideoIntroCard />

      <PanelSectionLabel label={t('desktop.whySection')} />
      {DESKTOP_BENEFITS.map((b) => (
        <BenefitRow key={b.titleKey} icon={b.icon} title={t(b.titleKey)} text={t(b.textKey)} />
      ))}

      <PanelSectionLabel label={t('desktop.pricingSection')} />
      <PricingCard />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
    paddingBottom: 24,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  brandText: {
    flex: 1,
  },
  wordmark: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  tagline: {
    fontSize: 12.5,
    lineHeight: 17,
    marginTop: 2,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 5,
  },
  benefitIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitIconText: {
    fontSize: 13,
  },
  benefitBody: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  benefitText: {
    fontSize: 12.5,
    lineHeight: 17,
    marginTop: 1,
  },
});
