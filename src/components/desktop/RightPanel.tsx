import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { InstallPanel } from './InstallPanel';
import { AppGuidePanel } from './AppGuidePanel';
import { CollapsibleSection } from './CollapsibleSection';
import { PanelSectionLabel } from './PanelSectionLabel';
import { AdSlot } from '../ads/AdSlot';

export const RightPanel: React.FC = () => {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <CollapsibleSection title={t('desktop.installSection')} storageKey="install">
        <InstallPanel showHeader={false} />
      </CollapsibleSection>

      <CollapsibleSection title={t('desktop.guideSection')} storageKey="guide">
        <AppGuidePanel />
      </CollapsibleSection>

      <PanelSectionLabel label={t('desktop.adSection')} />
      <AdSlot />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 14,
    paddingBottom: 24,
  },
});
