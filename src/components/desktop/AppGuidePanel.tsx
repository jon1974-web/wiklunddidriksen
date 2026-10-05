import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { AppIcon } from '../AppIcon';
import { GUIDE_TILES } from '../../constants/marketing';

export const AppGuidePanel: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View>
      <View style={styles.grid}>
        {GUIDE_TILES.map((tile) => (
          <View key={tile.titleKey} style={[styles.tile, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.tileIcon, { backgroundColor: tile.tint }]}>
              <AppIcon name={tile.icon} size={16} color={tile.color} />
            </View>
            <Text style={[styles.tileName, { color: colors.text }]}>{t(tile.titleKey)}</Text>
            <Text style={[styles.tileHint, { color: colors.textSecondary }]} numberOfLines={2}>
              {t(tile.hintKey)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tile: {
    flexBasis: '48%',
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    alignItems: 'flex-start',
  },
  tileIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  tileName: {
    fontSize: 11.5,
    fontWeight: '700',
    marginBottom: 2,
  },
  tileHint: {
    fontSize: 10,
    lineHeight: 13,
  },
});
