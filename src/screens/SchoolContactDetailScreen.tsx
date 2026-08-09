import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Platform, Linking } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { SchoolContact } from '../types';
import { getStaticMapUrl, getGoogleMapsUrl } from '../utils/maps';

interface SchoolContactDetailScreenProps {
  navigation: any;
  route: { params: { contact: SchoolContact } };
}

export const SchoolContactDetailScreen: React.FC<SchoolContactDetailScreenProps> = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { contact } = route.params;

  const mapUrl = useMemo(() => {
    return contact.address ? getStaticMapUrl(contact.address, 15, '600x300') : null;
  }, [contact.address]);

  const handleCall = (phone: string) => {
    if (phone) Linking.openURL(`tel:${phone.replace(/\s/g, '')}`);
  };

  const handleCopy = (text: string) => {
    if (text && Platform.OS === 'web') {
      navigator.clipboard.writeText(text);
    }
  };

  const handleEmail = (email: string) => {
    if (email) Linking.openURL(`mailto:${email}`);
  };

  const isTeacher = contact.role === 'teacher';

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ padding: 16 }}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { borderColor: colors.accent }]}>
        <Text style={{ color: colors.accent, fontSize: 18 }}>←</Text>
      </TouchableOpacity>

      <View style={[s.viewCard, { backgroundColor: colors.surface }]}>
        <Text style={s.viewIcon}>{isTeacher ? '👩‍🏫' : '👦'}</Text>
        <Text style={[s.viewTitle, { color: colors.text }]}>{contact.name}</Text>
        {isTeacher && contact.subject && (
          <Text style={[s.viewDescription, { color: colors.textSecondary }]}>📚 {contact.subject}</Text>
        )}
        {!isTeacher && contact.parentName && (
          <Text style={[s.viewDescription, { color: colors.textSecondary }]}>👤 {contact.parentName}</Text>
        )}
        <View style={[s.viewDivider, { backgroundColor: colors.border }]} />

        {contact.childPhone && (
          <View style={s.viewDetailRow}>
            <Text style={[s.viewDetailLabel, { color: colors.textSecondary }]}>📞 {t('school.childPhone')}</Text>
            <Text style={[s.viewDetailValue, { color: colors.text }]}>{contact.childPhone}</Text>
          </View>
        )}
        {contact.childEmail && (
          <View style={s.viewDetailRow}>
            <Text style={[s.viewDetailLabel, { color: colors.textSecondary }]}>✉️ {t('school.childEmail')}</Text>
            <Text style={[s.viewDetailValue, { color: colors.text }]}>{contact.childEmail}</Text>
          </View>
        )}
        {isTeacher && contact.phone && (
          <View style={s.viewDetailRow}>
            <Text style={[s.viewDetailLabel, { color: colors.textSecondary }]}>📞 {t('school.phone')}</Text>
            <Text style={[s.viewDetailValue, { color: colors.text }]}>{contact.phone}</Text>
          </View>
        )}
        {isTeacher && contact.email && (
          <View style={s.viewDetailRow}>
            <Text style={[s.viewDetailLabel, { color: colors.textSecondary }]}>✉️ {t('school.email')}</Text>
            <Text style={[s.viewDetailValue, { color: colors.text }]}>{contact.email}</Text>
          </View>
        )}
      </View>

      {!isTeacher && contact.parentName && (
        <View style={[s.viewCard, { backgroundColor: colors.surface }]}>
          <Text style={[s.viewDescription, { color: colors.accent, fontWeight: '700', marginBottom: 8 }]}>👤 {t('school.parentName')} 1</Text>
          <View style={s.viewDetailRow}>
            <Text style={[s.viewDetailLabel, { color: colors.textSecondary }]}>📞 {t('school.phone')}</Text>
            <Text style={[s.viewDetailValue, { color: colors.text }]}>{contact.parentPhone || '—'}</Text>
          </View>
          <View style={s.viewDetailRow}>
            <Text style={[s.viewDetailLabel, { color: colors.textSecondary }]}>✉️ {t('school.email')}</Text>
            <Text style={[s.viewDetailValue, { color: colors.text }]}>{contact.parentEmail || '—'}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            {contact.parentPhone && <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#E8F5E9' }]} onPress={() => handleCall(contact.parentPhone!)}><Text style={{ color: '#43A047', fontSize: 12, fontWeight: '600' }}>📞 {t('school.call')}</Text></TouchableOpacity>}
            {contact.parentPhone && <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#E3F2FD' }]} onPress={() => handleCopy(contact.parentPhone!)}><Text style={{ color: '#1E88E5', fontSize: 12, fontWeight: '600' }}>📋 {t('school.copy')}</Text></TouchableOpacity>}
            {contact.parentEmail && <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FFF3E0' }]} onPress={() => handleEmail(contact.parentEmail!)}><Text style={{ color: '#FB8C00', fontSize: 12, fontWeight: '600' }}>✉️ {t('school.email')}</Text></TouchableOpacity>}
          </View>
        </View>
      )}

      {!isTeacher && contact.parentName2 && (
        <View style={[s.viewCard, { backgroundColor: colors.surface }]}>
          <Text style={[s.viewDescription, { color: colors.accent, fontWeight: '700', marginBottom: 8 }]}>👤 {t('school.parentName')} 2</Text>
          <View style={s.viewDetailRow}>
            <Text style={[s.viewDetailLabel, { color: colors.textSecondary }]}>📞 {t('school.phone')}</Text>
            <Text style={[s.viewDetailValue, { color: colors.text }]}>{contact.parentPhone2 || '—'}</Text>
          </View>
          <View style={s.viewDetailRow}>
            <Text style={[s.viewDetailLabel, { color: colors.textSecondary }]}>✉️ {t('school.email')}</Text>
            <Text style={[s.viewDetailValue, { color: colors.text }]}>{contact.parentEmail2 || '—'}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            {contact.parentPhone2 && <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#E8F5E9' }]} onPress={() => handleCall(contact.parentPhone2!)}><Text style={{ color: '#43A047', fontSize: 12, fontWeight: '600' }}>📞 {t('school.call')}</Text></TouchableOpacity>}
            {contact.parentPhone2 && <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#E3F2FD' }]} onPress={() => handleCopy(contact.parentPhone2!)}><Text style={{ color: '#1E88E5', fontSize: 12, fontWeight: '600' }}>📋 {t('school.copy')}</Text></TouchableOpacity>}
            {contact.parentEmail2 && <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FFF3E0' }]} onPress={() => handleEmail(contact.parentEmail2!)}><Text style={{ color: '#FB8C00', fontSize: 12, fontWeight: '600' }}>✉️ {t('school.email')}</Text></TouchableOpacity>}
          </View>
        </View>
      )}

      {contact.address && (
        <View style={[s.viewCard, { backgroundColor: colors.surface }]}>
          <View style={s.viewDetailRow}>
            <Text style={[s.viewDetailLabel, { color: colors.textSecondary }]}>📍 {t('school.address')}</Text>
            <Text style={[s.viewDetailValue, { color: colors.text }]}>{contact.address}</Text>
          </View>
        </View>
      )}

      {mapUrl && (
        <TouchableOpacity
          style={[s.viewMapContainer, { backgroundColor: colors.surface }]}
          onPress={() => Linking.openURL(getGoogleMapsUrl(contact.address!))}
        >
          <Image source={{ uri: mapUrl }} style={s.viewMapImage} />
          <Text style={[s.viewMapLabel, { color: colors.accent }]}>{t('tips.openGoogleMaps')}</Text>
        </TouchableOpacity>
      )}

      {contact.notes && (
        <View style={[s.viewCard, { backgroundColor: colors.surface }]}>
          <View style={s.viewDetailRow}>
            <Text style={[s.viewDetailLabel, { color: colors.textSecondary }]}>📝 {t('common.note')}</Text>
            <Text style={[s.viewDetailValue, { color: colors.text }]}>{contact.notes}</Text>
          </View>
        </View>
      )}

      {isTeacher && contact.phone && (
        <View style={[s.viewCard, { backgroundColor: colors.surface }]}>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#E8F5E9', flex: 1 }]} onPress={() => handleCall(contact.phone!)}><Text style={{ color: '#43A047', fontSize: 13, fontWeight: '600' }}>📞 {t('school.call')}</Text></TouchableOpacity>
            {contact.phone && <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#E3F2FD', flex: 1 }]} onPress={() => handleCopy(contact.phone!)}><Text style={{ color: '#1E88E5', fontSize: 13, fontWeight: '600' }}>📋 {t('school.copy')}</Text></TouchableOpacity>}
            {contact.email && <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FFF3E0', flex: 1 }]} onPress={() => handleEmail(contact.email!)}><Text style={{ color: '#FB8C00', fontSize: 13, fontWeight: '600' }}>✉️ {t('school.email')}</Text></TouchableOpacity>}
          </View>
        </View>
      )}

      <TouchableOpacity style={[styles.editButton, { backgroundColor: colors.accent }]} onPress={() => navigation.goBack()}>
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{t('common.close')}</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  backButton: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  actionBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16 },
  editButton: { padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
});

const s = StyleSheet.create({
  viewCard: { borderRadius: 12, padding: 20, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  viewIcon: { fontSize: 42, marginBottom: 10 },
  viewTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  viewDescription: { fontSize: 15, lineHeight: 20, marginBottom: 4 },
  viewDivider: { height: 1, marginVertical: 12 },
  viewDetailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  viewDetailLabel: { fontSize: 14, flex: 1 },
  viewDetailValue: { fontSize: 14, fontWeight: '500', flex: 2, textAlign: 'right' },
  viewMapContainer: { borderRadius: 12, overflow: 'hidden', marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  viewMapImage: { width: '100%', height: 180 },
  viewMapLabel: { fontSize: 14, fontWeight: '600', textAlign: 'center', padding: 10 },
});
