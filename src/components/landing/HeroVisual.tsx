import React from 'react';
import { View, Text, Image, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { AppIcon } from '../AppIcon';
import { TabIcon } from '../CustomTabBar';
import { BRAND, LANDING_SAMPLES, LandingSample } from '../../constants/marketing';
import { getStaticMapUrl } from '../../utils/maps';

const HERO_TABS = [
  { name: 'events', labelKey: 'tabs.events', icon: 'calendar' as const, active: true },
  { name: 'chat', labelKey: 'spaces.chat', icon: 'chat' as const, active: false },
  { name: 'trips', labelKey: 'tabs.trips', icon: 'house' as const, active: false },
];

const SAMPLE_CARD: React.FC<{ sample: LandingSample }> = ({ sample }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const typeColor = sample.color || colors.accent;
  const isBirthday = sample.type === 'birthday';

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderLeftColor: typeColor }]}>
      <View style={styles.row}>
        <View style={[styles.cal, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, shadowOpacity: 0 }]}>
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

export const HeroVisual: React.FC<{ style?: StyleProp<ViewStyle> }> = ({ style }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={styles.growRoot}>
      <View style={[styles.frame, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 26 }, style]}>
        <View style={[styles.urlBar, { borderBottomColor: colors.border }]}>
        <View style={styles.dots}>
          <View style={[styles.dot, { backgroundColor: colors.border }]} />
          <View style={[styles.dot, { backgroundColor: colors.border }]} />
          <View style={[styles.dot, { backgroundColor: colors.border }]} />
        </View>
        <View style={[styles.urlPill, { backgroundColor: colors.background }]}>
          <Text style={[styles.urlText, { color: colors.textSecondary }]}>{BRAND.domain}</Text>
        </View>
        <View style={styles.dots}>
          <View style={{ width: 26 }} />
        </View>
      </View>

      <View style={[styles.topbar, { borderBottomColor: colors.border }]}>
        <View style={styles.topTabs}>
          {HERO_TABS.map((tab) => (
            <View key={tab.name} style={[styles.topTab, tab.active && { backgroundColor: 'rgba(59, 90, 117, 0.12)' }]}>
              <TabIcon icon={tab.icon} focused={tab.active} accentColor={colors.accent} />
              <Text style={[styles.topTabLabel, { color: tab.active ? colors.accent : colors.textSecondary }]}>
                {t(tab.labelKey)}
              </Text>
            </View>
          ))}
        </View>
        <View style={styles.topbarRight}>
          <View style={[styles.nyBtn, { backgroundColor: colors.accent }]}>
            <Text style={styles.nyText}>+ {t('common.newShort')}</Text>
          </View>
          <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
            <Text style={styles.avatarText}>J</Text>
          </View>
        </View>
      </View>

      <View style={[styles.body, { backgroundColor: colors.surface }]}>
        {LANDING_SAMPLES.map((sample) => (
          <SAMPLE_CARD key={sample.titleKey} sample={sample} />
        ))}
      </View>
      </View>
      <Text style={[styles.caption, { color: colors.textSecondary }]} numberOfLines={2}>
        {t('desktop.visualCaption')}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  growRoot: {
    flex: 1,
  },
  caption: {
    fontSize: 12.5,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 6,
  },
  frame: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  urlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderBottomWidth: 1,
    gap: 8,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  urlPill: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 999,
    paddingVertical: 3,
    marginHorizontal: 8,
  },
  urlText: {
    fontSize: 11,
    fontWeight: '600',
  },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomWidth: 1,
  },
  topTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  topTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  topTabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  topbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginLeft: 'auto',
  },
  nyBtn: {
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  nyText: {
    color: '#fff',
    fontSize: 10.5,
    fontWeight: '700',
  },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  body: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 5,
    flexGrow: 1,
  },
  card: {
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 12,
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
    width: 50,
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
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calWeekday: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  calDay: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 24,
    marginTop: 1,
  },
  calMonth: {
    fontSize: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
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
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 19,
    flex: 1,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  clock: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#999',
  },
  clockHandV: {
    position: 'absolute',
    width: 1.5,
    height: 3,
    backgroundColor: '#999',
    left: 3.75,
    top: 1.5,
    borderRadius: 1,
  },
  clockHandH: {
    position: 'absolute',
    width: 2.5,
    height: 1.5,
    backgroundColor: '#999',
    left: 3,
    top: 4.5,
    borderRadius: 1,
  },
  time: {
    fontSize: 13,
    fontWeight: '700',
  },
  address: {
    fontSize: 11.5,
    fontWeight: '500',
    marginTop: 2,
  },
  birthdayName: {
    fontSize: 13,
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
    fontSize: 13,
    fontWeight: '700',
  },
  map: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginLeft: 4,
  },
});
