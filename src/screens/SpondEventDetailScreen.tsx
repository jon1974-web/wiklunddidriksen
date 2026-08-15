import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { SpondEvent, SpondRespondent, SpondGroupMember } from '../types';
import { SpondResponseModal } from '../components/SpondResponseModal';
import { changeSpondResponse, getSpondMembers } from '../services/spondService';
import { useTheme } from '../theme/ThemeContext';
import { formatSpondTimestamp, formatSpondDate } from '../utils/dateUtils';
import { getEventRespondents, getModalRespondents, getSpondStampStatus } from './EventsScreen';
import { getStaticMapUrl, getGoogleMapsUrl } from '../utils/maps';

interface SpondEventDetailParams {
  event: SpondEvent;
  spondRespondents: SpondRespondent[];
  spondConfig: { email: string; password: string } | null;
  groupLogos?: Record<string, string>;
  spondAllMembers?: SpondGroupMember[];
}

export const SpondEventDetailScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const { event, spondRespondents, spondConfig, groupLogos = {}, spondAllMembers = [] } = route.params as SpondEventDetailParams;
  const { colors } = useTheme();
  const [responseModal, setResponseModal] = useState<{ type: 'accept' | 'decline' } | null>(null);
  const [showFullNote, setShowFullNote] = useState(false);
  const [expandedResponse, setExpandedResponse] = useState<'accepted' | 'declined' | 'unanswered' | null>(null);
  const [localMembers, setLocalMembers] = useState<SpondGroupMember[]>([]);

  useEffect(() => {
    if (spondAllMembers.length > 0 || !event.groupId || !spondConfig) return;
    let cancelled = false;
    (async () => {
      try {
        const members = await getSpondMembers(spondConfig.email, spondConfig.password, event.groupId);
        if (!cancelled) {
          setLocalMembers(members.map((m) => ({ ...m, groupId: event.groupId!, groupName: event.groupName || '' })));
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [spondAllMembers, event.groupId, event.groupName, spondConfig]);

  const dateText = useMemo(() => {
    const startStr = formatSpondDate(event.startTimestamp);
    const endStr = event.endTimestamp ? formatSpondDate(event.endTimestamp) : null;
    return endStr && startStr !== endStr ? `${startStr} – ${endStr}` : startStr;
  }, [event.startTimestamp, event.endTimestamp]);

  const timeText = useMemo(() => {
    const startTime = formatSpondTimestamp(event.startTimestamp);
    const endTime = event.endTimestamp ? formatSpondTimestamp(event.endTimestamp) : null;
    return endTime ? `${startTime} – ${endTime}` : startTime;
  }, [event.startTimestamp, event.endTimestamp]);

  const eventRespondents = useMemo(() => getEventRespondents(event, spondRespondents), [event, spondRespondents]);
  const stampStatus = useMemo(() => getSpondStampStatus(event, spondRespondents), [event, spondRespondents]);

  const mapUrl = useMemo(() => event.address ? getStaticMapUrl(event.address, 15, '600x300') : null, [event.address]);

  const groupLogo = useMemo(() => event.groupName ? groupLogos[event.groupName] : undefined, [event.groupName, groupLogos]);

  const handleSendResponse = useCallback(async (memberIds: string[]) => {
    if (!responseModal || !spondConfig) return;
    const accepted = responseModal.type === 'accept';
    for (const memberId of memberIds) {
      try {
        await changeSpondResponse(spondConfig.email, spondConfig.password, event.id, memberId, accepted);
      } catch {
        // Continue with next member
      }
    }
    setResponseModal(null);
  }, [responseModal, spondConfig, event.id]);

  const acceptedNames = useMemo(() => stampStatus?.details.filter((d) => d.status === 'accepted') || [], [stampStatus]);
  const declinedNames = useMemo(() => stampStatus?.details.filter((d) => d.status === 'declined') || [], [stampStatus]);
  const unansweredNames = useMemo(() => stampStatus?.details.filter((d) => d.status === 'unanswered') || [], [stampStatus]);

  const allMembers = useMemo(() => {
    if (spondAllMembers.length > 0) return spondAllMembers;
    return localMembers;
  }, [spondAllMembers, localMembers]);

  const resolveNames = useCallback((ids: string[]) => {
    return ids.map((id) => {
      const idStr = String(id);
      const member = allMembers.find((m) => String(m.id) === idStr || String(m.profileId) === idStr || String(m.childId) === idStr);
      if (member) return `${member.firstName} ${member.lastName}`;
      const respondent = spondRespondents.find((r) => String(r.spondId) === idStr || String(r.profileId) === idStr || String(r.childId) === idStr);
      if (respondent) return `${respondent.firstName} ${respondent.lastName}`;
      return id;
    });
  }, [allMembers, spondRespondents]);

  const acceptedAllNames = useMemo(() => resolveNames(event.responses?.acceptedIds || []), [resolveNames, event.responses]);
  const declinedAllNames = useMemo(() => resolveNames(event.responses?.declinedIds || []), [resolveNames, event.responses]);
  const unansweredAllNames = useMemo(() => resolveNames(event.responses?.unansweredIds || []), [resolveNames, event.responses]);

  const myStatus = useMemo(() => {
    if (!event.responses) return null;
    for (const r of spondRespondents) {
      const ids = [r.spondId, r.profileId, r.childId].filter(Boolean);
      if (ids.some((id) => event.responses!.acceptedIds?.includes(id))) return 'accepted';
      if (ids.some((id) => event.responses!.declinedIds?.includes(id))) return 'declined';
      if (ids.some((id) => event.responses!.unansweredIds?.includes(id))) return 'unanswered';
    }
    return null;
  }, [event.responses, spondRespondents]);

  const modalMembers = useMemo(() =>
    getModalRespondents(event, spondRespondents)
      .map((r) => ({ id: r.spondId, firstName: r.firstName, lastName: r.lastName })),
    [event, spondRespondents]
  );

  const d = event.startTimestamp ? new Date(event.startTimestamp) : null;
  const DAY_NAMES = ['SØN', 'MAN', 'TIR', 'ONS', 'TOR', 'FRE', 'LØR'];
  const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAI', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DES'];
  const dayName = d ? DAY_NAMES[d.getDay()] : '';
  const dayNum = d ? d.getDate() : '';
  const monthStr = d ? MONTHS[d.getMonth()] : '';

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
        <Text style={{ color: colors.accent, fontSize: 18 }}>←</Text>
      </TouchableOpacity>

      {/* Top card with calendar icon */}
      <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: '#E53935', backgroundColor: colors.surface }]}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
          <View style={{ width: 64, borderRadius: 12, overflow: 'hidden', flexShrink: 0, backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 }}>
            <View style={{ height: 16, backgroundColor: '#E53935', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 9, fontWeight: '700', color: '#fff' }}>{dayName}</Text>
            </View>
            <Text style={{ fontSize: 26, fontWeight: '800', textAlign: 'center', lineHeight: 30, marginTop: 2, color: colors.text }}>{dayNum}</Text>
            <Text style={{ fontSize: 10, fontWeight: '700', textAlign: 'center', textTransform: 'uppercase', color: colors.textSecondary, marginBottom: 4 }}>{monthStr}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }} numberOfLines={3}>{event.heading}</Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#333', marginTop: 2 }}>{timeText}</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: '#E53935' }}>
                {groupLogo ? (
                  <Image source={{ uri: groupLogo }} style={{ width: 14, height: 14, borderRadius: 7 }} />
                ) : (
                  <Text style={{ fontSize: 11 }}>⚽</Text>
                )}
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#fff' }}>Spond</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Detail card */}
      <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: '#E53935', backgroundColor: colors.surface }]}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#E53935', marginBottom: 8 }}>Detaljer</Text>
        {myStatus && (
          <View style={styles.viewDetailRow}>
            <Text style={[styles.viewDetailLabel, { color: colors.textSecondary }]}>📋</Text>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: myStatus === 'accepted' ? '#E8F5E9' : myStatus === 'declined' ? '#FFEBEE' : '#FFF8E1' }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: myStatus === 'accepted' ? '#43A047' : myStatus === 'declined' ? '#E53935' : '#F9A825' }}>
                  {myStatus === 'accepted' ? 'Akseptert' : myStatus === 'declined' ? 'Avslått' : 'Ikke svart'}
                </Text>
              </View>
            </View>
          </View>
        )}
        {event.address && (
          <View style={styles.viewDetailRow}>
            <Text style={[styles.viewDetailLabel, { color: colors.textSecondary }]}>📍</Text>
            <Text style={[styles.viewDetailValue, { color: colors.text }]} numberOfLines={2}>{event.address}</Text>
          </View>
        )}
        {event.groupName && (
          <View style={styles.viewDetailRow}>
            <View style={{ width: 24, alignItems: 'center', justifyContent: 'center' }}>
              {groupLogo ? (
                <Image source={{ uri: groupLogo }} style={styles.groupLogo} />
              ) : (
                <Text style={[styles.viewDetailLabel, { color: colors.textSecondary, width: 'auto' }]}>👥</Text>
              )}
            </View>
            <Text style={[styles.viewDetailValue, { color: colors.textSecondary }]} numberOfLines={1}>{event.groupName}</Text>
          </View>
        )}
        {event.description && (
          <View style={styles.viewDetailRow}>
            <Text style={[styles.viewDetailLabel, { color: colors.textSecondary }]}>📝</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, color: colors.text }} numberOfLines={showFullNote ? undefined : 2}>
                {event.description}
              </Text>
              {event.description.length > 60 && (
                <TouchableOpacity onPress={() => setShowFullNote(!showFullNote)}>
                  <Text style={{ fontSize: 12, color: '#E53935', fontWeight: '600', marginTop: 4 }}>
                    {showFullNote ? 'Vis mindre' : 'Les mer'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Map */}
      {event.address && mapUrl && (
        <View style={[styles.card, { padding: 0, overflow: 'hidden', borderLeftWidth: 4, borderLeftColor: '#E53935', backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={() => Linking.openURL(getGoogleMapsUrl(event.address!))} style={{ width: '100%', height: 140 }}>
            <Image source={{ uri: mapUrl }} style={{ width: '100%', height: 140, borderRadius: 0 }} resizeMode="cover" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Linking.openURL(getGoogleMapsUrl(event.address!))} style={{ padding: 12, alignItems: 'center' }}>
            <Text style={{ fontSize: 12, color: '#E53935', fontWeight: '600' }}>Åpne i Google Maps →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Din status */}
      {stampStatus && event.groupId && (
        <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: '#E53935', backgroundColor: colors.surface }]}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#E53935', marginBottom: 8 }}>Din status</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={[styles.responseButton, { backgroundColor: '#43A047', flex: 1 }]}
              onPress={() => setResponseModal({ type: 'accept' })}
            >
              <Text style={styles.responseButtonText}>✓ Aksepter</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.responseButton, { backgroundColor: '#E53935', flex: 1 }]}
              onPress={() => setResponseModal({ type: 'decline' })}
            >
              <Text style={styles.responseButtonText}>✕ Avslå</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Svar fra alle */}
      {stampStatus && (
        <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: '#E53935', backgroundColor: colors.surface }]}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#E53935', marginBottom: 8 }}>Svar fra alle {event.groupName ? `— ${event.groupName}` : ''}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: '#43A047', borderRadius: 10, padding: 10, alignItems: 'center' }}
              onPress={() => setExpandedResponse(expandedResponse === 'accepted' ? null : 'accepted')}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>{event.responses?.acceptedIds?.length || 0} Ja</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: '#E53935', borderRadius: 10, padding: 10, alignItems: 'center' }}
              onPress={() => setExpandedResponse(expandedResponse === 'declined' ? null : 'declined')}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>{event.responses?.declinedIds?.length || 0} Nei</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: '#f0f0f0', borderRadius: 10, padding: 10, alignItems: 'center' }}
              onPress={() => setExpandedResponse(expandedResponse === 'unanswered' ? null : 'unanswered')}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#333' }}>{event.responses?.unansweredIds?.length || 0} Vent</Text>
            </TouchableOpacity>
          </View>
          {expandedResponse === 'accepted' && acceptedAllNames.length > 0 && (
            <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0' }}>
              {acceptedAllNames.map((name, i) => (
                <Text key={i} style={{ fontSize: 13, color: '#43A047', paddingVertical: 2 }}>✓ {name}</Text>
              ))}
            </View>
          )}
          {expandedResponse === 'declined' && declinedAllNames.length > 0 && (
            <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0' }}>
              {declinedAllNames.map((name, i) => (
                <Text key={i} style={{ fontSize: 13, color: '#E53935', paddingVertical: 2 }}>✕ {name}</Text>
              ))}
            </View>
          )}
          {expandedResponse === 'unanswered' && unansweredAllNames.length > 0 && (
            <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0' }}>
              {unansweredAllNames.map((name, i) => (
                <Text key={i} style={{ fontSize: 13, color: '#C8A96E', paddingVertical: 2 }}>? {name}</Text>
              ))}
            </View>
          )}
        </View>
      )}

      {responseModal && spondConfig && (
        <SpondResponseModal
          visible={true}
          type={responseModal.type}
          members={modalMembers}
          onSend={handleSendResponse}
          onClose={() => setResponseModal(null)}
        />
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  card: { borderRadius: 12, padding: 24, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  viewDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  viewDetailLabel: { fontSize: 12, color: '#888', width: 24, textAlign: 'center' },
  viewDetailValue: { fontSize: 14, flex: 1 },
  groupLogo: { width: 18, height: 18, borderRadius: 9 },
  responseButton: { padding: 10, borderRadius: 10, alignItems: 'center' },
  responseButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
