import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, TextInput, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useUserStore } from '../store/userStore';
import { useTheme } from '../theme/ThemeContext';
import { addHealthAppointment } from '../services/healthService';
import { addVetVisit } from '../services/petService';
import { addSchoolActivity } from '../services/schoolService';
import { addKindergartenActivity } from '../services/kindergartenService';
import { getReminderOptions } from '../constants/eventOptions';
import { getErrorMessage } from '../utils/validation';
import { crossAlert } from '../utils/alert';
import { useTranslation } from 'react-i18next';
import { DatePickerModal } from '../components/DatePickerModal';
import { ActionModal } from '../components/ActionModal';
import { sanitizeInput } from '../utils/validation';
import { IMAGE_QUALITY } from '../constants/limits';
import { auth } from '../services/firebase';

type ActivityType = 'healthAppointment' | 'vetVisit' | 'schoolActivity' | 'kindergartenActivity';

interface PhotoActivityScreenProps {
  navigation: any;
  route: {
    params: {
      type: ActivityType;
      moduleColor: string;
      petId?: string;
      childId?: string;
      yearId?: string;
    };
  };
}

interface ParsedActivity {
  title: string;
  description: string;
  dateFrom: string;
  dateTo: string | null;
  startTime: string;
  endTime: string | null;
  location: string;
  reminder: number;
  person?: string;
  doctor?: string;
  activityType?: 'tur' | 'aktivitet' | 'møte';
}

interface EditableActivity extends ParsedActivity {
  showEndDate: boolean;
  showEndTime: boolean;
  checked: boolean;
}

const CLOUD_FUNCTION_URL = 'https://us-central1-familiesenter-837bb.cloudfunctions.net/photoToData';

const ACTIVITY_TYPE_CONFIG: Record<ActivityType, {
  titleKey: string;
  instructionKey: string;
  createSuccessKey: string;
  hasPerson: boolean;
  hasDoctor: boolean;
  hasActivityType: boolean;
}> = {
  healthAppointment: {
    titleKey: 'photoActivity.healthAppointmentTitle',
    instructionKey: 'photoActivity.healthAppointmentInstruction',
    createSuccessKey: 'photoActivity.healthAppointmentCreated',
    hasPerson: true,
    hasDoctor: true,
    hasActivityType: false,
  },
  vetVisit: {
    titleKey: 'photoActivity.vetVisitTitle',
    instructionKey: 'photoActivity.vetVisitInstruction',
    createSuccessKey: 'photoActivity.vetVisitCreated',
    hasPerson: false,
    hasDoctor: true,
    hasActivityType: false,
  },
  schoolActivity: {
    titleKey: 'photoActivity.schoolActivityTitle',
    instructionKey: 'photoActivity.schoolActivityInstruction',
    createSuccessKey: 'photoActivity.schoolActivityCreated',
    hasPerson: false,
    hasDoctor: false,
    hasActivityType: true,
  },
  kindergartenActivity: {
    titleKey: 'photoActivity.kindergartenActivityTitle',
    instructionKey: 'photoActivity.kindergartenActivityInstruction',
    createSuccessKey: 'photoActivity.kindergartenActivityCreated',
    hasPerson: false,
    hasDoctor: false,
    hasActivityType: true,
  },
};

