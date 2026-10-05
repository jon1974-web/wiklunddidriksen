import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { INTRO_VIDEO } from '../../constants/marketing';

export const VideoIntroCard: React.FC<{ grow?: boolean }> = ({ grow = false }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={grow && styles.growRoot}>
      <View style={[styles.card, grow ? styles.growCard : styles.fixedCard]}>
        <View style={styles.play}>
          <Text style={styles.playIcon}>▶</Text>
        </View>
        <Text style={styles.hint} numberOfLines={1}>
          {t('desktop.videoTitle')}
        </Text>
        <View style={styles.dur}>
          <Text style={styles.durText}>{INTRO_VIDEO.duration}</Text>
        </View>
      </View>
      <Text style={[styles.caption, { color: colors.textSecondary }]} numberOfLines={2}>
        {t('desktop.videoCaption')}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  growRoot: {
    flex: 1,
  },
  growCard: {
    flex: 1,
  },
  fixedCard: {
    aspectRatio: 16 / 9,
  },
  card: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#2D485E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  play: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    color: '#fff',
    fontSize: 20,
    marginLeft: 3,
  },
  hint: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    maxWidth: '60%',
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  dur: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  durText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  caption: {
    fontSize: 12.5,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 6,
  },
});
