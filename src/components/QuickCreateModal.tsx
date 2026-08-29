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

type IconName = React.ComponentProps<typeof AppIcon>['name'];

interface SectionItem {
  icon: IconName;
  nav: (n: any) => void;
  labelKey: string;
  color?: string;
}

interface Section {
  key: string;
  color: string;
  moduleIcon: IconName;
  labelKey: string;
  items: SectionItem[];
}

const SECTIONS: Section[] = [
  {
    key: 'events',
    color: '#3b5a75',
    moduleIcon: 'calendar',
    labelKey: 'quickCreate.events',
    items: [
      { icon: 'calendar' as IconName, nav: (n: any) => n.navigate('Events', { screen: 'EventsList', params: { openAddEvent: true } }), labelKey: 'quickCreate.newEvent' },
      { icon: 'microphone' as IconName, nav: (n: any) => n.navigate('Events', { screen: 'VoiceEvent', params: { _t: Date.now() } }), labelKey: 'quickCreate.voiceEvent' },
      { icon: 'camera' as IconName, nav: (n: any) => n.navigate('Events', { screen: 'PhotoEvent', params: { _t: Date.now() } }), labelKey: 'quickCreate.photoEvent' },
    ],
  },
  {
    key: 'health',
    color: MODULE_COLORS.health,
    moduleIcon: 'medication',
    labelKey: 'quickCreate.health',
    items: [
      { icon: 'medication' as IconName, nav: (n: any) => n.navigate('Trips', { screen: 'HealthSpace', params: { openAddSection: 'appointments', _t: Date.now() } }), labelKey: 'quickCreate.healthAppointment' },
      { icon: 'microphone' as IconName, nav: (n: any) => n.navigate('Events', { screen: 'VoiceActivity', params: { type: 'healthAppointment', moduleColor: MODULE_COLORS.health, _t: Date.now() } }), labelKey: 'quickCreate.voiceHealth' },
      { icon: 'camera' as IconName, nav: (n: any) => n.navigate('Events', { screen: 'PhotoActivity', params: { type: 'healthAppointment', moduleColor: MODULE_COLORS.health, _t: Date.now() } }), labelKey: 'quickCreate.photoHealth' },
    ],
  },
  {
    key: 'pets',
    color: MODULE_COLORS.pets,
    moduleIcon: 'pet',
    labelKey: 'quickCreate.pets',
    items: [
      { icon: 'pet' as IconName, nav: (n: any) => n.navigate('Trips', { screen: 'PetSpace', params: { openAddSection: 'vetVisits', _t: Date.now() } }), labelKey: 'quickCreate.petVetVisit' },
      { icon: 'microphone' as IconName, nav: (n: any) => n.navigate('Events', { screen: 'VoiceActivity', params: { type: 'vetVisit', moduleColor: MODULE_COLORS.pets, _t: Date.now() } }), labelKey: 'quickCreate.voiceVet' },
      { icon: 'camera' as IconName, nav: (n: any) => n.navigate('Events', { screen: 'PhotoActivity', params: { type: 'vetVisit', moduleColor: MODULE_COLORS.pets, _t: Date.now() } }), labelKey: 'quickCreate.photoVet' },
    ],
  },
  {
    key: 'school',
    color: MODULE_COLORS.school,
    moduleIcon: 'school',
    labelKey: 'quickCreate.school',
    items: [
      { icon: 'school' as IconName, nav: (n: any) => n.navigate('Trips', { screen: 'SchoolSpace', params: { openAddSection: 'activities', _t: Date.now() } }), labelKey: 'quickCreate.schoolActivity' },
      { icon: 'microphone' as IconName, nav: (n: any) => n.navigate('Events', { screen: 'VoiceActivity', params: { type: 'schoolActivity', moduleColor: MODULE_COLORS.school, _t: Date.now() } }), labelKey: 'quickCreate.voiceSchool' },
      { icon: 'camera' as IconName, nav: (n: any) => n.navigate('Events', { screen: 'PhotoActivity', params: { type: 'schoolActivity', moduleColor: MODULE_COLORS.school, _t: Date.now() } }), labelKey: 'quickCreate.photoSchool' },
    ],
  },
  {
    key: 'kindergarten',
    color: MODULE_COLORS.kindergarten,
    moduleIcon: 'kindergarten',
    labelKey: 'quickCreate.kindergarten',
    items: [
      { icon: 'kindergarten' as IconName, nav: (n: any) => n.navigate('Trips', { screen: 'KindergartenSpace', params: { openAddSection: 'activities', _t: Date.now() } }), labelKey: 'quickCreate.kindergartenActivity' },
      { icon: 'microphone' as IconName, nav: (n: any) => n.navigate('Events', { screen: 'VoiceActivity', params: { type: 'kindergartenActivity', moduleColor: MODULE_COLORS.kindergarten, _t: Date.now() } }), labelKey: 'quickCreate.voiceKindergarten' },
      { icon: 'camera' as IconName, nav: (n: any) => n.navigate('Events', { screen: 'PhotoActivity', params: { type: 'kindergartenActivity', moduleColor: MODULE_COLORS.kindergarten, _t: Date.now() } }), labelKey: 'quickCreate.photoKindergarten' },
    ],
  },
  {
    key: 'trips',
    color: MODULE_COLORS.trips,
    moduleIcon: 'transport',
    labelKey: 'quickCreate.trips',
    items: [
      { icon: 'transport' as IconName, nav: (n: any) => n.navigate('Trips', { screen: 'AddTrip', params: { _t: Date.now() } }), labelKey: 'quickCreate.newTrip' },
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
                <TouchableOpacity style={[styles.closeBtn, { borderColor: colors.textSecondary }]} onPress={onClose}>
                  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.textSecondary} strokeWidth="2.5" strokeLinecap="round">
                    <Line x1="18" y1="6" x2="6" y2="18"/>
                    <Line x1="6" y1="6" x2="18" y2="18"/>
                  </Svg>
                </TouchableOpacity>
              </View>

              <View style={styles.content}>
                {SECTIONS.map((section) => (
                  <View key={section.key} style={styles.moduleRow}>
                    <View style={[styles.moduleIconWrap, { backgroundColor: section.color + '15' }]}>
                      <AppIcon name={section.moduleIcon} size={24} color={section.color} />
                    </View>
                    <Text style={[styles.moduleName, { color: section.color }]}>{t(section.labelKey)}</Text>
                    <View style={[styles.actionChips, section.items.length === 1 && styles.actionChipsFull]}>
                      {section.items.map((item, i) => (
                        <TouchableOpacity key={i} style={[styles.actionChip, section.items.length === 1 && styles.actionChipFull]} onPress={() => navigateAndClose(() => item.nav(navigation))} activeOpacity={0.6}>
                          <View style={styles.actionIconWrap}>
                            <AppIcon name={item.icon} size={20} color={section.color} />
                          </View>
                          <Text style={[styles.actionLabel, { color: section.color }]}>{t(item.labelKey)}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))}
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
  content: {
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  moduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 2,
    borderRadius: 12,
    gap: 8,
  },
  moduleIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  moduleName: {
    fontSize: 13,
    fontWeight: '700',
    minWidth: 70,
    flexShrink: 0,
  },
  actionChips: {
    flexDirection: 'row',
    gap: 6,
    marginLeft: 'auto',
  },
  actionChipsFull: {
    flex: 1,
  },
  actionChip: {
    alignItems: 'center',
    gap: 2,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  actionChipFull: {
    flex: 1,
  },
  actionIconWrap: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
});
