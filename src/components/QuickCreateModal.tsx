import React from 'react';
import { View, Text, TouchableOpacity, Modal, TouchableWithoutFeedback, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { AppIcon } from './AppIcon';
import { MODULE_COLORS } from '../constants/moduleColors';
import Svg, { Line } from 'react-native-svg';

interface QuickCreateModalProps {
  visible: boolean;
  onClose: () => void;
  navigation: any;
}

const SECTIONS = [
  {
    key: 'events',
    colorKey: 'accent' as const,
    lockedColor: null,
    headerIcon: 'calendar' as const,
    items: [
      { icon: 'calendar' as const, nav: (n: any) => n.navigate('Events', { screen: 'AddEvent', params: { _t: Date.now() } }), labelKey: 'quickCreate.newEvent' },
      { icon: 'calendar' as const, nav: (n: any) => n.navigate('Events', { screen: 'VoiceEvent', params: { _t: Date.now() } }), labelKey: 'quickCreate.voiceEvent' },
      { icon: 'calendar' as const, nav: (n: any) => n.navigate('Events', { screen: 'PhotoEvent', params: { _t: Date.now() } }), labelKey: 'quickCreate.photoEvent' },
    ],
  },
  {
    key: 'health',
    colorKey: null,
    lockedColor: MODULE_COLORS.health,
    headerIcon: 'medication' as const,
    items: [
      { icon: 'calendar' as const, nav: (n: any) => n.navigate('Trips', { screen: 'HealthSpace', params: { openAddSection: 'appointments', _t: Date.now() } }), labelKey: 'quickCreate.healthAppointment' },
      { icon: 'vaccination' as const, nav: (n: any) => n.navigate('Trips', { screen: 'HealthSpace', params: { openAddSection: 'vaccinations', _t: Date.now() } }), labelKey: 'quickCreate.healthVaccination' },
    ],
  },
  {
    key: 'pets',
    colorKey: null,
    lockedColor: MODULE_COLORS.pets,
    headerIcon: 'pet' as const,
    items: [
      { icon: 'calendar' as const, nav: (n: any) => n.navigate('Trips', { screen: 'PetSpace', params: { openAddSection: 'vetVisits', _t: Date.now() } }), labelKey: 'quickCreate.petVetVisit' },
      { icon: 'vaccination' as const, nav: (n: any) => n.navigate('Trips', { screen: 'PetSpace', params: { openAddSection: 'vaccinations', _t: Date.now() } }), labelKey: 'quickCreate.petVaccination' },
    ],
  },
  {
    key: 'trips',
    colorKey: null,
    lockedColor: MODULE_COLORS.trips,
    headerIcon: 'transport' as const,
    items: [
      { icon: 'transport' as const, nav: (n: any) => n.navigate('Trips', { screen: 'AddTrip', params: { _t: Date.now() } }), labelKey: 'quickCreate.newTrip' },
    ],
  },
  {
    key: 'school',
    colorKey: null,
    lockedColor: MODULE_COLORS.school,
    headerIcon: 'school' as const,
    items: [
      { icon: 'calendar' as const, nav: (n: any) => n.navigate('Trips', { screen: 'SchoolSpace', params: { openAddSection: 'activities', _t: Date.now() } }), labelKey: 'quickCreate.schoolActivity' },
    ],
  },
];

export const QuickCreateModal: React.FC<QuickCreateModalProps> = React.memo(({ visible, onClose, navigation }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const navigateAndClose = (navigateFn: () => void) => {
    onClose();
    setTimeout(navigateFn, 300);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
              <View style={styles.handle} />
              <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>{t('quickCreate.title')}</Text>
                <TouchableOpacity style={[styles.closeBtn, { borderColor: colors.accent }]} onPress={onClose}>
                  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2.5" strokeLinecap="round">
                    <Line x1="18" y1="6" x2="6" y2="18"/>
                    <Line x1="6" y1="6" x2="18" y2="18"/>
                  </Svg>
                </TouchableOpacity>
              </View>
              <View style={styles.content}>
                {SECTIONS.map((section) => {
                  const sectionColor = section.colorKey ? colors[section.colorKey] : section.lockedColor!;
                  return (
                    <View key={section.key} style={styles.card}>
                      <View style={[styles.cardBorder, { backgroundColor: sectionColor }]} />
                      <View style={styles.cardContent}>
                        <View style={styles.cardTitleRow}>
                          <AppIcon name={section.headerIcon} size={16} color={sectionColor} />
                          <Text style={[styles.cardTitle, { color: sectionColor }]}>
                            {t(`quickCreate.${section.key}`)}
                          </Text>
                        </View>
                        <View style={styles.cardActions}>
                          {section.items.map((item, idx) => (
                            <TouchableOpacity
                              key={idx}
                              style={[styles.actionBtn, { backgroundColor: sectionColor }]}
                              onPress={() => navigateAndClose(() => item.nav(navigation))}
                              activeOpacity={0.8}
                            >
                              <View style={styles.actionIconWrap}>
                                <AppIcon name={item.icon} size={22} color="#fff" />
                              </View>
                              <Text style={styles.actionLabel}>{t(item.labelKey)}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ddd',
    alignSelf: 'center',
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 12,
    paddingBottom: 34,
  },
  card: {
    flexDirection: 'row',
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  cardBorder: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    padding: 10,
    paddingLeft: 12,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
  },
  actionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
});
