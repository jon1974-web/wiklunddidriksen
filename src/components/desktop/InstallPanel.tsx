import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { PanelSectionLabel } from './PanelSectionLabel';
import { BRAND_COLORS } from '../../constants/marketing';

const StepRow: React.FC<{ n: number; text: string }> = ({ n, text }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepNum}>
        <Text style={styles.stepNumText}>{n}</Text>
      </View>
      <Text style={[styles.stepText, { color: colors.textSecondary }]}>{text}</Text>
    </View>
  );
};

export const InstallPanel: React.FC<{ showHeader?: boolean; horizontal?: boolean }> = ({ showHeader = true, horizontal = false }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={horizontal ? styles.horizontalWrap : undefined}>
      {showHeader && !horizontal && <PanelSectionLabel label={t('desktop.installSection')} />}

      <View style={[styles.osCard, horizontal && styles.horizontalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.osHead}>
          <Text style={styles.osIcon}>🍎</Text>
          <Text style={[styles.osName, { color: colors.text }]}>{t('desktop.osApple')}</Text>
        </View>
        <StepRow n={1} text={t('desktop.iosStep1')} />
        <StepRow n={2} text={t('desktop.iosStep2')} />
        <StepRow n={3} text={t('desktop.iosStep3')} />
      </View>

      <View style={[styles.osCard, horizontal ? styles.horizontalCard : styles.osCardGap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.osHead}>
          <Text style={styles.osIcon}>🤖</Text>
          <Text style={[styles.osName, { color: colors.text }]}>{t('desktop.osAndroid')}</Text>
        </View>
        <StepRow n={1} text={t('desktop.androidStep1')} />
        <StepRow n={2} text={t('desktop.androidStep2')} />
        <StepRow n={3} text={t('desktop.androidStep3')} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  osCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  osCardGap: {
    marginTop: 12,
  },
  horizontalWrap: {
    flexDirection: 'row',
    gap: 12,
  },
  horizontalCard: {
    flex: 1,
  },
  osHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 4,
  },
  osIcon: {
    fontSize: 14,
  },
  osName: {
    fontSize: 13,
    fontWeight: '700',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 5,
  },
  stepNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: BRAND_COLORS.blueDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumText: {
    color: '#fff',
    fontSize: 10.5,
    fontWeight: '800',
  },
  stepText: {
    fontSize: 12.5,
    lineHeight: 18,
    flex: 1,
  },
});
