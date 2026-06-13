import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  TouchableWithoutFeedback,
  Linking,
  Image,
  Platform,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Trip, TripHotel, TripFlight, TripRestaurant, TripActivity, TripDocument, TripLink } from '../types';
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
import { GOOGLE_MAPS_API_KEY } from '../constants/api';
import { MAP_ZOOM, MAP_SIZE } from '../constants/limits';

interface TripDetailScreenProps {
  navigation: any;
  route: any;
}

const TRIP_ICONS = ['✈️', '🏖️', '🏔️', '🏕️', '⛷️', '⛷️', '🚂', '🚗', '🚌', '🚢', '🌍', '🗺️', '⛰️', '🏂', '🏄', '🤿', '🎿', '🏕️', '🎒', '🧳'];

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
  const [showTripStartDatePicker, setShowTripStartDatePicker] = useState(false);
  const [showTripEndDatePicker, setShowTripEndDatePicker] = useState(false);

  // Hotel form
  const [hotelName, setHotelName] = useState('');
  const [hotelAddress, setHotelAddress] = useState('');
  const [hotelPhone, setHotelPhone] = useState('');

  // Flight/Transport form
  const [flightTransportType, setFlightTransportType] = useState<'fly' | 'tog' | 'bil'>('fly');
  const [flightType, setFlightType] = useState<'utreise' | 'hjemreise'>('utreise');
  const [flightAirline, setFlightAirline] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [flightReference, setFlightReference] = useState('');
  const [flightWagon, setFlightWagon] = useState('');
  const [flightDriver, setFlightDriver] = useState('');
  const [flightPassengers, setFlightPassengers] = useState('');
  const [flightAddress, setFlightAddress] = useState('');
  const [flightDepartureDate, setFlightDepartureDate] = useState('');
  const [flightDepartureTime, setFlightDepartureTime] = useState('');
  const [flightArrivalDate, setFlightArrivalDate] = useState('');
  const [flightArrivalTime, setFlightArrivalTime] = useState('');
  const [flightPhone, setFlightPhone] = useState('');
  const [flightNote, setFlightNote] = useState('');
  const [showFlightDepDatePicker, setShowFlightDepDatePicker] = useState(false);
  const [showFlightArrDatePicker, setShowFlightArrDatePicker] = useState(false);
  const [showFlightDepTimePicker, setShowFlightDepTimePicker] = useState(false);
  const [showFlightArrTimePicker, setShowFlightArrTimePicker] = useState(false);

  // Restaurant form
  const [restName, setRestName] = useState('');
  const [restAddress, setRestAddress] = useState('');
  const [restNote, setRestNote] = useState('');

  // Activity form
  const [actName, setActName] = useState('');
  const [actDate, setActDate] = useState('');
  const [actTime, setActTime] = useState('');
  const [actAddress, setActAddress] = useState('');
  const [actNote, setActNote] = useState('');
  const [showActDatePicker, setShowActDatePicker] = useState(false);
  const [showActTimePicker, setShowActTimePicker] = useState(false);

  // Document form
  const [docTitle, setDocTitle] = useState('');
  const [docNote, setDocNote] = useState('');
  const [docFileUrl, setDocFileUrl] = useState('');
  const [docFileName, setDocFileName] = useState('');

  // Link form
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

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
      Alert.alert('Error', getErrorMessage(error));
    }
  }, [trip.id]);

  useEffect(() => {
    loadSubData();
  }, [loadSubData]);

  const resetForms = () => {
    setHotelName('');
    setHotelAddress('');
    setHotelPhone('');
    setFlightTransportType('fly');
    setFlightType('utreise');
    setFlightAirline('');
    setFlightNumber('');
    setFlightReference('');
    setFlightWagon('');
    setFlightDriver('');
    setFlightPassengers('');
    setFlightAddress('');
    setFlightDepartureDate('');
    setFlightDepartureTime('');
    setFlightArrivalDate('');
    setFlightArrivalTime('');
    setFlightPhone('');
    setFlightNote('');
    setRestName('');
    setRestAddress('');
    setRestNote('');
    setActName('');
    setActDate('');
    setActTime('');
    setActAddress('');
    setActNote('');
    setDocTitle('');
    setDocNote('');
    setDocFileUrl('');
    setDocFileName('');
    setLinkTitle('');
    setLinkUrl('');
    setEditingId(null);
  };

  const handleSaveTripEdit = useCallback(async () => {
    if (!tripTitle.trim()) {
      Alert.alert('Error', 'Vennligst skriv en tittel');
      return;
    }
    if (tripEndDate < tripStartDate) {
      Alert.alert('Error', 'Sluttdato kan ikke være før startdato');
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
      Alert.alert('Error', getErrorMessage(error));
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
      setHotelName(item.name || '');
      setHotelAddress(item.address || '');
      setHotelPhone(item.phone || '');
    } else if (modal === 'flight') {
      setFlightTransportType(item.transportType || 'fly');
      setFlightType(item.type || 'utreise');
      setFlightAirline(item.airline || '');
      setFlightNumber(item.flightNumber || '');
      setFlightReference(item.reference || '');
      setFlightWagon(item.wagon || '');
      setFlightDriver(item.driver || '');
      setFlightPassengers(item.passengers || '');
      setFlightAddress(item.address || '');
      setFlightDepartureDate(item.departureDate || '');
      setFlightDepartureTime(item.departureTime || '');
      setFlightArrivalDate(item.arrivalDate || '');
      setFlightArrivalTime(item.arrivalTime || '');
      setFlightPhone(item.phone || '');
      setFlightNote(item.note || '');
    } else if (modal === 'restaurant') {
      setRestName(item.name || '');
      setRestAddress(item.address || '');
      setRestNote(item.note || '');
    } else if (modal === 'activity') {
      setActName(item.name || '');
      setActDate(item.date || '');
      setActTime(item.time || '');
      setActAddress(item.address || '');
      setActNote(item.note || '');
    } else if (modal === 'document') {
      setDocTitle(item.title || '');
      setDocNote(item.note || '');
      setDocFileUrl(item.fileUrl || '');
      setDocFileName(item.fileName || '');
    } else if (modal === 'link') {
      setLinkTitle(item.title || '');
      setLinkUrl(item.url || '');
    }
    setActiveModal(modal);
  };

  // Hotel handlers
  const handleSaveHotel = useCallback(async () => {
    if (!hotelName.trim()) {
      Alert.alert('Error', 'Vennligst skriv et navn');
      return;
    }
    try {
      const data = { name: sanitizeInput(hotelName), address: hotelAddress.trim() ? sanitizeInput(hotelAddress) : undefined, phone: hotelPhone.trim() ? sanitizeInput(hotelPhone) : undefined };
      if (editingId) {
        await updateTripHotel(trip.id, editingId, data);
      } else {
        await addTripHotel(trip.id, data);
      }
      resetForms();
      setActiveModal(null);
      loadSubData();
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error));
    }
  }, [trip.id, hotelName, hotelAddress, hotelPhone, editingId, loadSubData]);

  // Flight handlers
  const handleSaveFlight = useCallback(async () => {
    try {
      const data = {
        transportType: flightTransportType,
        type: flightType,
        airline: flightAirline.trim() ? sanitizeInput(flightAirline) : undefined,
        flightNumber: flightNumber.trim() ? sanitizeInput(flightNumber) : undefined,
        reference: flightReference.trim() ? sanitizeInput(flightReference) : undefined,
        wagon: flightWagon.trim() ? sanitizeInput(flightWagon) : undefined,
        driver: flightDriver.trim() ? sanitizeInput(flightDriver) : undefined,
        passengers: flightPassengers.trim() ? sanitizeInput(flightPassengers) : undefined,
        address: flightAddress.trim() ? sanitizeInput(flightAddress) : undefined,
        departureDate: flightDepartureDate || undefined,
        departureTime: flightDepartureTime || undefined,
        arrivalDate: flightArrivalDate || undefined,
        arrivalTime: flightArrivalTime || undefined,
        phone: flightPhone.trim() ? sanitizeInput(flightPhone) : undefined,
        note: flightNote.trim() ? sanitizeInput(flightNote) : undefined,
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
      Alert.alert('Error', getErrorMessage(error));
    }
  }, [trip.id, flightTransportType, flightType, flightAirline, flightNumber, flightReference, flightWagon, flightDriver, flightPassengers, flightAddress, flightDepartureDate, flightDepartureTime, flightArrivalDate, flightArrivalTime, flightPhone, flightNote, editingId, loadSubData]);

  // Restaurant handlers
  const handleSaveRestaurant = useCallback(async () => {
    if (!restName.trim()) {
      Alert.alert('Error', 'Vennligst skriv et navn');
      return;
    }
    try {
      const data = { name: sanitizeInput(restName), address: restAddress.trim() ? sanitizeInput(restAddress) : undefined, note: restNote.trim() ? sanitizeInput(restNote) : undefined };
      if (editingId) {
        await updateTripRestaurant(trip.id, editingId, data);
      } else {
        await addTripRestaurant(trip.id, data);
      }
      resetForms();
      setActiveModal(null);
      loadSubData();
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error));
    }
  }, [trip.id, restName, restAddress, restNote, editingId, loadSubData]);

  // Activity handlers
  const handleSaveActivity = useCallback(async () => {
    if (!actName.trim()) {
      Alert.alert('Error', 'Vennligst skriv et navn');
      return;
    }
    try {
      const data = { name: sanitizeInput(actName), date: actDate || undefined, time: actTime || undefined, address: actAddress.trim() ? sanitizeInput(actAddress) : undefined, note: actNote.trim() ? sanitizeInput(actNote) : undefined };
      if (editingId) {
        await updateTripActivity(trip.id, editingId, data);
      } else {
        await addTripActivity(trip.id, data);
      }
      resetForms();
      setActiveModal(null);
      loadSubData();
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error));
    }
  }, [trip.id, actName, actDate, actTime, actAddress, actNote, editingId, loadSubData]);

  // Document handlers
  const handleSaveDocument = useCallback(async () => {
    if (!docTitle.trim()) {
      Alert.alert('Error', 'Vennligst skriv en tittel');
      return;
    }
    try {
      if (editingId) {
        const oldDoc = documents.find(d => d.id === editingId);
        if (oldDoc?.fileUrl && oldDoc.fileUrl !== docFileUrl) {
          try {
            const oldRef = ref(storage, oldDoc.fileUrl);
            await deleteObject(oldRef);
          } catch (e) {
            console.log('Could not delete old file:', e);
          }
        }
      }
      const data = { title: sanitizeInput(docTitle), note: docNote.trim() ? sanitizeInput(docNote) : undefined, fileUrl: docFileUrl || undefined, fileName: docFileName || undefined };
      if (editingId) {
        await updateTripDocument(trip.id, editingId, data);
      } else {
        await addTripDocument(trip.id, data);
      }
      resetForms();
      setActiveModal(null);
      loadSubData();
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error));
    }
  }, [trip.id, docTitle, docNote, docFileUrl, docFileName, editingId, loadSubData, documents]);

  // Link handlers
  const handleSaveLink = useCallback(async () => {
    if (!linkTitle.trim()) {
      Alert.alert('Error', 'Vennligst skriv en tittel');
      return;
    }
    if (!linkUrl.trim()) {
      Alert.alert('Error', 'Vennligst skriv en URL');
      return;
    }
    try {
      const data = { title: sanitizeInput(linkTitle), url: linkUrl.trim() };
      if (editingId) {
        await updateTripLink(trip.id, editingId, data);
      } else {
        await addTripLink(trip.id, data);
      }
      resetForms();
      setActiveModal(null);
      loadSubData();
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error));
    }
  }, [trip.id, linkTitle, linkUrl, editingId, loadSubData]);

  // Delete handlers
  const confirmDelete = (title: string, onConfirm: () => void) => {
    Alert.alert(`Slett ${title}`, 'Er du sikker?', [
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

  const timeOptions = Array.from({ length: 48 }, (_, i) => {
    const h = Math.floor(i / 2);
    const m = (i % 2) * 30;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  });

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

      {/* Transport */}
      {renderSectionHeader('Transport', '🚀', () => openAddModal('flight'))}
      {flights.length === 0 ? (
        <Text style={[styles.emptySection, { color: colors.textDisabled }]}>Ingen transport lagt til</Text>
      ) : (
        [...flights].sort((a, b) => {
          if (a.type === 'utreise' && b.type !== 'utreise') return -1;
          if (a.type !== 'utreise' && b.type === 'utreise') return 1;
          return 0;
        }).map((f) => {
          const transportIcon = f.transportType === 'tog' ? '🚆' : f.transportType === 'bil' ? '🚗' : '✈️';
          return (
            <TouchableOpacity
              key={f.id}
              style={[styles.itemCard, { backgroundColor: colors.surface }]}
              onPress={() => openEditModal('flight', f)}
              onLongPress={() => handleDeleteFlight(f.id)}
            >
              <View style={styles.itemRow}>
                <View style={styles.itemContent}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    {f.type && (
                      <Text style={[styles.itemDetail, { color: f.type === 'utreise' ? colors.accent : '#E53935', fontWeight: '600' }]}>
                        {f.type === 'utreise' ? 'Utreise' : 'Hjemreise'}
                      </Text>
                    )}
                    <Text style={[styles.itemDetail, { color: colors.textSecondary }]}>{transportIcon}</Text>
                  </View>
                  {f.airline && <Text style={[styles.itemName, { color: colors.text }]}>{f.airline}</Text>}
                  {f.flightNumber && <Text style={[styles.itemDetail, { color: colors.accent }]}>{f.flightNumber}</Text>}
                  {f.reference && <Text style={[styles.itemDetail, { color: colors.textSecondary }]}>Ref: {f.reference}</Text>}
                  {f.wagon && <Text style={[styles.itemDetail, { color: colors.textSecondary }]}>{f.wagon}</Text>}
                  {f.driver && <Text style={[styles.itemDetail, { color: colors.textSecondary }]}>Fører: {f.driver}</Text>}
                  {f.address && <Text style={[styles.itemDetail, { color: colors.textSecondary }]}>{f.address}</Text>}
                  {f.departureDate || f.departureTime ? (
                    <Text style={[styles.itemDetail, { color: colors.textSecondary }]}>
                      {f.transportType === 'bil' ? '🔑' : '🛫'} {[f.departureDate, f.departureTime].filter(Boolean).join(' ')}
                    </Text>
                  ) : null}
                  {f.arrivalDate || f.arrivalTime ? (
                    <Text style={[styles.itemDetail, { color: colors.textSecondary }]}>
                      {f.transportType === 'bil' ? '📋' : '🛬'} {[f.arrivalDate, f.arrivalTime].filter(Boolean).join(' ')}
                    </Text>
                  ) : null}
                {f.phone && <Text style={[styles.itemDetail, { color: colors.textSecondary }]}>📞 {f.phone}</Text>}
                {f.note && <Text style={[styles.itemNote, { color: colors.textSecondary }]}>{f.note}</Text>}
              </View>
            </View>
          </TouchableOpacity>
          );
        })
      )}

      {/* Hotels */}
      {renderSectionHeader('Hotell', '🛏️', () => openAddModal('hotel'))}
      {hotels.length === 0 ? (
        <Text style={[styles.emptySection, { color: colors.textDisabled }]}>Ingen hoteller lagt til</Text>
      ) : (
        hotels.map((h) => {
          const hotelMapUrl = h.address
            ? `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(h.address)}&zoom=${MAP_ZOOM}&size=${MAP_SIZE}&markers=color:red%7C${encodeURIComponent(h.address)}&key=${GOOGLE_MAPS_API_KEY}`
            : null;
          return (
            <TouchableOpacity
              key={h.id}
              style={[styles.itemCard, { backgroundColor: colors.surface }]}
              onPress={() => openEditModal('hotel', h)}
              onLongPress={() => handleDeleteHotel(h.id)}
            >
              <View style={styles.itemRow}>
                <View style={styles.itemContent}>
                  <Text style={[styles.itemName, { color: colors.text }]}>{h.name}</Text>
                  {h.address && <Text style={[styles.itemDetail, { color: colors.textSecondary }]}>{h.address}</Text>}
                  {h.phone && <Text style={[styles.itemDetail, { color: colors.textSecondary }]}>{h.phone}</Text>}
                </View>
                {hotelMapUrl && (
                  <TouchableOpacity
                    style={styles.itemMapContainer}
                    onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(h.address!)}`)}
                  >
                    <Image source={{ uri: hotelMapUrl }} style={styles.itemMapImage} />
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          );
        })
      )}

      {/* Restaurants */}
      {renderSectionHeader('Restauranter', '🍽️', () => openAddModal('restaurant'))}
      {restaurants.length === 0 ? (
        <Text style={[styles.emptySection, { color: colors.textDisabled }]}>Ingen restauranter lagt til</Text>
      ) : (
        restaurants.map((r) => {
          const restMapUrl = r.address
            ? `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(r.address)}&zoom=${MAP_ZOOM}&size=${MAP_SIZE}&markers=color:red%7C${encodeURIComponent(r.address)}&key=${GOOGLE_MAPS_API_KEY}`
            : null;
          return (
            <TouchableOpacity
              key={r.id}
              style={[styles.itemCard, { backgroundColor: colors.surface }]}
              onPress={() => openEditModal('restaurant', r)}
              onLongPress={() => handleDeleteRestaurant(r.id)}
            >
              <View style={styles.itemRow}>
                <View style={styles.itemContent}>
                  <Text style={[styles.itemName, { color: colors.text }]}>{r.name}</Text>
                  {r.address && <Text style={[styles.itemDetail, { color: colors.textSecondary }]}>{r.address}</Text>}
                  {r.note && <Text style={[styles.itemNote, { color: colors.textSecondary }]}>{r.note}</Text>}
                </View>
                {restMapUrl && (
                  <TouchableOpacity
                    style={styles.itemMapContainer}
                    onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.address!)}`)}
                  >
                    <Image source={{ uri: restMapUrl }} style={styles.itemMapImage} />
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          );
        })
      )}

      {/* Activities */}
      {renderSectionHeader('Aktiviteter', '🎯', () => openAddModal('activity'))}
      {activities.length === 0 ? (
        <Text style={[styles.emptySection, { color: colors.textDisabled }]}>Ingen aktiviteter lagt til</Text>
      ) : (
        activities.map((a) => {
          const actMapUrl = a.address
            ? `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(a.address)}&zoom=${MAP_ZOOM}&size=${MAP_SIZE}&markers=color:red%7C${encodeURIComponent(a.address)}&key=${GOOGLE_MAPS_API_KEY}`
            : null;
          return (
            <TouchableOpacity
              key={a.id}
              style={[styles.itemCard, { backgroundColor: colors.surface }]}
              onPress={() => openEditModal('activity', a)}
              onLongPress={() => handleDeleteActivity(a.id)}
            >
              <View style={styles.itemRow}>
                <View style={styles.itemContent}>
                  <Text style={[styles.itemName, { color: colors.text }]}>{a.name}</Text>
                  {(a.date || a.time) && (
                    <Text style={[styles.itemDetail, { color: colors.textSecondary }]}>
                      {[a.date, a.time].filter(Boolean).join(' ')}
                    </Text>
                  )}
                  {a.address && <Text style={[styles.itemDetail, { color: colors.textSecondary }]}>{a.address}</Text>}
                  {a.note && <Text style={[styles.itemNote, { color: colors.textSecondary }]}>{a.note}</Text>}
                </View>
                {actMapUrl && (
                  <TouchableOpacity
                    style={styles.itemMapContainer}
                    onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.address!)}`)}
                  >
                    <Image source={{ uri: actMapUrl }} style={styles.itemMapImage} />
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          );
        })
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
          <TouchableOpacity
            key={l.id}
            style={[styles.itemCard, { backgroundColor: colors.surface }]}
            onPress={() => Linking.openURL(l.url)}
            onLongPress={() => handleDeleteLink(l.id)}
          >
            <Text style={[styles.itemName, { color: colors.text }]}>{l.title}</Text>
            <Text style={[styles.itemDetail, { color: colors.accent }]} numberOfLines={1}>{l.url}</Text>
          </TouchableOpacity>
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
                      onPress={() => setShowTripStartDatePicker(true)}
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
                      onPress={() => setShowTripEndDatePicker(true)}
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

      {/* Trip Start Date Picker */}
      <Modal visible={showTripStartDatePicker} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setShowTripStartDatePicker(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.datePickerContainer, { backgroundColor: colors.surface }]}>
                <Text style={[styles.datePickerTitle, { color: colors.text, borderBottomColor: colors.border }]}>Velg startdato</Text>
                <ScrollView style={styles.datePickerScroll}>
                  {Array.from({ length: 365 }, (_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() + i);
                    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    return (
                      <TouchableOpacity
                        key={dateStr}
                        style={[styles.dateOption, { borderBottomColor: colors.border }, tripStartDate === dateStr && { backgroundColor: colors.accent }]}
                        onPress={() => { setTripStartDate(dateStr); setShowTripStartDatePicker(false); }}
                      >
                        <Text style={[styles.dateOptionText, { color: tripStartDate === dateStr ? '#fff' : colors.text }]}>
                          {d.toLocaleDateString('nb-NO', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <TouchableOpacity style={[styles.datePickerClose, { borderTopColor: colors.border }]} onPress={() => setShowTripStartDatePicker(false)}>
                  <Text style={[styles.datePickerCloseText, { color: colors.accent }]}>Lukk</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Trip End Date Picker */}
      <Modal visible={showTripEndDatePicker} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setShowTripEndDatePicker(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.datePickerContainer, { backgroundColor: colors.surface }]}>
                <Text style={[styles.datePickerTitle, { color: colors.text, borderBottomColor: colors.border }]}>Velg sluttdato</Text>
                <ScrollView style={styles.datePickerScroll}>
                  {Array.from({ length: 365 }, (_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() + i);
                    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    return (
                      <TouchableOpacity
                        key={dateStr}
                        style={[styles.dateOption, { borderBottomColor: colors.border }, tripEndDate === dateStr && { backgroundColor: colors.accent }]}
                        onPress={() => { setTripEndDate(dateStr); setShowTripEndDatePicker(false); }}
                      >
                        <Text style={[styles.dateOptionText, { color: tripEndDate === dateStr ? '#fff' : colors.text }]}>
                          {d.toLocaleDateString('nb-NO', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <TouchableOpacity style={[styles.datePickerClose, { borderTopColor: colors.border }]} onPress={() => setShowTripEndDatePicker(false)}>
                  <Text style={[styles.datePickerCloseText, { color: colors.accent }]}>Lukk</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Transport Modal */}
      <Modal visible={activeModal === 'flight'} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setActiveModal(null)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                <Text style={[styles.modalTitle, { color: colors.text, borderBottomColor: colors.border }]}>
                  {editingId ? 'Rediger transport' : 'Legg til transport'}
                </Text>
                <ScrollView style={styles.modalScroll}>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>Transporttype</Text>
                    <View style={styles.flightTypeRow}>
                      {(['fly', 'tog', 'bil'] as const).map((tt) => (
                        <TouchableOpacity
                          key={tt}
                          style={[styles.flightTypeOption, { backgroundColor: flightTransportType === tt ? colors.accent : colors.inputBackground }]}
                          onPress={() => setFlightTransportType(tt)}
                        >
                          <Text style={[styles.flightTypeText, { color: flightTransportType === tt ? '#fff' : colors.text }]}>
                            {tt === 'fly' ? '✈️ Fly' : tt === 'tog' ? '🚆 Tog' : '🚗 Bil'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View style={styles.flightTypeRow}>
                    <TouchableOpacity
                      style={[styles.flightTypeOption, { backgroundColor: flightType === 'utreise' ? colors.accent : colors.inputBackground }]}
                      onPress={() => setFlightType('utreise')}
                    >
                      <Text style={[styles.flightTypeText, { color: flightType === 'utreise' ? '#fff' : colors.text }]}>
                        {flightTransportType === 'bil' ? '🔑 Henting' : '🛫 Utreise'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.flightTypeOption, { backgroundColor: flightType === 'hjemreise' ? '#E53935' : colors.inputBackground }]}
                      onPress={() => setFlightType('hjemreise')}
                    >
                      <Text style={[styles.flightTypeText, { color: flightType === 'hjemreise' ? '#fff' : colors.text }]}>
                        {flightTransportType === 'bil' ? '📋 Levering' : '🛬 Hjemreise'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>
                      {flightTransportType === 'fly' ? 'Flyselskap' : flightTransportType === 'tog' ? 'Togoperatør' : 'Utleieselskap'}
                    </Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                      value={flightAirline}
                      onChangeText={setFlightAirline}
                      placeholder={flightTransportType === 'fly' ? 'F.eks. Norwegian, SAS' : flightTransportType === 'tog' ? 'F.eks. Vy, SJ' : 'F.eks. Hertz, Avis'}
                      placeholderTextColor={colors.textDisabled}
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>
                      {flightTransportType === 'fly' ? 'Flightnummer' : flightTransportType === 'tog' ? 'Togrute' : 'Registreringsnummer'}
                    </Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                      value={flightNumber}
                      onChangeText={setFlightNumber}
                      placeholder={flightTransportType === 'fly' ? 'F.eks. DY1234' : flightTransportType === 'tog' ? 'F.eks. 521, 71' : 'F.eks. AB 12345'}
                      placeholderTextColor={colors.textDisabled}
                      autoCapitalize={flightTransportType === 'bil' ? 'characters' : 'none'}
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>
                      {flightTransportType === 'fly' ? 'Referanse (PNR)' : 'Referansenr'}
                    </Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                      value={flightReference}
                      onChangeText={setFlightReference}
                      placeholder="F.eks. ABC123"
                      placeholderTextColor={colors.textDisabled}
                      autoCapitalize="characters"
                    />
                  </View>
                  {flightTransportType === 'tog' && (
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>Vogn og plass</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                        value={flightWagon}
                        onChangeText={setFlightWagon}
                        placeholder="F.eks. Vogn 3, Plass 22"
                        placeholderTextColor={colors.textDisabled}
                      />
                    </View>
                  )}
                  {flightTransportType === 'bil' && (
                    <>
                      <View style={styles.field}>
                        <Text style={[styles.label, { color: colors.text }]}>Fører</Text>
                        <TextInput
                          style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                          value={flightDriver}
                          onChangeText={setFlightDriver}
                          placeholder="Navn på fører"
                          placeholderTextColor={colors.textDisabled}
                        />
                      </View>
                      <View style={styles.field}>
                        <Text style={[styles.label, { color: colors.text }]}>Adresse</Text>
                        <GooglePlacesInput
                          value={flightAddress}
                          onChangeText={setFlightAddress}
                          placeholder="Søk etter adresse..."
                          onSelect={setFlightAddress}
                        />
                      </View>
                    </>
                  )}
                  <View style={styles.flightTimeRow}>
                    <View style={[styles.flightTimeField, { flex: 1 }]}>
                      <Text style={[styles.label, { color: colors.text }]}>
                        {flightTransportType === 'bil' ? 'Hentedato' : 'Avreisedato'}
                      </Text>
                      <TouchableOpacity
                        style={[styles.input, { backgroundColor: colors.inputBackground }]}
                        onPress={() => setShowFlightDepDatePicker(true)}
                      >
                        <Text style={{ color: flightDepartureDate ? colors.text : colors.textDisabled, fontSize: 16 }}>
                          {flightDepartureDate || 'Velg dato'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View style={[styles.flightTimeField, { flex: 1 }]}>
                      <Text style={[styles.label, { color: colors.text }]}>
                        {flightTransportType === 'bil' ? 'Hentetid' : 'Avreisetid'}
                      </Text>
                      <TouchableOpacity
                        style={[styles.input, { backgroundColor: colors.inputBackground }]}
                        onPress={() => setShowFlightDepTimePicker(true)}
                      >
                        <Text style={{ color: flightDepartureTime ? colors.text : colors.textDisabled, fontSize: 16 }}>
                          {flightDepartureTime || 'Velg tid'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.flightTimeRow}>
                    <View style={[styles.flightTimeField, { flex: 1 }]}>
                      <Text style={[styles.label, { color: colors.text }]}>
                        {flightTransportType === 'bil' ? 'Leveringsdato' : 'Ankomstdato'}
                      </Text>
                      <TouchableOpacity
                        style={[styles.input, { backgroundColor: colors.inputBackground }]}
                        onPress={() => setShowFlightArrDatePicker(true)}
                      >
                        <Text style={{ color: flightArrivalDate ? colors.text : colors.textDisabled, fontSize: 16 }}>
                          {flightArrivalDate || 'Velg dato'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View style={[styles.flightTimeField, { flex: 1 }]}>
                      <Text style={[styles.label, { color: colors.text }]}>
                        {flightTransportType === 'bil' ? 'Leveringstid' : 'Ankomsttid'}
                      </Text>
                      <TouchableOpacity
                        style={[styles.input, { backgroundColor: colors.inputBackground }]}
                        onPress={() => setShowFlightArrTimePicker(true)}
                      >
                        <Text style={{ color: flightArrivalTime ? colors.text : colors.textDisabled, fontSize: 16 }}>
                          {flightArrivalTime || 'Velg tid'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>Telefon</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                      value={flightPhone}
                      onChangeText={setFlightPhone}
                      placeholder="F.eks. +47 000 00 000"
                      placeholderTextColor={colors.textDisabled}
                      keyboardType="phone-pad"
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>Notater</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                      value={flightNote}
                      onChangeText={setFlightNote}
                      placeholder="F.eks. Utreise, retur, bagasje..."
                      placeholderTextColor={colors.textDisabled}
                    />
                  </View>
                </ScrollView>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.inputBackground }]} onPress={() => setActiveModal(null)}>
                    <Text style={[styles.modalButtonText, { color: colors.text }]}>Avbryt</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.accent }]} onPress={handleSaveFlight}>
                    <Text style={[styles.modalButtonText, { color: '#fff' }]}>{editingId ? 'Lagre' : 'Legg til'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Flight Departure Date Picker */}
      <Modal visible={showFlightDepDatePicker} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setShowFlightDepDatePicker(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.datePickerContainer, { backgroundColor: colors.surface }]}>
                <Text style={[styles.datePickerTitle, { color: colors.text, borderBottomColor: colors.border }]}>Velg avreisedato</Text>
                <ScrollView style={styles.datePickerScroll}>
                  {Array.from({ length: 365 }, (_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() + i);
                    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    return (
                      <TouchableOpacity
                        key={dateStr}
                        style={[styles.dateOption, { borderBottomColor: colors.border }, flightDepartureDate === dateStr && { backgroundColor: colors.accent }]}
                        onPress={() => { setFlightDepartureDate(dateStr); setShowFlightDepDatePicker(false); }}
                      >
                        <Text style={[styles.dateOptionText, { color: flightDepartureDate === dateStr ? '#fff' : colors.text }]}>
                          {d.toLocaleDateString('nb-NO', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <TouchableOpacity style={[styles.datePickerClose, { borderTopColor: colors.border }]} onPress={() => setShowFlightDepDatePicker(false)}>
                  <Text style={[styles.datePickerCloseText, { color: colors.accent }]}>Lukk</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Flight Departure Time Picker */}
      <Modal visible={showFlightDepTimePicker} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setShowFlightDepTimePicker(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.datePickerContainer, { backgroundColor: colors.surface }]}>
                <Text style={[styles.datePickerTitle, { color: colors.text, borderBottomColor: colors.border }]}>Velg avreisetid</Text>
                <ScrollView style={styles.datePickerScroll}>
                  {timeOptions.map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.dateOption, { borderBottomColor: colors.border }, flightDepartureTime === t && { backgroundColor: colors.accent }]}
                      onPress={() => { setFlightDepartureTime(t); setShowFlightDepTimePicker(false); }}
                    >
                      <Text style={[styles.dateOptionText, { color: flightDepartureTime === t ? '#fff' : colors.text }]}>
                        {t}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity style={[styles.datePickerClose, { borderTopColor: colors.border }]} onPress={() => setShowFlightDepTimePicker(false)}>
                  <Text style={[styles.datePickerCloseText, { color: colors.accent }]}>Lukk</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Flight Arrival Date Picker */}
      <Modal visible={showFlightArrDatePicker} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setShowFlightArrDatePicker(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.datePickerContainer, { backgroundColor: colors.surface }]}>
                <Text style={[styles.datePickerTitle, { color: colors.text, borderBottomColor: colors.border }]}>Velg ankomstdato</Text>
                <ScrollView style={styles.datePickerScroll}>
                  {Array.from({ length: 365 }, (_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() + i);
                    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    return (
                      <TouchableOpacity
                        key={dateStr}
                        style={[styles.dateOption, { borderBottomColor: colors.border }, flightArrivalDate === dateStr && { backgroundColor: colors.accent }]}
                        onPress={() => { setFlightArrivalDate(dateStr); setShowFlightArrDatePicker(false); }}
                      >
                        <Text style={[styles.dateOptionText, { color: flightArrivalDate === dateStr ? '#fff' : colors.text }]}>
                          {d.toLocaleDateString('nb-NO', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <TouchableOpacity style={[styles.datePickerClose, { borderTopColor: colors.border }]} onPress={() => setShowFlightArrDatePicker(false)}>
                  <Text style={[styles.datePickerCloseText, { color: colors.accent }]}>Lukk</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Flight Arrival Time Picker */}
      <Modal visible={showFlightArrTimePicker} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setShowFlightArrTimePicker(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.datePickerContainer, { backgroundColor: colors.surface }]}>
                <Text style={[styles.datePickerTitle, { color: colors.text, borderBottomColor: colors.border }]}>Velg ankomsttid</Text>
                <ScrollView style={styles.datePickerScroll}>
                  {timeOptions.map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.dateOption, { borderBottomColor: colors.border }, flightArrivalTime === t && { backgroundColor: colors.accent }]}
                      onPress={() => { setFlightArrivalTime(t); setShowFlightArrTimePicker(false); }}
                    >
                      <Text style={[styles.dateOptionText, { color: flightArrivalTime === t ? '#fff' : colors.text }]}>
                        {t}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity style={[styles.datePickerClose, { borderTopColor: colors.border }]} onPress={() => setShowFlightArrTimePicker(false)}>
                  <Text style={[styles.datePickerCloseText, { color: colors.accent }]}>Lukk</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

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
                      value={hotelName}
                      onChangeText={setHotelName}
                      placeholder="F.eks. Grand Hotel"
                      placeholderTextColor={colors.textDisabled}
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>Adresse</Text>
                    <GooglePlacesInput
                      value={hotelAddress}
                      onChangeText={setHotelAddress}
                      placeholder="Søk etter adresse..."
                      onSelect={setHotelAddress}
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>Telefonnr</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                      value={hotelPhone}
                      onChangeText={setHotelPhone}
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
                      value={restName}
                      onChangeText={setRestName}
                      placeholder="F.eks. pizza stedet"
                      placeholderTextColor={colors.textDisabled}
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>Adresse</Text>
                    <GooglePlacesInput
                      value={restAddress}
                      onChangeText={setRestAddress}
                      placeholder="Søk etter adresse..."
                      onSelect={setRestAddress}
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>Notat</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                      value={restNote}
                      onChangeText={setRestNote}
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
                      value={actName}
                      onChangeText={setActName}
                      placeholder="F.eks. Sightseeing"
                      placeholderTextColor={colors.textDisabled}
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>Dato</Text>
                    <TouchableOpacity
                      style={[styles.input, { backgroundColor: colors.inputBackground }]}
                      onPress={() => setShowActDatePicker(true)}
                    >
                      <Text style={{ color: actDate ? colors.text : colors.textDisabled, fontSize: 16 }}>
                        {actDate || 'Velg dato'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>Tid</Text>
                    <TouchableOpacity
                      style={[styles.input, { backgroundColor: colors.inputBackground }]}
                      onPress={() => setShowActTimePicker(true)}
                    >
                      <Text style={{ color: actTime ? colors.text : colors.textDisabled, fontSize: 16 }}>
                        {actTime || 'Velg tid'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>Adresse</Text>
                    <GooglePlacesInput
                      value={actAddress}
                      onChangeText={setActAddress}
                      placeholder="Søk etter adresse..."
                      onSelect={setActAddress}
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>Notat</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                      value={actNote}
                      onChangeText={setActNote}
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
                      value={docTitle}
                      onChangeText={setDocTitle}
                      placeholder="F.eks. Hotell booking"
                      placeholderTextColor={colors.textDisabled}
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>Notat</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                      value={docNote}
                      onChangeText={setDocNote}
                      placeholder="F.eks. Bekreftelsesnummer"
                      placeholderTextColor={colors.textDisabled}
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>Fil</Text>
                    <TripDocumentUpload
                      tripId={trip.id}
                      onUploaded={(url, name) => {
                        setDocFileUrl(url);
                        setDocFileName(name);
                      }}
                    />
                    {docFileName ? (
                      <Text style={[styles.fileInfo, { color: colors.accent }]}>📎 {docFileName}</Text>
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
                      value={linkTitle}
                      onChangeText={setLinkTitle}
                      placeholder="F.eks. Hotell nettside"
                      placeholderTextColor={colors.textDisabled}
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>URL *</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                      value={linkUrl}
                      onChangeText={setLinkUrl}
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

      {/* Date Picker */}
      <Modal visible={showActDatePicker} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setShowActDatePicker(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.datePickerContainer, { backgroundColor: colors.surface }]}>
                <Text style={[styles.datePickerTitle, { color: colors.text, borderBottomColor: colors.border }]}>Velg dato</Text>
                <ScrollView style={styles.datePickerScroll}>
                  {Array.from({ length: 365 }, (_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() + i);
                    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    return (
                      <TouchableOpacity
                        key={dateStr}
                        style={[styles.dateOption, { borderBottomColor: colors.border }, actDate === dateStr && { backgroundColor: colors.accent }]}
                        onPress={() => { setActDate(dateStr); setShowActDatePicker(false); }}
                      >
                        <Text style={[styles.dateOptionText, { color: actDate === dateStr ? '#fff' : colors.text }]}>
                          {d.toLocaleDateString('nb-NO', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <TouchableOpacity style={[styles.datePickerClose, { borderTopColor: colors.border }]} onPress={() => setShowActDatePicker(false)}>
                  <Text style={[styles.datePickerCloseText, { color: colors.accent }]}>Lukk</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Time Picker */}
      <Modal visible={showActTimePicker} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setShowActTimePicker(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.datePickerContainer, { backgroundColor: colors.surface }]}>
                <Text style={[styles.datePickerTitle, { color: colors.text, borderBottomColor: colors.border }]}>Velg tid</Text>
                <ScrollView style={styles.datePickerScroll}>
                  {timeOptions.map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.dateOption, { borderBottomColor: colors.border }, actTime === t && { backgroundColor: colors.accent }]}
                      onPress={() => { setActTime(t); setShowActTimePicker(false); }}
                    >
                      <Text style={[styles.dateOptionText, { color: actTime === t ? '#fff' : colors.text }]}>
                        {t}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity style={[styles.datePickerClose, { borderTopColor: colors.border }]} onPress={() => setShowActTimePicker(false)}>
                  <Text style={[styles.datePickerCloseText, { color: colors.accent }]}>Lukk</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
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
  itemMapContainer: {
    marginLeft: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  itemMapImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
  },
  itemDetail: {
    fontSize: 14,
    marginTop: 2,
  },
  itemNote: {
    fontSize: 13,
    marginTop: 4,
    fontStyle: 'italic',
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
  datePickerContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    paddingBottom: 20,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  datePickerScroll: {
    maxHeight: 350,
  },
  dateOption: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  dateOptionText: {
    fontSize: 16,
  },
  datePickerClose: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
  },
  datePickerCloseText: {
    fontSize: 16,
    fontWeight: '600',
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
  flightTimeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  flightTimeField: {
    flex: 1,
  },
  flightTypeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  flightTypeOption: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  flightTypeText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
