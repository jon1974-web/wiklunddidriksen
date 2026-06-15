import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  TouchableWithoutFeedback,
  Linking,
  Platform,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Trip, TripHotel, TripFlight, TripRestaurant, TripActivity, TripDocument, TripLink } from '../types';
import { crossAlert } from '../utils/alert';
import {
  getTripHotels,
  addTripHotel,
  updateTripHotel,
  deleteTripHotel,
  getTripFlights,
  addTripFlight,
  updateTripFlight,
  deleteTripFlight,
  getTripRestaurants,
  addTripRestaurant,
  updateTripRestaurant,
  deleteTripRestaurant,
  getTripActivities,
  addTripActivity,
  updateTripActivity,
  deleteTripActivity,
  getTripDocuments,
  addTripDocument,
  updateTripDocument,
  deleteTripDocument,
  getTripLinks,
  addTripLink,
  updateTripLink,
  deleteTripLink,
  updateTrip,
} from '../services/tripService';
import { ref, deleteObject } from 'firebase/storage';
import { storage } from '../services/firebase';
import { formatDate, getTodayLocal } from '../utils/dateUtils';
import { sanitizeInput, getErrorMessage } from '../utils/validation';
import { GooglePlacesInput } from '../components/GooglePlacesInput';
import { TripDocumentUpload } from '../components/TripDocumentUpload';
import { DatePickerModal } from '../components/DatePickerModal';
import { TransportTile } from '../components/TransportTile';
import { AddressItemCard } from '../components/AddressItemCard';
import { TransportFormModal } from '../components/TransportFormModal';
import { LinkPreviewCard } from '../components/LinkPreviewCard';
import { TRIP_ICONS } from '../constants/tripIcons';
import { getForecast, getHistoricalWeather, wmoToEmoji, geocodeCity } from '../services/weatherService';
import { WeatherDay } from '../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

interface TripDetailScreenProps {
  navigation: any;
  route: any;
}

type ModalType = 'hotel' | 'flight' | 'restaurant' | 'activity' | 'document' | 'link' | 'tripEdit' | null;

