import React from 'react';
import { View, Text, TouchableOpacity, Modal, TouchableWithoutFeedback, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';

interface QuickCreateModalProps {
  visible: boolean;
  onClose: () => void;
  navigation: any;
}

interface CreateOption {
  icon: string;
  labelKey: string;
  descKey: string;
  onPress: () => void;
}

interface CreateSection {
  icon: string;
  titleKey: string;
  options: CreateOption[];
}

export const QuickCreateModal: React.FC<QuickCreateModalProps> = React.memo(({ visible, onClose, navigation }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const navigateAndClose = (navigateFn: () => void) => {
    onClose();
    setTimeout(navigateFn, 300);
  };

  const sections: CreateSection[] = [
    {
      icon: '📅',
      titleKey: 'quickCreate.events',
      options: [
        {
          icon: '📝',
          labelKey: 'quickCreate.newEvent',
          descKey: 'quickCreate.newEventDesc',
          onPress: () => navigateAndClose(() => navigation.navigate('Events', { screen: 'AddEvent' })),
        },
        {
          icon: '🎤',
          labelKey: 'quickCreate.voiceEvent',
          descKey: 'quickCreate.voiceEventDesc',
          onPress: () => navigateAndClose(() => navigation.navigate('Events', { screen: 'VoiceEvent' })),
        },
        {
          icon: '📷',
          labelKey: 'quickCreate.photoEvent',
          descKey: 'quickCreate.photoEventDesc',
          onPress: () => navigateAndClose(() => navigation.navigate('Events', { screen: 'PhotoEvent' })),
        },
      ],
    },
    {
      icon: '🏥',
      titleKey: 'quickCreate.health',
      options: [
        {
          icon: '🩺',
          labelKey: 'quickCreate.healthAppointment',
          descKey: 'quickCreate.healthAppointmentDesc',
          onPress: () => navigateAndClose(() => navigation.navigate('Trips', { screen: 'HealthSpace', params: { openAddSection: 'appointments' } })),
        },
        {
          icon: '💉',
          labelKey: 'quickCreate.healthVaccination',
          descKey: 'quickCreate.healthVaccinationDesc',
          onPress: () => navigateAndClose(() => navigation.navigate('Trips', { screen: 'HealthSpace', params: { openAddSection: 'vaccinations' } })),
        },
      ],
    },
    {
      icon: '🐾',
      titleKey: 'quickCreate.pets',
      options: [
        {
          icon: '🏥',
          labelKey: 'quickCreate.petVetVisit',
          descKey: 'quickCreate.petVetVisitDesc',
          onPress: () => navigateAndClose(() => navigation.navigate('Trips', { screen: 'PetSpace', params: { openAddSection: 'vetVisits' } })),
        },
        {
          icon: '💉',
          labelKey: 'quickCreate.petVaccination',
          descKey: 'quickCreate.petVaccinationDesc',
          onPress: () => navigateAndClose(() => navigation.navigate('Trips', { screen: 'PetSpace', params: { openAddSection: 'vaccinations' } })),
        },
      ],
    },
    {
      icon: '✈️',
      titleKey: 'quickCreate.trips',
      options: [
        {
          icon: '🧳',
          labelKey: 'quickCreate.newTrip',
          descKey: 'quickCreate.newTripDesc',
          onPress: () => navigateAndClose(() => navigation.navigate('Trips', { screen: 'AddTrip' })),
        },
      ],
    },
  ];

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
                {sections.map((section, sIdx) => (
                  <View key={sIdx} style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionIcon}>{section.icon}</Text>
                      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t(section.titleKey)}</Text>
                    </View>
                    {section.options.map((option, oIdx) => (
                      <TouchableOpacity key={oIdx} style={[styles.option, { backgroundColor: colors.surface }]} onPress={option.onPress} activeOpacity={0.7}>
                        <View style={[styles.optionIcon, { backgroundColor: colors.inputBackground }]}>
                          <Text style={styles.optionEmoji}>{option.icon}</Text>
                        </View>
                        <View style={styles.optionText}>
                          <Text style={[styles.optionLabel, { color: colors.text }]}>{t(option.labelKey)}</Text>
                          <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>{t(option.descKey)}</Text>
                        </View>
                        <Text style={[styles.optionArrow, { color: colors.textDisabled }]}>›</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </ScrollView>
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
  sectionIcon: {
    fontSize: 16,
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
  optionEmoji: {
    fontSize: 18,
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
