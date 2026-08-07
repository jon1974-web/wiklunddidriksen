import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { SpondEvent, SpondRespondent } from '../types';
import { SpondResponseModal } from '../components/SpondResponseModal';
import { changeSpondResponse } from '../services/spondService';
import { useTheme } from '../theme/ThemeContext';
import { formatDate, formatSpondTimestamp, formatSpondDate } from '../utils/dateUtils';
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

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
        <Text style={{ color: colors.accent, fontSize: 18 }}>←</Text>
      </TouchableOpacity>

      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.titleRow}>
          {groupLogo ? (
            <Image source={{ uri: groupLogo }} style={styles.groupLogo} />
          ) : (
            <Text style={styles.groupIcon}>🏟️</Text>
          )}
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={3}>{event.heading}</Text>
        </View>

        {event.description && (
          <Text style={[styles.description, { color: colors.textSecondary }]}>{event.description}</Text>
        )}

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>📅 Dato</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>{dateText}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>🕐 Tid</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>{timeText}</Text>
        </View>

        {event.groupName && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>👥 Lag</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{event.groupName}</Text>
          </View>
        )}

        {event.address && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>📍 Adresse</Text>
            <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={2}>{event.address}</Text>
          </View>
        )}
      </View>

      {event.address && mapUrl && (
        <TouchableOpacity
          style={[styles.mapContainer, { backgroundColor: colors.surface }]}
          onPress={() => Linking.openURL(getGoogleMapsUrl(event.address!))}
        >
          <Image source={{ uri: mapUrl }} style={styles.mapImage} />
          <Text style={[styles.mapLabel, { color: colors.accent }]}>Åpne i Google Maps →</Text>
        </TouchableOpacity>
      )}

      {stampStatus && (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>📋 Status</Text>

          {acceptedNames.length > 0 && (
            <View style={styles.statusSection}>
              <Text style={[styles.statusHeader, { color: '#4CAF50' }]}>✓ Akseptert ({acceptedNames.length})</Text>
              {acceptedNames.map((d, i) => (
                <Text key={i} style={[styles.statusName, { color: colors.text }]}>{d.name}</Text>
              ))}
            </View>
          )}

          {declinedNames.length > 0 && (
            <View style={styles.statusSection}>
              <Text style={[styles.statusHeader, { color: '#E53935' }]}>✕ Avslått ({declinedNames.length})</Text>
              {declinedNames.map((d, i) => (
                <Text key={i} style={[styles.statusName, { color: colors.text }]}>{d.name}</Text>
              ))}
            </View>
          )}

          {unansweredNames.length > 0 && (
            <View style={styles.statusSection}>
              <Text style={[styles.statusHeader, { color: '#C8A96E' }]}>? Ikke svart ({unansweredNames.length})</Text>
              {unansweredNames.map((d, i) => (
                <Text key={i} style={[styles.statusName, { color: colors.text }]}>{d.name}</Text>
              ))}
            </View>
          )}
        </View>
      )}

      {event.groupId && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.acceptButton, { backgroundColor: colors.accent }]}
            onPress={() => setResponseModal({ type: 'accept' })}
          >
            <Text style={styles.acceptButtonText}>✓ Aksepter</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.declineButton, { borderColor: colors.danger }]}
            onPress={() => setResponseModal({ type: 'decline' })}
          >
            <Text style={[styles.declineButtonText, { color: colors.danger }]}>✕ Avslå</Text>
          </TouchableOpacity>
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
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  groupLogo: { width: 40, height: 40, borderRadius: 8 },
  groupIcon: { fontSize: 40 },
  title: { fontSize: 22, fontWeight: 'bold', flex: 1 },
  description: { fontSize: 16, lineHeight: 22, marginBottom: 16 },
  divider: { height: 1, marginBottom: 16 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  detailLabel: { fontSize: 14, flex: 1 },
  detailValue: { fontSize: 14, fontWeight: '500', flex: 2, textAlign: 'right' },
  mapContainer: { borderRadius: 12, overflow: 'hidden', marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  mapImage: { width: '100%', height: 200 },
  mapLabel: { fontSize: 14, fontWeight: '600', textAlign: 'center', padding: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  statusSection: { marginBottom: 12 },
  statusHeader: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  statusName: { fontSize: 14, marginLeft: 8, marginBottom: 2 },
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  acceptButton: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center' },
  acceptButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  declineButton: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 2, backgroundColor: 'transparent' },
  declineButtonText: { fontSize: 16, fontWeight: '600' },
});
