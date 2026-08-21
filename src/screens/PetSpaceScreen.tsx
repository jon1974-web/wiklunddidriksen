import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Modal, Image, ActivityIndicator, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useUserStore } from '../store/userStore';
import * as ImagePicker from 'expo-image-picker';
import { AppIcon } from '../components/AppIcon';
import { GooglePlacesInput } from '../components/GooglePlacesInput';
import { DatePickerModal } from '../components/DatePickerModal';
import { crossAlert } from '../utils/alert';
import { getErrorMessage } from '../utils/validation';
import { notifyHealthItem, getUserProfile } from '../services/familyService';
import { db } from '../services/firebase';
import { addDoc, collection } from 'firebase/firestore';
import {
  getPets, addPet, updatePet, deletePet,
  getVetVisits, addVetVisit, updateVetVisit, deleteVetVisit,
  getPetMedications, addPetMedication, updatePetMedication, deletePetMedication,
  getPetFood, addPetFood, updatePetFood, deletePetFood,
  getPetGrooming, addPetGrooming, updatePetGrooming, deletePetGrooming,
  getPetVaccinations, addPetVaccination, updatePetVaccination, deletePetVaccination,
  getPetInsurance, addPetInsurance, updatePetInsurance, deletePetInsurance,
} from '../services/petService';
import { Pet, PetVetVisit, PetMedication, PetFood, PetGrooming, PetVaccination, PetInsurance } from '../types';
import { ActionModal } from '../components/ActionModal';
import { HelpCenter } from '../components/HelpCenter';
import { getStaticMapUrl, getGoogleMapsUrl } from '../utils/maps';
import { MODULE_COLORS } from '../constants/moduleColors';

const PET_ICONS: Record<string, string> = { 'Katt': '🐱', 'Hund': '🐶', 'Fisk': '🐟', 'Fugl': '🐦', 'Kanin': '🐰', 'Hamster': '🐹', 'Skilpadde': '🐢', 'Hest': '🐴', 'Anna': '🐾' };
const PET_TYPES = ['Katt', 'Hund', 'Fisk', 'Fugl', 'Kanin', 'Skilpadde', 'Hamster', 'Hest', 'Anna'];
const PET_THEME = MODULE_COLORS.pets;

type PetSectionType = 'vetVisits' | 'medications' | 'food' | 'grooming' | 'vaccinations' | 'insurance';

interface PetSpaceScreenProps {
  navigation: any;
  route?: { params?: { openAddSection?: PetSectionType } };
}

