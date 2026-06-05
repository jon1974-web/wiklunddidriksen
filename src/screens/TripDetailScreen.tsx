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
  FlatList,
  Linking,
  Platform,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Trip, TripRestaurant, TripActivity, TripDocument, TripLink } from '../types';
import {
  getTripRestaurants,
  addTripRestaurant,
  deleteTripRestaurant,
  getTripActivities,
  addTripActivity,
  deleteTripActivity,
  getTripDocuments,
  addTripDocument,
  deleteTripDocument,
  getTripLinks,
  addTripLink,
  deleteTripLink,
} from '../services/tripService';
import { formatDate } from '../utils/dateUtils';
import { sanitizeInput, getErrorMessage } from '../utils/validation';
import { GooglePlacesInput } from '../components/GooglePlacesInput';
import { TripDocumentUpload } from '../components/TripDocumentUpload';

interface TripDetailScreenProps {
  navigation: any;
  route: any;
}

type ModalType = 'restaurant' | 'activity' | 'document' | 'link' | null;

export const TripDetailScreen: React.FC<TripDetailScreenProps> = ({ navigation, route }) => {
  const { trip } = route.params as { trip: Trip };
  const { colors } = useTheme();

  const [restaurants, setRestaurants] = useState<TripRestaurant[]>([]);
  const [activities, setActivities] = useState<TripActivity[]>([]);
  const [documents, setDocuments] = useState<TripDocument[]>([]);
  const [links, setLinks] = useState<TripLink[]>([]);
  const [activeModal, setActiveModal] = useState<ModalType>(null);

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
      const [r, a, d, l] = await Promise.all([
        getTripRestaurants(trip.id),
        getTripActivities(trip.id),
        getTripDocuments(trip.id),
        getTripLinks(trip.id),
      ]);
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
  };

  const handleAddRestaurant = useCallback(async () => {
    if (!restName.trim()) {
      Alert.alert('Error', 'Vennligst skriv et navn');
      return;
    }
    try {
      await addTripRestaurant(trip.id, {
        name: sanitizeInput(restName),
        address: restAddress.trim() ? sanitizeInput(restAddress) : undefined,
        note: restNote.trim() ? sanitizeInput(restNote) : undefined,
      });
      resetForms();
      setActiveModal(null);
      loadSubData();
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error));
    }
  }, [trip.id, restName, restAddress, restNote, loadSubData]);

  const handleAddActivity = useCallback(async () => {
    if (!actName.trim()) {
      Alert.alert('Error', 'Vennligst skriv et navn');
      return;
    }
    try {
      await addTripActivity(trip.id, {
        name: sanitizeInput(actName),
        date: actDate || undefined,
        time: actTime || undefined,
        address: actAddress.trim() ? sanitizeInput(actAddress) : undefined,
        note: actNote.trim() ? sanitizeInput(actNote) : undefined,
      });
      resetForms();
      setActiveModal(null);
      loadSubData();
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error));
    }
  }, [trip.id, actName, actDate, actTime, actAddress, actNote, loadSubData]);

  const handleAddDocument = useCallback(async () => {
    if (!docTitle.trim()) {
      Alert.alert('Error', 'Vennligst skriv en tittel');
      return;
    }
    try {
      await addTripDocument(trip.id, {
        title: sanitizeInput(docTitle),
        note: docNote.trim() ? sanitizeInput(docNote) : undefined,
        fileUrl: docFileUrl || undefined,
        fileName: docFileName || undefined,
      });
      resetForms();
      setActiveModal(null);
      loadSubData();
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error));
    }
  }, [trip.id, docTitle, docNote, docFileUrl, docFileName, loadSubData]);

  const handleAddLink = useCallback(async () => {
    if (!linkTitle.trim()) {
      Alert.alert('Error', 'Vennligst skriv en tittel');
      return;
    }
    if (!linkUrl.trim()) {
      Alert.alert('Error', 'Vennligst skriv en URL');
      return;
    }
    try {
      await addTripLink(trip.id, {
        title: sanitizeInput(linkTitle),
        url: linkUrl.trim(),
      });
      resetForms();
      setActiveModal(null);
      loadSubData();
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error));
    }
  }, [trip.id, linkTitle, linkUrl, loadSubData]);

  const handleDeleteRestaurant = useCallback(
    (id: string) => {
      Alert.alert('Slett restaurant', 'Er du sikker?', [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Slett',
          style: 'destructive',
          onPress: async () => {
            await deleteTripRestaurant(trip.id, id);
            loadSubData();
          },
        },
      ]);
    },
    [trip.id, loadSubData]
  );

  const handleDeleteActivity = useCallback(
    (id: string) => {
      Alert.alert('Slett aktivitet', 'Er du sikker?', [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Slett',
          style: 'destructive',
          onPress: async () => {
            await deleteTripActivity(trip.id, id);
            loadSubData();
          },
        },
      ]);
    },
    [trip.id, loadSubData]
  );

  const handleDeleteDocument = useCallback(
    (id: string) => {
      Alert.alert('Slett dokument', 'Er du sikker?', [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Slett',
          style: 'destructive',
          onPress: async () => {
            await deleteTripDocument(trip.id, id);
            loadSubData();
          },
        },
      ]);
    },
    [trip.id, loadSubData]
  );

  const handleDeleteLink = useCallback(
    (id: string) => {
      Alert.alert('Slett lenke', 'Er du sikker?', [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Slett',
          style: 'destructive',
          onPress: async () => {
            await deleteTripLink(trip.id, id);
            loadSubData();
          },
        },
      ]);
    },
    [trip.id, loadSubData]
  );

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

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 8 }}>
        <Text style={{ color: colors.accent, fontSize: 20 }}>←</Text>
      </TouchableOpacity>

      <View style={[styles.tripCard, { backgroundColor: colors.surface }]}>
        <Text style={styles.tripIcon}>✈️</Text>
        <Text style={[styles.tripTitle, { color: colors.text }]}>{trip.title}</Text>
        <Text style={[styles.tripLocation, { color: colors.textSecondary }]}>
          {trip.city}{trip.country ? `, ${trip.country}` : ''}
        </Text>
        <Text style={[styles.tripDates, { color: colors.textSecondary }]}>
          {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
        </Text>
      </View>

      {renderSectionHeader('Restauranter', '🍽️', () => { resetForms(); setActiveModal('restaurant'); })}
      {restaurants.length === 0 ? (
        <Text style={[styles.emptySection, { color: colors.textDisabled }]}>Ingen restauranter lagt til</Text>
      ) : (
        restaurants.map((r) => (
          <TouchableOpacity
            key={r.id}
            style={[styles.itemCard, { backgroundColor: colors.surface }]}
            onLongPress={() => handleDeleteRestaurant(r.id)}
          >
            <Text style={[styles.itemName, { color: colors.text }]}>{r.name}</Text>
            {r.address && <Text style={[styles.itemDetail, { color: colors.textSecondary }]}>{r.address}</Text>}
            {r.note && <Text style={[styles.itemNote, { color: colors.textSecondary }]}>{r.note}</Text>}
          </TouchableOpacity>
        ))
      )}

      {renderSectionHeader('Aktiviteter', '🎯', () => { resetForms(); setActiveModal('activity'); })}
      {activities.length === 0 ? (
        <Text style={[styles.emptySection, { color: colors.textDisabled }]}>Ingen aktiviteter lagt til</Text>
      ) : (
        activities.map((a) => (
          <TouchableOpacity
            key={a.id}
            style={[styles.itemCard, { backgroundColor: colors.surface }]}
            onLongPress={() => handleDeleteActivity(a.id)}
          >
            <Text style={[styles.itemName, { color: colors.text }]}>{a.name}</Text>
            {(a.date || a.time) && (
              <Text style={[styles.itemDetail, { color: colors.textSecondary }]}>
                {[a.date, a.time].filter(Boolean).join(' ')}
              </Text>
            )}
            {a.address && <Text style={[styles.itemDetail, { color: colors.textSecondary }]}>{a.address}</Text>}
            {a.note && <Text style={[styles.itemNote, { color: colors.textSecondary }]}>{a.note}</Text>}
          </TouchableOpacity>
        ))
      )}

      {renderSectionHeader('Reisedokumenter', '📄', () => { resetForms(); setActiveModal('document'); })}
      {documents.length === 0 ? (
        <Text style={[styles.emptySection, { color: colors.textDisabled }]}>Ingen dokumenter lagt til</Text>
      ) : (
        documents.map((d) => (
          <TouchableOpacity
            key={d.id}
            style={[styles.itemCard, { backgroundColor: colors.surface }]}
            onLongPress={() => handleDeleteDocument(d.id)}
            onPress={() => d.fileUrl && Linking.openURL(d.fileUrl)}
          >
            <Text style={[styles.itemName, { color: colors.text }]}>{d.title}</Text>
            {d.fileName && <Text style={[styles.itemDetail, { color: colors.accent }]}>{d.fileName}</Text>}
            {d.note && <Text style={[styles.itemNote, { color: colors.textSecondary }]}>{d.note}</Text>}
          </TouchableOpacity>
        ))
      )}

      {renderSectionHeader('Nyttige lenker', '🔗', () => { resetForms(); setActiveModal('link'); })}
      {links.length === 0 ? (
        <Text style={[styles.emptySection, { color: colors.textDisabled }]}>Ingen lenker lagt til</Text>
      ) : (
        links.map((l) => (
          <TouchableOpacity
            key={l.id}
            style={[styles.itemCard, { backgroundColor: colors.surface }]}
            onLongPress={() => handleDeleteLink(l.id)}
            onPress={() => Linking.openURL(l.url)}
          >
            <Text style={[styles.itemName, { color: colors.text }]}>{l.title}</Text>
            <Text style={[styles.itemDetail, { color: colors.accent }]} numberOfLines={1}>{l.url}</Text>
          </TouchableOpacity>
        ))
      )}

      <View style={{ height: 40 }} />

      <Modal visible={activeModal === 'restaurant'} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setActiveModal(null)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                <Text style={[styles.modalTitle, { color: colors.text, borderBottomColor: colors.border }]}>Legg til restaurant</Text>
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
                  <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.accent }]} onPress={handleAddRestaurant}>
                    <Text style={[styles.modalButtonText, { color: '#fff' }]}>Legg til</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal visible={activeModal === 'activity'} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setActiveModal(null)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                <Text style={[styles.modalTitle, { color: colors.text, borderBottomColor: colors.border }]}>Legg til aktivitet</Text>
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
                  <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.accent }]} onPress={handleAddActivity}>
                    <Text style={[styles.modalButtonText, { color: '#fff' }]}>Legg til</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal visible={activeModal === 'document'} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setActiveModal(null)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                <Text style={[styles.modalTitle, { color: colors.text, borderBottomColor: colors.border }]}>Legg til reisedokument</Text>
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
                  <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.accent }]} onPress={handleAddDocument}>
                    <Text style={[styles.modalButtonText, { color: '#fff' }]}>Legg til</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal visible={activeModal === 'link'} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setActiveModal(null)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                <Text style={[styles.modalTitle, { color: colors.text, borderBottomColor: colors.border }]}>Legg til lenke</Text>
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
                  <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.accent }]} onPress={handleAddLink}>
                    <Text style={[styles.modalButtonText, { color: '#fff' }]}>Legg til</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

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
});
