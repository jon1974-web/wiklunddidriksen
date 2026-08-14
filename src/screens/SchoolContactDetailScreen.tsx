import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Platform, Linking } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { SchoolContact } from '../types';
import { getStaticMapUrl, getGoogleMapsUrl } from '../utils/maps';
import { MODULE_COLORS } from '../constants/moduleColors';
import { AppIcon } from '../components/AppIcon';

interface SchoolContactDetailScreenProps {
  navigation: any;
  route: { params: { contact: SchoolContact; childId?: string; yearId?: string } };
}

export const SchoolContactDetailScreen: React.FC<SchoolContactDetailScreenProps> = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { contact, childId, yearId } = route.params;

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

  const isTeacher = contact.role === 'teacher' || contact.role === 'admin';
  const firstName = contact.name.split(' ')[0];

  const renderActionButtons = (phone?: string, email?: string, name?: string) => {
    if (!phone && !email) return null;
    const personName = name?.split(' ')[0] || '';
    return (
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        {phone && <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#E8F5E9' }]} onPress={() => handleCall(phone)}><AppIcon name="phone" size={14} color="#43A047" /><Text style={{ color: '#43A047', fontSize: 12, fontWeight: '600' }}>{t('school.call')} {personName}</Text></TouchableOpacity>}
        {phone && <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#E3F2FD', justifyContent: 'center' }]} onPress={() => handleCopy(phone)}><Text style={{ color: '#1E88E5', fontSize: 12, fontWeight: '600', textAlign: 'center' }}>📋 {t('school.copy')}</Text></TouchableOpacity>}
        {email && <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#E3F2FD' }]} onPress={() => handleEmail(email)}><AppIcon name="email" size={14} color="#1976D2" /><Text style={{ color: '#1976D2', fontSize: 12, fontWeight: '600' }}>{t('school.sendEmail')}</Text></TouchableOpacity>}
      </View>
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: MODULE_COLORS.schoolBg }]} contentContainerStyle={{ padding: 16 }}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { borderColor: MODULE_COLORS.school }]}>
        <Text style={{ color: MODULE_COLORS.school, fontSize: 18 }}>←</Text>
      </TouchableOpacity>

      <View style={[s.viewCard, { backgroundColor: colors.surface }]}>
        <Text style={s.viewIcon}>{contact.role === 'teacher' ? '👩‍🏫' : contact.role === 'admin' ? '🏥' : '👦'}</Text>
        <Text style={[s.viewTitle, { color: colors.text }]}>{contact.name}</Text>

        {contact.role === 'teacher' && (contact as any).teacherType && (
          <View style={[s.teacherTypeBadge, { backgroundColor: (contact as any).teacherType === 'personal' ? '#E8F5E9' : (contact as any).teacherType === 'contact' ? '#E3F2FD' : '#FFF3E0' }]}>
            <Text style={{ color: (contact as any).teacherType === 'personal' ? '#43A047' : (contact as any).teacherType === 'contact' ? '#1976D2' : '#FB8C00', fontSize: 12, fontWeight: '600' }}>
              {(contact as any).teacherType === 'personal' ? t('school.personalTeacher') : (contact as any).teacherType === 'contact' ? t('school.contactTeacher') : t('school.subjectTeacher')}
            </Text>
          </View>
        )}

        {contact.role === 'admin' && Array.isArray((contact as any).adminType) && (contact as any).adminType.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6, marginBottom: 4 }}>
            {(contact as any).adminType.map((role: string) => (
              <View key={role} style={[s.teacherTypeBadge, { backgroundColor: '#E3F2FD' }]}>
                <Text style={{ color: '#1976D2', fontSize: 12, fontWeight: '600' }}>{role}</Text>
              </View>
            ))}
          </View>
        )}

        {contact.role === 'teacher' && contact.subject && (
          <Text style={[s.viewDescription, { color: colors.textSecondary }]}>📚 {contact.subject}</Text>
        )}

        <View style={[s.viewDivider, { backgroundColor: colors.border }]} />

        {/* Admin fields */}
        {contact.role === 'admin' && (
          <>
            {contact.phone && (
              <View style={s.viewDetailRow}>
                <Text style={[s.viewDetailLabel, { color: colors.textSecondary }]}>{t('school.phone')}</Text>
                <Text style={[s.viewDetailValue, { color: colors.text }]}>{contact.phone}</Text>
              </View>
            )}
            {contact.email && (
              <View style={s.viewDetailRow}>
                <Text style={[s.viewDetailLabel, { color: colors.textSecondary }]}>{t('school.email')}</Text>
                <Text style={[s.viewDetailValue, { color: colors.text }]}>{contact.email}</Text>
              </View>
            )}
            {contact.address && (
              <View style={s.viewDetailRow}>
                <Text style={[s.viewDetailLabel, { color: colors.textSecondary }]}>{t('school.address')}</Text>
                <Text style={[s.viewDetailValue, { color: colors.text }]}>{contact.address}</Text>
              </View>
            )}
            {contact.notes && (
              <View style={s.viewDetailRow}>
                <Text style={[s.viewDetailLabel, { color: colors.textSecondary }]}>📝 {t('common.note')}</Text>
                <Text style={[s.viewDetailValue, { color: colors.text }]}>{contact.notes}</Text>
              </View>
            )}
            {(contact.phone || contact.email) && renderActionButtons(contact.phone, contact.email, contact.name)}
          </>
        )}

        {/* Teacher fields */}
        {contact.role === 'teacher' && (
          <>
            {contact.phone && (
              <View style={s.viewDetailRow}>
                <Text style={[s.viewDetailLabel, { color: colors.textSecondary }]}>{t('school.phone')}</Text>
                <Text style={[s.viewDetailValue, { color: colors.text }]}>{contact.phone}</Text>
              </View>
            )}
            {contact.email && (
              <View style={s.viewDetailRow}>
                <Text style={[s.viewDetailLabel, { color: colors.textSecondary }]}>{t('school.email')}</Text>
                <Text style={[s.viewDetailValue, { color: colors.text }]}>{contact.email}</Text>
              </View>
            )}
            {(contact.phone || contact.email) && renderActionButtons(contact.phone, contact.email, contact.name)}
          </>
        )}

        {/* Classmate fields */}
        {contact.role === 'classmate' && (
          <>
            {contact.childPhone && (
              <View style={s.viewDetailRow}>
                <Text style={[s.viewDetailLabel, { color: colors.textSecondary }]}>{t('school.childPhone')}</Text>
                <Text style={[s.viewDetailValue, { color: colors.text }]}>{contact.childPhone}</Text>
              </View>
            )}
            {contact.childEmail && (
              <View style={s.viewDetailRow}>
                <Text style={[s.viewDetailLabel, { color: colors.textSecondary }]}>{t('school.childEmail')}</Text>
                <Text style={[s.viewDetailValue, { color: colors.text }]}>{contact.childEmail}</Text>
              </View>
            )}
            {(contact.childPhone || contact.childEmail) && renderActionButtons(contact.childPhone, contact.childEmail, contact.name)}
          </>
        )}
      </View>

      {!isTeacher && contact.parentName && (
        <View style={[s.viewCard, { backgroundColor: colors.surface }]}>
          <Text style={[s.viewDescription, { color: MODULE_COLORS.school, fontWeight: '700', marginBottom: 8 }]}>👤 {contact.parentName}</Text>
          <View style={s.viewDetailRow}>
            <Text style={[s.viewDetailLabel, { color: colors.textSecondary }]}>{t('school.phone')}</Text>
            <Text style={[s.viewDetailValue, { color: colors.text }]}>{contact.parentPhone || '—'}</Text>
          </View>
          <View style={s.viewDetailRow}>
            <Text style={[s.viewDetailLabel, { color: colors.textSecondary }]}>{t('school.email')}</Text>
            <Text style={[s.viewDetailValue, { color: colors.text }]}>{contact.parentEmail || '—'}</Text>
          </View>
          {renderActionButtons(contact.parentPhone, contact.parentEmail, contact.parentName)}
        </View>
      )}

      {!isTeacher && contact.parentName2 && (
        <View style={[s.viewCard, { backgroundColor: colors.surface }]}>
          <Text style={[s.viewDescription, { color: MODULE_COLORS.school, fontWeight: '700', marginBottom: 8 }]}>👤 {contact.parentName2}</Text>
          <View style={s.viewDetailRow}>
            <Text style={[s.viewDetailLabel, { color: colors.textSecondary }]}>{t('school.phone')}</Text>
            <Text style={[s.viewDetailValue, { color: colors.text }]}>{contact.parentPhone2 || '—'}</Text>
          </View>
          <View style={s.viewDetailRow}>
            <Text style={[s.viewDetailLabel, { color: colors.textSecondary }]}>{t('school.email')}</Text>
            <Text style={[s.viewDetailValue, { color: colors.text }]}>{contact.parentEmail2 || '—'}</Text>
          </View>
          {renderActionButtons(contact.parentPhone2, contact.parentEmail2, contact.parentName2)}
        </View>
      )}

      {contact.role === 'classmate' && contact.notes && (
        <View style={[s.viewCard, { backgroundColor: colors.surface }]}>
          <View style={s.viewDetailRow}>
            <Text style={[s.viewDetailLabel, { color: colors.textSecondary }]}>📝 {t('common.note')}</Text>
            <Text style={[s.viewDetailValue, { color: colors.text }]}>{contact.notes}</Text>
          </View>
        </View>
      )}

      {contact.role === 'classmate' && contact.address && (
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
          <Text style={[s.viewMapLabel, { color: MODULE_COLORS.school }]}>{t('tips.openGoogleMaps')}</Text>
        </TouchableOpacity>
      )}

      <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
        <TouchableOpacity style={[styles.editButton, { backgroundColor: colors.inputBackground, flex: 1 }]} onPress={() => navigation.goBack()}>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{t('common.close')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.editButton, { backgroundColor: MODULE_COLORS.school, flex: 1 }]} onPress={() => {
          navigation.goBack();
          setTimeout(() => {
            navigation.navigate('SchoolSpace', { editContactId: contact.id });
          }, 100);
        }}>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{t('common.edit')}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  backButton: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  actionBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 6 },
  editButton: { padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
});

const s = StyleSheet.create({
  viewCard: { borderRadius: 12, padding: 20, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  teacherTypeBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 6, marginBottom: 4 },
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
