import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { InstallPanel } from './InstallPanel';
import { AppGuidePanel } from './AppGuidePanel';
import { PanelSectionLabel } from './PanelSectionLabel';
import { AdSlot } from '../ads/AdSlot';

export const RightPanel: React.FC = () => {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <InstallPanel />
      <AppGuidePanel />
      <PanelSectionLabel label={t('desktop.adSection')} />
      <AdSlot />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 18,
    paddingBottom: 24,
  },
});
