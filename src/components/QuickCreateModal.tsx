import React, { useState, useCallback } from 'react';
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
type Mode = 'manual' | 'voice' | 'photo' | null;

interface ModuleOption {
  icon: IconName;
  color: string;
  labelKey: string;
  nav: (n: any) => void;
}

const MODULES: ModuleOption[] = [
  {
    icon: 'calendar',
    color: '#3b5a75',
    labelKey: 'quickCreate.moduleEvent',
    nav: (n) => n.navigate('Events', { screen: 'EventsList', params: { openAddEvent: true } }),
  },
  {
    icon: 'medication',
    color: MODULE_COLORS.health,
    labelKey: 'quickCreate.moduleHealth',
    nav: (n) => n.navigate('Trips', { screen: 'HealthSpace', params: { openAddSection: 'appointments', _t: Date.now() } }),
  },
  {
    icon: 'pet',
    color: MODULE_COLORS.pets,
    labelKey: 'quickCreate.moduleVet',
    nav: (n) => n.navigate('Trips', { screen: 'PetSpace', params: { openAddSection: 'vetVisits', _t: Date.now() } }),
  },
  {
    icon: 'school',
    color: MODULE_COLORS.school,
    labelKey: 'quickCreate.moduleSchool',
    nav: (n) => n.navigate('Trips', { screen: 'SchoolSpace', params: { openAddSection: 'activities', _t: Date.now() } }),
  },
  {
    icon: 'kindergarten',
    color: MODULE_COLORS.kindergarten,
    labelKey: 'quickCreate.moduleKindergarten',
    nav: (n) => n.navigate('Trips', { screen: 'KindergartenSpace', params: { openAddSection: 'activities', _t: Date.now() } }),
  },
  {
    icon: 'house',
    color: MODULE_COLORS.home,
    labelKey: 'quickCreate.moduleService',
    nav: (n) => n.navigate('Trips', { screen: 'HomeSpace', params: { openAddSection: 'services', _t: Date.now() } }),
  },
  {
    icon: 'transport',
    color: MODULE_COLORS.trips,
    labelKey: 'quickCreate.moduleTrip',
    nav: (n) => n.navigate('Trips', { screen: 'AddTrip', params: { _t: Date.now() } }),
  },
];

function getVoiceNav(mod: ModuleOption): (n: any) => void {
  if (mod.labelKey === 'quickCreate.moduleHealth') return (n) => n.navigate('Events', { screen: 'VoiceActivity', params: { type: 'healthAppointment', moduleColor: MODULE_COLORS.health, _t: Date.now() } });
  if (mod.labelKey === 'quickCreate.moduleVet') return (n) => n.navigate('Events', { screen: 'VoiceActivity', params: { type: 'vetVisit', moduleColor: MODULE_COLORS.pets, _t: Date.now() } });
  if (mod.labelKey === 'quickCreate.moduleSchool') return (n) => n.navigate('Events', { screen: 'VoiceActivity', params: { type: 'schoolActivity', moduleColor: MODULE_COLORS.school, _t: Date.now() } });
  if (mod.labelKey === 'quickCreate.moduleKindergarten') return (n) => n.navigate('Events', { screen: 'VoiceActivity', params: { type: 'kindergartenActivity', moduleColor: MODULE_COLORS.kindergarten, _t: Date.now() } });
  if (mod.labelKey === 'quickCreate.moduleEvent') return (n) => n.navigate('Events', { screen: 'VoiceEvent', params: { _t: Date.now() } });
  return mod.nav;
}

function getPhotoNav(mod: ModuleOption): (n: any) => void {
  if (mod.labelKey === 'quickCreate.moduleHealth') return (n) => n.navigate('Events', { screen: 'PhotoActivity', params: { type: 'healthAppointment', moduleColor: MODULE_COLORS.health, _t: Date.now() } });
  if (mod.labelKey === 'quickCreate.moduleVet') return (n) => n.navigate('Events', { screen: 'PhotoActivity', params: { type: 'vetVisit', moduleColor: MODULE_COLORS.pets, _t: Date.now() } });
  if (mod.labelKey === 'quickCreate.moduleSchool') return (n) => n.navigate('Events', { screen: 'PhotoActivity', params: { type: 'schoolActivity', moduleColor: MODULE_COLORS.school, _t: Date.now() } });
  if (mod.labelKey === 'quickCreate.moduleKindergarten') return (n) => n.navigate('Events', { screen: 'PhotoActivity', params: { type: 'kindergartenActivity', moduleColor: MODULE_COLORS.kindergarten, _t: Date.now() } });
  if (mod.labelKey === 'quickCreate.moduleEvent') return (n) => n.navigate('Events', { screen: 'PhotoEvent', params: { _t: Date.now() } });
  return mod.nav;
}

const MODE_LABELS: Record<Mode, string> = {
  manual: 'quickCreate.modeManual',
  voice: 'quickCreate.modeVoice',
  photo: 'quickCreate.modePhoto',
};

