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
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Trip, TripHotel, TripFlight, TripRestaurant, TripActivity, TripDocument, TripLink, TripBoat, TripTaxi, TripFerry, DestinationTips, CityTips } from '../types';
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
  getTripBoats,
  addTripBoat,
  updateTripBoat,
  deleteTripBoat,
  getTripTaxis,
  addTripTaxi,
  updateTripTaxi,
  deleteTripTaxi,
  getTripFerries,
  addTripFerry,
  updateTripFerry,
  deleteTripFerry,
  updateTrip,
} from '../services/tripService';
import { ref, deleteObject } from 'firebase/storage';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { storage } from '../services/firebase';
import { formatDate, getTodayLocal } from '../utils/dateUtils';
import { sanitizeInput, getErrorMessage } from '../utils/validation';
import { GooglePlacesInput } from '../components/GooglePlacesInput';
import { TripDocumentUpload } from '../components/TripDocumentUpload';
import { DatePickerModal } from '../components/DatePickerModal';
import { TransportTile } from '../components/TransportTile';
import { TransportItemTile } from '../components/TransportItemTile';
import { AddressItemCard } from '../components/AddressItemCard';
import { TransportFormModal } from '../components/TransportFormModal';
import { LinkPreviewCard } from '../components/LinkPreviewCard';
import { ActionModal } from '../components/ActionModal';
import { CurrencyConverter } from '../components/CurrencyConverter';
import { TRIP_ICONS } from '../constants/tripIcons';
import { getForecast, getHistoricalWeather, wmoToEmoji, geocodeCity, tempColor } from '../services/weatherService';
import { WeatherDay } from '../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { useUserStore } from '../store/userStore';

interface TripDetailScreenProps {
  navigation: any;
  route: any;
}

type ModalType = 'hotel' | 'flight' | 'restaurant' | 'activity' | 'document' | 'link' | 'boat' | 'taxi' | 'ferry' | 'tripEdit' | null;