export const TripDetailScreen: React.FC<TripDetailScreenProps> = ({ navigation, route }) => {
  const { trip: initialTrip } = route.params as { trip: Trip };
  const { colors } = useTheme();

  const [trip, setTrip] = useState<Trip>(initialTrip);
  const [hotels, setHotels] = useState<TripHotel[]>([]);
  const [flights, setFlights] = useState<TripFlight[]>([]);
  const [restaurants, setRestaurants] = useState<TripRestaurant[]>([]);
  const [activities, setActivities] = useState<TripActivity[]>([]);
  const [documents, setDocuments] = useState<TripDocument[]>([]);
  const [links, setLinks] = useState<TripLink[]>([]);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Trip edit form
  const [tripTitle, setTripTitle] = useState(trip.title);
  const [tripStartDate, setTripStartDate] = useState(trip.startDate);
  const [tripEndDate, setTripEndDate] = useState(trip.endDate);
  const [tripIcon, setTripIcon] = useState(trip.icon || '✈️');

  // Form state (consolidated)
  const emptyHotel = { name: '', address: '', phone: '' };
  const emptyFlight = { transportType: 'fly' as 'fly' | 'tog' | 'bil', type: 'utreise' as 'utreise' | 'hjemreise', airline: '', flightNumber: '', reference: '', wagon: '', driver: '', passengers: '', address: '', departureDate: '', departureTime: '', arrivalDate: '', arrivalTime: '', phone: '', note: '' };
  const emptyRest = { name: '', address: '', note: '' };
  const emptyAct = { name: '', date: '', time: '', address: '', note: '' };
  const emptyDoc = { title: '', note: '', fileUrl: '', fileName: '' };
  const emptyLink = { title: '', url: '' };

  const [hotelForm, setHotelForm] = useState(emptyHotel);
  const [flightForm, setFlightForm] = useState(emptyFlight);
  const [restForm, setRestForm] = useState(emptyRest);
  const [actForm, setActForm] = useState(emptyAct);
  const [docForm, setDocForm] = useState(emptyDoc);
  const [linkForm, setLinkForm] = useState(emptyLink);

  // Unified picker state
  type PickerField = 'tripStart' | 'tripEnd' | 'flightDepDate' | 'flightArrDate' | 'flightDepTime' | 'flightArrTime' | 'actDate' | 'actTime' | null;
  const [activePicker, setActivePicker] = useState<PickerField>(null);

  const handlePickerSelect = (value: string) => {
    if (activePicker === 'tripStart') setTripStartDate(value);
    else if (activePicker === 'tripEnd') setTripEndDate(value);
    else if (activePicker === 'flightDepDate') setFlightForm(f => ({ ...f, departureDate: value }));
    else if (activePicker === 'flightArrDate') setFlightForm(f => ({ ...f, arrivalDate: value }));
    else if (activePicker === 'flightDepTime') setFlightForm(f => ({ ...f, departureTime: value }));
    else if (activePicker === 'flightArrTime') setFlightForm(f => ({ ...f, arrivalTime: value }));
    else if (activePicker === 'actDate') setActForm(f => ({ ...f, date: value }));
    else if (activePicker === 'actTime') setActForm(f => ({ ...f, time: value }));
    setActivePicker(null);
  };

  const getPickerTitle = () => {
    const titles: Record<string, string> = {
      tripStart: 'Velg startdato', tripEnd: 'Velg sluttdato',
      flightDepDate: 'Velg avreisedato', flightArrDate: 'Velg ankomstdato',
      flightDepTime: 'Velg avreisetid', flightArrTime: 'Velg ankomsttid',
      actDate: 'Velg dato', actTime: 'Velg tid',
    };
    return activePicker ? titles[activePicker] : '';
  };

  const getPickerValue = () => {
    const values: Record<string, string> = {
      tripStart: tripStartDate, tripEnd: tripEndDate,
      flightDepDate: flightForm.departureDate, flightArrDate: flightForm.arrivalDate,
      flightDepTime: flightForm.departureTime, flightArrTime: flightForm.arrivalTime,
      actDate: actForm.date, actTime: actForm.time,
    };
    return activePicker ? values[activePicker] || '' : '';
  };

  const isDatePicker = activePicker && activePicker.includes('Date') || activePicker === 'tripStart' || activePicker === 'tripEnd';
  const isTimePicker = activePicker && activePicker.includes('Time');

  const loadSubData = useCallback(async () => {
    try {
      const [h, f, r, a, d, l] = await Promise.all([
        getTripHotels(trip.id),
        getTripFlights(trip.id),
        getTripRestaurants(trip.id),
        getTripActivities(trip.id),
        getTripDocuments(trip.id),
        getTripLinks(trip.id),
      ]);
      setHotels(h);
      setFlights(f);
      setRestaurants(r);
      setActivities(a);
      setDocuments(d);
      setLinks(l);
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  }, [trip.id]);

  useEffect(() => {
    loadSubData();
  }, [loadSubData]);

  const [weather, setWeather] = useState<WeatherDay[]>([]);
  const [weatherPage, setWeatherPage] = useState(0);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [refreshingWeather, setRefreshingWeather] = useState(false);
  const WEATHER_PAGE_SIZE = 5;

  const today = getTodayLocal();
  const isActive = trip.endDate >= today;

  const fetchWeather = useCallback(async (showRefresh = false) => {
    let lat = trip.latitude;
    let lon = trip.longitude;
    if (!lat || !lon) {
      const locationQuery = trip.country ? `${trip.city}, ${trip.country}` : trip.city;
      const coords = await geocodeCity(locationQuery);
      if (!coords) { setWeatherLoading(false); return; }
      lat = coords.latitude;
      lon = coords.longitude;
    }
    if (showRefresh) setRefreshingWeather(true);
    try {
      if (isActive) {
        const forecast = await getForecast(lat, lon, 16);
        setWeather(forecast);
      } else if (trip.weatherSummary && trip.weatherSummary.length > 0) {
        setWeather(trip.weatherSummary);
      } else {
        const historical = await getHistoricalWeather(lat, lon, trip.startDate, trip.endDate);
        setWeather(historical);
        if (historical.length > 0) {
          try {
            const tripRef = doc(db, 'trips', trip.id);
            await updateDoc(tripRef, { weatherSummary: historical });
          } catch {}
        }
      }
    } catch {}
    finally { setWeatherLoading(false); setRefreshingWeather(false); }
  }, [trip, isActive]);

  useEffect(() => { fetchWeather(); }, [fetchWeather]);

  const pagedWeather = weather.slice(weatherPage * WEATHER_PAGE_SIZE, (weatherPage + 1) * WEATHER_PAGE_SIZE);
  const weatherPages = Math.ceil(weather.length / WEATHER_PAGE_SIZE);

  const formatShortDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.toLocaleDateString('nb-NO', { weekday: 'short' })} ${d.getDate()}.${d.getMonth() + 1}`;
  };

  const resetForms = () => {
    setHotelForm(emptyHotel);
    setFlightForm(emptyFlight);
    setRestForm(emptyRest);
    setActForm(emptyAct);
    setDocForm(emptyDoc);
    setLinkForm(emptyLink);
    setEditingId(null);
  };

  const handleSaveTripEdit = useCallback(async () => {
    if (!tripTitle.trim()) {
      crossAlert('Error', 'Vennligst skriv en tittel');
      return;
    }
    if (tripEndDate < tripStartDate) {
      crossAlert('Error', 'Sluttdato kan ikke være før startdato');
      return;
    }
    try {
      await updateTrip(trip.id, {
        title: sanitizeInput(tripTitle),
        startDate: tripStartDate,
        endDate: tripEndDate,
        icon: tripIcon,
      });
      setTrip({ ...trip, title: tripTitle, startDate: tripStartDate, endDate: tripEndDate, icon: tripIcon });
      setActiveModal(null);
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  }, [trip, tripTitle, tripStartDate, tripEndDate, tripIcon]);

  const openAddModal = (modal: ModalType) => {
    resetForms();
    setActiveModal(modal);
  };

  const openEditModal = (modal: ModalType, item: any) => {
    resetForms();
    setEditingId(item.id);
    if (modal === 'hotel') {
      setHotelForm({ name: item.name || '', address: item.address || '', phone: item.phone || '' });
    } else if (modal === 'flight') {
      setFlightForm({
        transportType: item.transportType || 'fly',
        type: item.type || 'utreise',
        airline: item.airline || '',
        flightNumber: item.flightNumber || '',
        reference: item.reference || '',
        wagon: item.wagon || '',
        driver: item.driver || '',
        passengers: item.passengers || '',
        address: item.address || '',
        departureDate: item.departureDate || '',
        departureTime: item.departureTime || '',
        arrivalDate: item.arrivalDate || '',
        arrivalTime: item.arrivalTime || '',
        phone: item.phone || '',
        note: item.note || '',
      });
    } else if (modal === 'restaurant') {
      setRestForm({ name: item.name || '', address: item.address || '', note: item.note || '' });
    } else if (modal === 'activity') {
      setActForm({ name: item.name || '', date: item.date || '', time: item.time || '', address: item.address || '', note: item.note || '' });
    } else if (modal === 'document') {
      setDocForm({ title: item.title || '', note: item.note || '', fileUrl: item.fileUrl || '', fileName: item.fileName || '' });
    } else if (modal === 'link') {
      setLinkForm({ title: item.title || '', url: item.url || '' });
    }
    setActiveModal(modal);
  };

  // Hotel handlers
  const handleSaveHotel = useCallback(async () => {
    if (!hotelForm.name.trim()) {
      crossAlert('Error', 'Vennligst skriv et navn');
      return;
    }
    try {
      const data = { name: sanitizeInput(hotelForm.name), address: hotelForm.address.trim() ? sanitizeInput(hotelForm.address) : undefined, phone: hotelForm.phone.trim() ? sanitizeInput(hotelForm.phone) : undefined };
      if (editingId) {
        await updateTripHotel(trip.id, editingId, data);
      } else {
        await addTripHotel(trip.id, data);
      }
      resetForms();
      setActiveModal(null);
      loadSubData();
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  }, [trip.id, hotelForm, editingId, loadSubData]);

  // Flight handlers
  const handleSaveFlight = useCallback(async () => {
    try {
      const data = {
        transportType: flightForm.transportType,
        type: flightForm.type,
        airline: flightForm.airline.trim() ? sanitizeInput(flightForm.airline) : undefined,
        flightNumber: flightForm.flightNumber.trim() ? sanitizeInput(flightForm.flightNumber) : undefined,
        reference: flightForm.reference.trim() ? sanitizeInput(flightForm.reference) : undefined,
        wagon: flightForm.wagon.trim() ? sanitizeInput(flightForm.wagon) : undefined,
        driver: flightForm.driver.trim() ? sanitizeInput(flightForm.driver) : undefined,
        passengers: flightForm.passengers.trim() ? sanitizeInput(flightForm.passengers) : undefined,
        address: flightForm.address.trim() ? sanitizeInput(flightForm.address) : undefined,
        departureDate: flightForm.departureDate || undefined,
        departureTime: flightForm.departureTime || undefined,
        arrivalDate: flightForm.arrivalDate || undefined,
        arrivalTime: flightForm.arrivalTime || undefined,
        phone: flightForm.phone.trim() ? sanitizeInput(flightForm.phone) : undefined,
        note: flightForm.note.trim() ? sanitizeInput(flightForm.note) : undefined,
      };
      if (editingId) {
        await updateTripFlight(trip.id, editingId, data);
      } else {
        await addTripFlight(trip.id, data);
      }
      resetForms();
      setActiveModal(null);
      loadSubData();
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  }, [trip.id, flightForm, editingId, loadSubData]);

  // Restaurant handlers
  const handleSaveRestaurant = useCallback(async () => {
    if (!restForm.name.trim()) {
      crossAlert('Error', 'Vennligst skriv et navn');
      return;
    }
    try {
      const data = { name: sanitizeInput(restForm.name), address: restForm.address.trim() ? sanitizeInput(restForm.address) : undefined, note: restForm.note.trim() ? sanitizeInput(restForm.note) : undefined };
      if (editingId) {
        await updateTripRestaurant(trip.id, editingId, data);
      } else {
        await addTripRestaurant(trip.id, data);
      }
      resetForms();
      setActiveModal(null);
      loadSubData();
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  }, [trip.id, restForm, editingId, loadSubData]);

  // Activity handlers
  const handleSaveActivity = useCallback(async () => {
    if (!actForm.name.trim()) {
      crossAlert('Error', 'Vennligst skriv et navn');
      return;
    }
    try {
      const data = { name: sanitizeInput(actForm.name), date: actForm.date || undefined, time: actForm.time || undefined, address: actForm.address.trim() ? sanitizeInput(actForm.address) : undefined, note: actForm.note.trim() ? sanitizeInput(actForm.note) : undefined };
      if (editingId) {
        await updateTripActivity(trip.id, editingId, data);
      } else {
        await addTripActivity(trip.id, data);
      }
      resetForms();
      setActiveModal(null);
      loadSubData();
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  }, [trip.id, actForm, editingId, loadSubData]);

  // Document handlers
  const handleSaveDocument = useCallback(async () => {
    if (!docForm.title.trim()) {
      crossAlert('Error', 'Vennligst skriv en tittel');
      return;
    }
    try {
      if (editingId) {
        const oldDoc = documents.find(d => d.id === editingId);
        if (oldDoc?.fileUrl && oldDoc.fileUrl !== docForm.fileUrl) {
          try {
            const oldRef = ref(storage, oldDoc.fileUrl);
            await deleteObject(oldRef);
          } catch (e) {
            // Old file deletion failed — non-critical, continue with save
          }
        }
      }
      const data = { title: sanitizeInput(docForm.title), note: docForm.note.trim() ? sanitizeInput(docForm.note) : undefined, fileUrl: docForm.fileUrl || undefined, fileName: docForm.fileName || undefined };
      if (editingId) {
        await updateTripDocument(trip.id, editingId, data);
      } else {
        await addTripDocument(trip.id, data);
      }
      resetForms();
      setActiveModal(null);
      loadSubData();
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  }, [trip.id, docForm, editingId, loadSubData, documents]);

  // Link handlers
  const handleSaveLink = useCallback(async () => {
    if (!linkForm.title.trim()) {
      crossAlert('Error', 'Vennligst skriv en tittel');
      return;
    }
    if (!linkForm.url.trim()) {
      crossAlert('Error', 'Vennligst skriv en URL');
      return;
    }
    try {
      const data = { title: sanitizeInput(linkForm.title), url: linkForm.url.trim() };
      if (editingId) {
        await updateTripLink(trip.id, editingId, data);
      } else {
        await addTripLink(trip.id, data);
      }
      resetForms();
      setActiveModal(null);
      loadSubData();
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  }, [trip.id, linkForm, editingId, loadSubData]);

  // Delete handlers
  const confirmDelete = (title: string, onConfirm: () => void) => {
    crossAlert(`Slett ${title}`, 'Er du sikker?', [
      { text: 'Avbryt', style: 'cancel' },
      { text: 'Slett', style: 'destructive', onPress: onConfirm },
    ]);
  };

  const handleDeleteHotel = useCallback((id: string) => confirmDelete('hotell', async () => { await deleteTripHotel(trip.id, id); loadSubData(); }), [trip.id, loadSubData]);
  const handleDeleteFlight = useCallback((id: string) => confirmDelete('fly', async () => { await deleteTripFlight(trip.id, id); loadSubData(); }), [trip.id, loadSubData]);
  const handleDeleteRestaurant = useCallback((id: string) => confirmDelete('restaurant', async () => { await deleteTripRestaurant(trip.id, id); loadSubData(); }), [trip.id, loadSubData]);
  const handleDeleteActivity = useCallback((id: string) => confirmDelete('aktivitet', async () => { await deleteTripActivity(trip.id, id); loadSubData(); }), [trip.id, loadSubData]);
  const handleDeleteDocument = useCallback((id: string) => confirmDelete('dokument', async () => { await deleteTripDocument(trip.id, id); loadSubData(); }), [trip.id, loadSubData]);
  const handleDeleteLink = useCallback((id: string) => confirmDelete('lenke', async () => { await deleteTripLink(trip.id, id); loadSubData(); }), [trip.id, loadSubData]);

  const renderSectionHeader = (title: string, icon: string, onAdd: () => void) => (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {icon} {title}
      </Text>
      <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.accent }]} onPress={onAdd}>
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>
    </View>
  );

  const openFileUrl = async (url: string) => {
    if (Platform.OS === 'web') {
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      } catch {
        window.open(url, '_blank');
      }
    } else {
      Linking.openURL(url);
    }
  };

  const sortedTransportRows = useMemo(() => {
    const sorted = [...flights].sort((a, b) => {
      if (a.type === 'utreise' && b.type !== 'utreise') return -1;
      if (a.type !== 'utreise' && b.type === 'utreise') return 1;
      const dateA = a.departureDate || '';
      const dateB = b.departureDate || '';
      if (dateA < dateB) return -1;
      if (dateA > dateB) return 1;
      const timeA = a.departureTime || '';
      const timeB = b.departureTime || '';
      if (timeA < timeB) return -1;
      if (timeA > timeB) return 1;
      return 0;
    });
    const rows: TripFlight[][] = [];
    let i = 0;
    while (i < sorted.length) {
      const current = sorted[i];
      if (current.type === 'utreise') {
        const match = sorted.findIndex((s, idx) => idx > i && s.type === 'hjemreise');
        if (match !== -1) {
          rows.push([current, sorted[match]]);
          sorted.splice(match, 1);
        } else {
          rows.push([current]);
        }
      } else {
        rows.push([current]);
      }
      i++;
    }
    return rows;
  }, [flights]);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 8 }}>
        <Text style={{ color: colors.accent, fontSize: 20 }}>←</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tripCard, { backgroundColor: colors.surface }]}
        onPress={() => {
          setTripTitle(trip.title);
          setTripStartDate(trip.startDate);
          setTripEndDate(trip.endDate);
          setTripIcon(trip.icon || '✈️');
          setActiveModal('tripEdit');
        }}
      >
        <Text style={styles.tripIcon}>{trip.icon || '✈️'}</Text>
        <Text style={[styles.tripTitle, { color: colors.text }]}>{trip.title}</Text>
        <Text style={[styles.tripLocation, { color: colors.textSecondary }]}>
          {trip.city}{trip.country ? `, ${trip.country}` : ''}
        </Text>
        <Text style={[styles.tripDates, { color: colors.textSecondary }]}>
          {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
        </Text>
      </TouchableOpacity>

      {/* Vær */}
      {trip.city && (
        <View>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>🌤️ Vær</Text>
            {isActive && (
              <TouchableOpacity
                onPress={() => fetchWeather(true)}
                disabled={refreshingWeather}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={{ color: colors.accent, fontSize: 14 }}>{refreshingWeather ? '⟳ Oppdaterer...' : '↻ Oppdater'}</Text>
              </TouchableOpacity>
            )}
          </View>
          {weatherLoading ? (
            <Text style={[styles.emptySection, { color: colors.textDisabled }]}>Henter værdata...</Text>
          ) : weather.length === 0 ? (
            <Text style={[styles.emptySection, { color: colors.textDisabled }]}>Ingen værdata tilgjengelig</Text>
          ) : (
            <>
              <View style={styles.weatherHeaderRow}>
                <Text style={[styles.weatherHeaderText, { color: colors.textSecondary, flex: 3 }]} numberOfLines={1}>Dag</Text>
                <Text style={[styles.weatherHeaderText, { color: colors.textSecondary, flex: 1 }]} numberOfLines={1}>Var</Text>
                <Text style={[styles.weatherHeaderText, { color: colors.textSecondary, flex: 2, textAlign: 'center' }]} numberOfLines={1}>Temp</Text>
                <Text style={[styles.weatherHeaderText, { color: colors.textSecondary, flex: 1, textAlign: 'center' }]} numberOfLines={1}>UV</Text>
                <Text style={[styles.weatherHeaderText, { color: colors.textSecondary, flex: 1, textAlign: 'right' }]} numberOfLines={1}>Vann</Text>
              </View>
              {pagedWeather.map((day, i) => (
                <View key={day.date} style={[styles.weatherRow, i % 2 === 0 ? { backgroundColor: colors.surface } : { backgroundColor: colors.background }]}>
                  <Text style={[styles.weatherDayText, { color: colors.text, flex: 3 }]} numberOfLines={1}>{formatShortDate(day.date)}</Text>
                  <Text style={{ flex: 1, textAlign: 'center' }}>{wmoToEmoji(day.weatherCode)}</Text>
                  <Text style={[styles.weatherDayText, { color: colors.text, flex: 2, textAlign: 'center' }]} numberOfLines={1}>{day.tempMin}° / {day.tempMax}°</Text>
                  <Text style={[styles.weatherDayText, { color: day.uvIndex >= 8 ? '#E53935' : colors.text, flex: 1, textAlign: 'center' }]} numberOfLines={1}>{day.uvIndex}</Text>
                  <Text style={[styles.weatherDayText, { color: colors.textSecondary, flex: 1, textAlign: 'right' }]} numberOfLines={1}>{day.waterTemp != null ? `${day.waterTemp}°` : '—'}</Text>
                </View>
              ))}
              {weatherPages > 1 && (
                <View style={styles.weatherPagination}>
                  <TouchableOpacity disabled={weatherPage === 0} onPress={() => setWeatherPage((p) => p - 1)}>
                    <Text style={{ color: weatherPage === 0 ? colors.textDisabled : colors.accent }}>← Forrige</Text>
                  </TouchableOpacity>
                  <Text style={{ color: colors.textSecondary }}>{weatherPage + 1} / {weatherPages}</Text>
                  <TouchableOpacity disabled={weatherPage >= weatherPages - 1} onPress={() => setWeatherPage((p) => p + 1)}>
                    <Text style={{ color: weatherPage >= weatherPages - 1 ? colors.textDisabled : colors.accent }}>Neste →</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>
      )}

      {/* Transport */}
      {renderSectionHeader('Transport', '🚀', () => openAddModal('flight'))}
      {flights.length === 0 ? (
        <Text style={[styles.emptySection, { color: colors.textDisabled }]}>Ingen transport lagt til</Text>
      ) : (
        sortedTransportRows.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.transportGrid}>
            {row.map((f) => (
              <TransportTile
                key={f.id}
                flight={f}
                onPress={() => openEditModal('flight', f)}
                onLongPress={() => handleDeleteFlight(f.id)}
              />
            ))}
          </View>
        ))
      )}

      {/* Hotels */}
      {renderSectionHeader('Hotell', '🛏️', () => openAddModal('hotel'))}
      {hotels.length === 0 ? (
        <Text style={[styles.emptySection, { color: colors.textDisabled }]}>Ingen hoteller lagt til</Text>
      ) : (
        hotels.map((h) => (
          <AddressItemCard
            key={h.id}
            name={h.name}
            address={h.address}
            detail={h.phone}
            onPress={() => openEditModal('hotel', h)}
            onLongPress={() => handleDeleteHotel(h.id)}
          />
        ))
      )}

      {/* Restaurants */}
      {renderSectionHeader('Restauranter', '🍽️', () => openAddModal('restaurant'))}
      {restaurants.length === 0 ? (
        <Text style={[styles.emptySection, { color: colors.textDisabled }]}>Ingen restauranter lagt til</Text>
      ) : (
        restaurants.map((r) => (
          <AddressItemCard
            key={r.id}
            name={r.name}
            address={r.address}
            note={r.note}
            onPress={() => openEditModal('restaurant', r)}
            onLongPress={() => handleDeleteRestaurant(r.id)}
          />
        ))
      )}

      {/* Activities */}
      {renderSectionHeader('Aktiviteter', '🎯', () => openAddModal('activity'))}
      {activities.length === 0 ? (
        <Text style={[styles.emptySection, { color: colors.textDisabled }]}>Ingen aktiviteter lagt til</Text>
      ) : (
        activities.map((a) => (
          <AddressItemCard
            key={a.id}
            name={a.name}
            address={a.address}
            detail={(a.date || a.time) ? [a.date, a.time].filter(Boolean).join(' ') : undefined}
            note={a.note}
            onPress={() => openEditModal('activity', a)}
            onLongPress={() => handleDeleteActivity(a.id)}
          />
        ))
      )}

      {/* Documents */}
      {renderSectionHeader('Reisedokumenter', '📄', () => openAddModal('document'))}
      {documents.length === 0 ? (
        <Text style={[styles.emptySection, { color: colors.textDisabled }]}>Ingen dokumenter lagt til</Text>
      ) : (
        documents.map((d) => (
          <TouchableOpacity
            key={d.id}
            style={[styles.itemCard, { backgroundColor: colors.surface }]}
            onPress={() => openEditModal('document', d)}
            onLongPress={() => handleDeleteDocument(d.id)}
          >
            <View style={styles.docRow}>
              <View style={styles.docContent}>
                <Text style={[styles.itemName, { color: colors.text }]}>{d.title}</Text>
                {d.note && <Text style={[styles.itemNote, { color: colors.textSecondary }]}>{d.note}</Text>}
                {d.fileName && <Text style={[styles.itemDetail, { color: colors.accent }]}>📎 {d.fileName}</Text>}
              </View>
              <View style={styles.docActions}>
                {d.fileUrl && (
                  <TouchableOpacity onPress={() => openFileUrl(d.fileUrl)} style={styles.docAction}>
                    <Text style={{ color: colors.accent, fontSize: 14 }}>Åpne</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => handleDeleteDocument(d.id)} style={styles.docAction}>
                  <Text style={{ color: '#E53935', fontSize: 14 }}>Slett</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        ))
      )}

      {/* Links */}
      {renderSectionHeader('Nyttige lenker', '🔗', () => openAddModal('link'))}
      {links.length === 0 ? (
        <Text style={[styles.emptySection, { color: colors.textDisabled }]}>Ingen lenker lagt til</Text>
      ) : (
        links.map((l) => (
          <LinkPreviewCard
            key={l.id}
            link={l}
            onPress={() => Linking.openURL(l.url)}
            onLongPress={() => handleDeleteLink(l.id)}
          />
        ))
      )}

      <View style={{ height: 40 }} />

      {/* Trip Edit Modal */}
      <Modal visible={activeModal === 'tripEdit'} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setActiveModal(null)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                <Text style={[styles.modalTitle, { color: colors.text, borderBottomColor: colors.border }]}>
                  Rediger reise
                </Text>
                <ScrollView style={styles.modalScroll}>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>Tittel</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                      value={tripTitle}
                      onChangeText={setTripTitle}
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
                          style={[styles.iconOption, { backgroundColor: colors.inputBackground, borderColor: tripIcon === i ? colors.accent : colors.border }]}
                          onPress={() => setTripIcon(i)}
                        >
                          <Text style={styles.iconText}>{i}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>Fra dato</Text>
                    <TouchableOpacity
                      style={[styles.input, { backgroundColor: colors.inputBackground }]}
                      onPress={() => setActivePicker('tripStart')}
                    >
                      <Text style={{ color: tripStartDate ? colors.text : colors.textDisabled, fontSize: 16 }}>
                        {tripStartDate || 'Velg startdato'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>Til dato</Text>
                    <TouchableOpacity
                      style={[styles.input, { backgroundColor: colors.inputBackground }]}
                      onPress={() => setActivePicker('tripEnd')}
                    >
                      <Text style={{ color: tripEndDate ? colors.text : colors.textDisabled, fontSize: 16 }}>
                        {tripEndDate || 'Velg sluttdato'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.inputBackground }]} onPress={() => setActiveModal(null)}>
                    <Text style={[styles.modalButtonText, { color: colors.text }]}>Avbryt</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.accent }]} onPress={handleSaveTripEdit}>
                    <Text style={[styles.modalButtonText, { color: '#fff' }]}>Lagre</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Transport Modal */}
      <TransportFormModal
        visible={activeModal === 'flight'}
        editingId={editingId}
        flightForm={flightForm}
        onFlightFormChange={setFlightForm}
        onSave={handleSaveFlight}
        onCancel={() => setActiveModal(null)}
        onOpenPicker={(field) => setActivePicker(field)}
        colors={colors}
      />

      {/* Hotel Modal */}
      <Modal visible={activeModal === 'hotel'} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setActiveModal(null)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                <Text style={[styles.modalTitle, { color: colors.text, borderBottomColor: colors.border }]}>
                  {editingId ? 'Rediger hotell' : 'Legg til hotell'}
                </Text>
                <ScrollView style={styles.modalScroll}>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>Navn *</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                      value={hotelForm.name}
                      onChangeText={(v) => setHotelForm(f => ({ ...f, name: v }))}
                      placeholder="F.eks. Grand Hotel"
                      placeholderTextColor={colors.textDisabled}
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>Adresse</Text>
                    <GooglePlacesInput
                      value={hotelForm.address}
                      onChangeText={(v) => setHotelForm(f => ({ ...f, address: v }))}
                      placeholder="Søk etter adresse..."
                      onSelect={(v) => setHotelForm(f => ({ ...f, address: v }))}
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>Telefonnr</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                      value={hotelForm.phone}
                      onChangeText={(v) => setHotelForm(f => ({ ...f, phone: v }))}
                      placeholder="F.eks. +46 8 123 456"
                      placeholderTextColor={colors.textDisabled}
                      keyboardType="phone-pad"
                    />
                  </View>
                </ScrollView>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.inputBackground }]} onPress={() => setActiveModal(null)}>
                    <Text style={[styles.modalButtonText, { color: colors.text }]}>Avbryt</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.accent }]} onPress={handleSaveHotel}>
                    <Text style={[styles.modalButtonText, { color: '#fff' }]}>{editingId ? 'Lagre' : 'Legg til'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Restaurant Modal */}
      <Modal visible={activeModal === 'restaurant'} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setActiveModal(null)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                <Text style={[styles.modalTitle, { color: colors.text, borderBottomColor: colors.border }]}>
                  {editingId ? 'Rediger restaurant' : 'Legg til restaurant'}
                </Text>
                <ScrollView style={styles.modalScroll}>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>Navn *</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                      value={restForm.name}
                      onChangeText={(v) => setRestForm(f => ({ ...f, name: v }))}
                      placeholder="F.eks. pizza stedet"
                      placeholderTextColor={colors.textDisabled}
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>Adresse</Text>
                    <GooglePlacesInput
                      value={restForm.address}
                      onChangeText={(v) => setRestForm(f => ({ ...f, address: v }))}
                      placeholder="Søk etter adresse..."
                      onSelect={(v) => setRestForm(f => ({ ...f, address: v }))}
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>Notat</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                      value={restForm.note}
                      onChangeText={(v) => setRestForm(f => ({ ...f, note: v }))}
                      placeholder="F.eks. Reservasjon kl. 19"
                      placeholderTextColor={colors.textDisabled}
                    />
                  </View>
                </ScrollView>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.inputBackground }]} onPress={() => setActiveModal(null)}>
                    <Text style={[styles.modalButtonText, { color: colors.text }]}>Avbryt</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.accent }]} onPress={handleSaveRestaurant}>
                    <Text style={[styles.modalButtonText, { color: '#fff' }]}>{editingId ? 'Lagre' : 'Legg til'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Activity Modal */}
      <Modal visible={activeModal === 'activity'} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setActiveModal(null)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                <Text style={[styles.modalTitle, { color: colors.text, borderBottomColor: colors.border }]}>
                  {editingId ? 'Rediger aktivitet' : 'Legg til aktivitet'}
                </Text>
                <ScrollView style={styles.modalScroll}>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>Navn *</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                      value={actForm.name}
                      onChangeText={(v) => setActForm(f => ({ ...f, name: v }))}
                      placeholder="F.eks. Sightseeing"
                      placeholderTextColor={colors.textDisabled}
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>Dato</Text>
                    <TouchableOpacity
                      style={[styles.input, { backgroundColor: colors.inputBackground }]}
                      onPress={() => setActivePicker('actDate')}
                    >
                      <Text style={{ color: actForm.date ? colors.text : colors.textDisabled, fontSize: 16 }}>
                        {actForm.date || 'Velg dato'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>Tid</Text>
                    <TouchableOpacity
                      style={[styles.input, { backgroundColor: colors.inputBackground }]}
                      onPress={() => setActivePicker('actTime')}
                    >
                      <Text style={{ color: actForm.time ? colors.text : colors.textDisabled, fontSize: 16 }}>
                        {actForm.time || 'Velg tid'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>Adresse</Text>
                    <GooglePlacesInput
                      value={actForm.address}
                      onChangeText={(v) => setActForm(f => ({ ...f, address: v }))}
                      placeholder="Søk etter adresse..."
                      onSelect={(v) => setActForm(f => ({ ...f, address: v }))}
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>Notat</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                      value={actForm.note}
                      onChangeText={(v) => setActForm(f => ({ ...f, note: v }))}
                      placeholder="F.eks. Billetter bestilt"
                      placeholderTextColor={colors.textDisabled}
                    />
                  </View>
                </ScrollView>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.inputBackground }]} onPress={() => setActiveModal(null)}>
                    <Text style={[styles.modalButtonText, { color: colors.text }]}>Avbryt</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.accent }]} onPress={handleSaveActivity}>
                    <Text style={[styles.modalButtonText, { color: '#fff' }]}>{editingId ? 'Lagre' : 'Legg til'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Document Modal */}
      <Modal visible={activeModal === 'document'} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setActiveModal(null)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                <Text style={[styles.modalTitle, { color: colors.text, borderBottomColor: colors.border }]}>
                  {editingId ? 'Rediger dokument' : 'Legg til reisedokument'}
                </Text>
                <ScrollView style={styles.modalScroll}>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>Tittel *</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                      value={docForm.title}
                      onChangeText={(v) => setDocForm(f => ({ ...f, title: v }))}
                      placeholder="F.eks. Hotell booking"
                      placeholderTextColor={colors.textDisabled}
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>Notat</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                      value={docForm.note}
                      onChangeText={(v) => setDocForm(f => ({ ...f, note: v }))}
                      placeholder="F.eks. Bekreftelsesnummer"
                      placeholderTextColor={colors.textDisabled}
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>Fil</Text>
                    <TripDocumentUpload
                      tripId={trip.id}
                      onUploaded={(url, name) => {
                        setDocForm(f => ({ ...f, fileUrl: url, fileName: name }));
                      }}
                    />
                    {docForm.fileName ? (
                      <Text style={[styles.fileInfo, { color: colors.accent }]}>📎 {docForm.fileName}</Text>
                    ) : null}
                  </View>
                </ScrollView>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.inputBackground }]} onPress={() => setActiveModal(null)}>
                    <Text style={[styles.modalButtonText, { color: colors.text }]}>Avbryt</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.accent }]} onPress={handleSaveDocument}>
                    <Text style={[styles.modalButtonText, { color: '#fff' }]}>{editingId ? 'Lagre' : 'Legg til'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Link Modal */}
      <Modal visible={activeModal === 'link'} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setActiveModal(null)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                <Text style={[styles.modalTitle, { color: colors.text, borderBottomColor: colors.border }]}>
                  {editingId ? 'Rediger lenke' : 'Legg til lenke'}
                </Text>
                <ScrollView style={styles.modalScroll}>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>Tittel *</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                      value={linkForm.title}
                      onChangeText={(v) => setLinkForm(f => ({ ...f, title: v }))}
                      placeholder="F.eks. Hotell nettside"
                      placeholderTextColor={colors.textDisabled}
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>URL *</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                      value={linkForm.url}
                      onChangeText={(v) => setLinkForm(f => ({ ...f, url: v }))}
                      placeholder="https://..."
                      placeholderTextColor={colors.textDisabled}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="url"
                    />
                  </View>
                </ScrollView>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.inputBackground }]} onPress={() => setActiveModal(null)}>
                    <Text style={[styles.modalButtonText, { color: colors.text }]}>Avbryt</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.accent }]} onPress={handleSaveLink}>
                    <Text style={[styles.modalButtonText, { color: '#fff' }]}>{editingId ? 'Lagre' : 'Legg til'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Unified Date/Time Picker */}
      <DatePickerModal
        visible={activePicker !== null}
        title={getPickerTitle()}
        mode={isTimePicker ? 'time' : 'date'}
        selectedValue={getPickerValue()}
        onSelect={handlePickerSelect}
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
  tripCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tripIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  tripTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  tripLocation: {
    fontSize: 16,
    marginBottom: 4,
  },
  tripDates: {
    fontSize: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  emptySection: {
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 8,
    marginLeft: 4,
  },
  itemCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  itemNote: {
    fontSize: 14,
    marginBottom: 2,
  },
  itemDetail: {
    fontSize: 14,
  },
  docRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  docContent: {
    flex: 1,
    marginRight: 12,
  },
  docActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  docAction: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalScroll: {
    maxHeight: 500,
    paddingHorizontal: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
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
    padding: 14,
    borderRadius: 10,
    fontSize: 16,
  },
  fileInfo: {
    marginTop: 8,
    fontSize: 14,
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
  transportGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  weatherHeaderRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  weatherHeaderText: {
    fontSize: 11,
    fontWeight: '600',
  },
  weatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  weatherDayText: {
    fontSize: 13,
  },
  weatherPagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
});
