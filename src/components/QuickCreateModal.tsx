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
  labelKey: string;
  items: SectionItem[];
}

const lightenColor = (hex: string, factor: number = 0.35): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.round(r + (255 - r) * factor);
  const lg = Math.round(g + (255 - g) * factor);
  const lb = Math.round(b + (255 - b) * factor);
  return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`;
};

const SECTIONS: Section[] = [
  {
    key: 'events',
    color: '#3b5a75',
    labelKey: 'quickCreate.events',
    items: [
      { icon: 'calendar' as IconName, nav: (n: any) => n.navigate('Events', { screen: 'AddEvent', params: { _t: Date.now() } }), labelKey: 'quickCreate.newEvent' },
      { icon: 'chat' as IconName, nav: (n: any) => n.navigate('Events', { screen: 'VoiceEvent', params: { _t: Date.now() } }), labelKey: 'quickCreate.voiceEvent' },
      { icon: 'camera' as IconName, nav: (n: any) => n.navigate('Events', { screen: 'PhotoEvent', params: { _t: Date.now() } }), labelKey: 'quickCreate.photoEvent' },
    ],
  },
  {
    key: 'health',
    color: MODULE_COLORS.health,
    labelKey: 'quickCreate.health',
    items: [
      { icon: 'medication' as IconName, nav: (n: any) => n.navigate('Trips', { screen: 'HealthSpace', params: { openAddSection: 'appointments', _t: Date.now() } }), labelKey: 'quickCreate.healthAppointment' },
    ],
  },
  {
    key: 'pets',
    color: MODULE_COLORS.pets,
    labelKey: 'quickCreate.pets',
    items: [
      { icon: 'pet' as IconName, nav: (n: any) => n.navigate('Trips', { screen: 'PetSpace', params: { openAddSection: 'vetVisits', _t: Date.now() } }), labelKey: 'quickCreate.petVetVisit' },
    ],
  },
  {
    key: 'school',
    color: MODULE_COLORS.school,
    labelKey: 'quickCreate.school',
    items: [
      { icon: 'school' as IconName, nav: (n: any) => n.navigate('Trips', { screen: 'SchoolSpace', params: { openAddSection: 'activities', _t: Date.now() } }), labelKey: 'quickCreate.schoolActivity' },
    ],
  },
  {
    key: 'kindergarten',
    color: MODULE_COLORS.kindergarten,
    labelKey: 'quickCreate.kindergarten',
    items: [
      { icon: 'kindergarten' as IconName, nav: (n: any) => n.navigate('Trips', { screen: 'KindergartenSpace', params: { openAddSection: 'activities', _t: Date.now() } }), labelKey: 'quickCreate.kindergartenActivity' },
    ],
  },
  {
    key: 'trips',
    color: MODULE_COLORS.trips,
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

  const eventsSection = SECTIONS[0];
  const healthSection = SECTIONS[1];
  const petsSection = SECTIONS[2];
  const schoolSection = SECTIONS[3];
  const kindergartenSection = SECTIONS[4];
  const tripsSection = SECTIONS[5];

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
                {/* Row 1: Manuell → Tale ← Foto */}
                <View style={styles.sectionLabelWrap}>
                  <Text style={[styles.sectionLabel, { color: eventsSection.color }]}>{t(eventsSection.labelKey)}</Text>
                </View>
                <View style={styles.row}>
                  <TouchableOpacity style={[styles.moduleCol, { alignItems: 'flex-end' }]} onPress={() => navigateAndClose(() => eventsSection.items[0].nav(navigation))} activeOpacity={0.6}>
                    <View style={styles.iconWrap}>
                      <AppIcon name={eventsSection.items[0].icon} size={28} color={eventsSection.color} />
                    </View>
                    <Text style={[styles.actionTitle, { color: lightenColor(eventsSection.color) }]}>{t(eventsSection.items[0].labelKey)}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.moduleCol} onPress={() => navigateAndClose(() => eventsSection.items[1].nav(navigation))} activeOpacity={0.6}>
                    <View style={styles.iconWrap}>
                      <AppIcon name={eventsSection.items[1].icon} size={28} color={eventsSection.color} />
                    </View>
                    <Text style={[styles.actionTitle, { color: lightenColor(eventsSection.color) }]}>{t(eventsSection.items[1].labelKey)}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.moduleCol, { alignItems: 'flex-start' }]} onPress={() => navigateAndClose(() => eventsSection.items[2].nav(navigation))} activeOpacity={0.6}>
                    <View style={styles.iconWrap}>
                      <AppIcon name={eventsSection.items[2].icon} size={28} color={eventsSection.color} />
                    </View>
                    <Text style={[styles.actionTitle, { color: lightenColor(eventsSection.color) }]}>{t(eventsSection.items[2].labelKey)}</Text>
                  </TouchableOpacity>
                </View>

                {/* Row 2: Helse → empty ← Kjæledyr */}
                <View style={styles.row}>
                  <TouchableOpacity style={[styles.moduleCol, { alignItems: 'flex-end' }]} onPress={() => navigateAndClose(() => healthSection.items[0].nav(navigation))} activeOpacity={0.6}>
                    <Text style={[styles.sectionLabel, { color: healthSection.color }]}>{t(healthSection.labelKey)}</Text>
                    <View style={styles.iconWrap}>
                      <AppIcon name={healthSection.items[0].icon} size={28} color={healthSection.color} />
                    </View>
                    <Text style={[styles.actionTitle, { color: lightenColor(healthSection.color) }]}>{t(healthSection.items[0].labelKey)}</Text>
                  </TouchableOpacity>
                  <View style={styles.moduleCol} />
                  <TouchableOpacity style={[styles.moduleCol, { alignItems: 'flex-start' }]} onPress={() => navigateAndClose(() => petsSection.items[0].nav(navigation))} activeOpacity={0.6}>
                    <Text style={[styles.sectionLabel, { color: petsSection.color }]}>{t(petsSection.labelKey)}</Text>
                    <View style={styles.iconWrap}>
                      <AppIcon name={petsSection.items[0].icon} size={28} color={petsSection.color} />
                    </View>
                    <Text style={[styles.actionTitle, { color: lightenColor(petsSection.color) }]}>{t(petsSection.items[0].labelKey)}</Text>
                  </TouchableOpacity>
                </View>

                {/* Row 3: School → empty ← Kindergarten */}
                <View style={styles.row}>
                  <TouchableOpacity style={[styles.moduleCol, { alignItems: 'flex-end' }]} onPress={() => navigateAndClose(() => schoolSection.items[0].nav(navigation))} activeOpacity={0.6}>
                    <Text style={[styles.sectionLabel, { color: schoolSection.color }]}>{t(schoolSection.labelKey)}</Text>
                    <View style={styles.iconWrap}>
                      <AppIcon name={schoolSection.items[0].icon} size={28} color={schoolSection.color} />
                    </View>
                    <Text style={[styles.actionTitle, { color: lightenColor(schoolSection.color) }]}>{t(schoolSection.items[0].labelKey)}</Text>
                  </TouchableOpacity>
                  <View style={styles.moduleCol} />
                  <TouchableOpacity style={[styles.moduleCol, { alignItems: 'flex-start' }]} onPress={() => navigateAndClose(() => kindergartenSection.items[0].nav(navigation))} activeOpacity={0.6}>
                    <Text style={[styles.sectionLabel, { color: kindergartenSection.color }]}>{t(kindergartenSection.labelKey)}</Text>
                    <View style={styles.iconWrap}>
                      <AppIcon name={kindergartenSection.items[0].icon} size={28} color={kindergartenSection.color} />
                    </View>
                    <Text style={[styles.actionTitle, { color: lightenColor(kindergartenSection.color) }]}>{t(kindergartenSection.items[0].labelKey)}</Text>
                  </TouchableOpacity>
                </View>

                {/* Row 4: empty → Reiser ← empty */}
                <View style={styles.sectionLabelWrap}>
                  <Text style={[styles.sectionLabel, { color: tripsSection.color }]}>{t(tripsSection.labelKey)}</Text>
                </View>
                <View style={styles.centerRow}>
                  <TouchableOpacity style={styles.moduleCol} onPress={() => navigateAndClose(() => tripsSection.items[0].nav(navigation))} activeOpacity={0.6}>
                    <View style={styles.iconWrap}>
                      <AppIcon name={tripsSection.items[0].icon} size={28} color={tripsSection.color} />
                    </View>
                    <Text style={[styles.actionTitle, { color: lightenColor(tripsSection.color) }]}>{t(tripsSection.items[0].labelKey)}</Text>
                  </TouchableOpacity>
                </View>
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
    paddingBottom: 34,
  },
  sectionLabelWrap: {
    marginBottom: 6,
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  centerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  moduleCol: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  actionItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
});