export const TripDetailScreen: React.FC<TripDetailScreenProps> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { trip: initialTrip } = route.params as { trip: Trip };
  const { colors } = useTheme();
  const user = useUserStore((state) => state.user);
  const familyRole = useUserStore((state) => state.familyRole);

  const [trip, setTrip] = useState<Trip>(initialTrip);
  const canDelete = trip.createdBy === user?.uid || familyRole === 'owner' || familyRole === 'admin';
  const [hotels, setHotels] = useState<TripHotel[]>([]);
  const [flights, setFlights] = useState<TripFlight[]>([]);
  const [restaurants, setRestaurants] = useState<TripRestaurant[]>([]);
  const [activities, setActivities] = useState<TripActivity[]>([]);
  const [documents, setDocuments] = useState<TripDocument[]>([]);
  const [links, setLinks] = useState<TripLink[]>([]);
  const [boats, setBoats] = useState<TripBoat[]>([]);
  const [taxis, setTaxis] = useState<TripTaxi[]>([]);
  const [ferries, setFerries] = useState<TripFerry[]>([]);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Trip edit form
  const [tripTitle, setTripTitle] = useState(trip.title);
  const [tripCity, setTripCity] = useState(trip.city);
  const [tripCountry, setTripCountry] = useState(trip.country);
  const [tripStartDate, setTripStartDate] = useState(trip.startDate);
  const [tripEndDate, setTripEndDate] = useState(trip.endDate);
  const [tripIcon, setTripIcon] = useState(trip.icon || '✈️');

  // Form state (consolidated)
  const emptyHotel = { name: '', address: '', phone: '', startDate: '', endDate: '', checkInTime: '', checkOutTime: '', note: '' };
  const emptyFlight = { transportType: 'fly' as 'fly' | 'tog' | 'bil', type: 'utreise' as 'utreise' | 'hjemreise', isOneWay: false, airline: '', flightNumber: '', reference: '', seatNumber: '', wagon: '', driver: '', passengers: '', address: '', departureDate: '', departureTime: '', arrivalDate: '', arrivalTime: '', phone: '', note: '' };
  const emptyRest = { name: '', address: '', note: '' };
  const emptyAct = { name: '', startDate: '', endDate: '', startTime: '', endTime: '', address: '', note: '' };
  const emptyDoc = { title: '', note: '', fileUrl: '', fileName: '' };
  const emptyLink = { title: '', url: '' };
  const emptyBoat = { name: '', routeName: '', reference: '', cabin: '', isOneWay: false, type: 'utreise' as 'utreise' | 'hjemreise', departureDate: '', departureTime: '', arrivalDate: '', arrivalTime: '', departureAddress: '', arrivalAddress: '', phone: '', hasCar: false, carRegistration: '', driver: '', passengers: '', note: '' };
  const emptyTaxi = { name: '', reference: '', isOneWay: false, departureDate: '', departureTime: '', arrivalDate: '', arrivalTime: '', departureAddress: '', arrivalAddress: '', phone: '', driver: '', passengers: '', note: '', type: 'utreise' as 'utreise' | 'hjemreise' };
  const emptyFerry = { name: '', routeName: '', reference: '', cabin: '', isOneWay: false, type: 'utreise' as 'utreise' | 'hjemreise', departureDate: '', departureTime: '', arrivalDate: '', arrivalTime: '', departureAddress: '', arrivalAddress: '', phone: '', hasCar: false, carRegistration: '', driver: '', passengers: '', note: '' };

  const [hotelForm, setHotelForm] = useState(emptyHotel);
  const [flightFormUtreise, setFlightFormUtreise] = useState(emptyFlight);
  const [flightFormHjemreise, setFlightFormHjemreise] = useState(emptyFlight);
  const [activeDirection, setActiveDirection] = useState<'utreise' | 'hjemreise'>('utreise');
  const flightForm = activeDirection === 'utreise' ? flightFormUtreise : flightFormHjemreise;

  const handleFlightFormChange = useCallback((updater: React.SetStateAction<typeof emptyFlight>) => {
    if (activeDirection === 'utreise') {
      setFlightFormUtreise(updater);
    } else {
      setFlightFormHjemreise(updater);
    }
  }, [activeDirection]);
  const [restForm, setRestForm] = useState(emptyRest);
  const [actForm, setActForm] = useState(emptyAct);
  const [docForm, setDocForm] = useState(emptyDoc);
  const [linkForm, setLinkForm] = useState(emptyLink);
  const [boatForm, setBoatForm] = useState(emptyBoat);
  const [taxiForm, setTaxiForm] = useState(emptyTaxi);
  const [ferryForm, setFerryForm] = useState(emptyFerry);
  const [showTransportPicker, setShowTransportPicker] = useState(false);
  const [actionModal, setActionModal] = useState<{ visible: boolean; title: string; subtitle?: string; onEdit?: () => void; onDelete?: () => void }>({ visible: false, title: '' });

  // Unified picker state
  type PickerField = 'tripStart' | 'tripEnd' | 'flightDepDate' | 'flightArrDate' | 'flightDepTime' | 'flightArrTime' | 'actStartDate' | 'actEndDate' | 'actStartTime' | 'actEndTime' | 'hotelStartDate' | 'hotelEndDate' | 'hotelCheckIn' | 'hotelCheckOut' | 'boatDepDate' | 'boatDepTime' | 'boatArrDate' | 'boatArrTime' | 'taxiDate' | 'taxiTime' | 'taxiArrDate' | 'taxiArrTime' | 'ferryDepDate' | 'ferryDepTime' | 'ferryArrDate' | 'ferryArrTime' | null;
  const [activePicker, setActivePicker] = useState<PickerField>(null);

  const handlePickerSelect = (value: string) => {
    if (activePicker === 'tripStart') setTripStartDate(value);
    else if (activePicker === 'tripEnd') setTripEndDate(value);
    else if (activePicker === 'flightDepDate') handleFlightFormChange(f => ({ ...f, departureDate: value }));
    else if (activePicker === 'flightArrDate') handleFlightFormChange(f => ({ ...f, arrivalDate: value }));
    else if (activePicker === 'flightDepTime') handleFlightFormChange(f => ({ ...f, departureTime: value }));
    else if (activePicker === 'flightArrTime') handleFlightFormChange(f => ({ ...f, arrivalTime: value }));
    else if (activePicker === 'actStartDate') setActForm(f => ({ ...f, startDate: value }));
    else if (activePicker === 'actEndDate') setActForm(f => ({ ...f, endDate: value }));
    else if (activePicker === 'actStartTime') setActForm(f => ({ ...f, startTime: value }));
    else if (activePicker === 'actEndTime') setActForm(f => ({ ...f, endTime: value }));
    else if (activePicker === 'hotelStartDate') setHotelForm(f => ({ ...f, startDate: value }));
    else if (activePicker === 'hotelEndDate') setHotelForm(f => ({ ...f, endDate: value }));
    else if (activePicker === 'hotelCheckIn') setHotelForm(f => ({ ...f, checkInTime: value }));
    else if (activePicker === 'hotelCheckOut') setHotelForm(f => ({ ...f, checkOutTime: value }));
    else if (activePicker === 'boatDepDate') setBoatForm(f => ({ ...f, departureDate: value }));
    else if (activePicker === 'boatDepTime') setBoatForm(f => ({ ...f, departureTime: value }));
    else if (activePicker === 'boatArrDate') setBoatForm(f => ({ ...f, arrivalDate: value }));
    else if (activePicker === 'boatArrTime') setBoatForm(f => ({ ...f, arrivalTime: value }));
    else if (activePicker === 'taxiDate') setTaxiForm(f => ({ ...f, departureDate: value }));
    else if (activePicker === 'taxiTime') setTaxiForm(f => ({ ...f, departureTime: value }));
    else if (activePicker === 'taxiArrDate') setTaxiForm(f => ({ ...f, arrivalDate: value }));
    else if (activePicker === 'taxiArrTime') setTaxiForm(f => ({ ...f, arrivalTime: value }));
    else if (activePicker === 'ferryDepDate') setFerryForm(f => ({ ...f, departureDate: value }));
    else if (activePicker === 'ferryDepTime') setFerryForm(f => ({ ...f, departureTime: value }));
    else if (activePicker === 'ferryArrDate') setFerryForm(f => ({ ...f, arrivalDate: value }));
    else if (activePicker === 'ferryArrTime') setFerryForm(f => ({ ...f, arrivalTime: value }));
    setActivePicker(null);
  };

  const getPickerTitle = () => {
    const titles: Record<string, string> = {
      tripStart: t('pickers.startDate'), tripEnd: t('pickers.endDate'),
      flightDepDate: t('pickers.departureDate'), flightArrDate: t('pickers.arrivalDate'),
      flightDepTime: t('pickers.departureTime'), flightArrTime: t('pickers.arrivalTime'),
      actStartDate: t('pickers.startDate'), actEndDate: t('pickers.endDate'), actStartTime: t('pickers.startTime'), actEndTime: t('pickers.endTime'),
      hotelStartDate: t('pickers.startDate'), hotelEndDate: t('pickers.endDate'),
      hotelCheckIn: t('pickers.checkInTime'), hotelCheckOut: t('pickers.checkOutTime'),
      boatDepDate: t('pickers.departureDate'), boatDepTime: t('pickers.departureTime'), boatArrDate: t('pickers.arrivalDate'), boatArrTime: t('pickers.arrivalTime'),
      taxiDate: t('pickers.date'), taxiTime: t('pickers.time'), taxiArrDate: t('pickers.arrivalDate'), taxiArrTime: t('pickers.arrivalTime'),
      ferryDepDate: t('pickers.departureDate'), ferryDepTime: t('pickers.departureTime'), ferryArrDate: t('pickers.arrivalDate'), ferryArrTime: t('pickers.arrivalTime'),
    };
    return activePicker ? titles[activePicker] : '';
  };

  const getPickerValue = () => {
    const values: Record<string, string> = {
      tripStart: tripStartDate, tripEnd: tripEndDate,
      flightDepDate: flightForm.departureDate, flightArrDate: flightForm.arrivalDate,
      flightDepTime: flightForm.departureTime, flightArrTime: flightForm.arrivalTime,
      actStartDate: actForm.startDate, actEndDate: actForm.endDate, actStartTime: actForm.startTime, actEndTime: actForm.endTime,
      hotelStartDate: hotelForm.startDate, hotelEndDate: hotelForm.endDate, hotelCheckIn: hotelForm.checkInTime, hotelCheckOut: hotelForm.checkOutTime,
      boatDepDate: boatForm.departureDate, boatDepTime: boatForm.departureTime, boatArrDate: boatForm.arrivalDate, boatArrTime: boatForm.arrivalTime,
      taxiDate: taxiForm.departureDate, taxiTime: taxiForm.departureTime,
      ferryDepDate: ferryForm.departureDate, ferryDepTime: ferryForm.departureTime, ferryArrDate: ferryForm.arrivalDate, ferryArrTime: ferryForm.arrivalTime,
    };
    return activePicker ? values[activePicker] || '' : '';
  };

  const isDatePicker = activePicker && activePicker.includes('Date') || activePicker === 'tripStart' || activePicker === 'tripEnd';
  const isTimePicker = activePicker && (activePicker.includes('Time') || activePicker === 'hotelCheckIn' || activePicker === 'hotelCheckOut');

  const loadSubData = useCallback(async () => {
    try {
      const [h, f, r, a, d, l, bo, ta, fe] = await Promise.all([
        getTripHotels(trip.id),
        getTripFlights(trip.id),
        getTripRestaurants(trip.id),
        getTripActivities(trip.id),
        getTripDocuments(trip.id),
        getTripLinks(trip.id),
        getTripBoats(trip.id),
        getTripTaxis(trip.id),
        getTripFerries(trip.id),
      ]);
      setHotels(h);
      setFlights(f);
      setRestaurants(r);
      setActivities(a);
      setDocuments(d);
      setLinks(l);
      setBoats(bo);
      setTaxis(ta);
      setFerries(fe);
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

  const [cityTipsList, setCityTipsList] = useState<CityTips[]>(
    Array.isArray(trip.destinationTips) ? trip.destinationTips : []
  );
  const [tipsSearchValue, setTipsSearchValue] = useState('');
  const [stagedCity, setStagedCity] = useState<string | null>(null);
  const [expandedTipsCity, setExpandedTipsCity] = useState<string | null>(null);
  const [docsExpanded, setDocsExpanded] = useState(false);
  const [tipsLoading, setTipsLoading] = useState(false);
  const [tipsError, setTipsError] = useState<string | null>(null);

  useEffect(() => {
    if (Array.isArray(trip.destinationTips)) {
      setCityTipsList(trip.destinationTips);
    } else if (trip.destinationTips && typeof trip.destinationTips === 'object') {
      setCityTipsList([{ city: trip.city, tips: trip.destinationTips as unknown as DestinationTips }]);
    }
  }, [trip.destinationTips, trip.city]);

  const handleGenerateTips = useCallback(async (city: string, existingIndex?: number) => {
    setTipsLoading(true);
    setTipsError(null);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Ikke innlogget');
      const token = await user.getIdToken();

      const weatherSummary = trip.weatherSummary || [];
      const res = await fetch('https://us-central1-familiesenter-837bb.cloudfunctions.net/destinationTips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          city,
          country: trip.country,
          startDate: trip.startDate,
          endDate: trip.endDate,
          weather: weatherSummary,
        }),
      });
      if (!res.ok) throw new Error('Kunne ikke generere tips');
      const data = await res.json();

      const newEntry: CityTips = { city, tips: data.tips };
      let updatedList: CityTips[];
      if (existingIndex !== undefined && existingIndex >= 0) {
        updatedList = [...cityTipsList];
        updatedList[existingIndex] = newEntry;
      } else {
        updatedList = [...cityTipsList, newEntry];
      }

      setCityTipsList(updatedList);
      setExpandedTipsCity(city);
      setStagedCity(null);
      setTipsSearchValue('');

      try {
        await updateDoc(doc(db, 'trips', trip.id), { destinationTips: updatedList });
      } catch {}
    } catch (error: any) {
      setTipsError(error.message || 'Noe gikk galt');
    } finally {
      setTipsLoading(false);
    }
  }, [trip, cityTipsList]);

  const resetForms = () => {
    setHotelForm(emptyHotel);
    setFlightFormUtreise(emptyFlight);
    setFlightFormHjemreise(emptyFlight);
    setActiveDirection('utreise');
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
      const locationQuery = tripCountry ? `${tripCity}, ${tripCountry}` : tripCity;
      const coords = await geocodeCity(locationQuery);
      const updateData: Record<string, any> = {
        title: sanitizeInput(tripTitle),
        city: sanitizeInput(tripCity),
        country: sanitizeInput(tripCountry),
        startDate: tripStartDate,
        endDate: tripEndDate,
        icon: tripIcon,
      };
      if (coords) {
        updateData.latitude = coords.latitude;
        updateData.longitude = coords.longitude;
      }
      await updateTrip(trip.id, updateData);
      setTrip({ ...trip, ...updateData });
      setActiveModal(null);
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  }, [trip, tripTitle, tripCity, tripCountry, tripStartDate, tripEndDate, tripIcon]);

  const openAddModal = (modal: ModalType, transportType?: 'fly' | 'tog' | 'bil') => {
    resetForms();
    if (transportType) {
      setFlightFormUtreise(f => ({ ...f, transportType }));
      setFlightFormHjemreise(f => ({ ...f, transportType }));
    }
    setActiveModal(modal);
  };

  const openEditModal = (modal: ModalType, item: any) => {
    resetForms();
    setEditingId(item.id);
    if (modal === 'hotel') {
      setHotelForm({ name: item.name || '', address: item.address || '', phone: item.phone || '', startDate: item.startDate || '', endDate: item.endDate || '', checkInTime: item.checkInTime || '', checkOutTime: item.checkOutTime || '', note: item.note || '' });
    } else if (modal === 'flight') {
      const formData = {
        transportType: item.transportType || 'fly',
        type: item.type || 'utreise',
        isOneWay: item.isOneWay || false,
        airline: item.airline || '',
        flightNumber: item.flightNumber || '',
        reference: item.reference || '',
        seatNumber: item.seatNumber || '',
        wagon: item.wagon || '',
        driver: item.driver || '',
        passengers: item.passengers || '',
        address: item.address || '',
        departureAddress: item.departureAddress || '',
        arrivalAddress: item.arrivalAddress || '',
        departureDate: item.departureDate || '',
        departureTime: item.departureTime || '',
        arrivalDate: item.arrivalDate || '',
        arrivalTime: item.arrivalTime || '',
        phone: item.phone || '',
        note: item.note || '',
      };
      if (item.type === 'hjemreise') {
        setActiveDirection('hjemreise');
        setFlightFormHjemreise(formData);
      } else {
        setActiveDirection('utreise');
        setFlightFormUtreise(formData);
      }
    } else if (modal === 'restaurant') {
      setRestForm({ name: item.name || '', address: item.address || '', note: item.note || '' });
    } else if (modal === 'activity') {
      setActForm({ name: item.name || '', startDate: item.startDate || item.date || '', endDate: item.endDate || '', startTime: item.startTime || item.time || '', endTime: item.endTime || '', address: item.address || '', note: item.note || '' });
    } else if (modal === 'document') {
      setDocForm({ title: item.title || '', note: item.note || '', fileUrl: item.fileUrl || '', fileName: item.fileName || '' });
    } else if (modal === 'link') {
      setLinkForm({ title: item.title || '', url: item.url || '' });
    } else if (modal === 'boat') {
      setBoatForm({ name: item.name || '', routeName: item.routeName || '', reference: item.reference || '', cabin: item.cabin || '', isOneWay: item.isOneWay || false, type: item.type || 'utreise', departureDate: item.departureDate || '', departureTime: item.departureTime || '', arrivalDate: item.arrivalDate || '', arrivalTime: item.arrivalTime || '', departureAddress: item.departureAddress || '', arrivalAddress: item.arrivalAddress || '', phone: item.phone || '', hasCar: item.hasCar || false, carRegistration: item.carRegistration || '', driver: item.driver || '', passengers: item.passengers || '', note: item.note || '' });
    } else if (modal === 'taxi') {
      setTaxiForm({ name: item.name || '', reference: item.reference || '', isOneWay: item.isOneWay || false, type: item.type || 'utreise', departureDate: item.departureDate || '', departureTime: item.departureTime || '', arrivalDate: item.arrivalDate || '', arrivalTime: item.arrivalTime || '', departureAddress: item.departureAddress || item.address || '', arrivalAddress: item.arrivalAddress || '', phone: item.phone || '', driver: item.driver || '', passengers: item.passengers || '', note: item.note || '' });
    } else if (modal === 'ferry') {
      setFerryForm({ name: item.name || '', routeName: item.routeName || '', reference: item.reference || '', cabin: item.cabin || '', isOneWay: item.isOneWay || false, type: item.type || 'utreise', departureDate: item.departureDate || '', departureTime: item.departureTime || '', arrivalDate: item.arrivalDate || '', arrivalTime: item.arrivalTime || '', departureAddress: item.departureAddress || '', arrivalAddress: item.arrivalAddress || '', phone: item.phone || '', hasCar: item.hasCar || false, carRegistration: item.carRegistration || '', driver: item.driver || '', passengers: item.passengers || '', note: item.note || '' });
    }
    setActiveModal(modal);
  };

  useEffect(() => {
    const editId = route.params?.openFlightEditId;
    if (editId && flights.length > 0) {
      const flight = flights.find(f => f.id === editId);
      if (flight) {
        openEditModal('flight', flight);
        navigation.setParams({ openFlightEditId: undefined });
      }
    }
  }, [route.params?.openFlightEditId, flights]);

  useEffect(() => {
    const editId = route.params?.openItemEditId;
    const itemType = route.params?.openItemType;
    if (editId && itemType) {
      const collections: Record<string, any[]> = { hotel: hotels, restaurant: restaurants, activity: activities, boat: boats, taxi: taxis, ferry: ferries };
      const items = collections[itemType] || [];
      const found = items.find((i: any) => i.id === editId);
      if (found) {
        openEditModal(itemType as ModalType, found);
        navigation.setParams({ openItemEditId: undefined, openItemType: undefined });
      }
    }
  }, [route.params?.openItemEditId, route.params?.openItemType, hotels, restaurants, activities, boats, taxis, ferries]);

  const cleanData = (data: Record<string, any>) => Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));

  // Hotel handlers
  const handleSaveHotel = useCallback(async () => {
    if (!hotelForm.name.trim()) {
      crossAlert('Error', 'Vennligst skriv et navn');
      return;
    }
    try {
      const data = cleanData({ name: sanitizeInput(hotelForm.name), address: hotelForm.address.trim() ? sanitizeInput(hotelForm.address) : undefined, phone: hotelForm.phone.trim() ? sanitizeInput(hotelForm.phone) : undefined, startDate: hotelForm.startDate || undefined, endDate: hotelForm.endDate || undefined, checkInTime: hotelForm.checkInTime || undefined, checkOutTime: hotelForm.checkOutTime || undefined, note: hotelForm.note.trim() ? sanitizeInput(hotelForm.note) : undefined });
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
      const buildDataFrom = (type: 'utreise' | 'hjemreise', form: typeof emptyFlight) => {
        const rawData: Record<string, any> = {
          transportType: form.transportType,
          type,
          isOneWay: form.isOneWay || undefined,
          airline: form.airline.trim() ? sanitizeInput(form.airline) : undefined,
          flightNumber: form.flightNumber.trim() ? sanitizeInput(form.flightNumber) : undefined,
          reference: form.reference.trim() ? sanitizeInput(form.reference) : undefined,
          seatNumber: form.seatNumber.trim() ? sanitizeInput(form.seatNumber) : undefined,
          wagon: form.wagon.trim() ? sanitizeInput(form.wagon) : undefined,
          driver: form.driver.trim() ? sanitizeInput(form.driver) : undefined,
          passengers: form.passengers.trim() ? sanitizeInput(form.passengers) : undefined,
          address: form.address.trim() ? sanitizeInput(form.address) : undefined,
          departureAddress: form.departureAddress?.trim() ? sanitizeInput(form.departureAddress) : undefined,
          arrivalAddress: form.arrivalAddress?.trim() ? sanitizeInput(form.arrivalAddress) : undefined,
          phone: form.phone.trim() ? sanitizeInput(form.phone) : undefined,
          note: form.note.trim() ? sanitizeInput(form.note) : undefined,
        };
        if (form.transportType === 'bil') {
          if (type === 'utreise') {
            rawData.departureDate = form.departureDate || undefined;
            rawData.departureTime = form.departureTime || undefined;
          } else {
            rawData.arrivalDate = form.arrivalDate || undefined;
            rawData.arrivalTime = form.arrivalTime || undefined;
          }
        } else {
          rawData.departureDate = form.departureDate || undefined;
          rawData.departureTime = form.departureTime || undefined;
          rawData.arrivalDate = form.arrivalDate || undefined;
          rawData.arrivalTime = form.arrivalTime || undefined;
        }
        return Object.fromEntries(Object.entries(rawData).filter(([, v]) => v !== undefined));
      };

      if (editingId) {
        const editingType = (editingFlight?: TripFlight) => editingFlight?.type || activeDirection;
        const originalFlight = flights.find(f => f.id === editingId);
        const resolvedType = editingType(originalFlight);
        const form = resolvedType === 'utreise' ? flightFormUtreise : flightFormHjemreise;
        const data = buildDataFrom(resolvedType, form);
        await updateTripFlight(trip.id, editingId, data);
      } else {
        await addTripFlight(trip.id, buildDataFrom('utreise', flightFormUtreise));
        if (!flightFormUtreise.isOneWay) {
          await addTripFlight(trip.id, buildDataFrom('hjemreise', flightFormHjemreise));
        }
      }
      resetForms();
      setActiveModal(null);
      loadSubData();
    } catch (error) {
      console.error('Bil transport save error:', error);
      crossAlert('Error', getErrorMessage(error));
    }
  }, [trip.id, flightFormUtreise, flightFormHjemreise, activeDirection, editingId, loadSubData, flights]);

  // Restaurant handlers
  const handleSaveRestaurant = useCallback(async () => {
    if (!restForm.name.trim()) {
      crossAlert('Error', 'Vennligst skriv et navn');
      return;
    }
    try {
      const data = cleanData({ name: restForm.name.trim() ? sanitizeInput(restForm.name) : undefined, address: restForm.address.trim() ? sanitizeInput(restForm.address) : undefined, note: restForm.note.trim() ? sanitizeInput(restForm.note) : undefined });
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
      const data = cleanData({ name: actForm.name.trim() ? sanitizeInput(actForm.name) : undefined, startDate: actForm.startDate || undefined, endDate: actForm.endDate || undefined, startTime: actForm.startTime || undefined, endTime: actForm.endTime || undefined, address: actForm.address.trim() ? sanitizeInput(actForm.address) : undefined, note: actForm.note.trim() ? sanitizeInput(actForm.note) : undefined });
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

  const handleSaveBoat = useCallback(async () => {
    try {
      const shared = { name: boatForm.name.trim() ? sanitizeInput(boatForm.name) : undefined, routeName: boatForm.routeName.trim() ? sanitizeInput(boatForm.routeName) : undefined, reference: boatForm.reference.trim() ? sanitizeInput(boatForm.reference) : undefined, cabin: boatForm.cabin.trim() ? sanitizeInput(boatForm.cabin) : undefined, isOneWay: boatForm.isOneWay || undefined, phone: boatForm.phone.trim() ? sanitizeInput(boatForm.phone) : undefined, hasCar: boatForm.hasCar || undefined, carRegistration: boatForm.hasCar && boatForm.carRegistration.trim() ? sanitizeInput(boatForm.carRegistration) : undefined, driver: boatForm.driver.trim() ? sanitizeInput(boatForm.driver) : undefined, passengers: boatForm.passengers.trim() ? sanitizeInput(boatForm.passengers) : undefined, note: boatForm.note.trim() ? sanitizeInput(boatForm.note) : undefined };
      const utreiseData = cleanData({ ...shared, type: 'utreise', departureDate: boatForm.departureDate || undefined, departureTime: boatForm.departureTime || undefined, departureAddress: boatForm.departureAddress.trim() ? sanitizeInput(boatForm.departureAddress) : undefined, arrivalAddress: boatForm.arrivalAddress.trim() ? sanitizeInput(boatForm.arrivalAddress) : undefined });
      const hjemreiseData = cleanData({ ...shared, type: 'hjemreise', departureDate: boatForm.arrivalDate || undefined, departureTime: boatForm.arrivalTime || undefined, departureAddress: boatForm.arrivalAddress.trim() ? sanitizeInput(boatForm.arrivalAddress) : undefined });
      if (editingId) { await updateTripBoat(trip.id, editingId, boatForm.type === 'hjemreise' ? hjemreiseData : utreiseData); } else {
        await addTripBoat(trip.id, utreiseData);
        if (!boatForm.isOneWay) { await addTripBoat(trip.id, hjemreiseData); }
      }
      resetForms(); setActiveModal(null); loadSubData();
    } catch (error) { crossAlert('Error', getErrorMessage(error)); }
  }, [trip.id, boatForm, editingId, loadSubData]);

  const handleSaveTaxi = useCallback(async () => {
    try {
      const shared = { name: taxiForm.name.trim() ? sanitizeInput(taxiForm.name) : undefined, reference: taxiForm.reference.trim() ? sanitizeInput(taxiForm.reference) : undefined, isOneWay: taxiForm.isOneWay || undefined, phone: taxiForm.phone.trim() ? sanitizeInput(taxiForm.phone) : undefined, driver: taxiForm.driver.trim() ? sanitizeInput(taxiForm.driver) : undefined, passengers: taxiForm.passengers.trim() ? sanitizeInput(taxiForm.passengers) : undefined, note: taxiForm.note.trim() ? sanitizeInput(taxiForm.note) : undefined };
      const utreiseData = cleanData({ ...shared, type: 'utreise', departureDate: taxiForm.departureDate || undefined, departureTime: taxiForm.departureTime || undefined, departureAddress: taxiForm.departureAddress.trim() ? sanitizeInput(taxiForm.departureAddress) : undefined });
      const hjemreiseData = cleanData({ ...shared, type: 'hjemreise', departureDate: taxiForm.arrivalDate || undefined, departureTime: taxiForm.arrivalTime || undefined, departureAddress: taxiForm.arrivalAddress.trim() ? sanitizeInput(taxiForm.arrivalAddress) : undefined });
      if (editingId) { await updateTripTaxi(trip.id, editingId, taxiForm.type === 'hjemreise' ? hjemreiseData : utreiseData); } else {
        await addTripTaxi(trip.id, utreiseData);
        if (!taxiForm.isOneWay) { await addTripTaxi(trip.id, hjemreiseData); }
      }
      resetForms(); setActiveModal(null); loadSubData();
    } catch (error) { crossAlert('Error', getErrorMessage(error)); }
  }, [trip.id, taxiForm, editingId, loadSubData]);

  const handleSaveFerry = useCallback(async () => {
    try {
      const shared = { name: ferryForm.name.trim() ? sanitizeInput(ferryForm.name) : undefined, routeName: ferryForm.routeName.trim() ? sanitizeInput(ferryForm.routeName) : undefined, reference: ferryForm.reference.trim() ? sanitizeInput(ferryForm.reference) : undefined, cabin: ferryForm.cabin?.trim() ? sanitizeInput(ferryForm.cabin) : undefined, isOneWay: ferryForm.isOneWay || undefined, phone: ferryForm.phone.trim() ? sanitizeInput(ferryForm.phone) : undefined, hasCar: ferryForm.hasCar || undefined, carRegistration: ferryForm.hasCar && ferryForm.carRegistration.trim() ? sanitizeInput(ferryForm.carRegistration) : undefined, driver: ferryForm.driver.trim() ? sanitizeInput(ferryForm.driver) : undefined, passengers: ferryForm.passengers.trim() ? sanitizeInput(ferryForm.passengers) : undefined, note: ferryForm.note.trim() ? sanitizeInput(ferryForm.note) : undefined };
      const utreiseData = cleanData({ ...shared, type: 'utreise', departureDate: ferryForm.departureDate || undefined, departureTime: ferryForm.departureTime || undefined, departureAddress: ferryForm.departureAddress.trim() ? sanitizeInput(ferryForm.departureAddress) : undefined, arrivalAddress: ferryForm.arrivalAddress.trim() ? sanitizeInput(ferryForm.arrivalAddress) : undefined });
      const hjemreiseData = cleanData({ ...shared, type: 'hjemreise', departureDate: ferryForm.arrivalDate || undefined, departureTime: ferryForm.arrivalTime || undefined, departureAddress: ferryForm.arrivalAddress.trim() ? sanitizeInput(ferryForm.arrivalAddress) : undefined });
      if (editingId) { await updateTripFerry(trip.id, editingId, ferryForm.type === 'hjemreise' ? hjemreiseData : utreiseData); } else {
        await addTripFerry(trip.id, utreiseData);
        if (!ferryForm.isOneWay) { await addTripFerry(trip.id, hjemreiseData); }
      }
      resetForms(); setActiveModal(null); loadSubData();
    } catch (error) { crossAlert('Error', getErrorMessage(error)); }
  }, [trip.id, ferryForm, editingId, loadSubData]);

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
  const handleDeleteBoat = useCallback((id: string) => confirmDelete('båt', async () => { await deleteTripBoat(trip.id, id); loadSubData(); }), [trip.id, loadSubData]);
  const handleDeleteTaxi = useCallback((id: string) => confirmDelete('taxi', async () => { await deleteTripTaxi(trip.id, id); loadSubData(); }), [trip.id, loadSubData]);
  const handleDeleteFerry = useCallback((id: string) => confirmDelete('ferje', async () => { await deleteTripFerry(trip.id, id); loadSubData(); }), [trip.id, loadSubData]);

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
        const { webFetchAsBlob } = await import('../services/webStorage');
        const blob = await webFetchAsBlob(url);
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = '';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      } catch (err) {
        window.location.href = url;
      }
    } else {
      Linking.openURL(url);
    }
  };

  const sortedTransportRows = useMemo(() => {
    const typeOrder: Record<string, number> = { fly: 0, tog: 1, bil: 2 };
    // Filter out blank records (created when one-way was saved but hjemreise still generated)
    const valid = flights.filter(f => {
      const hasAnyData = f.airline || f.flightNumber || f.departureAddress || f.arrivalAddress || f.address || f.note || f.reference || f.wagon || f.driver || f.passengers || f.phone || f.seatNumber;
      return !!hasAnyData;
    });
    const sorted = [...valid].sort((a, b) => {
      const ta = typeOrder[a.transportType ?? 'fly'] ?? 0;
      const tb = typeOrder[b.transportType ?? 'fly'] ?? 0;
      if (ta !== tb) return ta - tb;
      if (a.type === 'utreise' && b.type !== 'utreise') return -1;
      if (a.type !== 'utreise' && b.type === 'utreise') return 1;
      const dateA = a.departureDate || a.arrivalDate || '';
      const dateB = b.departureDate || b.arrivalDate || '';
      if (dateA < dateB) return -1;
      if (dateA > dateB) return 1;
      const timeA = a.departureTime || a.arrivalTime || '';
      const timeB = b.departureTime || b.arrivalTime || '';
      if (timeA < timeB) return -1;
      if (timeA > timeB) return 1;
      return 0;
    });
    // Pair utreise (non-one-way) with matching hjemreise, drop unpaired hjemreise
    const rows: TripFlight[][] = [];
    const used = new Set<string>();
    for (let i = 0; i < sorted.length; i++) {
      if (used.has(sorted[i].id)) continue;
      const current = sorted[i];
      if (current.type === 'utreise' && !current.isOneWay) {
        const matchIdx = sorted.findIndex(
          (s, idx) => idx > i && !used.has(s.id) && s.type === 'hjemreise' && s.transportType === current.transportType
        );
        if (matchIdx !== -1) {
          rows.push([current, sorted[matchIdx]]);
          used.add(current.id);
          used.add(sorted[matchIdx].id);
        } else {
          rows.push([current]);
        }
      } else if (current.type === 'utreise') {
        // One-way departure — show alone, never pair
        rows.push([current]);
      }
      // hjemreise without matching utreise is silently dropped (orphan/one-way return)
    }
    return rows;
  }, [flights]);

  const otherTransportItems = useMemo(() => {
    const allItems: any[] = [];
    boats.forEach(b => {
      const typeLabel = b.type === 'hjemreise' ? t('transport.arrival') : t('transport.departure');
      allItems.push({
        id: b.id, icon: '⛴️', label: 'Ferje', typeLabel, name: b.name, detail: b.routeName, isHjemreise: b.type === 'hjemreise',
        departureDate: b.departureDate, departureTime: b.departureTime, arrivalTime: b.arrivalTime, hasCar: b.hasCar,
        transportType: 'ferry', docType: b.type,
        onPress: () => navigation.navigate('TripItemDetail', { item: b, tripId: trip.id, trip, itemType: 'boat' }),
        onLongPress: canDelete ? () => setActionModal({ visible: true, title: b.name || 'Ferje', onEdit: () => openEditModal('boat', b), onDelete: () => handleDeleteBoat(b.id) }) : undefined,
        sortKey: `boat_${b.departureDate || ''}_${b.departureTime || ''}`,
      });
    });
    taxis.forEach(tx => {
      const typeLabel = tx.type === 'hjemreise' ? t('transport.arrival') : t('transport.departure');
      allItems.push({
        id: tx.id, icon: '🚕', label: 'Taxi', typeLabel, name: tx.name, detail: tx.reference, isHjemreise: tx.type === 'hjemreise',
        departureDate: tx.departureDate, departureTime: tx.departureTime,
        transportType: 'taxi', docType: tx.type,
        onPress: () => navigation.navigate('TripItemDetail', { item: tx, tripId: trip.id, trip, itemType: 'taxi' }),
        onLongPress: canDelete ? () => setActionModal({ visible: true, title: tx.name || 'Taxi', onEdit: () => openEditModal('taxi', tx), onDelete: () => handleDeleteTaxi(tx.id) }) : undefined,
        sortKey: `taxi_${tx.departureDate || ''}_${tx.departureTime || ''}`,
      });
    });
    ferries.forEach(f => {
      const typeLabel = f.type === 'hjemreise' ? t('transport.arrival') : t('transport.departure');
      allItems.push({
        id: f.id, icon: '🚢', label: 'Båt/Cruise', typeLabel, name: f.name, detail: f.routeName, isHjemreise: f.type === 'hjemreise',
        departureDate: f.departureDate, departureTime: f.departureTime, arrivalTime: f.arrivalTime, hasCar: f.hasCar,
        transportType: 'ferry', docType: f.type,
        onPress: () => navigation.navigate('TripItemDetail', { item: f, tripId: trip.id, trip, itemType: 'ferry' }),
        onLongPress: canDelete ? () => setActionModal({ visible: true, title: f.name || 'Båt/Cruise', onEdit: () => openEditModal('ferry', f), onDelete: () => handleDeleteFerry(f.id) }) : undefined,
        sortKey: `ferry_${f.departureDate || ''}_${f.departureTime || ''}`,
      });
    });
    // Pair utreise with hjemreise, drop unpaired hjemreise
    const sorted = allItems.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    const rows: any[][] = [];
    const used = new Set<string>();
    for (let i = 0; i < sorted.length; i++) {
      if (used.has(sorted[i].id)) continue;
      const current = sorted[i];
      if (current.docType === 'utreise' || !current.docType) {
        const matchIdx = sorted.findIndex(
          (s, idx) => idx > i && !used.has(s.id) && s.docType === 'hjemreise' && s.transportType === current.transportType && s.label === current.label
        );
        if (matchIdx !== -1) {
          rows.push([current, sorted[matchIdx]]);
          used.add(current.id);
          used.add(sorted[matchIdx].id);
        } else {
          rows.push([current]);
        }
      }
      // Drop unpaired hjemreise
    }
    return rows;
  }, [boats, taxis, ferries, canDelete, trip, navigation]);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 8 }}>
        <Text style={{ color: colors.accent, fontSize: 20 }}>←</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tripCard, { backgroundColor: colors.surface }]}
        onPress={() => {
          setTripTitle(trip.title);
          setTripCity(trip.city);
          setTripCountry(trip.country);
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
        <View style={[styles.weatherCard, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>🌤️ {t('weather.title')}</Text>
            {isActive && (
              <TouchableOpacity
                onPress={() => fetchWeather(true)}
                disabled={refreshingWeather}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={{ color: colors.accent, fontSize: 14 }}>{refreshingWeather ? '⟳ ' + t('weather.refreshing') : '↻ ' + t('weather.refresh')}</Text>
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
                <Text style={[styles.weatherHeaderText, { color: '#0097A7', flex: 3 }]} numberOfLines={1}>{t('weather.day')}</Text>
                <Text style={[styles.weatherHeaderText, { color: '#0097A7', flex: 1, textAlign: 'center' }]} numberOfLines={1}>{t('weather.weather')}</Text>
                <Text style={[styles.weatherHeaderText, { color: '#0097A7', flex: 2, textAlign: 'center' }]} numberOfLines={1}>{t('weather.temp')}</Text>
                <Text style={[styles.weatherHeaderText, { color: '#0097A7', flex: 1, textAlign: 'center' }]} numberOfLines={1}>{t('weather.uv')}</Text>
                <Text style={[styles.weatherHeaderText, { color: '#0097A7', flex: 1, textAlign: 'right' }]} numberOfLines={1}>{t('weather.water')}</Text>
              </View>
              {pagedWeather.map((day, i) => {
                const isToday = day.date === today;
                return (
                  <View key={day.date} style={[
                    styles.weatherRow,
                    isToday && styles.weatherTodayRow,
                    !isToday && i % 2 === 0 && { backgroundColor: colors.surface },
                    !isToday && i % 2 !== 0 && { backgroundColor: colors.background },
                  ]}>
                    <Text style={[styles.weatherDayText, { color: colors.text, flex: 3, ...(isToday && { fontWeight: '600' }) }]} numberOfLines={1}>{formatShortDate(day.date)}</Text>
                    <Text style={{ flex: 1, textAlign: 'center', fontSize: 22 }}>{wmoToEmoji(day.weatherCode)}</Text>
                    <Text style={[styles.weatherDayText, { color: colors.text, flex: 2, textAlign: 'center' }]} numberOfLines={1}>
                      <Text style={{ color: tempColor(day.tempMin) }}>{day.tempMin}°</Text>
                      {' / '}
                      <Text style={{ color: tempColor(day.tempMax) }}>{day.tempMax}°</Text>
                    </Text>
                    <Text style={[styles.weatherDayText, { color: day.uvIndex >= 8 ? '#E53935' : colors.text, flex: 1, textAlign: 'center' }]} numberOfLines={1}>{day.uvIndex}</Text>
                    <Text style={[styles.weatherDayText, { color: colors.textSecondary, flex: 1, textAlign: 'right' }]} numberOfLines={1}>{day.waterTemp != null ? `${day.waterTemp}°` : '—'}</Text>
                  </View>
                );
              })}
              {weatherPages > 1 && (
                <View style={styles.weatherPagination}>
                  <TouchableOpacity disabled={weatherPage === 0} onPress={() => setWeatherPage((p) => p - 1)}>
                    <Text style={{ color: weatherPage === 0 ? colors.textDisabled : colors.accent }}>← {t('weather.previous')}</Text>
                  </TouchableOpacity>
                  <Text style={{ color: colors.textSecondary }}>{weatherPage + 1} / {weatherPages}</Text>
                  <TouchableOpacity disabled={weatherPage >= weatherPages - 1} onPress={() => setWeatherPage((p) => p + 1)}>
                    <Text style={{ color: weatherPage >= weatherPages - 1 ? colors.textDisabled : colors.accent }}>{t('weather.next')} →</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>
      )}

      {/* Currency Converter */}
      {trip.country && (
        <View style={[styles.weatherCard, { backgroundColor: colors.surface }]}>
          <CurrencyConverter country={trip.country} language={i18n.language} />
        </View>
      )}

      {/* Transport */}
      <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
        {renderSectionHeader(t('transport.title'), '🚀', () => setShowTransportPicker(true))}
        {sortedTransportRows.length === 0 && otherTransportItems.length === 0 ? (
          <Text style={[styles.emptySection, { color: colors.textDisabled, paddingHorizontal: 16 }]}>{t('transport.noTransport')}</Text>
        ) : (
          <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
            {sortedTransportRows.map((row, rowIdx) => (
              <View key={`flight-${rowIdx}`} style={styles.transportGrid}>
                {row.map((f) => (
                  <View key={f.id} style={styles.transportTileWrapper}>
                    <TransportTile
                      flight={f}
                      onPress={() => navigation.navigate('TransportDetail', { flight: f, tripId: trip.id, trip })}
                      onLongPress={canDelete ? () => setActionModal({ visible: true, title: `${f.airline || f.transportType} ${f.flightNumber || ''}`.trim(), subtitle: 'Transport', onEdit: () => openEditModal('flight', f), onDelete: () => handleDeleteFlight(f.id) }) : undefined}
                    />
                  </View>
                ))}
              </View>
            ))}
            {(() => {
              return otherTransportItems.map((row, rowIdx) => (
                <View key={`other-${rowIdx}`} style={styles.transportGrid}>
                  {row.map((item: any) => (
                    <View key={item.id} style={styles.transportTileWrapper}>
                      <TransportItemTile
                        icon={item.icon}
                        label={item.label}
                        typeLabel={item.typeLabel}
                        name={item.name}
                        detail={item.detail}
                        departureDate={item.departureDate}
                        departureTime={item.departureTime}
                        arrivalTime={item.arrivalTime}
                        hasCar={item.hasCar}
                        isHjemreise={item.isHjemreise}
                        onPress={item.onPress}
                        onLongPress={item.onLongPress}
                      />
                    </View>
                  ))}
                </View>
              ));
            })()}
          </View>
        )}
      </View>

      {/* Hotels */}
      <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
        {renderSectionHeader(t('hotels.title'), '🛏️', () => openAddModal('hotel'))}
        <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
          {hotels.length === 0 ? (
            <Text style={[styles.emptySection, { color: colors.textDisabled }]}>{t('hotels.noHotels')}</Text>
          ) : (
            hotels.map((h) => (
              <AddressItemCard
                key={h.id}
                name={h.name}
                address={h.address}
                detail={[h.startDate ? formatDate(h.startDate) : '', h.endDate ? formatDate(h.endDate) : ''].filter(Boolean).join(' – ') || h.phone}
                onPress={() => navigation.navigate('TripItemDetail', { item: h, tripId: trip.id, trip, itemType: 'hotel' })}
                onLongPress={canDelete ? () => setActionModal({ visible: true, title: h.name, onEdit: () => openEditModal('hotel', h), onDelete: () => handleDeleteHotel(h.id) }) : undefined}
              />
            ))
          )}
        </View>
      </View>

      {/* Restaurants */}
      <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
        {renderSectionHeader(t('restaurants.title'), '🍽️', () => openAddModal('restaurant'))}
        <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
          {restaurants.length === 0 ? (
            <Text style={[styles.emptySection, { color: colors.textDisabled }]}>{t('restaurants.noRestaurants')}</Text>
          ) : (
            restaurants.map((r) => (
              <AddressItemCard
                key={r.id}
                name={r.name}
                address={r.address}
                note={r.note}
                onPress={() => navigation.navigate('TripItemDetail', { item: r, tripId: trip.id, trip, itemType: 'restaurant' })}
                onLongPress={canDelete ? () => setActionModal({ visible: true, title: r.name || 'Restaurant', onEdit: () => openEditModal('restaurant', r), onDelete: () => handleDeleteRestaurant(r.id) }) : undefined}
              />
            ))
          )}
        </View>
      </View>

      {/* Activities */}
      <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
        {renderSectionHeader(t('activities.title'), '🎯', () => openAddModal('activity'))}
        <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
          {activities.length === 0 ? (
            <Text style={[styles.emptySection, { color: colors.textDisabled }]}>{t('activities.noActivities')}</Text>
          ) : (
            activities.map((a) => (
              <AddressItemCard
                key={a.id}
                name={a.name}
                address={a.address}
                detail={[a.startDate ? formatDate(a.startDate) : '', a.endDate ? formatDate(a.endDate) : ''].filter(Boolean).join(' – ') || [a.startTime, a.endTime].filter(Boolean).join(' – ') || undefined}
                note={a.note}
                onPress={() => navigation.navigate('TripItemDetail', { item: a, tripId: trip.id, trip, itemType: 'activity' })}
                onLongPress={canDelete ? () => setActionModal({ visible: true, title: a.name || 'Aktivitet', onEdit: () => openEditModal('activity', a), onDelete: () => handleDeleteActivity(a.id) }) : undefined}
              />
            ))
          )}
        </View>
      </View>

      {/* Destination Tips */}
      <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>💡 {t('tips.title')}</Text>
        </View>
        <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
          <GooglePlacesInput
            value={tipsSearchValue}
            onChangeText={setTipsSearchValue}
            placeholder={t('tips.searchCity')}
            onSelect={(description) => {
              const cityName = description.split(',')[0].trim();
              setStagedCity(cityName);
              setTipsSearchValue('');
            }}
            types={['(cities)']}
          />

          {stagedCity && (
            <View style={[styles.stagedCityRow, { borderColor: colors.accent, backgroundColor: colors.inputBackground }]}>
              <Text style={[styles.stagedCityName, { color: colors.text }]}>📍 {stagedCity}</Text>
              {tipsLoading ? (
                <View style={[styles.generateButton, { backgroundColor: colors.accent, flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.generateButtonText}>Genererer...</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.generateButton, { backgroundColor: colors.accent }]}
                  onPress={() => handleGenerateTips(stagedCity)}
                >
                  <Text style={styles.generateButtonText}>Generer</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {tipsLoading && !stagedCity && (
            <Text style={[styles.emptySection, { color: colors.textDisabled }]}>Genererer tips...</Text>
          )}
          {tipsError && (
            <Text style={[styles.emptySection, { color: '#E53935' }]}>{tipsError}</Text>
          )}

          {cityTipsList.map((entry) => {
            const isExpanded = expandedTipsCity === entry.city;
            return (
              <View key={entry.city} style={[styles.tipsExpandable, { borderColor: colors.border }]}>
                <TouchableOpacity
                  style={[styles.tipsExpandHeader, { backgroundColor: colors.inputBackground }]}
                  onPress={() => setExpandedTipsCity(isExpanded ? null : entry.city)}
                >
                  <Text style={[styles.tipsExpandIcon, { color: colors.textSecondary }]}>{isExpanded ? '▼' : '▶'}</Text>
                  <Text style={[styles.tipsExpandTitle, { color: colors.text }]}>{entry.city}</Text>
                  <Text style={[styles.tipsExpandDate, { color: colors.textDisabled }]}>
                    {new Date(entry.tips.generatedAt).toLocaleDateString('nb-NO')}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      const idx = cityTipsList.findIndex((e) => e.city === entry.city);
                      handleGenerateTips(entry.city, idx);
                    }}
                    disabled={tipsLoading}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={[styles.tipsRefreshBtn, { color: colors.accent }]}>
                      {tipsLoading ? '...' : '↻'}
                    </Text>
                  </TouchableOpacity>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={[styles.tipsExpandBody, { backgroundColor: colors.inputBackground }]}>
                    {entry.tips.overview ? (
                      <Text style={[styles.tipsOverview, { color: colors.text }]}>{entry.tips.overview}</Text>
                    ) : null}

                    {entry.tips.thingsToDo.length > 0 && (
                      <View style={styles.tipsGroup}>
                        <Text style={[styles.tipsGroupTitle, { color: colors.text }]}>🗓️ Ting å gjøre</Text>
                        {entry.tips.thingsToDo.map((item, i) => (
                          <Text key={i} style={[styles.tipsItem, { color: colors.text }]}>• {item}</Text>
                        ))}
                      </View>
                    )}

                    {entry.tips.restaurants.length > 0 && (
                      <View style={styles.tipsGroup}>
                        <Text style={[styles.tipsGroupTitle, { color: colors.text }]}>🍽️ Restauranter</Text>
                        {entry.tips.restaurants.map((item, i) => (
                          <Text key={i} style={[styles.tipsItem, { color: colors.text }]}>• {item}</Text>
                        ))}
                      </View>
                    )}

                    {entry.tips.localPhrases.length > 0 && (
                      <View style={styles.tipsGroup}>
                        <Text style={[styles.tipsGroupTitle, { color: colors.text }]}>💬 Nyttige fraser</Text>
                        {entry.tips.localPhrases.map((p, i) => (
                          <View key={i} style={styles.phraseRow}>
                            <Text style={[styles.phraseText, { color: colors.text }]}>{p.no}</Text>
                            <Text style={[styles.phraseArrow, { color: colors.textSecondary }]}> → </Text>
                            <Text style={[styles.phraseText, { color: colors.accent }]}>{p.local}</Text>
                            {p.pronunciation ? (
                              <Text style={[styles.phrasePron, { color: colors.textSecondary }]}> ({p.pronunciation})</Text>
                            ) : null}
                          </View>
                        ))}
                      </View>
                    )}

                    {entry.tips.transportTips.length > 0 && (
                      <View style={styles.tipsGroup}>
                        <Text style={[styles.tipsGroupTitle, { color: colors.text }]}>🚗 Transport</Text>
                        {entry.tips.transportTips.map((item, i) => (
                          <Text key={i} style={[styles.tipsItem, { color: colors.text }]}>• {item}</Text>
                        ))}
                      </View>
                    )}

                    {entry.tips.scamWarnings.length > 0 && (
                      <View style={styles.tipsGroup}>
                        <Text style={[styles.tipsGroupTitle, { color: '#E53935' }]}>⚠️ Varsler</Text>
                        {entry.tips.scamWarnings.map((item, i) => (
                          <Text key={i} style={[styles.tipsItem, { color: colors.text }]}>• {item}</Text>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}

          {cityTipsList.length === 0 && !tipsLoading && !stagedCity && (
            <Text style={[styles.emptySection, { color: colors.textDisabled }]}>
              Søk etter en by for å generere destinasjonstips
            </Text>
          )}
        </View>
      </View>

      {/* Links */}
      <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
        {renderSectionHeader(t('links.title'), '🔗', () => openAddModal('link'))}
        <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
          {links.length === 0 ? (
            <Text style={[styles.emptySection, { color: colors.textDisabled }]}>Ingen lenker lagt til</Text>
          ) : (
            links.map((l) => (
              <LinkPreviewCard
                key={l.id}
                link={l}
                onPress={() => Linking.openURL(l.url)}
                onLongPress={canDelete ? () => handleDeleteLink(l.id) : undefined}
              />
            ))
          )}
        </View>
      </View>

      {/* Documents */}
      <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={[styles.tipsExpandHeader, { backgroundColor: colors.surface }]}
          onPress={() => setDocsExpanded(!docsExpanded)}
        >
          <Text style={[styles.tipsExpandIcon, { color: colors.textSecondary }]}>{docsExpanded ? '\u25bc' : '\u25b6'}</Text>
          <Text style={[styles.tipsExpandTitle, { color: colors.text }]}>📄 {t('documents.title')}</Text>
          {docsExpanded && (
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.accent }]}
              onPress={() => openAddModal('document')}
            >
              <Text style={styles.addButtonText}>+</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
        {docsExpanded && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
            {documents.length === 0 ? (
              <Text style={[styles.emptySection, { color: colors.textDisabled }]}>Ingen dokumenter lagt til</Text>
            ) : (
              documents.map((d) => (
                <TouchableOpacity
                  key={d.id}
                  style={[styles.itemCard, { backgroundColor: colors.inputBackground }]}
                  onPress={() => openEditModal('document', d)}
                  onLongPress={canDelete ? () => handleDeleteDocument(d.id) : undefined}
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
                          <Text style={{ color: colors.accent, fontSize: 14 }}>{t('documents.open')}</Text>
                        </TouchableOpacity>
                      )}
                      {canDelete && (
                        <TouchableOpacity onPress={() => handleDeleteDocument(d.id)} style={styles.docAction}>
                          <Text style={{ color: '#E53935', fontSize: 14 }}>{t('common.delete')}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </View>


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
                    <Text style={[styles.label, { color: colors.text }]}>By</Text>
                    <GooglePlacesInput
                      value={tripCity}
                      onChangeText={setTripCity}
                      placeholder="F.eks. Cavtat"
                      types={['(cities)']}
                      onSelect={(address) => {
                        const parts = address.split(',').map((p) => p.trim());
                        setTripCity(parts[0] || address);
                        if (parts.length > 1) {
                          setTripCountry(parts[parts.length - 1]);
                        }
                      }}
                    />
                  </View>

                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>Land</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                      value={tripCountry}
                      onChangeText={setTripCountry}
                      placeholder="F.eks. Kroatia"
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
                    <Text style={[styles.modalButtonText, { color: colors.text }]}>{t('common.cancel')}</Text>
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
        onFlightFormChange={handleFlightFormChange}
        onSave={handleSaveFlight}
        onCancel={() => setActiveModal(null)}
        onOpenPicker={(field) => setActivePicker(field)}
        onDirectionChange={(dir) => {
          setActiveDirection(dir);
          if (dir === 'utreise') {
            setFlightFormUtreise(f => ({ ...f, type: 'utreise' }));
          } else {
            setFlightFormHjemreise(f => ({ ...f, type: 'hjemreise' }));
          }
        }}
        onTransportTypeChange={(tt) => {
          setFlightFormUtreise(f => ({ ...f, transportType: tt }));
          setFlightFormHjemreise(f => ({ ...f, transportType: tt }));
        }}
        colors={colors}
      />

      {/* Hotel Modal */}
      <Modal visible={activeModal === 'hotel'} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setActiveModal(null)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                <Text style={[styles.modalTitle, { color: colors.text, borderBottomColor: colors.border }]}>
                  {editingId ? t('detail.edit') + ' ' + t('hotels.title').toLowerCase() : t('common.add') + ' ' + t('hotels.title').toLowerCase()}
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
                    <Text style={[styles.label, { color: colors.text }]}>{t('common.address')}</Text>
                    <GooglePlacesInput
                      value={hotelForm.address}
                      onChangeText={(v) => setHotelForm(f => ({ ...f, address: v }))}
                      placeholder={t('common.search') + "..."}
                      onSelect={(v) => setHotelForm(f => ({ ...f, address: v }))}
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('common.phone')}</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                      value={hotelForm.phone}
                      onChangeText={(v) => setHotelForm(f => ({ ...f, phone: v }))}
                      placeholder="F.eks. +46 8 123 456"
                      placeholderTextColor={colors.textDisabled}
                      keyboardType="phone-pad"
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('common.startDate')}</Text>
                    <TouchableOpacity
                      style={[styles.input, { backgroundColor: colors.inputBackground }]}
                      onPress={() => setActivePicker('hotelStartDate')}
                    >
                      <Text style={{ color: hotelForm.startDate ? colors.text : colors.textDisabled, fontSize: 16 }}>
                        {hotelForm.startDate || 'Velg startdato'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('common.endDate')}</Text>
                    <TouchableOpacity
                      style={[styles.input, { backgroundColor: colors.inputBackground }]}
                      onPress={() => setActivePicker('hotelEndDate')}
                    >
                      <Text style={{ color: hotelForm.endDate ? colors.text : colors.textDisabled, fontSize: 16 }}>
                        {hotelForm.endDate || 'Velg sluttdato'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('hotels.checkIn')}</Text>
                    <TouchableOpacity
                      style={[styles.input, { backgroundColor: colors.inputBackground }]}
                      onPress={() => setActivePicker('hotelCheckIn')}
                    >
                      <Text style={{ color: hotelForm.checkInTime ? colors.text : colors.textDisabled, fontSize: 16 }}>
                        {hotelForm.checkInTime || t('common.pickTime')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('hotels.checkOut')}</Text>
                    <TouchableOpacity
                      style={[styles.input, { backgroundColor: colors.inputBackground }]}
                      onPress={() => setActivePicker('hotelCheckOut')}
                    >
                      <Text style={{ color: hotelForm.checkOutTime ? colors.text : colors.textDisabled, fontSize: 16 }}>
                        {hotelForm.checkOutTime || t('common.pickTime')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('common.notes')}</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                      value={hotelForm.note}
                      onChangeText={(v) => setHotelForm(f => ({ ...f, note: v }))}
                      placeholder="F.eks. Utsikt mot havet"
                      placeholderTextColor={colors.textDisabled}
                    />
                  </View>
                </ScrollView>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.inputBackground }]} onPress={() => setActiveModal(null)}>
                    <Text style={[styles.modalButtonText, { color: colors.text }]}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.accent }]} onPress={handleSaveHotel}>
                    <Text style={[styles.modalButtonText, { color: '#fff' }]}>{editingId ? t('common.save') : t('common.add')}</Text>
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
                  {editingId ? t('detail.edit') + ' ' + t('restaurants.title').toLowerCase() : t('common.add') + ' ' + t('restaurants.title').toLowerCase()}
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
                    <Text style={[styles.label, { color: colors.text }]}>{t('common.address')}</Text>
                    <GooglePlacesInput
                      value={restForm.address}
                      onChangeText={(v) => setRestForm(f => ({ ...f, address: v }))}
                      placeholder={t('common.search') + "..."}
                      onSelect={(v) => setRestForm(f => ({ ...f, address: v }))}
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('common.note')}</Text>
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
                    <Text style={[styles.modalButtonText, { color: colors.text }]}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.accent }]} onPress={handleSaveRestaurant}>
                    <Text style={[styles.modalButtonText, { color: '#fff' }]}>{editingId ? t('common.save') : t('common.add')}</Text>
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
                  {editingId ? t('detail.edit') + ' ' + t('activities.title').toLowerCase() : t('common.add') + ' ' + t('activities.title').toLowerCase()}
                </Text>
                <ScrollView style={styles.modalScroll}>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('common.name')} *</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                      value={actForm.name}
                      onChangeText={(v) => setActForm(f => ({ ...f, name: v }))}
                      placeholder={t('activities.placeholderName')}
                      placeholderTextColor={colors.textDisabled}
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('common.address')}</Text>
                    <GooglePlacesInput
                      value={actForm.address}
                      onChangeText={(v) => setActForm(f => ({ ...f, address: v }))}
                      placeholder={t('common.search') + "..."}
                      onSelect={(v) => setActForm(f => ({ ...f, address: v }))}
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('common.startDate')}</Text>
                    <TouchableOpacity
                      style={[styles.input, { backgroundColor: colors.inputBackground }]}
                      onPress={() => setActivePicker('actStartDate')}
                    >
                      <Text style={{ color: actForm.startDate ? colors.text : colors.textDisabled, fontSize: 16 }}>
                        {actForm.startDate || t('pickers.startDate')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('common.endDate')}</Text>
                    <TouchableOpacity
                      style={[styles.input, { backgroundColor: colors.inputBackground }]}
                      onPress={() => setActivePicker('actEndDate')}
                    >
                      <Text style={{ color: actForm.endDate ? colors.text : colors.textDisabled, fontSize: 16 }}>
                        {actForm.endDate || t('pickers.endDate')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('pickers.startTime')}</Text>
                    <TouchableOpacity
                      style={[styles.input, { backgroundColor: colors.inputBackground }]}
                      onPress={() => setActivePicker('actStartTime')}
                    >
                      <Text style={{ color: actForm.startTime ? colors.text : colors.textDisabled, fontSize: 16 }}>
                        {actForm.startTime || t('pickers.startTime')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('pickers.endTime')}</Text>
                    <TouchableOpacity
                      style={[styles.input, { backgroundColor: colors.inputBackground }]}
                      onPress={() => setActivePicker('actEndTime')}
                    >
                      <Text style={{ color: actForm.endTime ? colors.text : colors.textDisabled, fontSize: 16 }}>
                        {actForm.endTime || t('pickers.endTime')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('common.note')}</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                      value={actForm.note}
                      onChangeText={(v) => setActForm(f => ({ ...f, note: v }))}
                      placeholder={t('activities.placeholderNote')}
                      placeholderTextColor={colors.textDisabled}
                    />
                  </View>
                </ScrollView>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.inputBackground }]} onPress={() => setActiveModal(null)}>
                    <Text style={[styles.modalButtonText, { color: colors.text }]}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.accent }]} onPress={handleSaveActivity}>
                    <Text style={[styles.modalButtonText, { color: '#fff' }]}>{editingId ? t('common.save') : t('common.add')}</Text>
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
                  {editingId ? t('detail.edit') + ' ' + t('documents.title').toLowerCase() : t('common.add') + ' ' + t('documents.title').toLowerCase()}
                </Text>
                <ScrollView style={styles.modalScroll}>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('common.title')} *</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                      value={docForm.title}
                      onChangeText={(v) => setDocForm(f => ({ ...f, title: v }))}
                      placeholder={t('documents.placeholderTitle')}
                      placeholderTextColor={colors.textDisabled}
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('common.note')}</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                      value={docForm.note}
                      onChangeText={(v) => setDocForm(f => ({ ...f, note: v }))}
                      placeholder={t('documents.placeholderNote')}
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
                    <Text style={[styles.modalButtonText, { color: colors.text }]}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.accent }]} onPress={handleSaveDocument}>
                    <Text style={[styles.modalButtonText, { color: '#fff' }]}>{editingId ? t('common.save') : t('common.add')}</Text>
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
                  {editingId ? t('detail.edit') + ' ' + t('links.title').toLowerCase() : t('common.add') + ' ' + t('links.title').toLowerCase()}
                </Text>
                <ScrollView style={styles.modalScroll}>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('common.title')} *</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                      value={linkForm.title}
                      onChangeText={(v) => setLinkForm(f => ({ ...f, title: v }))}
                      placeholder={t('links.placeholderTitle')}
                      placeholderTextColor={colors.textDisabled}
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('links.url')} *</Text>
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
                    <Text style={[styles.modalButtonText, { color: colors.text }]}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.accent }]} onPress={handleSaveLink}>
                    <Text style={[styles.modalButtonText, { color: '#fff' }]}>{editingId ? t('common.save') : t('common.add')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Boat Modal → now Ferje */}
      <Modal visible={activeModal === 'boat'} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setActiveModal(null)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 12 }}>
                  <Text style={{ fontSize: 28 }}>⛴️</Text>
                  <Text style={[styles.modalTitle, { color: colors.text, borderBottomColor: 'transparent' }]}>
                    {editingId ? t('detail.edit') + ' ' + t('transport.ferry').toLowerCase() : t('common.add') + ' ' + t('transport.ferry').toLowerCase()}
                  </Text>
                </View>
                <ScrollView style={styles.modalScroll}>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('transport.operator')}</Text>
                    <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={boatForm.name} onChangeText={(v) => setBoatForm(f => ({ ...f, name: v }))} placeholder="F.eks. Color Line" placeholderTextColor={colors.textDisabled} />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('transport.routeName')}</Text>
                    <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={boatForm.routeName} onChangeText={(v) => setBoatForm(f => ({ ...f, routeName: v }))} placeholder="F.eks. Bergen–Tromsø" placeholderTextColor={colors.textDisabled} />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('common.reference')}</Text>
                    <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={boatForm.reference} onChangeText={(v) => setBoatForm(f => ({ ...f, reference: v }))} placeholder="Booking-referanse" placeholderTextColor={colors.textDisabled} />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('transport.cabin')}</Text>
                    <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={boatForm.cabin} onChangeText={(v) => setBoatForm(f => ({ ...f, cabin: v }))} placeholder="F.eks. Inner 2-sengs" placeholderTextColor={colors.textDisabled} />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('transport.departure')}</Text>
                    <TouchableOpacity style={[styles.input, { backgroundColor: colors.inputBackground }]} onPress={() => setActivePicker('boatDepDate')}>
                      <Text style={{ color: boatForm.departureDate ? colors.text : colors.textDisabled, fontSize: 16 }}>{boatForm.departureDate || t('common.pickDate')}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('transport.departure')} {t('common.time')}</Text>
                    <TouchableOpacity style={[styles.input, { backgroundColor: colors.inputBackground }]} onPress={() => setActivePicker('boatDepTime')}>
                      <Text style={{ color: boatForm.departureTime ? colors.text : colors.textDisabled, fontSize: 16 }}>{boatForm.departureTime || t('common.pickTime')}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.field}>
                    <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} onPress={() => setBoatForm(f => ({ ...f, isOneWay: !f.isOneWay }))}>
                      <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: boatForm.isOneWay ? colors.accent : colors.textDisabled, backgroundColor: boatForm.isOneWay ? colors.accent : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                        {boatForm.isOneWay && <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>✓</Text>}
                      </View>
                      <Text style={[styles.label, { color: colors.text }]}>{t('transport.oneWay')}</Text>
                    </TouchableOpacity>
                  </View>
                  {!boatForm.isOneWay && (
                    <>
                      <View style={styles.field}>
                        <Text style={[styles.label, { color: colors.text }]}>{t('transport.arrival')}</Text>
                        <TouchableOpacity style={[styles.input, { backgroundColor: colors.inputBackground }]} onPress={() => setActivePicker('boatArrDate')}>
                          <Text style={{ color: boatForm.arrivalDate ? colors.text : colors.textDisabled, fontSize: 16 }}>{boatForm.arrivalDate || t('common.pickDate')}</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.field}>
                        <Text style={[styles.label, { color: colors.text }]}>{t('transport.arrival')} {t('common.time')}</Text>
                        <TouchableOpacity style={[styles.input, { backgroundColor: colors.inputBackground }]} onPress={() => setActivePicker('boatArrTime')}>
                          <Text style={{ color: boatForm.arrivalTime ? colors.text : colors.textDisabled, fontSize: 16 }}>{boatForm.arrivalTime || t('common.pickTime')}</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('transport.departureTerminal')}</Text>
                    <GooglePlacesInput value={boatForm.departureAddress} onChangeText={(v) => setBoatForm(f => ({ ...f, departureAddress: v }))} placeholder="Avgangsterminal adresse..." onSelect={(v) => setBoatForm(f => ({ ...f, departureAddress: v }))} />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('transport.arrivalTerminal')}</Text>
                    <GooglePlacesInput value={boatForm.arrivalAddress} onChangeText={(v) => setBoatForm(f => ({ ...f, arrivalAddress: v }))} placeholder="Ankomstterminal adresse..." onSelect={(v) => setBoatForm(f => ({ ...f, arrivalAddress: v }))} />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('common.phone')}</Text>
                    <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={boatForm.phone} onChangeText={(v) => setBoatForm(f => ({ ...f, phone: v }))} placeholder="F.eks. +47 000 00 000" placeholderTextColor={colors.textDisabled} keyboardType="phone-pad" />
                  </View>
                  <View style={styles.field}>
                    <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} onPress={() => setBoatForm(f => ({ ...f, hasCar: !f.hasCar }))}>
                      <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: boatForm.hasCar ? colors.accent : colors.textDisabled, backgroundColor: boatForm.hasCar ? colors.accent : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                        {boatForm.hasCar && <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>✓</Text>}
                      </View>
                      <Text style={[styles.label, { color: colors.text }]}>{t('common.carWith')}</Text>
                    </TouchableOpacity>
                  </View>
                  {boatForm.hasCar && (
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('common.carRegNr')}</Text>
                      <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={boatForm.carRegistration} onChangeText={(v) => setBoatForm(f => ({ ...f, carRegistration: v }))} placeholder="F.eks. AB 12345" placeholderTextColor={colors.textDisabled} />
                    </View>
                  )}
                  {boatForm.hasCar && (
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('common.driver')}</Text>
                      <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={boatForm.driver} onChangeText={(v) => setBoatForm(f => ({ ...f, driver: v }))} placeholder="F.eks. Jon" placeholderTextColor={colors.textDisabled} />
                    </View>
                  )}
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('common.passengers')}</Text>
                    <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={boatForm.passengers} onChangeText={(v) => setBoatForm(f => ({ ...f, passengers: v }))} placeholder="F.eks. 4" placeholderTextColor={colors.textDisabled} keyboardType="number-pad" />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('common.note')}</Text>
                    <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={boatForm.note} onChangeText={(v) => setBoatForm(f => ({ ...f, note: v }))} placeholder="F.eks. Bestilt middag ombord" placeholderTextColor={colors.textDisabled} />
                  </View>
                </ScrollView>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.inputBackground }]} onPress={() => setActiveModal(null)}>
                    <Text style={[styles.modalButtonText, { color: colors.text }]}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.accent }]} onPress={handleSaveBoat}>
                    <Text style={[styles.modalButtonText, { color: '#fff' }]}>{editingId ? t('common.save') : t('common.add')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Taxi Modal */}
      <Modal visible={activeModal === 'taxi'} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setActiveModal(null)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 12 }}>
                  <Text style={{ fontSize: 28 }}>🚕</Text>
                  <Text style={[styles.modalTitle, { color: colors.text, borderBottomColor: 'transparent' }]}>
                    {editingId ? t('detail.edit') + ' ' + t('transport.taxi').toLowerCase() : t('common.add') + ' ' + t('transport.taxi').toLowerCase()}
                  </Text>
                </View>
                <ScrollView style={styles.modalScroll}>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('transport.operator')}</Text>
                    <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={taxiForm.name} onChangeText={(v) => setTaxiForm(f => ({ ...f, name: v }))} placeholder="F.eks. Oslo Taxi" placeholderTextColor={colors.textDisabled} />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('common.reference')}</Text>
                    <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={taxiForm.reference} onChangeText={(v) => setTaxiForm(f => ({ ...f, reference: v }))} placeholder="Booking-referanse" placeholderTextColor={colors.textDisabled} />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('transport.departure')} {t('common.date')}</Text>
                    <TouchableOpacity style={[styles.input, { backgroundColor: colors.inputBackground }]} onPress={() => setActivePicker('taxiDate')}>
                      <Text style={{ color: taxiForm.departureDate ? colors.text : colors.textDisabled, fontSize: 16 }}>{taxiForm.departureDate || t('common.pickDate')}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('transport.departure')} {t('common.time')}</Text>
                    <TouchableOpacity style={[styles.input, { backgroundColor: colors.inputBackground }]} onPress={() => setActivePicker('taxiTime')}>
                      <Text style={{ color: taxiForm.departureTime ? colors.text : colors.textDisabled, fontSize: 16 }}>{taxiForm.departureTime || t('common.pickTime')}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.field}>
                    <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} onPress={() => setTaxiForm(f => ({ ...f, isOneWay: !f.isOneWay }))}>
                      <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: taxiForm.isOneWay ? colors.accent : colors.textDisabled, backgroundColor: taxiForm.isOneWay ? colors.accent : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                        {taxiForm.isOneWay && <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>✓</Text>}
                      </View>
                      <Text style={[styles.label, { color: colors.text }]}>{t('transport.oneWay')}</Text>
                    </TouchableOpacity>
                  </View>
                  {!taxiForm.isOneWay && (
                    <>
                      <View style={styles.field}>
                        <Text style={[styles.label, { color: colors.text }]}>{t('transport.arrival')} {t('common.date')}</Text>
                        <TouchableOpacity style={[styles.input, { backgroundColor: colors.inputBackground }]} onPress={() => setActivePicker('taxiArrDate')}>
                          <Text style={{ color: taxiForm.arrivalDate ? colors.text : colors.textDisabled, fontSize: 16 }}>{taxiForm.arrivalDate || t('common.pickDate')}</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.field}>
                        <Text style={[styles.label, { color: colors.text }]}>{t('transport.arrival')} {t('common.time')}</Text>
                        <TouchableOpacity style={[styles.input, { backgroundColor: colors.inputBackground }]} onPress={() => setActivePicker('taxiArrTime')}>
                          <Text style={{ color: taxiForm.arrivalTime ? colors.text : colors.textDisabled, fontSize: 16 }}>{taxiForm.arrivalTime || t('common.pickTime')}</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('transport.departureTerminal')}</Text>
                    <GooglePlacesInput value={taxiForm.departureAddress} onChangeText={(v) => setTaxiForm(f => ({ ...f, departureAddress: v }))} placeholder="Henteadresse..." onSelect={(v) => setTaxiForm(f => ({ ...f, departureAddress: v }))} />
                  </View>
                  {!taxiForm.isOneWay && (
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('transport.arrivalTerminal')}</Text>
                      <GooglePlacesInput value={taxiForm.arrivalAddress} onChangeText={(v) => setTaxiForm(f => ({ ...f, arrivalAddress: v }))} placeholder="Leveringsadresse..." onSelect={(v) => setTaxiForm(f => ({ ...f, arrivalAddress: v }))} />
                    </View>
                  )}
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('common.phone')}</Text>
                    <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={taxiForm.phone} onChangeText={(v) => setTaxiForm(f => ({ ...f, phone: v }))} placeholder="F.eks. +47 000 00 000" placeholderTextColor={colors.textDisabled} keyboardType="phone-pad" />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('common.driver')}</Text>
                    <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={taxiForm.driver} onChangeText={(v) => setTaxiForm(f => ({ ...f, driver: v }))} placeholder="F.eks. Jon" placeholderTextColor={colors.textDisabled} />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('common.passengers')}</Text>
                    <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={taxiForm.passengers} onChangeText={(v) => setTaxiForm(f => ({ ...f, passengers: v }))} placeholder="F.eks. 4" placeholderTextColor={colors.textDisabled} keyboardType="number-pad" />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('common.note')}</Text>
                    <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={taxiForm.note} onChangeText={(v) => setTaxiForm(f => ({ ...f, note: v }))} placeholder="F.eks. Bestilt for 4 personer" placeholderTextColor={colors.textDisabled} />
                  </View>
                </ScrollView>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.inputBackground }]} onPress={() => setActiveModal(null)}>
                    <Text style={[styles.modalButtonText, { color: colors.text }]}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.accent }]} onPress={handleSaveTaxi}>
                    <Text style={[styles.modalButtonText, { color: '#fff' }]}>{editingId ? t('common.save') : t('common.add')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Ferry Modal → now Båt/Cruise */}
      <Modal visible={activeModal === 'ferry'} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setActiveModal(null)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 12 }}>
                  <Text style={{ fontSize: 28 }}>🚢</Text>
                  <Text style={[styles.modalTitle, { color: colors.text, borderBottomColor: 'transparent' }]}>
                    {editingId ? t('detail.edit') + ' ' + t('transport.boatCruise').toLowerCase() : t('common.add') + ' ' + t('transport.boatCruise').toLowerCase()}
                  </Text>
                </View>
                <ScrollView style={styles.modalScroll}>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('transport.operator')}</Text>
                    <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={ferryForm.name} onChangeText={(v) => setFerryForm(f => ({ ...f, name: v }))} placeholder="F.eks. Color Line" placeholderTextColor={colors.textDisabled} />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('transport.routeName')}</Text>
                    <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={ferryForm.routeName} onChangeText={(v) => setFerryForm(f => ({ ...f, routeName: v }))} placeholder="F.eks. Oslo–Frederikshavn" placeholderTextColor={colors.textDisabled} />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('transport.cabin')}</Text>
                    <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={ferryForm.cabin || ''} onChangeText={(v) => setFerryForm(f => ({ ...f, cabin: v }))} placeholder="F.eks. Inner 2-sengs" placeholderTextColor={colors.textDisabled} />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('common.reference')}</Text>
                    <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={ferryForm.reference} onChangeText={(v) => setFerryForm(f => ({ ...f, reference: v }))} placeholder="Booking-referanse" placeholderTextColor={colors.textDisabled} />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('transport.departure')}</Text>
                    <TouchableOpacity style={[styles.input, { backgroundColor: colors.inputBackground }]} onPress={() => setActivePicker('ferryDepDate')}>
                      <Text style={{ color: ferryForm.departureDate ? colors.text : colors.textDisabled, fontSize: 16 }}>{ferryForm.departureDate || t('common.pickDate')}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('transport.departure')} {t('common.time')}</Text>
                    <TouchableOpacity style={[styles.input, { backgroundColor: colors.inputBackground }]} onPress={() => setActivePicker('ferryDepTime')}>
                      <Text style={{ color: ferryForm.departureTime ? colors.text : colors.textDisabled, fontSize: 16 }}>{ferryForm.departureTime || t('common.pickTime')}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.field}>
                    <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} onPress={() => setFerryForm(f => ({ ...f, isOneWay: !f.isOneWay }))}>
                      <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: ferryForm.isOneWay ? colors.accent : colors.textDisabled, backgroundColor: ferryForm.isOneWay ? colors.accent : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                        {ferryForm.isOneWay && <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>✓</Text>}
                      </View>
                      <Text style={[styles.label, { color: colors.text }]}>{t('transport.oneWay')}</Text>
                    </TouchableOpacity>
                  </View>
                  {!ferryForm.isOneWay && (
                    <>
                      <View style={styles.field}>
                        <Text style={[styles.label, { color: colors.text }]}>{t('transport.arrival')}</Text>
                        <TouchableOpacity style={[styles.input, { backgroundColor: colors.inputBackground }]} onPress={() => setActivePicker('ferryArrDate')}>
                          <Text style={{ color: ferryForm.arrivalDate ? colors.text : colors.textDisabled, fontSize: 16 }}>{ferryForm.arrivalDate || t('common.pickDate')}</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.field}>
                        <Text style={[styles.label, { color: colors.text }]}>{t('transport.arrival')} {t('common.time')}</Text>
                        <TouchableOpacity style={[styles.input, { backgroundColor: colors.inputBackground }]} onPress={() => setActivePicker('ferryArrTime')}>
                          <Text style={{ color: ferryForm.arrivalTime ? colors.text : colors.textDisabled, fontSize: 16 }}>{ferryForm.arrivalTime || t('common.pickTime')}</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('transport.departureTerminal')}</Text>
                    <GooglePlacesInput value={ferryForm.departureAddress} onChangeText={(v) => setFerryForm(f => ({ ...f, departureAddress: v }))} placeholder="Avgangsterminal adresse..." onSelect={(v) => setFerryForm(f => ({ ...f, departureAddress: v }))} />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('transport.arrivalTerminal')}</Text>
                    <GooglePlacesInput value={ferryForm.arrivalAddress} onChangeText={(v) => setFerryForm(f => ({ ...f, arrivalAddress: v }))} placeholder="Ankomstterminal adresse..." onSelect={(v) => setFerryForm(f => ({ ...f, arrivalAddress: v }))} />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('common.phone')}</Text>
                    <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={ferryForm.phone} onChangeText={(v) => setFerryForm(f => ({ ...f, phone: v }))} placeholder="F.eks. +47 000 00 000" placeholderTextColor={colors.textDisabled} keyboardType="phone-pad" />
                  </View>
                  <View style={styles.field}>
                    <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} onPress={() => setFerryForm(f => ({ ...f, hasCar: !f.hasCar }))}>
                      <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: ferryForm.hasCar ? colors.accent : colors.textDisabled, backgroundColor: ferryForm.hasCar ? colors.accent : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                        {ferryForm.hasCar && <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>✓</Text>}
                      </View>
                      <Text style={[styles.label, { color: colors.text }]}>{t('common.carWith')}</Text>
                    </TouchableOpacity>
                  </View>
                  {ferryForm.hasCar && (
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('common.carRegNr')}</Text>
                      <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={ferryForm.carRegistration} onChangeText={(v) => setFerryForm(f => ({ ...f, carRegistration: v }))} placeholder="F.eks. AB 12345" placeholderTextColor={colors.textDisabled} />
                    </View>
                  )}
                  {ferryForm.hasCar && (
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('common.driver')}</Text>
                      <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={ferryForm.driver} onChangeText={(v) => setFerryForm(f => ({ ...f, driver: v }))} placeholder="F.eks. Jon" placeholderTextColor={colors.textDisabled} />
                    </View>
                  )}
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('common.passengers')}</Text>
                    <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={ferryForm.passengers} onChangeText={(v) => setFerryForm(f => ({ ...f, passengers: v }))} placeholder="F.eks. 4" placeholderTextColor={colors.textDisabled} keyboardType="number-pad" />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('common.note')}</Text>
                    <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={ferryForm.note} onChangeText={(v) => setFerryForm(f => ({ ...f, note: v }))} placeholder="F.eks. Billett bestilt" placeholderTextColor={colors.textDisabled} />
                  </View>
                </ScrollView>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.inputBackground }]} onPress={() => setActiveModal(null)}>
                    <Text style={[styles.modalButtonText, { color: colors.text }]}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.accent }]} onPress={handleSaveFerry}>
                    <Text style={[styles.modalButtonText, { color: '#fff' }]}>{editingId ? t('common.save') : t('common.add')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Transport Type Picker */}
      <Modal visible={showTransportPicker} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setShowTransportPicker(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                <Text style={[styles.modalTitle, { color: colors.text, borderBottomColor: colors.border }]}>Velg transporttype</Text>
                {[
                  { icon: '✈️', label: 'Fly', type: 'flight' as ModalType, transportType: 'fly' as const },
                  { icon: '🚆', label: 'Tog', type: 'flight' as ModalType, transportType: 'tog' as const },
                  { icon: '🚗', label: 'Leiebil', type: 'flight' as ModalType, transportType: 'bil' as const },
                  { icon: '🚢', label: 'Båt/Cruise', type: 'ferry' as ModalType },
                  { icon: '⛴️', label: 'Ferje', type: 'boat' as ModalType },
                  { icon: '🚕', label: 'Taxi', type: 'taxi' as ModalType },
                ].map((opt) => (
                  <TouchableOpacity
                    key={opt.label}
                    style={[styles.modalButton, { backgroundColor: colors.inputBackground, marginBottom: 8 }]}
                    onPress={() => {
                      setShowTransportPicker(false);
                      openAddModal(opt.type, opt.transportType);
                    }}
                  >
                    <Text style={[styles.modalButtonText, { color: colors.text, textAlign: 'left' }]}>{opt.icon}  {opt.label}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.inputBackground, marginTop: 4 }]} onPress={() => setShowTransportPicker(false)}>
                  <Text style={[styles.modalButtonText, { color: colors.textSecondary }]}>{t('common.cancel')}</Text>
                </TouchableOpacity>
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

      <ActionModal
        visible={actionModal.visible}
        title={actionModal.title}
        subtitle={actionModal.subtitle}
        onEdit={actionModal.onEdit}
        onDelete={actionModal.onDelete}
        onCancel={() => setActionModal({ visible: false, title: '' })}
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
  weatherCard: {
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 8,
    overflow: 'hidden',
  },
  sectionCard: {
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 8,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
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
    marginBottom: 10,
    gap: 8,
  },
  transportTileWrapper: {
    flex: 1,
    minWidth: 0,
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
  weatherTodayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#e0f7fa',
    borderLeftWidth: 3,
    borderLeftColor: '#0097A7',
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
  tipsOverview: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  tipsGroup: {
    marginBottom: 12,
  },
  tipsGroupTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  tipsItem: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 2,
    paddingLeft: 8,
  },
  phraseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    paddingLeft: 8,
  },
  phraseText: {
    fontSize: 13,
  },
  phraseArrow: {
    fontSize: 13,
  },
  phrasePron: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  stagedCityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  stagedCityName: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  generateButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  tipsExpandable: {
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
    overflow: 'hidden',
  },
  tipsExpandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tipsExpandIcon: {
    fontSize: 12,
    marginRight: 8,
  },
  tipsExpandTitle: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  tipsExpandDate: {
    fontSize: 12,
    marginRight: 8,
  },
  tipsRefreshBtn: {
    fontSize: 16,
  },
  tipsExpandBody: {
    padding: 12,
    paddingTop: 0,
  },
});
