import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { SpondEvent, SpondRespondent } from '../types';
import { SpondResponseModal } from '../components/SpondResponseModal';
import { changeSpondResponse } from '../services/spondService';
import { useTheme } from '../theme/ThemeContext';
import { formatSpondTimestamp, formatSpondDate } from '../utils/dateUtils';
import { getEventRespondents, getModalRespondents, getSpondStampStatus } from './EventsScreen';
import { getStaticMapUrl, getGoogleMapsUrl } from '../utils/maps';

interface SpondEventDetailParams {
  event: SpondEvent;
  spondRespondents: SpondRespondent[];
  spondConfig: { email: string; password: string } | null;
  groupLogos?: Record<string, string>;
}

export const SpondEventDetailScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const { event, spondRespondents, spondConfig, groupLogos = {} } = route.params as SpondEventDetailParams;
  const { colors } = useTheme();
  const [responseModal, setResponseModal] = useState<{ type: 'accept' | 'decline' } | null>(null);
  const [showFullNote, setShowFullNote] = useState(false);

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
          <View style={{ width: 52, borderRadius: 12, overflow: 'hidden', flexShrink: 0, backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 }}>
            <View style={{ height: 14, backgroundColor: '#E53935', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 8, fontWeight: '700', color: '#fff' }}>{dayName}</Text>
            </View>
            <Text style={{ fontSize: 22, fontWeight: '800', textAlign: 'center', lineHeight: 26, marginTop: 1, color: colors.text }}>{dayNum}</Text>
            <Text style={{ fontSize: 9, fontWeight: '700', textAlign: 'center', textTransform: 'uppercase', color: colors.textSecondary, marginBottom: 2 }}>{monthStr}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }} numberOfLines={3}>{event.heading}</Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#333', marginTop: 2 }}>{timeText}</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
              <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, backgroundColor: '#FFEBEE' }}>
                <Text style={{ fontSize: 10, fontWeight: '600', color: '#E53935' }}>Spond</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Detail card */}
      <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: '#E53935', backgroundColor: colors.surface }]}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#E53935', marginBottom: 8 }}>Detaljer</Text>
        {event.address && (
          <View style={styles.viewDetailRow}>
            <Text style={[styles.viewDetailLabel, { color: colors.textSecondary }]}>📍</Text>
            <Text style={[styles.viewDetailValue, { color: colors.text }]} numberOfLines={2}>{event.address}</Text>
          </View>
        )}
        {event.groupName && (
          <View style={styles.viewDetailRow}>
            <Text style={[styles.viewDetailLabel, { color: colors.textSecondary }]}>👥</Text>
            <Text style={[styles.viewDetailValue, { color: colors.text }]}>{event.groupName}</Text>
          </View>
        )}
        {event.description && (
          <View style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Text style={{ fontSize: 14 }}>📝</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#E53935' }}>Notat</Text>
            </View>
            <View style={{ paddingLeft: 22 }}>
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
          <TouchableOpacity onPress={() => Linking.openURL(getGoogleMapsUrl(event.address!))} style={{ width: '100%', height: 140, backgroundColor: '#FFEBEE', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6 }}>
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
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              style={[styles.responseButton, { backgroundColor: colors.accent, flex: 1 }]}
              onPress={() => setResponseModal({ type: 'accept' })}
            >
              <Text style={styles.responseButtonText}>✓ Aksepter</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.responseButton, { borderColor: '#E53935', borderWidth: 2, backgroundColor: 'transparent', flex: 1 }]}
              onPress={() => setResponseModal({ type: 'decline' })}
            >
              <Text style={[styles.responseButtonText, { color: '#E53935' }]}>✕ Avslå</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Svar fra alle */}
      {stampStatus && (
        <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: '#E53935', backgroundColor: colors.surface }]}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#E53935', marginBottom: 8 }}>Svar fra alle</Text>
          <View style={{ flexDirection: 'row', gap: 16, marginBottom: 12 }}>
            {acceptedNames.length > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 22, fontWeight: '800', color: '#4CAF50' }}>{acceptedNames.length}</Text>
                <Text style={{ fontSize: 12, color: '#4CAF50', fontWeight: '600' }}>Ja</Text>
              </View>
            )}
            {declinedNames.length > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 22, fontWeight: '800', color: '#E53935' }}>{declinedNames.length}</Text>
                <Text style={{ fontSize: 12, color: '#E53935', fontWeight: '600' }}>Nei</Text>
              </View>
            )}
            {unansweredNames.length > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 22, fontWeight: '800', color: '#C8A96E' }}>{unansweredNames.length}</Text>
                <Text style={{ fontSize: 12, color: '#C8A96E', fontWeight: '600' }}>Vent</Text>
              </View>
            )}
          </View>

          {acceptedNames.length > 0 && (
            <View style={{ marginBottom: 8 }}>
              {acceptedNames.map((d, i) => (
                <Text key={i} style={{ fontSize: 13, color: '#4CAF50', marginLeft: 4, marginBottom: 2 }}>✓ {d.name}</Text>
              ))}
            </View>
          )}
          {declinedNames.length > 0 && (
            <View style={{ marginBottom: 8 }}>
              {declinedNames.map((d, i) => (
                <Text key={i} style={{ fontSize: 13, color: '#E53935', marginLeft: 4, marginBottom: 2 }}>✕ {d.name}</Text>
              ))}
            </View>
          )}
          {unansweredNames.length > 0 && (
            <View>
              {unansweredNames.map((d, i) => (
                <Text key={i} style={{ fontSize: 13, color: '#C8A96E', marginLeft: 4, marginBottom: 2 }}>? {d.name}</Text>
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
  viewDetailRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 8 },
  viewDetailLabel: { fontSize: 16, width: 24, textAlign: 'center' },
  viewDetailValue: { fontSize: 14, flex: 1 },
  responseButton: { padding: 16, borderRadius: 12, alignItems: 'center' },
  responseButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
