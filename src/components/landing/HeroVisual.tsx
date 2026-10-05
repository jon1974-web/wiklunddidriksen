import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { AppIcon } from '../AppIcon';
import { BRAND, LANDING_SAMPLES, LandingSample } from '../../constants/marketing';
import { getStaticMapUrl } from '../../utils/maps';

const SAMPLE_CARD: React.FC<{ sample: LandingSample }> = ({ sample }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const typeColor = sample.color || colors.accent;

  const isBirthday = sample.type === 'birthday';

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderLeftColor: typeColor }]}>
      <View style={styles.row}>
        <View style={[styles.cal, { backgroundColor: colors.surface }]}>
          <View style={[styles.calTop, { backgroundColor: typeColor }]}>
            <Text style={styles.calWeekday}>{t(sample.weekdayKey)}</Text>
          </View>
          <Text style={[styles.calDay, { color: colors.text }]}>{sample.day}</Text>
          <Text style={[styles.calMonth, { color: colors.textSecondary }]}>{sample.month}</Text>
        </View>

        <View style={styles.mid}>
          <View style={styles.titleRow}>
            <AppIcon name={sample.icon} size={16} color={isBirthday ? typeColor : colors.accent} />
            <Text
              style={[styles.title, { color: isBirthday ? typeColor : colors.text }]}
              numberOfLines={1}
            >
              {t(sample.titleKey)}
            </Text>
          </View>

          {isBirthday ? (
            <>
              <View style={styles.nameRow}>
                <AppIcon name="person" size={14} color={typeColor} />
                <Text style={[styles.birthdayName, { color: colors.text }]}>{t(sample.nameKey!)}</Text>
              </View>
              <View style={styles.ageRow}>
                <AppIcon name="birthday" size={12} color={typeColor} />
                <Text style={[styles.age, { color: colors.textSecondary }]}>{t(sample.ageKey!)}</Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.timeRow}>
                <View style={styles.clock}>
                  <View style={styles.clockHandV} />
                  <View style={styles.clockHandH} />
                </View>
                <Text style={[styles.time, { color: colors.text }]}>{t(sample.timeKey!)}</Text>
              </View>
              <Text style={[styles.address, { color: colors.accent }]} numberOfLines={1}>
                📍 {t(sample.addressKey!)}
              </Text>
            </>
          )}
        </View>

        {sample.addressKey && (
          <Image
            source={{ uri: getStaticMapUrl(t(sample.addressKey)) }}
            style={styles.map}
          />
        )}
      </View>
    </View>
  );
};

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
      <View style={[styles.body, { backgroundColor: colors.background }]}>
        {LANDING_SAMPLES.map((sample) => (
          <SAMPLE_CARD key={sample.titleKey} sample={sample} />
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
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 4,
  },
  card: {
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  cal: {
    width: 64,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    flexShrink: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  calTop: {
    width: '100%',
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calWeekday: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  calDay: {
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 30,
    marginTop: 2,
  },
  calMonth: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  mid: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    flex: 1,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  clock: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#999',
  },
  clockHandV: {
    position: 'absolute',
    width: 1.5,
    height: 3.5,
    backgroundColor: '#999',
    left: 4.75,
    top: 2,
    borderRadius: 1,
  },
  clockHandH: {
    position: 'absolute',
    width: 3,
    height: 1.5,
    backgroundColor: '#999',
    left: 4,
    top: 5.5,
    borderRadius: 1,
  },
  time: {
    fontSize: 15,
    fontWeight: '700',
  },
  address: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  birthdayName: {
    fontSize: 15,
    fontWeight: '700',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  ageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  age: {
    fontSize: 15,
    fontWeight: '700',
  },
  map: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginLeft: 4,
  },
});
