import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { PanelSectionLabel } from './PanelSectionLabel';
import { GUIDE_SPACES, guideSpaceNameKey, guideSpaceHintKey } from '../../constants/marketing';

export const AppGuidePanel: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View>
      <PanelSectionLabel label={t('desktop.guideSection')} />
      <View style={styles.bento}>
        {GUIDE_SPACES.map((space) => (
          <View
            key={space.key}
            style={[styles.tile, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={[styles.tileIcon, { backgroundColor: space.colorBg }]}>
              <Text style={styles.tileIconText}>{space.icon}</Text>
            </View>
            <Text style={[styles.tileName, { color: colors.text }]}>{t(guideSpaceNameKey(space))}</Text>
            <Text style={[styles.tileHint, { color: colors.textSecondary }]} numberOfLines={2}>
              {t(guideSpaceHintKey(space))}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bento: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tile: {
    flexBasis: '48%',
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 11,
    alignItems: 'flex-start',
  },
  tileIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  tileIconText: {
    fontSize: 13,
  },
  tileName: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  tileHint: {
    fontSize: 10.5,
    lineHeight: 14,
  },
});