export const PetSpaceScreen: React.FC<PetSpaceScreenProps> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const familyId = useUserStore((state) => state.familyId);
  const user = useUserStore((state) => state.user);

  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [showAddPetModal, setShowAddPetModal] = useState(false);
  const [editingPet, setEditingPet] = useState<string | null>(null);
  const [petActionModal, setPetActionModal] = useState<{ visible: boolean; id: string; title: string }>({ visible: false, id: '', title: '' });
  const [showHelp, setShowHelp] = useState(false);

  const [petForm, setPetForm] = useState({ name: '', type: 'Katt', gender: 'Ukjent', breed: '', birthday: '', identification: '', passportNumber: '', chipId: '', chipDate: '', photoUrl: '' });

  const [vetVisits, setVetVisits] = useState<PetVetVisit[]>([]);
  const [medications, setMedications] = useState<PetMedication[]>([]);
  const [food, setFood] = useState<PetFood[]>([]);
  const [grooming, setGrooming] = useState<PetGrooming[]>([]);
  const [vaccinations, setVaccinations] = useState<PetVaccination[]>([]);
  const [insurance, setInsurance] = useState<PetInsurance[]>([]);

  const [activeSection, setActiveSection] = useState<PetSectionType | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<{ id: string; section: PetSectionType } | null>(null);
  const [itemActionModal, setItemActionModal] = useState<{ visible: boolean; id: string; title: string; section: PetSectionType }>({ visible: false, id: '', title: '', section: 'vetVisits' });
  const [detailModal, setDetailModal] = useState<{ visible: boolean; item: any; section: PetSectionType }>({ visible: false, item: null, section: 'vetVisits' });
  const [activePicker, setActivePicker] = useState<string | null>(null);
  const [userCalendarProvider, setUserCalendarProvider] = useState<'google' | 'outlook' | null>(null);
  const [userCalendarEmail, setUserCalendarEmail] = useState<string | null>(null);

  const [vetForm, setVetForm] = useState({ title: '', doctor: '', date: '', startTime: '', endTime: '', location: '', note: '', reminder: '', status: 'planned' as 'planned' | 'completed' });
  const [medForm, setMedForm] = useState({ name: '', dosage: '', frequency: 1, timeSlots: [{ time: '08:00', reminderMinutes: 15 }] as { time: string; reminderMinutes: number }[], dateFrom: '', dateTo: '', note: '' });
  const [foodForm, setFoodForm] = useState({ name: '', time: '', amount: '', note: '' });
  const [groomForm, setGroomForm] = useState({ name: '', lastDate: '', nextDate: '', note: '' });
  const [vaccForm, setVaccForm] = useState({ name: '', date: '', nextDue: '', reminder: '', status: 'completed' as 'completed' | 'pending', note: '' });
  const [insForm, setInsForm] = useState({ provider: '', policyNumber: '', expiryDate: '', documentUrl: '', note: '' });

  const isDatePast = useCallback((dateStr: string): boolean => {
    if (!dateStr) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(dateStr) < today;
  }, []);

  const loadPets = useCallback(async () => {
    if (!familyId) return;
    try {
      const data = await getPets(familyId);
      setPets(data);
      const user = useUserStore.getState().user;
      if (user) {
        const profile = await getUserProfile(user.uid);
        if (profile?.calendarEmail) {
          setUserCalendarEmail(profile.calendarEmail);
          setUserCalendarProvider(profile.calendarProvider || 'google');
        }
      }
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  }, [familyId]);

  const loadPetData = useCallback(async () => {
    if (!familyId || !selectedPet) return;
    try {
      const [v, m, f, g, va, i] = await Promise.all([
        getVetVisits(familyId, selectedPet.id),
        getPetMedications(familyId, selectedPet.id),
        getPetFood(familyId, selectedPet.id),
        getPetGrooming(familyId, selectedPet.id),
        getPetVaccinations(familyId, selectedPet.id),
        getPetInsurance(familyId, selectedPet.id),
      ]);
      setVetVisits(v);
      setMedications(m);
      setFood(f);
      setGrooming(g);
      setVaccinations(va);
      setInsurance(i);
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  }, [familyId, selectedPet]);

  useEffect(() => { loadPets(); }, [loadPets]);
  useEffect(() => { if (selectedPet) loadPetData(); }, [selectedPet, loadPetData]);

  useEffect(() => {
    if (route?.params?.openAddSection && pets.length > 0 && !selectedPet) {
      if (pets.length === 1) {
        setSelectedPet(pets[0]);
        setTimeout(() => {
          setActiveSection(route.params!.openAddSection!);
          setEditingItem(null);
          resetItemForms();
          setShowItemModal(true);
          navigation.setParams({ openAddSection: undefined });
        }, 500);
      }
    }
    if (route?.params?.editId && route?.params?.editSection && pets.length > 0) {
      const section = route.params.editSection as PetSectionType;
      const id = route.params.editId;
      let item: any = null;
      if (section === 'vetVisits') item = vetVisits.find(v => v.id === id);
      else if (section === 'medications') item = medications.find(m => m.id === id);
      else if (section === 'food') item = food.find(f => f.id === id);
      else if (section === 'grooming') item = grooming.find(g => g.id === id);
      else if (section === 'vaccinations') item = vaccinations.find(v => v.id === id);
      else if (section === 'insurance') item = insurance.find(i => i.id === id);
      if (item) {
        const pet = pets.find(p => p.id === item.petId);
        if (pet) setSelectedPet(pet);
        setActiveSection(section);
        setEditingItem({ id: item.id, section });
        resetItemForms();
        setShowItemModal(true);
        navigation.setParams({ editId: undefined, editSection: undefined });
      }
    }
  }, [route?.params?.openAddSection, route?.params?.editId, route?.params?.editSection, pets, selectedPet, vetVisits, medications, food, grooming, vaccinations, insurance]);

  useEffect(() => {
    if (!editingItem) return;
    const { id, section } = editingItem;
    if (section === 'vetVisits') {
      const item = vetVisits.find(v => v.id === id);
      if (item) setVetForm({ title: item.title, doctor: item.doctor || '', date: item.date, startTime: item.startTime, endTime: item.endTime || '', location: item.location || '', note: item.note || '', reminder: item.reminder || '', status: item.status });
    } else if (section === 'medications') {
      const item = medications.find(m => m.id === id);
      if (item) setMedForm({ name: item.name, dosage: item.dosage, frequency: item.frequency || 1, timeSlots: item.timeSlots || [{ time: '08:00', reminderMinutes: 15 }], dateFrom: item.dateFrom || '', dateTo: item.dateTo || '', note: item.note || '' });
    } else if (section === 'food') {
      const item = food.find(f => f.id === id);
      if (item) setFoodForm({ name: item.name, time: item.time, amount: item.amount, note: item.note || '' });
    } else if (section === 'grooming') {
      const item = grooming.find(g => g.id === id);
      if (item) setGroomForm({ name: item.name, lastDate: item.lastDate, nextDate: item.nextDate || '', note: item.note || '' });
    } else if (section === 'vaccinations') {
      const item = vaccinations.find(v => v.id === id);
      if (item) setVaccForm({ name: item.name, date: item.date, nextDue: item.nextDue || '', reminder: item.reminder || '', status: item.status, note: item.note || '' });
    } else if (section === 'insurance') {
      const item = insurance.find(i => i.id === id);
      if (item) setInsForm({ provider: item.provider, policyNumber: item.policyNumber, expiryDate: item.expiryDate, documentUrl: item.documentUrl || '', note: item.note || '' });
    }
  }, [editingItem, vetVisits, medications, food, grooming, vaccinations, insurance]);

  const handleAddPet = async () => {
    if (!familyId) return;
    if (!petForm.name.trim()) { crossAlert('Error', t('pets.enterPetName')); return; }
    try {
      const cleanData = Object.fromEntries(
        Object.entries(petForm).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
      );
      if (editingPet) {
        await updatePet(editingPet, cleanData);
      } else {
        await addPet(familyId, cleanData as any);
      }
      setPetForm({ name: '', type: 'Katt', gender: 'Ukjent', breed: '', birthday: '', identification: '', passportNumber: '', chipId: '', chipDate: '', photoUrl: '' });
      setEditingPet(null);
      setShowAddPetModal(false);
      loadPets();
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  };

  const handleDeletePet = async () => {
    if (!familyId || !petActionModal.id) return;
    try {
      await deletePet(petActionModal.id);
      setPetActionModal({ visible: false, id: '', title: '' });
      loadPets();
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  };

  const handleEditPet = () => {
    const pet = pets.find(p => p.id === petActionModal.id);
    if (!pet) return;
    setPetForm({ name: pet.name, type: pet.type, gender: pet.gender || 'Ukjent', breed: pet.breed || '', birthday: pet.birthday || '', identification: pet.identification || '', passportNumber: pet.passportNumber || '', chipId: pet.chipId || '', chipDate: pet.chipDate || '', photoUrl: pet.photoUrl || '' });
    setEditingPet(pet.id);
    setPetActionModal({ visible: false, id: '', title: '' });
    setShowAddPetModal(true);
  };

  const handleAddItem = async () => {
    if (!familyId || !selectedPet) return;
    try {
      const isEditing = editingItem !== null;
      if (activeSection === 'vetVisits') {
        if (!vetForm.title.trim() || !vetForm.date) { crossAlert('Error', t('pets.enterVetVisitTitle')); return; }
        if (isEditing) {
          await updateVetVisit(editingItem.id, vetForm);
        } else {
          await addVetVisit({ ...vetForm, petId: selectedPet.id, familyId }, user?.uid);
        }
        if (!isEditing && vetForm.date) {
          const reminderMinutes = vetForm.reminder ? (vetForm.reminder.includes('1 d') ? 1440 : vetForm.reminder.includes('3') ? 4320 : 10080) : 0;
          const eventDate = new Date(`${vetForm.date}T${vetForm.startTime || '09:00'}:00`);
          notifyHealthItem(familyId, `${selectedPet.name}: ${vetForm.title}`, vetForm.date, vetForm.startTime, vetForm.location || '', 'appointment', user?.displayName || '', selectedPet.name).catch(() => {});
        }
        setVetForm({ title: '', doctor: '', date: '', startTime: '', endTime: '', location: '', note: '', reminder: '', status: 'planned' });
      } else if (activeSection === 'medications') {
        if (!medForm.name.trim()) { crossAlert('Error', t('pets.enterMedicationName')); return; }
        if (isEditing) await updatePetMedication(editingItem.id, medForm);
        else await addPetMedication({ ...medForm, petId: selectedPet.id, familyId });
    setMedForm({ name: '', dosage: '', frequency: 1, timeSlots: [{ time: '08:00', reminderMinutes: 15 }], dateFrom: '', dateTo: '', note: '' });
      } else if (activeSection === 'food') {
        if (!foodForm.name.trim()) { crossAlert('Error', t('pets.enterMedicationName')); return; }
        if (isEditing) await updatePetFood(editingItem.id, foodForm);
        else await addPetFood({ ...foodForm, petId: selectedPet.id, familyId });
        setFoodForm({ name: '', time: '', amount: '', note: '' });
      } else if (activeSection === 'grooming') {
        if (!groomForm.name.trim() || !groomForm.lastDate) { crossAlert('Error', t('pets.enterVetVisitTitle')); return; }
        if (isEditing) await updatePetGrooming(editingItem.id, groomForm);
        else await addPetGrooming({ ...groomForm, petId: selectedPet.id, familyId });
        setGroomForm({ name: '', lastDate: '', nextDate: '', note: '' });
      } else if (activeSection === 'vaccinations') {
        if (!vaccForm.name.trim() || !vaccForm.date) { crossAlert('Error', t('pets.enterVetVisitTitle')); return; }
        let savedVacc;
        if (isEditing) {
          await updatePetVaccination(editingItem.id, vaccForm);
          savedVacc = { ...vaccForm, id: editingItem.id };
        } else {
          const id = await addPetVaccination({ ...vaccForm, petId: selectedPet.id, familyId, status: vaccForm.status || "completed" });
          savedVacc = { ...vaccForm, id };
        }
        if (!isEditing && vaccForm.date) {
          const reminderMinutes = vaccForm.reminder ? (vaccForm.reminder.includes('1 d') ? 1440 : vaccForm.reminder.includes('3') ? 4320 : 10080) : 0;
          const vaccDate = new Date(`${vaccForm.date}T09:00:00`);
          const eventData = {
            title: `${PET_ICONS[selectedPet.type] || '🐾'} ${selectedPet.name}: ${vaccForm.name}`,
            description: vaccForm.note || null,
            address: null,
            date: vaccForm.date,
            time: '09:00',
            endTime: null,
            reminderMinutes,
            reminderAt: reminderMinutes > 0 ? new Date(vaccDate.getTime() - reminderMinutes * 60 * 1000).toISOString() : null,
            createdBy: user?.uid,
            familyId,
            createdAt: Date.now(),
            icon: 'pet',
          };
          const docRef = await addDoc(collection(db, 'events'), eventData);
          notifyHealthItem(familyId, `${selectedPet.name}: ${vaccForm.name}`, vaccForm.date, '', '', 'vaccination', user?.displayName || '', selectedPet.name).catch(() => {});
        }
        setVaccForm({ name: '', date: '', nextDue: '', reminder: '', status: 'completed', note: '' });
      } else if (activeSection === 'insurance') {
        if (!insForm.provider.trim()) { crossAlert('Error', t('pets.enterInsuranceInfo')); return; }
        if (isEditing) await updatePetInsurance(editingItem.id, insForm);
        else await addPetInsurance({ ...insForm, petId: selectedPet.id, familyId });
        setInsForm({ provider: '', policyNumber: '', expiryDate: '', documentUrl: '', note: '' });
      }
      setEditingItem(null);
      setShowItemModal(false);
      loadPetData();
      if (route?.params?.returnToEvents) {
        navigation.navigate('Events');
        navigation.setParams({ returnToEvents: undefined });
      }
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  };

  const handleDeleteItem = async () => {
    if (!familyId || !selectedPet || !itemActionModal.id) return;
    try {
      if (itemActionModal.section === 'vetVisits') await deleteVetVisit(itemActionModal.id);
      else if (itemActionModal.section === 'medications') await deletePetMedication(itemActionModal.id);
      else if (itemActionModal.section === 'food') await deletePetFood(itemActionModal.id);
      else if (itemActionModal.section === 'grooming') await deletePetGrooming(itemActionModal.id);
      else if (itemActionModal.section === 'vaccinations') await deletePetVaccination(itemActionModal.id);
      else if (itemActionModal.section === 'insurance') await deletePetInsurance(itemActionModal.id);
      setItemActionModal({ visible: false, id: '', title: '', section: 'vetVisits' });
      loadPetData();
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  };

  const handleEditItem = () => {
    if (!itemActionModal.id || !itemActionModal.section) return;
    setItemActionModal({ visible: false, id: '', title: '', section: 'vetVisits' });
    setActiveSection(itemActionModal.section);
    setEditingItem({ id: itemActionModal.id, section: itemActionModal.section });
    setShowItemModal(true);
  };

  const resetItemForms = () => {
    setVetForm({ title: '', doctor: '', date: '', startTime: '', endTime: '', location: '', note: '', reminder: '', status: 'planned' });
    setMedForm({ name: '', dosage: '', frequency: 1, timeSlots: [{ time: '08:00', reminderMinutes: 15 }], dateFrom: '', dateTo: '', note: '' });
    setFoodForm({ name: '', time: '', amount: '', note: '' });
    setGroomForm({ name: '', lastDate: '', nextDate: '', note: '' });
    setVaccForm({ name: '', date: '', nextDue: '', reminder: '', status: 'completed', note: '' });
    setInsForm({ provider: '', policyNumber: '', expiryDate: '', documentUrl: '', note: '' });
  };

  const renderSection = (title: string, icon: string, count: number, section: PetSectionType, children: React.ReactNode) => (
    <View style={[styles.section, { backgroundColor: colors.surface }]}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <AppIcon name={icon as any} size={18} color={PET_THEME} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>({count})</Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: PET_THEME }]}
          onPress={() => { setActiveSection(section); setEditingItem(null); resetItemForms(); setShowItemModal(true); }}
        >
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>+</Text>
        </TouchableOpacity>
      </View>
      {children}
    </View>
  );

  const PET_GENDER_ICONS: Record<string, string> = { 'Hann': '♂️', 'Hunn': '♀️', 'Ukjent': '' };

  const renderGrid = () => (
    <>
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: MODULE_COLORS.pets, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: MODULE_COLORS.pets, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, marginTop: 8 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <AppIcon name="pet" size={28} color={PET_THEME} />
          <Text style={[styles.screenTitle, { color: colors.text }]}>{t('spaces.pets')}</Text>
          <TouchableOpacity style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#3b5a75', alignItems: 'center', justifyContent: 'center' }} onPress={() => setShowHelp(true)}>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: '#3b5a75', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 7, fontWeight: '800' }}>i</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView style={styles.content}>
        <Text style={[styles.gridSubtitle, { color: colors.textSecondary }]}>{t('pets.ourPets')}</Text>
        <View style={styles.grid}>
          {pets.map((pet) => (
            <TouchableOpacity
              key={pet.id}
              style={[styles.gridTile, { backgroundColor: colors.surface }]}
              onPress={() => {
                setSelectedPet(pet);
                if (route?.params?.openAddSection) {
                  setTimeout(() => {
                    setActiveSection(route.params!.openAddSection!);
                    setEditingItem(null);
                    resetItemForms();
                    setShowItemModal(true);
                    navigation.setParams({ openAddSection: undefined });
                  }, 300);
                }
              }}
              onLongPress={() => setPetActionModal({ visible: true, id: pet.id, title: pet.name })}
            >
              {pet.photoUrl ? (
                <Image source={{ uri: pet.photoUrl }} style={styles.gridPhoto} />
              ) : (
                <Text style={styles.gridEmoji}>{PET_ICONS[pet.type] || '🐾'}</Text>
              )}
              <Text style={[styles.gridName, { color: colors.text }]} numberOfLines={1}>{pet.name}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.gridTile, styles.gridTileAdd, { borderColor: colors.textDisabled }]}
            onPress={() => { setEditingPet(null); setPetForm({ name: '', type: 'Katt', gender: 'Ukjent', breed: '', birthday: '', identification: '', passportNumber: '', chipId: '', chipDate: '', photoUrl: '' }); setShowAddPetModal(true); }}
          >
            <Text style={[styles.gridEmoji, { color: colors.textDisabled }]}>+</Text>
            <Text style={[styles.gridName, { color: colors.textDisabled }]}>{t('pets.newPet')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={showAddPetModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{editingPet ? t('pets.editPet') : t('pets.addPet')}</Text>
            <ScrollView>
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>{t('pets.photo')}</Text>
                <TouchableOpacity
                  style={[styles.imagePicker, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                  onPress={async () => {
                    const result = await ImagePicker.launchImageLibraryAsync({
                      mediaTypes: ['images'],
                      allowsEditing: true,
                      aspect: [1, 1],
                      quality: 0.7,
                      base64: true,
                    });
                    if (!result.canceled && result.assets[0]) {
                      try {
                        const { webUploadFile } = await import('../services/webStorage');
                        const asset = result.assets[0];
                        const fileName = `pet_${Date.now()}.jpg`;
                        const path = `pet-photos/${fileName}`;
                        let blob: Blob;
                        if (asset.base64 && Platform.OS === 'web') {
                          const byteString = atob(asset.base64);
                          const ab = new ArrayBuffer(byteString.length);
                          const ia = new Uint8Array(ab);
                          for (let i = 0; i < byteString.length; i++) {
                            ia[i] = byteString.charCodeAt(i);
                          }
                          blob = new Blob([ab], { type: 'image/jpeg' });
                        } else {
                          const response = await fetch(asset.uri);
                          blob = await response.blob();
                        }
                        const url = await webUploadFile(path, blob);
                        setPetForm(f => ({ ...f, photoUrl: url }));
                      } catch (err) {
                        crossAlert('Error', getErrorMessage(err));
                      }
                    }
                  }}
                >
                  {petForm.photoUrl ? (
                    <Image source={{ uri: petForm.photoUrl }} style={styles.formPhoto} />
                  ) : (
                    <View style={{ alignItems: 'center', gap: 4 }}>
                      <Text style={{ color: colors.textSecondary, fontSize: 24 }}>📷</Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{t('pets.uploadPhoto')}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>{t('pets.name')}</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={petForm.name} onChangeText={(v) => setPetForm(f => ({ ...f, name: v }))} placeholder={t('pets.namePlaceholder')} placeholderTextColor={colors.textDisabled} />
              </View>
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>{t('pets.type')}</Text>
                <View style={styles.personRow}>
                  {PET_TYPES.map(pt => (
                    <TouchableOpacity key={pt} style={[styles.personChip, { backgroundColor: petForm.type === pt ? PET_THEME : colors.inputBackground }]} onPress={() => setPetForm(f => ({ ...f, type: pt }))}>
                      <Text style={{ color: petForm.type === pt ? '#fff' : colors.text, fontSize: 13 }}>{PET_ICONS[pt]} {pt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>{t('pets.gender')}</Text>
                <View style={styles.personRow}>
                  {[
                    { value: 'Hann', label: t('pets.male'), icon: '♂️' },
                    { value: 'Hunn', label: t('pets.female'), icon: '♀️' },
                    { value: 'Ukjent', label: t('pets.unknown'), icon: '' },
                  ].map(g => (
                    <TouchableOpacity key={g.value} style={[styles.personChip, { backgroundColor: petForm.gender === g.value ? PET_THEME : colors.inputBackground }]} onPress={() => setPetForm(f => ({ ...f, gender: g.value }))}>
                      <Text style={{ color: petForm.gender === g.value ? '#fff' : colors.text, fontSize: 13 }}>{g.icon} {g.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>{t('pets.breed')}</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={petForm.breed} onChangeText={(v) => setPetForm(f => ({ ...f, breed: v }))} placeholder={t('pets.breedPlaceholder')} placeholderTextColor={colors.textDisabled} />
              </View>
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>{t('pets.birthday')}</Text>
                <TouchableOpacity style={[styles.input, { backgroundColor: colors.inputBackground }]} onPress={() => setActivePicker('petBirthday')}>
                  <Text style={{ color: petForm.birthday ? colors.text : colors.textDisabled, fontSize: 16 }}>{petForm.birthday || t('common.pickDate')}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>{t('pets.identification')}</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={petForm.identification} onChangeText={(v) => setPetForm(f => ({ ...f, identification: v }))} placeholderTextColor={colors.textDisabled} />
              </View>
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>{t('pets.passport')}</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={petForm.passportNumber} onChangeText={(v) => setPetForm(f => ({ ...f, passportNumber: v }))} placeholderTextColor={colors.textDisabled} />
              </View>
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>{t('pets.chipId')}</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={petForm.chipId} onChangeText={(v) => setPetForm(f => ({ ...f, chipId: v }))} placeholderTextColor={colors.textDisabled} />
              </View>
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>{t('pets.chipDate')}</Text>
                <TouchableOpacity style={[styles.input, { backgroundColor: colors.inputBackground }]} onPress={() => setActivePicker('petChipDate')}>
                  <Text style={{ color: petForm.chipDate ? colors.text : colors.textDisabled, fontSize: 16 }}>{petForm.chipDate || t('common.pickDate')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.inputBackground }]} onPress={() => { setShowAddPetModal(false); setEditingPet(null); }}>
                <Text style={[styles.modalBtnText, { color: colors.text }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: PET_THEME }]} onPress={handleAddPet}>
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ActionModal
        visible={petActionModal.visible}
        title={petActionModal.title}
        onEdit={handleEditPet}
        onDelete={handleDeletePet}
        onCancel={() => setPetActionModal({ visible: false, id: '', title: '' })}
        accentColor={MODULE_COLORS.pets}
      />
    </>
  );

  const renderDetail = () => {
    if (!selectedPet) return null;
    return (
      <>
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <TouchableOpacity onPress={() => { setSelectedPet(null); }} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: MODULE_COLORS.pets, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: MODULE_COLORS.pets, fontSize: 18 }}>←</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, marginTop: 8 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {selectedPet.photoUrl ? (
                <Image source={{ uri: selectedPet.photoUrl }} style={{ width: 56, height: 56, borderRadius: 28 }} />
              ) : (
                <Text style={{ fontSize: 28 }}>{PET_ICONS[selectedPet.type] || '🐾'}</Text>
              )}
            <Text style={[styles.screenTitle, { color: colors.text }]}>{selectedPet.name}</Text>
          </View>
        </View>

        <ScrollView style={styles.content}>
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <AppIcon name="pet" size={18} color={PET_THEME} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('pets.title')}</Text>
              </View>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('pets.type')}</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{PET_ICONS[selectedPet.type] || '🐾'} {selectedPet.type}</Text>
            </View>
            {selectedPet.gender && selectedPet.gender !== 'Ukjent' && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('pets.gender')}</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{selectedPet.gender}</Text>
              </View>
            )}
            {selectedPet.breed && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('pets.breed')}</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{selectedPet.breed}</Text>
              </View>
            )}
            {selectedPet.birthday && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('pets.birthday')}</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{selectedPet.birthday}</Text>
              </View>
            )}
            {selectedPet.identification && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('pets.identification')}</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{selectedPet.identification}</Text>
              </View>
            )}
            {selectedPet.passportNumber && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('pets.passport')}</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{selectedPet.passportNumber}</Text>
              </View>
            )}
            {selectedPet.chipId && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('pets.chipId')}</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{selectedPet.chipId}</Text>
              </View>
            )}
            {selectedPet.chipDate && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('pets.chipDate')}</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{selectedPet.chipDate}</Text>
              </View>
            )}
          </View>

          {renderSection(t('pets.vetVisits'), 'calendar', vetVisits.length, 'vetVisits', (
            vetVisits.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('pets.noVetVisits')}</Text>
            ) : (
              [...vetVisits].sort((a, b) => {
                const aPast = isDatePast(a.date);
                const bPast = isDatePast(b.date);
                if (aPast && !bPast) return 1;
                if (!aPast && bPast) return -1;
                if (aPast && bPast) return b.date.localeCompare(a.date);
                return a.date.localeCompare(b.date);
              }).map(v => (
                <TouchableOpacity key={v.id} style={styles.item} onPress={() => navigation.navigate('PetVetDetail', { visit: v, petName: pets.find(p => p.id === v.petId)?.name, source: 'pets' })} onLongPress={() => setItemActionModal({ visible: true, id: v.id, title: v.title, section: 'vetVisits' })}>
                  <AppIcon name="calendar" size={20} color={PET_THEME} />
                  <View style={styles.itemText}>
                    <Text style={[styles.itemTitle, { color: colors.text }]}>{v.title}</Text>
                    <Text style={[styles.itemSub, { color: colors.textSecondary }]}>{v.date} {v.startTime}{v.location ? ' — ' + v.location : ''}</Text>
                  </View>
                  <Text style={[styles.badge, { backgroundColor: (v.status === 'completed' || isDatePast(v.date)) ? '#E8F5E9' : '#FFF3E0', color: (v.status === 'completed' || isDatePast(v.date)) ? '#43A047' : '#FB8C00' }]}>
                    {(v.status === 'completed' || isDatePast(v.date)) ? t('health.completed') : t('health.pending')}
                  </Text>
                </TouchableOpacity>
              ))
            )
          ))}

          {renderSection(t('pets.medications'), 'medication', medications.length, 'medications', (
            medications.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('pets.noMedications')}</Text>
            ) : (
              [...medications].sort((a, b) => {
                const aPast = a.dateTo && isDatePast(a.dateTo);
                const bPast = b.dateTo && isDatePast(b.dateTo);
                if (aPast && !bPast) return 1;
                if (!aPast && bPast) return -1;
                return (a.dateFrom || '').localeCompare(b.dateFrom || '');
              }).map(m => {
                const isFinished = m.dateTo && isDatePast(m.dateTo);
                const isActive = m.dateFrom && (!m.dateTo || !isDatePast(m.dateTo));
                return (
                  <TouchableOpacity key={m.id} style={styles.item} onPress={() => navigation.navigate('PetMedDetail', { medication: m, petName: pets.find(p => p.id === m.petId)?.name, source: 'pets' })} onLongPress={() => setItemActionModal({ visible: true, id: m.id, title: m.name, section: 'medications' })}>
                    <AppIcon name="medication" size={20} color={PET_THEME} />
                    <View style={styles.itemText}>
                      <Text style={[styles.itemTitle, { color: colors.text }]}>{m.name}</Text>
                      <Text style={[styles.itemSub, { color: colors.textSecondary }]}>{m.dosage} {m.frequency}</Text>
                    </View>
                    {isFinished ? (
                      <Text style={[styles.badge, { backgroundColor: '#E8F5E9', color: '#43A047' }]}>{t('health.completed')}</Text>
                    ) : isActive ? (
                      <Text style={[styles.badge, { backgroundColor: '#FFF3E0', color: '#FB8C00' }]}>{t('health.ongoing')}</Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })
            )
          ))}

          {renderSection(t('pets.food'), 'utensils', food.length, 'food', (
            food.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('pets.noFood')}</Text>
            ) : (
              food.map(f => (
                <TouchableOpacity key={f.id} style={styles.item} onPress={() => setDetailModal({ visible: true, item: f, section: 'food' })} onLongPress={() => setItemActionModal({ visible: true, id: f.id, title: f.name, section: 'food' })}>
                  <AppIcon name="utensils" size={20} color={PET_THEME} />
                  <View style={styles.itemText}>
                    <Text style={[styles.itemTitle, { color: colors.text }]}>{f.name}</Text>
                    <Text style={[styles.itemSub, { color: colors.textSecondary }]}>{f.time} — {f.amount}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )
          ))}

          {renderSection(t('pets.grooming'), 'person', grooming.length, 'grooming', (
            grooming.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('pets.noGrooming')}</Text>
            ) : (
              grooming.map(g => (
                <TouchableOpacity key={g.id} style={styles.item} onPress={() => navigation.navigate('PetGroomDetail', { grooming: g, petName: pets.find(p => p.id === g.petId)?.name, source: 'pets' })} onLongPress={() => setItemActionModal({ visible: true, id: g.id, title: g.name, section: 'grooming' })}>
                  <AppIcon name="person" size={20} color={PET_THEME} />
                  <View style={styles.itemText}>
                    <Text style={[styles.itemTitle, { color: colors.text }]}>{g.name}</Text>
                    <Text style={[styles.itemSub, { color: colors.textSecondary }]}>{t('pets.lastDate')}: {g.lastDate}{g.nextDate ? ` → ${t('pets.nextDate')}: ${g.nextDate}` : ''}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )
          ))}

          {renderSection(t('pets.vaccinations'), 'vaccination', vaccinations.length, 'vaccinations', (
            vaccinations.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('pets.noVaccinations')}</Text>
            ) : (
              [...vaccinations].sort((a, b) => {
                const aPast = isDatePast(a.date);
                const bPast = isDatePast(b.date);
                if (aPast && !bPast) return 1;
                if (!aPast && bPast) return -1;
                if (aPast && bPast) return b.date.localeCompare(a.date);
                return a.date.localeCompare(b.date);
              }).map(v => (
                <TouchableOpacity key={v.id} style={styles.item} onPress={() => navigation.navigate('PetVaccDetail', { vaccination: v, petName: pets.find(p => p.id === v.petId)?.name, source: 'pets' })} onLongPress={() => setItemActionModal({ visible: true, id: v.id, title: v.name, section: 'vaccinations' })}>
                  <AppIcon name="vaccination" size={20} color={PET_THEME} />
                  <View style={styles.itemText}>
                    <Text style={[styles.itemTitle, { color: colors.text }]}>{v.name}</Text>
                    <Text style={[styles.itemSub, { color: colors.textSecondary }]}>{v.date}{v.nextDue ? ` → ${v.nextDue}` : ''}</Text>
                  </View>
                  <Text style={[styles.badge, { backgroundColor: (v.status === 'completed' || isDatePast(v.date)) ? '#E8F5E9' : '#FFF3E0', color: (v.status === 'completed' || isDatePast(v.date)) ? '#43A047' : '#FB8C00' }]}>
                    {(v.status === 'completed' || isDatePast(v.date)) ? t('health.completed') : t('health.pending')}
                  </Text>
                </TouchableOpacity>
              ))
            )
          ))}

          {renderSection(t('pets.insurance'), 'documents', insurance.length, 'insurance', (
            insurance.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('pets.noInsurance')}</Text>
            ) : (
              insurance.map(i => (
                <TouchableOpacity key={i.id} style={styles.item} onPress={() => setDetailModal({ visible: true, item: i, section: 'insurance' })} onLongPress={() => setItemActionModal({ visible: true, id: i.id, title: i.provider, section: 'insurance' })}>
                  <AppIcon name="documents" size={20} color={PET_THEME} />
                  <View style={styles.itemText}>
                    <Text style={[styles.itemTitle, { color: colors.text }]}>{i.provider}</Text>
                    <Text style={[styles.itemSub, { color: colors.textSecondary }]}>{i.policyNumber} — {t('pets.expiryDate')}: {i.expiryDate}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )
          ))}
        </ScrollView>

        <Modal visible={showItemModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingItem ? t('common.edit') : ''}
                {activeSection === 'vetVisits' ? ` ${t('pets.addVetVisit')}` :
                 activeSection === 'medications' ? ` ${t('pets.addMedication')}` :
                 activeSection === 'food' ? ` ${t('pets.addFood')}` :
                 activeSection === 'grooming' ? ` ${t('pets.addGrooming')}` :
                 activeSection === 'vaccinations' ? ` ${t('pets.addVaccination')}` :
                 activeSection === 'insurance' ? ` ${t('pets.addInsurance')}` : ''}
              </Text>
              <ScrollView>
                {activeSection === 'vetVisits' && (
                  <>
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('pets.vetTitle')}</Text>
                      <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={vetForm.title} onChangeText={(v) => setVetForm(f => ({ ...f, title: v }))} placeholder={t('pets.vetTitlePlaceholder')} placeholderTextColor={colors.textDisabled} />
                    </View>
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('common.date')}</Text>
                      <TouchableOpacity style={[styles.input, { backgroundColor: colors.inputBackground }]} onPress={() => setActivePicker('vetDate')}>
                        <Text style={{ color: vetForm.date ? colors.text : colors.textDisabled, fontSize: 16 }}>{vetForm.date || t('common.pickDate')}</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <View style={[styles.field, { flex: 1 }]}>
                        <Text style={[styles.label, { color: colors.text }]}>{t('common.startTime')}</Text>
                        <TouchableOpacity style={[styles.input, { backgroundColor: colors.inputBackground }]} onPress={() => setActivePicker('vetStartTime')}>
                          <Text style={{ color: vetForm.startTime ? colors.text : colors.textDisabled, fontSize: 16 }}>{vetForm.startTime || t('common.pickTime')}</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={[styles.field, { flex: 1 }]}>
                        <Text style={[styles.label, { color: colors.text }]}>{t('common.endTime')}</Text>
                        <TouchableOpacity style={[styles.input, { backgroundColor: colors.inputBackground }]} onPress={() => setActivePicker('vetEndTime')}>
                          <Text style={{ color: vetForm.endTime ? colors.text : colors.textDisabled, fontSize: 16 }}>{vetForm.endTime || t('common.pickTime')}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('pets.veterinarian')}</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                        value={vetForm.doctor}
                        onChangeText={(v) => setVetForm(f => ({ ...f, doctor: v }))}
                        placeholder={t('pets.veterinarianPlaceholder')}
                        placeholderTextColor={colors.textDisabled}
                      />
                    </View>
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('health.location')}</Text>
                      <GooglePlacesInput
                        value={vetForm.location}
                        onChangeText={(v) => setVetForm(f => ({ ...f, location: v }))}
                        placeholder={t('health.locationPlaceholder')}
                        onSelect={(v) => setVetForm(f => ({ ...f, location: v }))}
                      />
                    </View>
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('common.note')}</Text>
                      <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={vetForm.note} onChangeText={(v) => setVetForm(f => ({ ...f, note: v }))} placeholderTextColor={colors.textDisabled} multiline />
                    </View>
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('health.reminder')}</Text>
                      <View style={styles.personRow}>
                        {['', t('health.reminder1Day'), t('health.reminder3Days'), t('health.reminder1Week')].map((r, i) => (
                          <TouchableOpacity key={i} style={[styles.personChip, { backgroundColor: vetForm.reminder === r ? PET_THEME : colors.inputBackground }]} onPress={() => setVetForm(f => ({ ...f, reminder: r }))}>
                            <Text style={{ color: vetForm.reminder === r ? '#fff' : colors.text, fontSize: 13 }}>{r || t('health.noReminder')}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </>
                )}

                {activeSection === 'medications' && (
                  <>
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('pets.medications')}</Text>
                      <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={medForm.name} onChangeText={(v) => setMedForm(f => ({ ...f, name: v }))} placeholderTextColor={colors.textDisabled} />
                    </View>
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('health.dosage')}</Text>
                      <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={medForm.dosage} onChangeText={(v) => setMedForm(f => ({ ...f, dosage: v }))} placeholder={t('health.dosagePlaceholder')} placeholderTextColor={colors.textDisabled} />
                    </View>

                    {/* Frekvens */}
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('health.frequency')}</Text>
                      <View style={styles.personRow}>
                        {[1, 2, 3, 4].map(n => (
                          <TouchableOpacity key={n} style={[styles.personChip, { backgroundColor: medForm.frequency === n ? PET_THEME : colors.inputBackground }]} onPress={() => {
                            const newSlots = [...medForm.timeSlots];
                            while (newSlots.length < n) newSlots.push({ time: '08:00', reminderMinutes: 15 });
                            while (newSlots.length > n) newSlots.pop();
                            setMedForm(f => ({ ...f, frequency: n, timeSlots: newSlots }));
                          }}>
                            <Text style={{ color: medForm.frequency === n ? '#fff' : colors.text, fontSize: 13 }}>{n}x</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {/* Tider og påminnelser */}
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('health.timesAndReminders')}</Text>
                      {(medForm.timeSlots || []).map((slot, i) => (
                        <View key={i} style={[styles.timeSlot, { backgroundColor: colors.inputBackground }]}>
                          <Text style={[styles.timeSlotLabel, { color: colors.textSecondary }]}>{t('health.time')} {i + 1}:</Text>
                          <TouchableOpacity style={[styles.timeInput, { backgroundColor: colors.surface }]} onPress={() => setActivePicker(`medTime${i}`)}>
                            <Text style={{ color: colors.text, fontSize: 16 }}>{slot.time}</Text>
                          </TouchableOpacity>
                          <View style={styles.reminderRow}>
                            <Text style={[styles.reminderLabel, { color: colors.textSecondary }]}>{t('health.reminder')}:</Text>
                            {[0, 15, 30, 60].map(mins => (
                              <TouchableOpacity key={mins} style={[styles.reminderChip, { backgroundColor: slot.reminderMinutes === mins ? PET_THEME : colors.inputBackground }]} onPress={() => {
                                const newSlots = [...medForm.timeSlots];
                                newSlots[i] = { ...newSlots[i], reminderMinutes: mins };
                                setMedForm(f => ({ ...f, timeSlots: newSlots }));
                              }}>
                                <Text style={{ color: slot.reminderMinutes === mins ? '#fff' : colors.text, fontSize: 10 }}>{mins === 0 ? t('health.noReminder') : mins < 60 ? `${mins}m` : `${mins/60}t`}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      ))}
                    </View>

                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <View style={[styles.field, { flex: 1 }]}>
                        <Text style={[styles.label, { color: colors.text }]}>{t('health.dateFrom')}</Text>
                        <TouchableOpacity style={[styles.input, { backgroundColor: colors.inputBackground }]} onPress={() => setActivePicker('medDateFrom')}>
                          <Text style={{ color: medForm.dateFrom ? colors.text : colors.textDisabled, fontSize: 16 }}>{medForm.dateFrom || t('common.pickDate')}</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={[styles.field, { flex: 1 }]}>
                        <Text style={[styles.label, { color: colors.text }]}>{t('health.dateTo')}</Text>
                        <TouchableOpacity style={[styles.input, { backgroundColor: colors.inputBackground }]} onPress={() => setActivePicker('medDateTo')}>
                          <Text style={{ color: medForm.dateTo ? colors.text : colors.textDisabled, fontSize: 16 }}>{medForm.dateTo || t('common.pickDate')}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('common.note')}</Text>
                      <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={medForm.note} onChangeText={(v) => setMedForm(f => ({ ...f, note: v }))} placeholderTextColor={colors.textDisabled} multiline />
                    </View>
                  </>
                )}

                {activeSection === 'food' && (
                  <>
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('pets.foodName')}</Text>
                      <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={foodForm.name} onChangeText={(v) => setFoodForm(f => ({ ...f, name: v }))} placeholder={t('pets.foodNamePlaceholder')} placeholderTextColor={colors.textDisabled} />
                    </View>
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('pets.time')}</Text>
                      <TouchableOpacity style={[styles.input, { backgroundColor: colors.inputBackground }]} onPress={() => setActivePicker('foodTime')}>
                        <Text style={{ color: foodForm.time ? colors.text : colors.textDisabled, fontSize: 16 }}>{foodForm.time || t('common.pickTime')}</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('pets.amount')}</Text>
                      <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={foodForm.amount} onChangeText={(v) => setFoodForm(f => ({ ...f, amount: v }))} placeholder={t('pets.amountPlaceholder')} placeholderTextColor={colors.textDisabled} />
                    </View>
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('common.note')}</Text>
                      <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={foodForm.note} onChangeText={(v) => setFoodForm(f => ({ ...f, note: v }))} placeholderTextColor={colors.textDisabled} multiline />
                    </View>
                  </>
                )}

                {activeSection === 'grooming' && (
                  <>
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('pets.groomName')}</Text>
                      <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={groomForm.name} onChangeText={(v) => setGroomForm(f => ({ ...f, name: v }))} placeholder={t('pets.groomNamePlaceholder')} placeholderTextColor={colors.textDisabled} />
                    </View>
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('pets.lastDate')}</Text>
                      <TouchableOpacity style={[styles.input, { backgroundColor: colors.inputBackground }]} onPress={() => setActivePicker('groomLastDate')}>
                        <Text style={{ color: groomForm.lastDate ? colors.text : colors.textDisabled, fontSize: 16 }}>{groomForm.lastDate || t('common.pickDate')}</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('pets.nextDate')}</Text>
                      <TouchableOpacity style={[styles.input, { backgroundColor: colors.inputBackground }]} onPress={() => setActivePicker('groomNextDate')}>
                        <Text style={{ color: groomForm.nextDate ? colors.text : colors.textDisabled, fontSize: 16 }}>{groomForm.nextDate || t('common.pickDate')}</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('common.note')}</Text>
                      <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={groomForm.note} onChangeText={(v) => setGroomForm(f => ({ ...f, note: v }))} placeholderTextColor={colors.textDisabled} multiline />
                    </View>
                  </>
                )}

                {activeSection === 'vaccinations' && (
                  <>
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('pets.vaccName')}</Text>
                      <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={vaccForm.name} onChangeText={(v) => setVaccForm(f => ({ ...f, name: v }))} placeholder={t('pets.vaccNamePlaceholder')} placeholderTextColor={colors.textDisabled} />
                    </View>
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('common.date')}</Text>
                      <TouchableOpacity style={[styles.input, { backgroundColor: colors.inputBackground }]} onPress={() => setActivePicker('vaccDate')}>
                        <Text style={{ color: vaccForm.date ? colors.text : colors.textDisabled, fontSize: 16 }}>{vaccForm.date || t('common.pickDate')}</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('health.nextDue')}</Text>
                      <TouchableOpacity style={[styles.input, { backgroundColor: colors.inputBackground }]} onPress={() => setActivePicker('vaccNextDue')}>
                        <Text style={{ color: vaccForm.nextDue ? colors.text : colors.textDisabled, fontSize: 16 }}>{vaccForm.nextDue || t('common.pickDate')}</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('health.reminder')}</Text>
                      <View style={styles.personRow}>
                        {['', t('health.reminder1Day'), t('health.reminder3Days'), t('health.reminder1Week')].map((r, i) => (
                          <TouchableOpacity key={i} style={[styles.personChip, { backgroundColor: vaccForm.reminder === r ? PET_THEME : colors.inputBackground }]} onPress={() => setVaccForm(f => ({ ...f, reminder: r }))}>
                            <Text style={{ color: vaccForm.reminder === r ? '#fff' : colors.text, fontSize: 13 }}>{r || t('health.noReminder')}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('common.note')}</Text>
                      <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={vaccForm.note} onChangeText={(v) => setVaccForm(f => ({ ...f, note: v }))} placeholderTextColor={colors.textDisabled} multiline />
                    </View>
                  </>
                )}

                {activeSection === 'insurance' && (
                  <>
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('pets.insProvider')}</Text>
                      <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={insForm.provider} onChangeText={(v) => setInsForm(f => ({ ...f, provider: v }))} placeholder={t('pets.insProviderPlaceholder')} placeholderTextColor={colors.textDisabled} />
                    </View>
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('pets.policyNumber')}</Text>
                      <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={insForm.policyNumber} onChangeText={(v) => setInsForm(f => ({ ...f, policyNumber: v }))} placeholder={t('pets.policyPlaceholder')} placeholderTextColor={colors.textDisabled} />
                    </View>
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('pets.expiryDate')}</Text>
                      <TouchableOpacity style={[styles.input, { backgroundColor: colors.inputBackground }]} onPress={() => setActivePicker('insExpiryDate')}>
                        <Text style={{ color: insForm.expiryDate ? colors.text : colors.textDisabled, fontSize: 16 }}>{insForm.expiryDate || t('common.pickDate')}</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('pets.document')}</Text>
                      <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={insForm.documentUrl} onChangeText={(v) => setInsForm(f => ({ ...f, documentUrl: v }))} placeholder={t('common.placeholderUrl') || 'URL'} placeholderTextColor={colors.textDisabled} />
                    </View>
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('common.note')}</Text>
                      <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={insForm.note} onChangeText={(v) => setInsForm(f => ({ ...f, note: v }))} placeholderTextColor={colors.textDisabled} multiline />
                    </View>
                  </>
                )}
              </ScrollView>
              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.inputBackground }]} onPress={() => { setShowItemModal(false); setEditingItem(null); }}>
                  <Text style={[styles.modalBtnText, { color: colors.text }]}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: PET_THEME }]} onPress={handleAddItem}>
                  <Text style={[styles.modalBtnText, { color: '#fff' }]}>{t('common.save')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <ActionModal
          visible={itemActionModal.visible}
          title={itemActionModal.title}
          onEdit={handleEditItem}
          onDelete={handleDeleteItem}
          onCancel={() => setItemActionModal({ visible: false, id: '', title: '', section: 'vetVisits' })}
          accentColor={MODULE_COLORS.pets}
        />

        <Modal visible={detailModal.visible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 0 }]}>
                  {detailModal.section === 'vetVisits' ? t('pets.vetVisits') :
                   detailModal.section === 'medications' ? t('pets.medications') :
                   detailModal.section === 'food' ? t('pets.food') :
                   detailModal.section === 'grooming' ? t('pets.grooming') :
                   detailModal.section === 'vaccinations' ? t('pets.vaccinations') :
                   t('pets.insurance')}
                </Text>
                <TouchableOpacity onPress={() => setDetailModal({ visible: false, item: null, section: 'vetVisits' })}>
                  <Text style={{ color: colors.textSecondary, fontSize: 18 }}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView>
                {detailModal.item && detailModal.section === 'vetVisits' && (
                  <>
                    <View style={[styles.viewCard, { backgroundColor: colors.surface }]}>
                      <Text style={styles.viewIcon}>🏥</Text>
                      <Text style={[styles.viewTitle, { color: colors.text }]}>{detailModal.item.title}</Text>
                      {detailModal.item.doctor && (
                        <Text style={[styles.viewDescription, { color: colors.textSecondary }]}>🩺 {detailModal.item.doctor}</Text>
                      )}
                      <View style={[styles.viewDivider, { backgroundColor: colors.border }]} />
                      <View style={styles.viewDetailRow}>
                        <Text style={[styles.viewDetailLabel, { color: colors.textSecondary }]}>📅 {t('common.date')}</Text>
                        <Text style={[styles.viewDetailValue, { color: colors.text }]}>{detailModal.item.date}</Text>
                      </View>
                      <View style={styles.viewDetailRow}>
                        <Text style={[styles.viewDetailLabel, { color: colors.textSecondary }]}>🕐 {t('common.time')}</Text>
                        <Text style={[styles.viewDetailValue, { color: colors.text }]}>{detailModal.item.startTime}{detailModal.item.endTime ? ` - ${detailModal.item.endTime}` : ''}</Text>
                      </View>
                      {detailModal.item.location && (
                        <View style={styles.viewDetailRow}>
                          <Text style={[styles.viewDetailLabel, { color: colors.textSecondary }]}>📍 {t('health.location')}</Text>
                          <Text style={[styles.viewDetailValue, { color: colors.text }]} numberOfLines={2}>{detailModal.item.location}</Text>
                        </View>
                      )}
                      {detailModal.item.reminder && (
                        <View style={styles.viewDetailRow}>
                          <Text style={[styles.viewDetailLabel, { color: colors.textSecondary }]}>🔔 {t('health.reminder')}</Text>
                          <Text style={[styles.viewDetailValue, { color: colors.text }]}>{detailModal.item.reminder}</Text>
                        </View>
                      )}
                      <View style={styles.viewDetailRow}>
                        <Text style={[styles.viewDetailLabel, { color: colors.textSecondary }]}>✅ {t('health.status')}</Text>
                        <Text style={[styles.viewDetailValue, { color: (detailModal.item.status === 'completed' || isDatePast(detailModal.item.date)) ? '#43A047' : '#FB8C00' }]}>{(detailModal.item.status === 'completed' || isDatePast(detailModal.item.date)) ? t('health.completed') : t('health.pending')}</Text>
                      </View>
                      {detailModal.item.note && (
                        <View style={styles.viewDetailRow}>
                          <Text style={[styles.viewDetailLabel, { color: colors.textSecondary }]}>📝 {t('common.note')}</Text>
                          <Text style={[styles.viewDetailValue, { color: colors.text }]} numberOfLines={3}>{detailModal.item.note}</Text>
                        </View>
                      )}
                    </View>
                    {detailModal.item.location && (() => {
                      const mapUrl = getStaticMapUrl(detailModal.item.location);
                      return mapUrl ? (
                        <TouchableOpacity
                          style={[styles.viewMapContainer, { backgroundColor: colors.surface }]}
                          onPress={() => Linking.openURL(getGoogleMapsUrl(detailModal.item.location))}
                        >
                          <Image source={{ uri: mapUrl }} style={styles.viewMapImage} />
                          <Text style={[styles.viewMapLabel, { color: MODULE_COLORS.pets }]}>{t('tips.openGoogleMaps')}</Text>
                        </TouchableOpacity>
                      ) : null;
                    })()}
                    {Platform.OS === 'web' && (
                      <View style={{ marginTop: 8 }}>
                        {userCalendarProvider && userCalendarEmail ? (
                          <TouchableOpacity
                            style={[styles.calendarWebButton, { backgroundColor: userCalendarProvider === 'google' ? '#4285F4' : '#0078D4' }]}
                            onPress={() => {
                              const [h, m] = (detailModal.item.startTime || '09:00').split(':').map(Number);
                              const start = new Date(detailModal.item.date);
                              start.setHours(h, m, 0, 0);
                              let end: Date;
                              if (detailModal.item.endTime) {
                                const [eh, em] = detailModal.item.endTime.split(':').map(Number);
                                end = new Date(detailModal.item.date);
                                end.setHours(eh, em, 0, 0);
                              } else {
                                end = new Date(start.getTime() + 60 * 60 * 1000);
                              }
                              const title = `${PET_ICONS[selectedPet?.type] || '🐾'} ${selectedPet?.name || ''}: ${detailModal.item.title}`;
                              if (userCalendarProvider === 'google') {
                                const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
                                const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent(detailModal.item.note || '')}&location=${encodeURIComponent(detailModal.item.location || '')}`;
                                Linking.openURL(url);
                              } else {
                                const fmt = (d: Date) => d.toISOString();
                                const url = `https://outlook.live.com/calendar/0/action/compose?subject=${encodeURIComponent(title)}&startdt=${fmt(start)}&enddt=${fmt(end)}&body=${encodeURIComponent(detailModal.item.note || '')}&location=${encodeURIComponent(detailModal.item.location || '')}`;
                                Linking.openURL(url);
                              }
                            }}
                          >
                            <Text style={styles.calendarWebButtonText}>
                              {userCalendarProvider === 'google' ? t('calendar.addToGoogle') : t('calendar.addToOutlook')}
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <Text style={[styles.sectionLabel, { color: colors.textDisabled, textAlign: 'center' }]}>
                            Lagre kalender-e-post i Profil for å legge til arrangementer direkte.
                          </Text>
                        )}
                      </View>
                    )}
                  </>
                )}
                {detailModal.item && detailModal.section === 'medications' && (
                  <>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('pets.medications')}</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{detailModal.item.name}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('health.dosage')}</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{detailModal.item.dosage}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('health.frequency')}</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{detailModal.item.frequency}</Text>
                    </View>
                    {detailModal.item.dateFrom && (
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('health.dateFrom')}</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{detailModal.item.dateFrom}</Text>
                      </View>
                    )}
                    {detailModal.item.dateTo && (
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('health.dateTo')}</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{detailModal.item.dateTo}</Text>
                      </View>
                    )}
                    {detailModal.item.note && (
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('common.note')}</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{detailModal.item.note}</Text>
                      </View>
                    )}
                  </>
                )}
                {detailModal.item && detailModal.section === 'food' && (
                  <>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('pets.foodName')}</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{detailModal.item.name}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('pets.time')}</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{detailModal.item.time}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('pets.amount')}</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{detailModal.item.amount}</Text>
                    </View>
                    {detailModal.item.note && (
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('common.note')}</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{detailModal.item.note}</Text>
                      </View>
                    )}
                  </>
                )}
                {detailModal.item && detailModal.section === 'grooming' && (
                  <>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('pets.groomName')}</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{detailModal.item.name}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('pets.lastDate')}</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{detailModal.item.lastDate}</Text>
                    </View>
                    {detailModal.item.nextDate && (
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('pets.nextDate')}</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{detailModal.item.nextDate}</Text>
                      </View>
                    )}
                    {detailModal.item.note && (
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('common.note')}</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{detailModal.item.note}</Text>
                      </View>
                    )}
                  </>
                )}
                {detailModal.item && detailModal.section === 'vaccinations' && (
                  <>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('pets.vaccName')}</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{detailModal.item.name}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('common.date')}</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{detailModal.item.date}</Text>
                    </View>
                    {detailModal.item.nextDue && (
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('health.nextDue')}</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{detailModal.item.nextDue}</Text>
                      </View>
                    )}
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('health.status')}</Text>
                      <Text style={[styles.detailValue, { color: (detailModal.item.status === 'completed' || isDatePast(detailModal.item.date)) ? '#43A047' : '#FB8C00' }]}>{(detailModal.item.status === 'completed' || isDatePast(detailModal.item.date)) ? t('health.completed') : t('health.pending')}</Text>
                    </View>
                    {detailModal.item.note && (
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('common.note')}</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{detailModal.item.note}</Text>
                      </View>
                    )}
                  </>
                )}
                {detailModal.item && detailModal.section === 'insurance' && (
                  <>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('pets.insProvider')}</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{detailModal.item.provider}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('pets.policyNumber')}</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{detailModal.item.policyNumber}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('pets.expiryDate')}</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{detailModal.item.expiryDate}</Text>
                    </View>
                    {detailModal.item.documentUrl && (
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('pets.document')}</Text>
                        <Text style={[styles.detailValue, { color: PET_THEME }]}>{detailModal.item.documentUrl}</Text>
                      </View>
                    )}
                    {detailModal.item.note && (
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('common.note')}</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{detailModal.item.note}</Text>
                      </View>
                    )}
                  </>
                )}
              </ScrollView>
              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.inputBackground }]} onPress={() => setDetailModal({ visible: false, item: null, section: 'vetVisits' })}>
                  <Text style={[styles.modalBtnText, { color: colors.text }]}>{t('common.close')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: PET_THEME }]} onPress={() => {
                  const item = detailModal.item;
                  const section = detailModal.section;
                  setDetailModal({ visible: false, item: null, section: 'vetVisits' });
                  setActiveSection(section);
                  setEditingItem({ id: item.id, section });
                  setShowItemModal(true);
                }}>
                  <Text style={[styles.modalBtnText, { color: '#fff' }]}>{t('common.edit')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: MODULE_COLORS.petsBg }]} edges={['top']}>
      {selectedPet ? renderDetail() : renderGrid()}

      <DatePickerModal
        visible={activePicker !== null}
        title={
          activePicker?.includes('Date') || activePicker?.includes('date') || activePicker?.includes('Due') || activePicker?.includes('Birthday') || activePicker?.includes('Chip') || activePicker?.includes('Expiry')
            ? t('common.date')
            : t('common.time')
        }
        mode={activePicker?.includes('Time') || activePicker?.includes('time') ? 'time' : 'date'}
        dateOffset={
          activePicker === 'petBirthday' || activePicker === 'petChipDate' ? -5475 :
          activePicker === 'groomLastDate' || activePicker === 'medDateFrom' ? -1825 :
          activePicker === 'vetDate' || activePicker === 'vaccDate' ? -1825 :
          activePicker === 'groomNextDate' || activePicker === 'vaccNextDue' || activePicker === 'insExpiryDate' ? -365 :
          activePicker === 'foodTime' ? 0 : 0
        }
        dateCount={
          activePicker === 'petBirthday' || activePicker === 'petChipDate' ? 5840 :
          activePicker === 'groomLastDate' || activePicker === 'medDateFrom' ? 2190 :
          activePicker === 'vetDate' || activePicker === 'vaccDate' ? 2190 :
          activePicker === 'groomNextDate' || activePicker === 'vaccNextDue' || activePicker === 'insExpiryDate' ? 730 : 365
        }
        selectedValue={
          activePicker === 'petBirthday' ? petForm.birthday :
          activePicker === 'petChipDate' ? petForm.chipDate :
          activePicker === 'vetDate' ? vetForm.date :
          activePicker === 'vetStartTime' ? vetForm.startTime :
          activePicker === 'vetEndTime' ? vetForm.endTime :
          activePicker === 'medDateFrom' ? medForm.dateFrom :
          activePicker === 'medDateTo' ? medForm.dateTo :
          activePicker === 'foodTime' ? foodForm.time :
          activePicker === 'groomLastDate' ? groomForm.lastDate :
          activePicker === 'groomNextDate' ? groomForm.nextDate :
          activePicker === 'vaccDate' ? vaccForm.date :
          activePicker === 'vaccNextDue' ? vaccForm.nextDue :
          activePicker === 'insExpiryDate' ? insForm.expiryDate :
          activePicker?.startsWith('medTime') ? (medForm.timeSlots[parseInt(activePicker.replace('medTime', ''))]?.time || '') : ''
        }
        onSelect={(value) => {
          if (activePicker === 'petBirthday') setPetForm(f => ({ ...f, birthday: value }));
          else if (activePicker === 'petChipDate') setPetForm(f => ({ ...f, chipDate: value }));
          else if (activePicker === 'vetDate') setVetForm(f => ({ ...f, date: value }));
          else if (activePicker === 'vetStartTime') setVetForm(f => ({ ...f, startTime: value }));
          else if (activePicker === 'vetEndTime') setVetForm(f => ({ ...f, endTime: value }));
          else if (activePicker === 'medDateFrom') setMedForm(f => ({ ...f, dateFrom: value }));
          else if (activePicker === 'medDateTo') setMedForm(f => ({ ...f, dateTo: value }));
          else if (activePicker === 'foodTime') setFoodForm(f => ({ ...f, time: value }));
          else if (activePicker === 'groomLastDate') setGroomForm(f => ({ ...f, lastDate: value }));
          else if (activePicker === 'groomNextDate') setGroomForm(f => ({ ...f, nextDate: value }));
          else if (activePicker === 'vaccDate') setVaccForm(f => ({ ...f, date: value }));
          else if (activePicker === 'vaccNextDue') setVaccForm(f => ({ ...f, nextDue: value }));
          else if (activePicker === 'insExpiryDate') setInsForm(f => ({ ...f, expiryDate: value }));
          else if (activePicker?.startsWith('medTime')) {
            const idx = parseInt(activePicker.replace('medTime', ''));
            const newSlots = [...medForm.timeSlots];
            if (newSlots[idx]) {
              newSlots[idx] = { ...newSlots[idx], time: value };
              setMedForm(f => ({ ...f, timeSlots: newSlots }));
            }
          }
          setActivePicker(null);
        }}
        onClose={() => setActivePicker(null)}
        accentColor={MODULE_COLORS.pets}
      />

      <HelpCenter
        visible={showHelp}
        onClose={() => setShowHelp(false)}
        title={t('pets.helpTitle')}
        sections={[
          { icon: '🐾', title: t('pets.helpWhat'), text: t('pets.helpWhatText') },
          { icon: '👉', title: t('pets.helpHow'), text: t('pets.helpHowText'), tip: t('pets.helpTip') },
          { icon: '⚙️', title: t('pets.helpFeatures'), text: t('pets.helpFeaturesText') },
        ]}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, borderBottomWidth: 1 },
  screenTitle: { fontSize: 28, fontWeight: 'bold' },
  content: { flex: 1, padding: 16 },
  gridSubtitle: { fontSize: 14, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridTile: { width: '30%', borderRadius: 16, alignItems: 'center', justifyContent: 'center', padding: 12 },
  gridTileAdd: { borderWidth: 2, borderStyle: 'dashed', backgroundColor: 'transparent', aspectRatio: 1 },
  gridEmoji: { fontSize: 36, marginBottom: 6 },
  gridPhoto: { width: 80, height: 80, borderRadius: 40, marginBottom: 6 },
  imagePicker: { width: '100%', height: 120, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  formPhoto: { width: 120, height: 120, borderRadius: 60 },
  gridName: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  gridType: { fontSize: 12, marginTop: 2 },
  section: { borderRadius: 12, padding: 16, marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 14, fontWeight: '700' },
  sectionCount: { fontSize: 12 },
  addButton: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#ddd', gap: 10 },
  itemText: { flex: 1 },
  itemTitle: { fontSize: 14, fontWeight: '600' },
  itemSub: { fontSize: 12 },
  badge: { fontSize: 11, fontWeight: '600', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 10 },
  emptyText: { fontSize: 13, textAlign: 'center', paddingVertical: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { borderRadius: 10, padding: 14, fontSize: 16 },
  personRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  personChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  modalBtnText: { fontSize: 16, fontWeight: '600' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  detailLabel: { fontSize: 14, fontWeight: '600' },
  detailValue: { fontSize: 14, flex: 1, textAlign: 'right' },
  viewCard: { borderRadius: 12, padding: 20, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  viewIcon: { fontSize: 42, marginBottom: 10 },
  viewTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  viewDescription: { fontSize: 15, lineHeight: 20, marginBottom: 4 },
  viewDivider: { height: 1, marginVertical: 12 },
  viewDetailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  viewDetailLabel: { fontSize: 14, flex: 1 },
  viewDetailValue: { fontSize: 14, fontWeight: '500', flex: 2, textAlign: 'right' },
  viewMapContainer: { borderRadius: 12, overflow: 'hidden', marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  viewMapImage: { width: '100%', height: 180 },
  viewMapLabel: { fontSize: 14, fontWeight: '600', textAlign: 'center', padding: 10 },
  calendarWebButton: { padding: 14, borderRadius: 12, alignItems: 'center' },
  calendarWebButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  sectionLabel: { fontSize: 13, fontWeight: '600' },
});