export const PhotoActivityScreen: React.FC<PhotoActivityScreenProps> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const user = useUserStore((state) => state.user);
  const familyId = useUserStore((state) => state.familyId);

  const { type, moduleColor, petId, childId, yearId } = route.params;
  const config = ACTIVITY_TYPE_CONFIG[type];

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [activities, setActivities] = useState<EditableActivity[]>([]);
  const [creating, setCreating] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [activePicker, setActivePicker] = useState<{ activityIndex: number; field: 'dateFrom' | 'startTime' | 'dateTo' | 'endTime' } | null>(null);
  const [successModal, setSuccessModal] = useState<{ visible: boolean; title: string; subtitle: string }>({ visible: false, title: '', subtitle: '' });

  const toEditableActivity = (a: ParsedActivity): EditableActivity => ({
    ...a,
    showEndDate: !!a.dateTo,
    showEndTime: !!a.endTime,
    checked: true,
  });

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: IMAGE_QUALITY,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      sendToCloud(result.assets[0].base64 || null);
    }
  }, []);

  const takePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      crossAlert(t('common.alert'), t('photoActivity.cameraPermission'));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: IMAGE_QUALITY,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      sendToCloud(result.assets[0].base64 || null);
    }
  }, []);

  const sendToCloud = useCallback(async (base64: string | null) => {
    if (!base64) {
      crossAlert(t('common.error'), t('photoActivity.error'));
      return;
    }

    setProcessing(true);
    setActivities([]);
    setExpandedIndex(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      const currentUser = auth.currentUser;
      if (currentUser) {
        const idToken = await currentUser.getIdToken();
        headers['Authorization'] = `Bearer ${idToken}`;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);

      const apiResponse = await fetch(CLOUD_FUNCTION_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ imageBase64: base64, type }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        throw new Error(errorData.error || 'Server error');
      }

      const data = await apiResponse.json();
      const parsed: ParsedActivity[] = data.events || [];

      if (parsed.length === 0) {
        crossAlert(t('photoActivity.title'), t('photoActivity.noActivities'));
        setImageUri(null);
        return;
      }

      const editable = parsed.map(toEditableActivity);
      setActivities(editable);
      setExpandedIndex(editable.length === 1 ? 0 : null);
    } catch (error: any) {
      const msg = error?.name === 'AbortError'
        ? t('photoActivity.timeout')
        : error?.message?.includes('Failed to fetch')
        ? t('photoActivity.fetchError')
        : getErrorMessage(error);
      crossAlert(t('common.error'), msg);
    } finally {
      setProcessing(false);
    }
  }, [type, t]);

  const handleCreateActivity = useCallback(async (activity: EditableActivity, showSuccess = false) => {
    if (!user || creating) return;
    setCreating(true);

    try {
      if (type === 'healthAppointment') {
        await addHealthAppointment(familyId || '', {
          title: sanitizeInput(activity.title),
          person: activity.person ? sanitizeInput(activity.person) : '',
          doctor: activity.doctor ? sanitizeInput(activity.doctor) : undefined,
          dateFrom: activity.dateFrom,
          dateTo: activity.showEndDate && activity.dateTo ? activity.dateTo : undefined,
          startTime: activity.startTime,
          endTime: activity.showEndTime && activity.endTime ? activity.endTime : undefined,
          location: activity.location ? sanitizeInput(activity.location) : undefined,
          note: activity.description ? sanitizeInput(activity.description) : undefined,
          reminder: activity.reminder || undefined,
          status: 'planned',
        }, user.uid);
      } else if (type === 'vetVisit') {
        await addVetVisit({
          title: sanitizeInput(activity.title),
          petId: petId || '',
          familyId: familyId || '',
          doctor: activity.doctor ? sanitizeInput(activity.doctor) : undefined,
          dateFrom: activity.dateFrom,
          dateTo: activity.showEndDate && activity.dateTo ? activity.dateTo : undefined,
          startTime: activity.startTime,
          endTime: activity.showEndTime && activity.endTime ? activity.endTime : undefined,
          location: activity.location ? sanitizeInput(activity.location) : undefined,
          note: activity.description ? sanitizeInput(activity.description) : undefined,
          reminder: activity.reminder || undefined,
          status: 'planned',
        }, user.uid);
      } else if (type === 'schoolActivity') {
        await addSchoolActivity({
          title: sanitizeInput(activity.title),
          childId: childId || '',
          yearId: yearId || '',
          familyId: familyId || '',
          activityType: activity.activityType || 'aktivitet',
          dateFrom: activity.dateFrom,
          dateTo: activity.showEndDate && activity.dateTo ? activity.dateTo : undefined,
          startTime: activity.startTime || undefined,
          endTime: activity.showEndTime && activity.endTime ? activity.endTime : undefined,
          location: activity.location ? sanitizeInput(activity.location) : undefined,
          note: activity.description ? sanitizeInput(activity.description) : undefined,
          reminder: activity.reminder || undefined,
          createdBy: user.uid,
        });
      } else if (type === 'kindergartenActivity') {
        await addKindergartenActivity({
          title: sanitizeInput(activity.title),
          childId: childId || '',
          yearId: yearId || '',
          familyId: familyId || '',
          activityType: activity.activityType || 'aktivitet',
          dateFrom: activity.dateFrom,
          dateTo: activity.showEndDate && activity.dateTo ? activity.dateTo : undefined,
          startTime: activity.startTime || undefined,
          endTime: activity.showEndTime && activity.endTime ? activity.endTime : undefined,
          location: activity.location ? sanitizeInput(activity.location) : undefined,
          note: activity.description ? sanitizeInput(activity.description) : undefined,
          reminder: activity.reminder || undefined,
          createdBy: user.uid,
        });
      }

      if (showSuccess) {
        setSuccessModal({
          visible: true,
          title: t('common.success'),
          subtitle: t(config.createSuccessKey),
        });
      }
    } catch (error) {
      crossAlert(t('common.error'), getErrorMessage(error));
    } finally {
      setCreating(false);
    }
  }, [user, familyId, type, petId, childId, yearId, creating, t, config]);

  const handleCreateSelected = useCallback(async () => {
    const selected = activities.filter(a => a.checked);
    if (selected.length === 0) return;

    for (const activity of selected) {
      await handleCreateActivity(activity);
    }

    setSuccessModal({
      visible: true,
      title: t('common.success'),
      subtitle: `${selected.length} ${selected.length === 1 ? t('photoActivity.singleCreated') : t('photoActivity.multipleCreated')}!`,
    });
  }, [activities, handleCreateActivity, t]);

  const handleReset = useCallback(() => {
    setImageUri(null);
    setActivities([]);
    setExpandedIndex(null);
  }, []);

  const updateActivity = useCallback((index: number, updates: Partial<EditableActivity>) => {
    setActivities(prev => prev.map((a, i) => i === index ? { ...a, ...updates } : a));
  }, []);

  const toggleAllActivities = useCallback(() => {
    const allChecked = activities.every(a => a.checked);
    setActivities(prev => prev.map(a => ({ ...a, checked: !allChecked })));
  }, [activities]);

  const getPickerTitle = () => {
    if (!activePicker) return '';
    const titles: Record<string, string> = {
      dateFrom: t('common.pickDate'),
      startTime: t('common.pickTime'),
      dateTo: t('common.pickEndDate'),
      endTime: t('common.pickEndTime'),
    };
    return titles[activePicker.field];
  };

  const getPickerValue = () => {
    if (!activePicker) return '';
    const activity = activities[activePicker.activityIndex];
    const values: Record<string, string> = {
      dateFrom: activity.dateFrom,
      startTime: activity.startTime,
      dateTo: activity.dateTo || '',
      endTime: activity.endTime || '',
    };
    return values[activePicker.field];
  };

  const handlePickerSelect = (value: string) => {
    if (!activePicker) return;
    const { activityIndex, field } = activePicker;
    if (field === 'dateFrom') updateActivity(activityIndex, { dateFrom: value });
    else if (field === 'startTime') updateActivity(activityIndex, { startTime: value });
    else if (field === 'dateTo') updateActivity(activityIndex, { dateTo: value });
    else if (field === 'endTime') updateActivity(activityIndex, { endTime: value });
    setActivePicker(null);
  };

  const isTimePicker = activePicker?.field === 'startTime' || activePicker?.field === 'endTime';

  const renderExpandedCard = (activity: EditableActivity, index: number) => (
    <View key={`expanded-${index}`} style={[styles.expandedCard, { backgroundColor: colors.surface }]}>
      {imageUri && (
        <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />
      )}

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>{t('common.title')}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
          value={activity.title}
          onChangeText={(text) => updateActivity(index, { title: text })}
          placeholder={t('common.title')}
          placeholderTextColor={colors.textDisabled}
        />
      </View>

      {config.hasPerson && (
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>{t('health.person')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
            value={activity.person || ''}
            onChangeText={(text) => updateActivity(index, { person: text })}
            placeholder={t('health.person')}
            placeholderTextColor={colors.textDisabled}
          />
        </View>
      )}

      {config.hasDoctor && (
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>{t('health.doctor')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
            value={activity.doctor || ''}
            onChangeText={(text) => updateActivity(index, { doctor: text })}
            placeholder={t('health.doctor')}
            placeholderTextColor={colors.textDisabled}
          />
        </View>
      )}

      {config.hasActivityType && (
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>{t('school.activityType')}</Text>
          <View style={styles.activityTypeRow}>
            {(['tur', 'aktivitet', 'møte'] as const).map((at) => (
              <TouchableOpacity
                key={at}
                style={[styles.activityTypeChip, { backgroundColor: colors.inputBackground, borderColor: colors.border }, activity.activityType === at && { backgroundColor: moduleColor, borderColor: moduleColor }]}
                onPress={() => updateActivity(index, { activityType: at })}
              >
                <Text style={[styles.activityTypeText, { color: activity.activityType === at ? '#fff' : colors.text }]}>
                  {at === 'tur' ? t('school.activityTypeTur') : at === 'aktivitet' ? t('school.activityTypeAktivitet') : t('school.activityTypeMøte')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>{t('common.notes')}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }, styles.textArea]}
          value={activity.description}
          onChangeText={(text) => updateActivity(index, { description: text })}
          placeholder={t('common.notes')}
          placeholderTextColor={colors.textDisabled}
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>{t('common.address')}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
          value={activity.location}
          onChangeText={(text) => updateActivity(index, { location: text })}
          placeholder={t('common.address')}
          placeholderTextColor={colors.textDisabled}
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>{t('common.startDate')}</Text>
        <TouchableOpacity
          style={[styles.input, { backgroundColor: colors.inputBackground }]}
          onPress={() => setActivePicker({ activityIndex: index, field: 'dateFrom' })}
        >
          <Text style={[styles.dateText, { color: colors.text }]}>{activity.dateFrom}</Text>
        </TouchableOpacity>
      </View>

      {!activity.showEndDate ? (
        <TouchableOpacity onPress={() => updateActivity(index, { showEndDate: true })}>
          <Text style={[styles.addLink, { color: moduleColor }]}>+ {t('events.addEndDate')}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>{t('common.endDate')}</Text>
          <TouchableOpacity
            style={[styles.input, { backgroundColor: colors.inputBackground }]}
            onPress={() => setActivePicker({ activityIndex: index, field: 'dateTo' })}
          >
            <Text style={[styles.dateText, { color: colors.text }]}>{activity.dateTo || t('common.pickDate')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => updateActivity(index, { showEndDate: false, dateTo: null })}>
            <Text style={[styles.removeLink, { color: colors.danger }]}>{t('events.removeEndDate')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>{t('common.startTime')}</Text>
        <TouchableOpacity
          style={[styles.input, { backgroundColor: colors.inputBackground }]}
          onPress={() => setActivePicker({ activityIndex: index, field: 'startTime' })}
        >
          <Text style={[styles.dateText, { color: colors.text }]}>{activity.startTime}</Text>
        </TouchableOpacity>
      </View>

      {!activity.showEndTime ? (
        <TouchableOpacity onPress={() => updateActivity(index, { showEndTime: true })}>
          <Text style={[styles.addLink, { color: moduleColor }]}>+ {t('events.addEndTime')}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>{t('common.endTime')}</Text>
          <TouchableOpacity
            style={[styles.input, { backgroundColor: colors.inputBackground }]}
            onPress={() => setActivePicker({ activityIndex: index, field: 'endTime' })}
          >
            <Text style={[styles.dateText, { color: colors.text }]}>{activity.endTime || t('common.pickTime')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => updateActivity(index, { showEndTime: false, endTime: null })}>
            <Text style={[styles.removeLink, { color: colors.danger }]}>{t('events.removeEndTime')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>{t('events.reminder')}</Text>
        <View style={styles.reminderOptions}>
          {getReminderOptions().map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.reminderOption, { backgroundColor: colors.inputBackground, borderColor: colors.border }, activity.reminder === option.value && { backgroundColor: moduleColor, borderColor: moduleColor }]}
              onPress={() => updateActivity(index, { reminder: option.value })}
            >
              <Text style={[styles.reminderText, { color: activity.reminder === option.value ? '#fff' : colors.textSecondary }]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.expandedActions}>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: moduleColor, opacity: creating ? 0.6 : 1 }]}
          onPress={() => handleCreateActivity(activity, true)}
          disabled={creating}
        >
          <Text style={styles.primaryButtonText}>{creating ? t('photoActivity.creating') : t('photoActivity.createActivity')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSummaryCard = (activity: EditableActivity, index: number) => (
    <View key={`summary-${index}`} style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
      <TouchableOpacity
        style={styles.summaryHeader}
        onPress={() => setExpandedIndex(expandedIndex === index ? null : index)}
      >
        <TouchableOpacity
          style={[styles.checkbox, { borderColor: colors.border }, activity.checked && { backgroundColor: moduleColor, borderColor: moduleColor }]}
          onPress={() => updateActivity(index, { checked: !activity.checked })}
        >
          {activity.checked && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>
        <View style={styles.summaryInfo}>
          <Text style={[styles.summaryTitle, { color: colors.text }]}>{activity.title || t('common.title')}</Text>
          <Text style={[styles.summaryDetail, { color: colors.textSecondary }]}>
            📅 {activity.dateFrom}  🕐 {activity.startTime}
          </Text>
        </View>
        <Text style={[styles.expandIcon, { color: colors.textSecondary }]}>
          {expandedIndex === index ? '▼' : '▶'}
        </Text>
      </TouchableOpacity>
      {expandedIndex === index && renderExpandedCard(activity, index)}
    </View>
  );

  const selectedCount = activities.filter(a => a.checked).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { borderColor: moduleColor }]}>
          <Text style={{ color: moduleColor, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t(config.titleKey)}</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={[styles.helperSection, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t(config.instructionKey)}
        </Text>
      </View>

      <ScrollView style={styles.content}>
        {!imageUri && !processing && activities.length === 0 && (
          <View style={styles.pickContainer}>
            <TouchableOpacity style={[styles.pickButton, { backgroundColor: moduleColor }]} onPress={takePhoto}>
              <Text style={styles.pickIcon}>📷</Text>
              <Text style={styles.pickButtonText}>{t('photoEvent.takePhoto')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.pickButton, { backgroundColor: colors.inputBackground, borderColor: colors.border, borderWidth: 1 }]} onPress={pickImage}>
              <Text style={styles.pickIcon}>🖼️</Text>
              <Text style={[styles.pickButtonText, { color: colors.text }]}>{t('photoEvent.pickImage')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {processing && (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color={moduleColor} />
            <Text style={[styles.processingText, { color: colors.textSecondary }]}>
              {t('photoEvent.processing')}
            </Text>
          </View>
        )}

        {activities.length > 0 && !processing && (
          <View style={styles.resultsContainer}>
            {activities.length > 1 && (
              <View style={styles.resultsHeader}>
                <Text style={[styles.resultsCount, { color: colors.text }]}>
                  {activities.length} {t('photoActivity.activitiesFound')}
                </Text>
                <TouchableOpacity onPress={toggleAllActivities}>
                  <Text style={[styles.toggleAll, { color: moduleColor }]}>
                    {activities.every(a => a.checked) ? t('photoEvent.deselectAll') : t('photoEvent.selectAll')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {activities.map((activity, index) => (
              activities.length === 1
                ? <View key={index}>{renderExpandedCard(activity, index)}</View>
                : renderSummaryCard(activity, index)
            ))}

            {activities.length > 1 && (
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: moduleColor, opacity: selectedCount === 0 || creating ? 0.5 : 1 }]}
                onPress={handleCreateSelected}
                disabled={selectedCount === 0 || creating}
              >
                <Text style={styles.primaryButtonText}>
                  {creating ? t('photoActivity.creating') : `${t('photoActivity.createSelected')} (${selectedCount})`}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
              <Text style={[styles.resetButtonText, { color: moduleColor }]}>{t('photoEvent.tryAgain')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <DatePickerModal
        visible={activePicker !== null}
        title={getPickerTitle()}
        mode={isTimePicker ? 'time' : 'date'}
        dateOffset={isTimePicker ? 0 : -365}
        dateCount={isTimePicker ? 48 : 730}
        selectedValue={getPickerValue()}
        onSelect={handlePickerSelect}
        onClose={() => setActivePicker(null)}
      />

      <ActionModal
        visible={successModal.visible}
        title={successModal.title}
        subtitle={successModal.subtitle}
        onCancel={() => { setSuccessModal({ visible: false, title: '', subtitle: '' }); navigation.goBack(); }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  helperSection: {
    padding: 16,
    borderBottomWidth: 1,
  },
  subtitle: {
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  pickContainer: {
    gap: 16,
    marginTop: 40,
  },
  pickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 12,
    gap: 12,
  },
  pickIcon: {
    fontSize: 28,
  },
  pickButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  processingContainer: {
    alignItems: 'center',
    marginTop: 60,
    gap: 16,
  },
  processingText: {
    fontSize: 16,
  },
  resultsContainer: {
    gap: 12,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultsCount: {
    fontSize: 16,
    fontWeight: '600',
  },
  toggleAll: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryCard: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  summaryInfo: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  summaryDetail: {
    fontSize: 13,
    marginTop: 2,
  },
  expandIcon: {
    fontSize: 12,
  },
  expandedCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  dateText: {
    fontSize: 16,
  },
  addLink: {
    fontSize: 14,
    marginBottom: 16,
    fontWeight: '600',
  },
  removeLink: {
    fontSize: 13,
    marginTop: 6,
  },
  activityTypeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  activityTypeChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  activityTypeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  reminderOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reminderOption: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  reminderText: {
    fontSize: 13,
  },
  expandedActions: {
    gap: 10,
    marginTop: 8,
  },
  primaryButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resetButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
