import React from 'react';
import { View, Text, TouchableOpacity, Modal, TouchableWithoutFeedback, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { AppIcon } from './AppIcon';
import { MODULE_COLORS } from '../constants/moduleColors';

interface QuickCreateModalProps {
  visible: boolean;
  onClose: () => void;
  navigation: any;
}

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
                <TouchableOpacity style={[styles.closeBtn, { backgroundColor: colors.inputBackground }]} onPress={onClose}>
                  <Text style={[styles.closeText, { color: colors.textSecondary }]}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

                {/* Avtaler */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <AppIcon name="calendar" size={18} color={colors.accent} />
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('quickCreate.events')}</Text>
                  </View>
                  <OptionRow
                    icon="calendar"
                    iconColor={colors.accent}
                    label={t('quickCreate.newEvent')}
                    desc={t('quickCreate.newEventDesc')}
                    onPress={() => navigateAndClose(() => navigation.navigate('Events', { screen: 'AddEvent' }))}
                    colors={colors}
                  />
                  <OptionRow
                    icon="calendar"
                    iconColor={colors.accent}
                    label={t('quickCreate.voiceEvent')}
                    desc={t('quickCreate.voiceEventDesc')}
                    onPress={() => navigateAndClose(() => navigation.navigate('Events', { screen: 'VoiceEvent' }))}
                    colors={colors}
                  />
                  <OptionRow
                    icon="calendar"
                    iconColor={colors.accent}
                    label={t('quickCreate.photoEvent')}
                    desc={t('quickCreate.photoEventDesc')}
                    onPress={() => navigateAndClose(() => navigation.navigate('Events', { screen: 'PhotoEvent' }))}
                    colors={colors}
                  />
                </View>

                {/* Helse */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <AppIcon name="medication" size={18} color={MODULE_COLORS.health} />
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('quickCreate.health')}</Text>
                  </View>
                  <OptionRow
                    icon="calendar"
                    iconColor={MODULE_COLORS.health}
                    label={t('quickCreate.healthAppointment')}
                    desc={t('quickCreate.healthAppointmentDesc')}
                    onPress={() => navigateAndClose(() => navigation.navigate('Trips', { screen: 'HealthSpace', params: { openAddSection: 'appointments' } }))}
                    colors={colors}
                  />
                  <OptionRow
                    icon="vaccination"
                    iconColor={MODULE_COLORS.health}
                    label={t('quickCreate.healthVaccination')}
                    desc={t('quickCreate.healthVaccinationDesc')}
                    onPress={() => navigateAndClose(() => navigation.navigate('Trips', { screen: 'HealthSpace', params: { openAddSection: 'vaccinations' } }))}
                    colors={colors}
                  />
                </View>

                {/* Kjæledyr */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <AppIcon name="pet" size={18} color={MODULE_COLORS.pets} />
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('quickCreate.pets')}</Text>
                  </View>
                  <OptionRow
                    icon="calendar"
                    iconColor={MODULE_COLORS.pets}
                    label={t('quickCreate.petVetVisit')}
                    desc={t('quickCreate.petVetVisitDesc')}
                    onPress={() => navigateAndClose(() => navigation.navigate('Trips', { screen: 'PetSpace', params: { openAddSection: 'vetVisits' } }))}
                    colors={colors}
                  />
                  <OptionRow
                    icon="vaccination"
                    iconColor={MODULE_COLORS.pets}
                    label={t('quickCreate.petVaccination')}
                    desc={t('quickCreate.petVaccinationDesc')}
                    onPress={() => navigateAndClose(() => navigation.navigate('Trips', { screen: 'PetSpace', params: { openAddSection: 'vaccinations' } }))}
                    colors={colors}
                  />
                </View>

                {/* Reiser */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <AppIcon name="transport" size={18} color={MODULE_COLORS.trips} />
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('quickCreate.trips')}</Text>
                  </View>
                  <OptionRow
                    icon="transport"
                    iconColor={MODULE_COLORS.trips}
                    label={t('quickCreate.newTrip')}
                    desc={t('quickCreate.newTripDesc')}
                    onPress={() => navigateAndClose(() => navigation.navigate('Trips', { screen: 'AddTrip' }))}
                    colors={colors}
                  />
                </View>

              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
});

const OptionRow = ({ icon, iconColor, label, desc, onPress, colors }: {
  icon: string;
  iconColor: string;
  label: string;
  desc: string;
  onPress: () => void;
  colors: any;
}) => (
  <TouchableOpacity style={[styles.option, { backgroundColor: colors.surface }]} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.optionIcon, { backgroundColor: iconColor + '18' }]}>
      <AppIcon name={icon as any} size={20} color={iconColor} />
    </View>
    <View style={styles.optionText}>
      <Text style={[styles.optionLabel, { color: colors.text }]}>{label}</Text>
      <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>{desc}</Text>
    </View>
    <Text style={[styles.optionArrow, { color: colors.textDisabled }]}>›</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
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
    paddingBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 34,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  optionDesc: {
    fontSize: 12,
    marginTop: 1,
  },
  optionArrow: {
    fontSize: 18,
    fontWeight: '300',
  },
});
