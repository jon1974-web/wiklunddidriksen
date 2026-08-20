import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Platform, Linking } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { KindergartenContact } from '../types';
import { getStaticMapUrl, getGoogleMapsUrl } from '../utils/maps';
import { MODULE_COLORS } from '../constants/moduleColors';
import { AppIcon } from '../components/AppIcon';

interface Props {
  navigation: any;
  route: { params: { contact: KindergartenContact; childId?: string; yearId?: string } };
}

const KG = MODULE_COLORS.kindergarten;

export const KindergartenContactDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { contact } = route.params;

  const mapUrl = useMemo(() => contact.address ? getStaticMapUrl(contact.address, 15, '600x300') : null, [contact.address]);

  const handleCall = (phone: string) => { if (phone) Linking.openURL(`tel:${phone.replace(/\s/g, '')}`); };
  const handleCopy = (text: string) => { if (text && Platform.OS === 'web') navigator.clipboard.writeText(text); };
  const handleEmail = (email: string) => { if (email) Linking.openURL(`mailto:${email}`); };

  const renderActions = (phone?: string, email?: string, name?: string) => {
    if (!phone && !email) return null;
    const pName = name?.split(' ')[0] || '';
    return (
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        {phone && <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#F3E5F5' }]} onPress={() => handleCall(phone)}><AppIcon name="phone" size={14} color={KG} /><Text style={{ color: KG, fontSize: 12, fontWeight: '600' }}>{t('kindergarten.call')} {pName}</Text></TouchableOpacity>}
        {phone && <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#F3E5F5' }]} onPress={() => handleCopy(phone)}><Text style={{ color: KG, fontSize: 12, fontWeight: '600' }}>📋 {t('kindergarten.copy')}</Text></TouchableOpacity>}
        {email && <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#F3E5F5' }]} onPress={() => handleEmail(email)}><AppIcon name="email" size={14} color={KG} /><Text style={{ color: KG, fontSize: 12, fontWeight: '600' }}>{t('kindergarten.email')}</Text></TouchableOpacity>}
      </View>
    );
  };

  const isTeacher = contact.role === 'teacher';

  return (
    <ScrollView style={[styles.container, { backgroundColor: MODULE_COLORS.kindergartenBg }]} contentContainerStyle={{ padding: 16 }}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { borderColor: KG }]}>
        <Text style={{ color: KG, fontSize: 18 }}>←</Text>
      </TouchableOpacity>

      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Text style={{ fontSize: 42, marginBottom: 10 }}>{isTeacher ? '👩‍🏫' : '👦'}</Text>
        <Text style={[styles.title, { color: colors.text }]}>{contact.name}</Text>

        {isTeacher && (contact as any).teacherType && (
          <View style={[styles.badge, { backgroundColor: (contact as any).teacherType === 'personal' ? '#E8F5E9' : (contact as any).teacherType === 'contact' ? '#E3F2FD' : '#FFF3E0' }]}>
            <Text style={{ color: (contact as any).teacherType === 'personal' ? '#43A047' : (contact as any).teacherType === 'contact' ? '#1976D2' : '#FB8C00', fontSize: 12, fontWeight: '600' }}>
              {(contact as any).teacherType === 'personal' ? t('kindergarten.personalTeacher') : (contact as any).teacherType === 'contact' ? t('kindergarten.contactTeacher') : t('kindergarten.subjectTeacher')}
            </Text>
          </View>
        )}

        {isTeacher && contact.subject && (
          <Text style={[styles.desc, { color: colors.textSecondary }]}>📚 {contact.subject}</Text>
        )}

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {isTeacher && (
          <>
            {contact.phone && <View style={styles.row}><Text style={[styles.label, { color: colors.textSecondary }]}>{t('kindergarten.phone')}</Text><Text style={[styles.value, { color: colors.text }]}>{contact.phone}</Text></View>}
            {contact.email && <View style={styles.row}><Text style={[styles.label, { color: colors.textSecondary }]}>{t('kindergarten.email')}</Text><Text style={[styles.value, { color: colors.text }]}>{contact.email}</Text></View>}
            {(contact.phone || contact.email) && renderActions(contact.phone, contact.email, contact.name)}
          </>
        )}

        {contact.role === 'child' && (
          <>
            {contact.phone && <View style={styles.row}><Text style={[styles.label, { color: colors.textSecondary }]}>{t('kindergarten.phone')}</Text><Text style={[styles.value, { color: colors.text }]}>{contact.phone}</Text></View>}
            {contact.email && <View style={styles.row}><Text style={[styles.label, { color: colors.textSecondary }]}>{t('kindergarten.email')}</Text><Text style={[styles.value, { color: colors.text }]}>{contact.email}</Text></View>}
            {(contact.phone || contact.email) && renderActions(contact.phone, contact.email, contact.name)}
          </>
        )}
      </View>

      {!isTeacher && contact.parentName && (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.desc, { color: KG, fontWeight: '700', marginBottom: 8 }]}>👤 {contact.parentName}</Text>
          <View style={styles.row}><Text style={[styles.label, { color: colors.textSecondary }]}>{t('kindergarten.phone')}</Text><Text style={[styles.value, { color: colors.text }]}>{contact.parentPhone || '—'}</Text></View>
          <View style={styles.row}><Text style={[styles.label, { color: colors.textSecondary }]}>{t('kindergarten.email')}</Text><Text style={[styles.value, { color: colors.text }]}>{contact.parentEmail || '—'}</Text></View>
          {renderActions(contact.parentPhone, contact.parentEmail, contact.parentName)}
        </View>
      )}

      {!isTeacher && contact.parentName2 && (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.desc, { color: KG, fontWeight: '700', marginBottom: 8 }]}>👤 {contact.parentName2}</Text>
          <View style={styles.row}><Text style={[styles.label, { color: colors.textSecondary }]}>{t('kindergarten.phone')}</Text><Text style={[styles.value, { color: colors.text }]}>{contact.parentPhone2 || '—'}</Text></View>
          <View style={styles.row}><Text style={[styles.label, { color: colors.textSecondary }]}>{t('kindergarten.email')}</Text><Text style={[styles.value, { color: colors.text }]}>{contact.parentEmail2 || '—'}</Text></View>
          {renderActions(contact.parentPhone2, contact.parentEmail2, contact.parentName2)}
        </View>
      )}

      {contact.role === 'child' && contact.notes && (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.row}><Text style={[styles.label, { color: colors.textSecondary }]}>📝 {t('common.note')}</Text><Text style={[styles.value, { color: colors.text }]}>{contact.notes}</Text></View>
        </View>
      )}

      {contact.role === 'child' && contact.address && (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.row}><Text style={[styles.label, { color: colors.textSecondary }]}>📍 {t('kindergarten.address')}</Text><Text style={[styles.value, { color: colors.text }]}>{contact.address}</Text></View>
        </View>
      )}

      {mapUrl && (
        <TouchableOpacity style={[styles.mapCard, { backgroundColor: colors.surface }]} onPress={() => Linking.openURL(getGoogleMapsUrl(contact.address!))}>
          <Image source={{ uri: mapUrl }} style={styles.mapImage} />
          <Text style={[styles.mapLabel, { color: KG }]}>{t('tips.openGoogleMaps')}</Text>
        </TouchableOpacity>
      )}

      <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
        <TouchableOpacity style={[styles.btn, { backgroundColor: colors.inputBackground, flex: 1 }]} onPress={() => navigation.goBack()}>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{t('common.close')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { backgroundColor: KG, flex: 1 }]} onPress={() => {
          navigation.goBack();
          setTimeout(() => navigation.navigate('KindergartenSpace', { editContactId: contact.id }), 100);
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
  backBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  card: { borderRadius: 12, padding: 20, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 6, marginBottom: 4 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  desc: { fontSize: 15, lineHeight: 20, marginBottom: 4 },
  divider: { height: 1, marginVertical: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  label: { fontSize: 14, flex: 1 },
  value: { fontSize: 14, fontWeight: '500', flex: 2, textAlign: 'right' },
  actionBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 6 },
  btn: { padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  mapCard: { borderRadius: 12, overflow: 'hidden', marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  mapImage: { width: '100%', height: 140 },
  mapLabel: { fontSize: 14, fontWeight: '600', textAlign: 'center', padding: 10 },
});
