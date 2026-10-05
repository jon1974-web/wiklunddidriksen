import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { useTheme } from '../../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { db } from '../../services/firebase';
import { useUserStore } from '../../store/userStore';
import { getFamilyMembersWithRoles } from '../../services/familyService';
import { docUrls, CONTACT_EMAIL } from '../../constants/marketing';
import { PanelSectionLabel } from './PanelSectionLabel';
import { UserProfile } from '../../types';

const ROLE_KEYS: Record<string, string> = {
  owner: 'profile.owner',
  admin: 'profile.admin',
  member: 'profile.member',
};

const localToday = (): string => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const FamilyCard: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const familyId = useUserStore((s) => s.familyId);
  const familyName = useUserStore((s) => s.familyName);
  const [members, setMembers] = useState<{ profile: UserProfile; role: string }[] | null>(null);

  useEffect(() => {
    if (!familyId) return;
    let active = true;
    getFamilyMembersWithRoles(familyId)
      .then((m) => { if (active) setMembers(m); })
      .catch(() => { if (active) setMembers([]); });
    return () => { active = false; };
  }, [familyId]);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {familyName ? (
        <Text style={[styles.familyName, { color: colors.text }]} numberOfLines={1}>{familyName}</Text>
      ) : null}
      {(members || []).map(({ profile, role }) => (
        <View key={profile.uid} style={styles.memberRow}>
          {profile.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={styles.memberAvatar} />
          ) : (
            <View style={[styles.memberAvatar, styles.memberInitial, { backgroundColor: colors.accent }]}>
              <Text style={styles.memberInitialText}>
                {(profile.displayName || '?').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={[styles.memberName, { color: colors.text }]} numberOfLines={1}>
            {profile.displayName || profile.email}
          </Text>
          <Text style={[styles.memberRole, { color: colors.textSecondary }]}>
            {t(ROLE_KEYS[role] || 'profile.member')}
          </Text>
        </View>
      ))}
    </View>
  );
};

const UpcomingPanel: React.FC = () => {
  const { t, i18n: i18nInst } = useTranslation();
  const { colors } = useTheme();
  const familyId = useUserStore((s) => s.familyId);
  const [events, setEvents] = useState<Pick<import('../../types').Event, 'id' | 'title' | 'date' | 'time'>[] | null>(null);

  useEffect(() => {
    if (!familyId) return;
    let active = true;
    const q = query(
      collection(db, 'events'),
      where('familyId', '==', familyId),
      where('date', '>=', localToday()),
      orderBy('date'),
      limit(3)
    );
    getDocs(q)
      .then((snap) => {
        if (!active) return;
        setEvents(snap.docs.map((doc) => {
          const { id, title, date, time } = doc.data() as import('../../types').Event;
          return { id, title, date, time };
        }));
      })
      .catch(() => { if (active) setEvents([]); });
    return () => { active = false; };
  }, [familyId]);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {(events || []).map((event) => (
        <View key={event.id} style={styles.upcomingRow}>
          <Text style={[styles.upcomingDate, { color: colors.accent }]}>
            {new Date(`${event.date}T12:00:00`).toLocaleDateString(i18nInst.language || 'nb', { day: 'numeric', month: 'short' })}
          </Text>
          <View style={styles.upcomingBody}>
            <Text style={[styles.upcomingTitle, { color: colors.text }]} numberOfLines={1}>{event.title}</Text>
            {event.time ? (
              <Text style={[styles.upcomingTime, { color: colors.textSecondary }]}>{event.time}</Text>
            ) : null}
          </View>
        </View>
      ))}
      {events && events.length === 0 && (
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('desktop.noUpcoming')}</Text>
      )}
    </View>
  );
};

const HelpPanel: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const lang = i18n.language || 'nb';

  const links = [
    { label: t('landing.linkContact'), url: `mailto:${CONTACT_EMAIL}` },
    { label: t('landing.linkPrivacy'), url: docUrls.privacy(lang) },
    { label: t('landing.linkTerms'), url: docUrls.terms(lang) },
  ];

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {links.map((link) => (
        <TouchableOpacity key={link.label} style={styles.helpRow} onPress={() => Linking.openURL(link.url)}>
          <Text style={[styles.helpLabel, { color: colors.text }]}>{link.label}</Text>
          <Text style={[styles.helpArrow, { color: colors.textSecondary }]}>↗</Text>
        </TouchableOpacity>
      ))}
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

      <PanelSectionLabel label={t('desktop.familyTitle')} />
      <FamilyCard />

      <PanelSectionLabel label={t('desktop.upcomingTitle')} />
      <UpcomingPanel />

      <PanelSectionLabel label={t('desktop.helpTitle')} />
      <HelpPanel />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 6,
    paddingBottom: 24,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
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
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  familyName: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 4,
  },
  memberAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  memberInitial: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInitialText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  memberName: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  memberRole: {
    fontSize: 11,
  },
  upcomingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 4,
  },
  upcomingDate: {
    fontSize: 12,
    fontWeight: '700',
    minWidth: 44,
  },
  upcomingBody: {
    flex: 1,
  },
  upcomingTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  upcomingTime: {
    fontSize: 11.5,
    marginTop: 1,
  },
  emptyText: {
    fontSize: 12,
  },
  helpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
  },
  helpLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  helpArrow: {
    fontSize: 12,
  },
});
