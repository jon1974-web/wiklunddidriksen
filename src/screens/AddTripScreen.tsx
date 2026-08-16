import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useUserStore } from '../store/userStore';
import { addTrip } from '../services/tripService';
import { getTodayLocal } from '../utils/dateUtils';
import { sanitizeInput, getErrorMessage } from '../utils/validation';
import { GooglePlacesInput } from '../components/GooglePlacesInput';
import { DatePickerModal } from '../components/DatePickerModal';
import { TRIP_ICONS } from '../constants/tripIcons';
import { MODULE_COLORS } from '../constants/moduleColors';
import { geocodeCity } from '../services/weatherService';
import { useTranslation } from 'react-i18next';

interface AddTripScreenProps {
  navigation: any;
}

export const AddTripScreen: React.FC<AddTripScreenProps> = ({ navigation }) => {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('Norge');
  const [startDate, setStartDate] = useState(getTodayLocal());
  const [endDate, setEndDate] = useState(getTodayLocal());
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [icon, setIcon] = useState('✈️');
  const [activePicker, setActivePicker] = useState<'start' | 'end' | 'startTime' | 'endTime' | null>(null);
  const user = useUserStore((state) => state.user);
  const familyId = useUserStore((state) => state.familyId);
  const { colors } = useTheme();

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Vennligst skriv en tittel');
      return;
    }
    if (!city.trim()) {
      Alert.alert('Error', 'Vennligst skriv en by');
      return;
    }
    if (endDate < startDate) {
      Alert.alert('Error', 'Sluttdato kan ikke være før startdato');
      return;
    }

    try {
      const coords = await geocodeCity(city);
      await addTrip({
        title: sanitizeInput(title),
        city: sanitizeInput(city),
        country: sanitizeInput(country),
        startDate,
        endDate,
        ...(startTime ? { startTime } : {}),
        ...(endTime ? { endTime } : {}),
        icon,
        ...(coords ? { latitude: coords.latitude, longitude: coords.longitude } : {}),
        createdBy: user?.uid || '',
      }, familyId || '');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error));
    }
  }, [title, city, country, startDate, endDate, startTime, endTime, icon, user, familyId, navigation]);

  return (
    <ScrollView style={[styles.container, { backgroundColor: MODULE_COLORS.tripsBg }]}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={[styles.backBtn, { borderColor: MODULE_COLORS.trips }]}
      >
        <Text style={[styles.backBtnText, { color: MODULE_COLORS.trips }]}>←</Text>
      </TouchableOpacity>
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <Text style={[styles.screenTitle, { color: colors.text }]}>{t('trips.addTrip')}</Text>
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>Tittel</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
          value={title}
          onChange={setTitle}
          onChangeText={setTitle}
          placeholder="F.eks. Sommerferie i Spania"
          placeholderTextColor={colors.textDisabled}
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>Ikon</Text>
        <View style={styles.iconGrid}>
          {TRIP_ICONS.map((i) => (
            <TouchableOpacity
              key={i}
              style={[styles.iconOption, { backgroundColor: colors.surface, borderColor: icon === i ? MODULE_COLORS.trips : colors.border }]}
              onPress={() => setIcon(i)}
            >
              <Text style={styles.iconText}>{i}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>{t('trips.city')}</Text>
        <GooglePlacesInput
          value={city}
          onChangeText={setCity}
          placeholder="F.eks. Barcelona"
          types={['(cities)']}
          onSelect={(address) => {
            const parts = address.split(',').map((p) => p.trim());
            setCity(parts[0] || address);
            if (parts.length > 1) {
              setCountry(parts[parts.length - 1]);
            }
          }}
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>{t('trips.country')}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
          value={country}
          onChangeText={setCountry}
          placeholder="F.eks. Spania"
          placeholderTextColor={colors.textDisabled}
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>Fra dato</Text>
        <TouchableOpacity
          style={[styles.input, { backgroundColor: colors.surface }]}
          onPress={() => setActivePicker('start')}
        >
          <Text style={[styles.dateText, { color: colors.text }]}>{startDate}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>Til dato</Text>
        <TouchableOpacity
          style={[styles.input, { backgroundColor: colors.surface }]}
          onPress={() => setActivePicker('end')}
        >
          <Text style={[styles.dateText, { color: colors.text }]}>{endDate}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>{t('common.startTime')} ({t('trips.optional')})</Text>
        <TouchableOpacity
          style={[styles.input, { backgroundColor: colors.surface }]}
          onPress={() => setActivePicker('startTime')}
        >
          <Text style={[styles.dateText, { color: startTime ? colors.text : colors.textDisabled }]}>
            {startTime || t('common.pickTime')}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>{t('common.endTime')} ({t('trips.optional')})</Text>
        <TouchableOpacity
          style={[styles.input, { backgroundColor: colors.surface }]}
          onPress={() => setActivePicker('endTime')}
        >
          <Text style={[styles.dateText, { color: endTime ? colors.text : colors.textDisabled }]}>
            {endTime || t('common.pickTime')}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={[styles.button, { backgroundColor: MODULE_COLORS.trips }]} onPress={handleSave}>
        <Text style={styles.buttonText}>{t('common.save')}</Text>
      </TouchableOpacity>

      <DatePickerModal
        visible={activePicker !== null}
        title={activePicker === 'start' ? 'Velg startdato' : activePicker === 'end' ? 'Velg sluttdato' : activePicker === 'startTime' ? 'Velg starttid' : 'Velg sluttid'}
        mode={activePicker === 'startTime' || activePicker === 'endTime' ? 'time' : 'date'}
        dateOffset={activePicker === 'startTime' || activePicker === 'endTime' ? 0 : -365}
        dateCount={activePicker === 'startTime' || activePicker === 'endTime' ? 48 : 730}
        selectedValue={activePicker === 'start' ? startDate : activePicker === 'end' ? endDate : activePicker === 'startTime' ? startTime : endTime}
        onSelect={(value) => {
          if (activePicker === 'start') setStartDate(value);
          else if (activePicker === 'end') setEndDate(value);
          else if (activePicker === 'startTime') setStartTime(value);
          else if (activePicker === 'endTime') setEndTime(value);
        }}
        onClose={() => setActivePicker(null)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  backBtnText: {
    fontSize: 18,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
  },
  dateText: {
    fontSize: 16,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 22,
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