export const QuickCreateModal: React.FC<QuickCreateModalProps> = React.memo(({ visible, onClose, navigation }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [selectedMode, setSelectedMode] = useState<Mode>(null);

  const navigateAndClose = useCallback((navigateFn: () => void) => {
    onClose();
    setTimeout(() => {
      navigateFn();
      setSelectedMode(null);
    }, 300);
  }, [onClose]);

  const handleClose = useCallback(() => {
    setSelectedMode(null);
    onClose();
  }, [onClose]);

  const getNavForMode = useCallback((mod: ModuleOption) => {
    if (selectedMode === 'voice') return getVoiceNav(mod);
    if (selectedMode === 'photo') return getPhotoNav(mod);
    return mod.nav;
  }, [selectedMode]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
              <View style={styles.handle} />

              {/* Header */}
              <View style={styles.header}>
                {selectedMode ? (
                  <TouchableOpacity onPress={() => setSelectedMode(null)} style={styles.backBtn}>
                    <Text style={{ color: colors.accent, fontSize: 14, fontWeight: '600' }}>← {t('quickCreate.back')}</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={[styles.title, { color: colors.text }]}>{t('quickCreate.title')}</Text>
                )}
                <TouchableOpacity style={[styles.closeBtn, { borderColor: colors.textSecondary }]} onPress={handleClose}>
                  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.textSecondary} strokeWidth="2.5" strokeLinecap="round">
                    <Line x1="18" y1="6" x2="6" y2="18"/>
                    <Line x1="6" y1="6" x2="18" y2="18"/>
                  </Svg>
                </TouchableOpacity>
              </View>

              {/* Default view: AI + 3 action buttons */}
              {!selectedMode && (
                <View style={styles.content}>
                  <TouchableOpacity
                    style={styles.aiRow}
                    onPress={() => navigateAndClose(() => navigation.navigate('Trips', { screen: 'AIAssistant', params: { _t: Date.now() } }))}
                    activeOpacity={0.6}
                  >
                    <View style={[styles.aiIconWrap, { backgroundColor: MODULE_COLORS.home + '18' }]}>
                      <AppIcon name="ai" size={20} color={MODULE_COLORS.home} />
                    </View>
                    <Text style={[styles.aiLabel, { color: MODULE_COLORS.home }]}>{t('quickCreate.aiAssistant')}</Text>
                    <View style={[styles.aiStartBtn, { backgroundColor: MODULE_COLORS.home }]}>
                      <Text style={styles.aiStartBtnText}>{t('quickCreate.openAssistant')}</Text>
                    </View>
                  </TouchableOpacity>

                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t('quickCreate.createNew')}</Text>

                  <View style={styles.actionRow}>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.accent + '10' }]} onPress={() => setSelectedMode('manual')} activeOpacity={0.6}>
                      <AppIcon name="pencil" size={24} color={colors.accent} />
                      <Text style={[styles.actionLabel, { color: colors.accent }]}>{t('quickCreate.newEvent')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.accent + '10' }]} onPress={() => setSelectedMode('voice')} activeOpacity={0.6}>
                      <AppIcon name="microphone" size={24} color={colors.accent} />
                      <Text style={[styles.actionLabel, { color: colors.accent }]}>{t('quickCreate.voiceEvent')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.accent + '10' }]} onPress={() => setSelectedMode('photo')} activeOpacity={0.6}>
                      <AppIcon name="camera" size={24} color={colors.accent} />
                      <Text style={[styles.actionLabel, { color: colors.accent }]}>{t('quickCreate.photoEvent')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Step 2: Module selection */}
              {selectedMode && (
                <View style={styles.content}>
                  <Text style={[styles.modeTitle, { color: colors.text }]}>{t(MODE_LABELS[selectedMode])}</Text>
                  <View style={styles.moduleList}>
                    {MODULES.map((mod) => (
                      <TouchableOpacity
                        key={mod.labelKey}
                        style={[styles.moduleItem, { backgroundColor: colors.surface }]}
                        onPress={() => navigateAndClose(() => getNavForMode(mod)(navigation))}
                        activeOpacity={0.6}
                      >
                        <View style={[styles.moduleIconWrap, { backgroundColor: mod.color + '15' }]}>
                          <AppIcon name={mod.icon} size={22} color={mod.color} />
                        </View>
                        <Text style={[styles.moduleName, { color: mod.color }]}>{t(mod.labelKey)}</Text>
                        <Text style={[styles.moduleArrow, { color: colors.textDisabled }]}>&rsaquo;</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#ddd', alignSelf: 'center', marginTop: 10 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingBottom: 8 },
  title: { fontSize: 20, fontWeight: '700' },
  backBtn: { paddingVertical: 4 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 12, paddingBottom: 20 },
  aiRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12 },
  aiIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  aiLabel: { fontSize: 14, fontWeight: '600', flex: 1 },
  aiStartBtn: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 8 },
  aiStartBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  divider: { height: 1, marginVertical: 8, marginHorizontal: 4 },
  sectionLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 4, paddingBottom: 8 },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 16, borderRadius: 12 },
  actionLabel: { fontSize: 12, fontWeight: '600' },
  modeTitle: { fontSize: 16, fontWeight: '700', paddingHorizontal: 4, paddingBottom: 10 },
  moduleList: { gap: 2 },
  moduleItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 10, borderRadius: 12 },
  moduleIconWrap: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  moduleName: { fontSize: 15, fontWeight: '600', flex: 1 },
  moduleArrow: { fontSize: 18 },
});
