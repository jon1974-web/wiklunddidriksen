import { MODULE_COLORS } from "../constants/moduleColors";
import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, TouchableWithoutFeedback, StyleSheet } from 'react-native';
import { GooglePlacesInput } from './GooglePlacesInput';
import { useTranslation } from 'react-i18next';
import { AppIcon, AppIconName } from './AppIcon';
import type { TransportMode } from '../types';

export const GENERAL_TRANSPORT_MODES: { mode: TransportMode; icon: AppIconName; labelKey: string }[] = [
  { mode: 'personalCar', icon: 'personalCar', labelKey: 'transport.modePersonalCar' },
  { mode: 'bus', icon: 'bus', labelKey: 'transport.modeBus' },
  { mode: 'tram', icon: 'tram', labelKey: 'transport.modeTram' },
  { mode: 'other', icon: 'transport', labelKey: 'transport.modeOther' },
];

export interface TransportForm {
  transportType: 'fly' | 'tog' | 'bil' | 'boat' | 'taxi' | 'ferry' | 'general';
  transportMode: TransportMode | undefined;
  type: 'utreise' | 'hjemreise';
  isOneWay: boolean;
  airline: string;
  flightNumber: string;
  reference: string;
  seatNumber: string;
  wagon: string;
  driver: string;
  passengers: string;
  address: string;
  departureAddress: string;
  arrivalAddress: string;
  departureDate: string;
  departureTime: string;
  arrivalDate: string;
  arrivalTime: string;
  phone: string;
  note: string;
  routeName: string;
  cabin: string;
  hasCar: boolean;
  carRegistration: string;
  carType: string;
}

interface TransportFormModalProps {
  visible: boolean;
  editingId: string | null;
  transportForm: TransportForm;
  onTransportFormChange: React.Dispatch<React.SetStateAction<TransportForm>>;
  onSave: () => void;
  onCancel: () => void;
  onOpenPicker: (field: 'flightDepDate' | 'flightArrDate' | 'flightDepTime' | 'flightArrTime') => void;
  onDirectionChange?: (direction: 'utreise' | 'hjemreise') => void;
  onTransportTypeChange?: (type: TransportForm['transportType']) => void;
  colors: {
    surface: string;
    text: string;
    textDisabled: string;
    border: string;
    accent: string;
    inputBackground: string;
  };
}

export const TransportFormModal: React.FC<TransportFormModalProps> = React.memo(({
  visible,
  editingId,
  transportForm,
  onTransportFormChange,
  onSave,
  onCancel,
  onOpenPicker,
  onDirectionChange,
  onTransportTypeChange,
  colors,
}) => {
  const { t } = useTranslation();
  const set = (patch: Partial<TransportForm>) => onTransportFormChange(f => ({ ...f, ...patch }));

  const handleDirectionToggle = (dir: 'utreise' | 'hjemreise') => {
    if (onDirectionChange) {
      onDirectionChange(dir);
    } else {
      set({ type: dir });
    }
  };

  const isGeneral = transportForm.transportType === 'general';
  const isPersonalCar = isGeneral && transportForm.transportMode === 'personalCar';

  const headerIconName: AppIconName = transportForm.transportType === 'fly' ? 'fly'
    : transportForm.transportType === 'tog' ? 'train'
    : transportForm.transportType === 'boat' ? 'boat'
    : transportForm.transportType === 'ferry' ? 'ferry'
    : transportForm.transportType === 'taxi' ? 'taxi'
    : transportForm.transportType === 'general' ? (GENERAL_TRANSPORT_MODES.find(m => m.mode === transportForm.transportMode)?.icon ?? 'transport')
    : 'car';

  const handleTransportTypeChange = (tt: TransportForm['transportType']) => {
    if (onTransportTypeChange) {
      onTransportTypeChange(tt);
    } else {
      set({ transportType: tt });
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 12 }}>
                <AppIcon name={headerIconName} size={28} color="#3b5a75" />
                <Text style={[styles.modalTitle, { color: colors.text, borderBottomColor: 'transparent' }]}>
                  {editingId ? t('detail.edit') : t('common.add')} {t('transport.title')}
                </Text>
              </View>
              <ScrollView style={styles.modalScroll}>
                {isGeneral && (
                  <View style={styles.modeRow}>
                    {GENERAL_TRANSPORT_MODES.map(({ mode, icon, labelKey }) => {
                      const selected = transportForm.transportMode === mode;
                      return (
                        <TouchableOpacity
                          key={mode}
                          style={[styles.modeChip, { backgroundColor: selected ? MODULE_COLORS.tripsBg : colors.inputBackground, borderColor: selected ? MODULE_COLORS.trips : colors.border }]}
                          onPress={() => set({ transportMode: mode })}
                        >
                          <AppIcon name={icon} size={20} color={selected ? MODULE_COLORS.trips : colors.textDisabled} />
                          <Text style={[styles.modeChipText, { color: colors.text }]}>{t(labelKey)}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
                {!isGeneral && <View style={styles.flightTypeRow}>
                  <TouchableOpacity
                    style={[styles.flightTypeOption, { backgroundColor: transportForm.type === 'utreise' ? MODULE_COLORS.trips : colors.inputBackground }]}
                    onPress={() => handleDirectionToggle('utreise')}
                  >
                    <Text style={[styles.flightTypeText, { color: transportForm.type === 'utreise' ? '#fff' : colors.text }]}>
                      {transportForm.transportType === 'bil' || transportForm.transportType === 'taxi' ? t('transport.pickup') : transportForm.transportType === 'boat' || transportForm.transportType === 'ferry' ? t('transport.departure') : t('transport.departure')}
                    </Text>
                  </TouchableOpacity>
                  {!transportForm.isOneWay && (
                    <TouchableOpacity
                      style={[styles.flightTypeOption, { backgroundColor: transportForm.type === 'hjemreise' ? '#E53935' : colors.inputBackground }]}
                      onPress={() => handleDirectionToggle('hjemreise')}
                    >
                      <Text style={[styles.flightTypeText, { color: transportForm.type === 'hjemreise' ? '#fff' : colors.text }]}>
                        {transportForm.transportType === 'bil' || transportForm.transportType === 'taxi' ? t('transport.dropoff') : transportForm.transportType === 'boat' || transportForm.transportType === 'ferry' ? t('transport.arrival') : t('transport.arrival')}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                }
                {!isPersonalCar && (
                <>
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.text }]}>
                    {isGeneral ? t('transport.operator') : transportForm.transportType === 'fly' ? t('transport.airline') : transportForm.transportType === 'tog' ? t('transport.trainOperator') : t('transport.rentalCompany')}
                  </Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: MODULE_COLORS.tripsBg, color: colors.text }]}
                    value={transportForm.airline}
                    onChangeText={(v) => set({ airline: v })}
                    placeholder={isGeneral ? t('common.placeholderOperator') : transportForm.transportType === 'fly' ? t('common.placeholderAirline') : transportForm.transportType === 'tog' ? t('common.placeholderTrainOperator') : t('common.placeholderRentalCompany')}
                    placeholderTextColor={colors.textDisabled}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.text }]}>
                    {isGeneral ? t('transport.lineNumber') : transportForm.transportType === 'fly' ? t('transport.flightNumber') : transportForm.transportType === 'tog' ? t('transport.trainRoute') : t('transport.bookingNumber')}
                  </Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: MODULE_COLORS.tripsBg, color: colors.text }]}
                    value={transportForm.flightNumber}
                    onChangeText={(v) => set({ flightNumber: v })}
                    placeholder={isGeneral ? t('common.placeholderLineNumber') : transportForm.transportType === 'fly' ? t('common.placeholderFlightNumber') : transportForm.transportType === 'tog' ? t('common.placeholderTrainRoute') : t('common.placeholderBookingNumber')}
                    placeholderTextColor={colors.textDisabled}
                    autoCapitalize={transportForm.transportType === 'bil' ? 'characters' : 'none'}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.text }]}>
                    {t('transport.reference')}
                  </Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: MODULE_COLORS.tripsBg, color: colors.text }]}
                    value={transportForm.reference}
                    onChangeText={(v) => set({ reference: v })}
                    placeholder={t('common.placeholderReference')}
                    placeholderTextColor={colors.textDisabled}
                    autoCapitalize="characters"
                  />
                </View>
                </>
                )}
                {transportForm.transportType === 'fly' && (
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('transport.seatNumber')}</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: MODULE_COLORS.tripsBg, color: colors.text }]}
                      value={transportForm.seatNumber}
                      onChangeText={(v) => set({ seatNumber: v })}
                      placeholder={t('common.placeholderSeat')}
                      placeholderTextColor={colors.textDisabled}
                      autoCapitalize="characters"
                    />
                  </View>
                )}
                {transportForm.transportType === 'tog' && (
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('transport.wagon')}</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: MODULE_COLORS.tripsBg, color: colors.text }]}
                      value={transportForm.wagon}
                      onChangeText={(v) => set({ wagon: v })}
                      placeholder={t('common.placeholderWagonSeat')}
                      placeholderTextColor={colors.textDisabled}
                    />
                  </View>
                )}
                {transportForm.transportType === 'bil' && (
                  <>
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('common.driver')}</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: MODULE_COLORS.tripsBg, color: colors.text }]}
                        value={transportForm.driver}
                        onChangeText={(v) => set({ driver: v })}
                        placeholder={t('common.placeholderDriverName')}
                        placeholderTextColor={colors.textDisabled}
                      />
                    </View>
                  </>
                )}
                {isPersonalCar && (
                  <>
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('transport.carType')}</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: MODULE_COLORS.tripsBg, color: colors.text }]}
                        value={transportForm.carType}
                        onChangeText={(v) => set({ carType: v })}
                        placeholder={t('common.placeholderCarType')}
                        placeholderTextColor={colors.textDisabled}
                      />
                    </View>
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('common.driver')}</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: MODULE_COLORS.tripsBg, color: colors.text }]}
                        value={transportForm.driver}
                        onChangeText={(v) => set({ driver: v })}
                        placeholder={t('common.placeholderDriverName')}
                        placeholderTextColor={colors.textDisabled}
                      />
                    </View>
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('transport.carRegNr')}</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: MODULE_COLORS.tripsBg, color: colors.text }]}
                        value={transportForm.carRegistration || ''}
                        onChangeText={(v) => set({ carRegistration: v })}
                        placeholder={t('common.placeholderCarRegNr')}
                        placeholderTextColor={colors.textDisabled}
                        autoCapitalize="characters"
                      />
                    </View>
                  </>
                )}
                {transportForm.type === 'utreise' && !isGeneral && (
                  <View style={styles.field}>
                    <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} onPress={() => onTransportFormChange((f: any) => ({ ...f, isOneWay: !f.isOneWay }))}>
                      <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: transportForm.isOneWay ? MODULE_COLORS.trips : colors.textDisabled, backgroundColor: transportForm.isOneWay ? MODULE_COLORS.trips : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                        {transportForm.isOneWay && <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>✓</Text>}
                      </View>
                      <Text style={[styles.label, { color: colors.text }]}>{t('transport.oneWay')}</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {transportForm.transportType === 'bil' && (
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('common.address')}</Text>
                    <GooglePlacesInput
                      value={transportForm.address}
                      onChangeText={(v) => set({ address: v })}
                      placeholder={t('common.placeholderAddress')}
                      onSelect={(v) => set({ address: v })}
                    />
                  </View>
                )}
                {transportForm.transportType !== 'bil' && transportForm.transportType !== 'taxi' && (
                  <>
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>{isGeneral ? t('transport.fromPlace') : transportForm.transportType === 'fly' ? t('transport.departureAirport') : t('transport.departureTerminal')}</Text>
                      <GooglePlacesInput
                        value={transportForm.departureAddress || ''}
                        onChangeText={(v) => onTransportFormChange((f: any) => ({ ...f, departureAddress: v }))}
                        placeholder={isGeneral ? t('common.placeholderFromPlace') : transportForm.transportType === 'fly' ? t('common.placeholderDepartureAirport') : t('common.placeholderDepartureTerminal')}
                        onSelect={(v) => onTransportFormChange((f: any) => ({ ...f, departureAddress: v }))}
                      />
                    </View>
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>{isGeneral ? t('transport.toPlace') : transportForm.transportType === 'fly' ? t('transport.arrivalAirport') : t('transport.arrivalTerminal')}</Text>
                      <GooglePlacesInput
                        value={transportForm.arrivalAddress || ''}
                        onChangeText={(v) => onTransportFormChange((f: any) => ({ ...f, arrivalAddress: v }))}
                        placeholder={isGeneral ? t('common.placeholderToPlace') : transportForm.transportType === 'fly' ? t('common.placeholderArrivalAirport') : t('common.placeholderArrivalTerminal')}
                        onSelect={(v) => onTransportFormChange((f: any) => ({ ...f, arrivalAddress: v }))}
                      />
                    </View>
                  </>
                )}
                {transportForm.transportType === 'taxi' && (
                  <>
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('transport.pickupAddress')}</Text>
                      <GooglePlacesInput
                        value={transportForm.departureAddress || ''}
                        onChangeText={(v) => onTransportFormChange((f: any) => ({ ...f, departureAddress: v }))}
                        placeholder={t('common.placeholderPickupAddress')}
                        onSelect={(v) => onTransportFormChange((f: any) => ({ ...f, departureAddress: v }))}
                      />
                    </View>
                    {!transportForm.isOneWay && (
                      <View style={styles.field}>
                        <Text style={[styles.label, { color: colors.text }]}>{t('transport.arrivalAddress')}</Text>
                        <GooglePlacesInput
                          value={transportForm.arrivalAddress || ''}
                          onChangeText={(v) => onTransportFormChange((f: any) => ({ ...f, arrivalAddress: v }))}
                          placeholder={t('common.placeholderDeliveryAddress')}
                          onSelect={(v) => onTransportFormChange((f: any) => ({ ...f, arrivalAddress: v }))}
                        />
                      </View>
                    )}
                  </>
                )}
                {(transportForm.transportType === 'bil' ? transportForm.type === 'utreise' : true) && (
                <View style={styles.flightTimeRow}>
                  <View style={[styles.flightTimeField, { flex: 1 }]}>
                    <Text style={[styles.label, { color: colors.text }]}>
                      {transportForm.transportType === 'bil' ? 'Hentedato' : t('transport.departureDateLabel')}
                    </Text>
                    <TouchableOpacity
                      style={[styles.input, { backgroundColor: MODULE_COLORS.tripsBg }]}
                      onPress={() => onOpenPicker('flightDepDate')}
                    >
                      <Text style={{ color: transportForm.departureDate ? colors.text : colors.textDisabled, fontSize: 16 }}>
                        {transportForm.departureDate || t('common.selectDate')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.flightTimeField, { flex: 1 }]}>
                    <Text style={[styles.label, { color: colors.text }]}>
                      {transportForm.transportType === 'bil' ? 'Hentetid' : t('transport.departureTimeLabel')}
                    </Text>
                    <TouchableOpacity
                      style={[styles.input, { backgroundColor: MODULE_COLORS.tripsBg }]}
                      onPress={() => onOpenPicker('flightDepTime')}
                    >
                      <Text style={{ color: transportForm.departureTime ? colors.text : colors.textDisabled, fontSize: 16 }}>
                        {transportForm.departureTime || t('common.selectTime')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                )}
                {(transportForm.transportType === 'bil' ? transportForm.type === 'hjemreise' : true) && (
                <View style={styles.flightTimeRow}>
                  <View style={[styles.flightTimeField, { flex: 1 }]}>
                    <Text style={[styles.label, { color: colors.text }]}>
                      {transportForm.transportType === 'bil' ? t('transport.dropoff') : t('transport.arrivalDateLabel')}
                    </Text>
                    <TouchableOpacity
                      style={[styles.input, { backgroundColor: MODULE_COLORS.tripsBg }]}
                      onPress={() => onOpenPicker('flightArrDate')}
                    >
                      <Text style={{ color: transportForm.arrivalDate ? colors.text : colors.textDisabled, fontSize: 16 }}>
                        {transportForm.arrivalDate || t('common.selectDate')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.flightTimeField, { flex: 1 }]}>
                    <Text style={[styles.label, { color: colors.text }]}>
                      {transportForm.transportType === 'bil' ? t('transport.dropoff') : t('transport.arrivalTimeLabel')}
                    </Text>
                    <TouchableOpacity
                      style={[styles.input, { backgroundColor: MODULE_COLORS.tripsBg }]}
                      onPress={() => onOpenPicker('flightArrTime')}
                    >
                      <Text style={{ color: transportForm.arrivalTime ? colors.text : colors.textDisabled, fontSize: 16 }}>
                        {transportForm.arrivalTime || t('common.selectTime')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                )}
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.text }]}>{t('common.phone')}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: MODULE_COLORS.tripsBg, color: colors.text }]}
                    value={transportForm.phone}
                    onChangeText={(v) => set({ phone: v })}
                    placeholder={t('common.placeholderPhoneFormat')}
                    placeholderTextColor={colors.textDisabled}
                    keyboardType="phone-pad"
                  />
                </View>
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.text }]}>{t('common.notes')}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: MODULE_COLORS.tripsBg, color: colors.text }]}
                    value={transportForm.note}
                    onChangeText={(v) => set({ note: v })}
                    placeholder="..."
                    placeholderTextColor={colors.textDisabled}
                  />
                </View>
              </ScrollView>
              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalButton, { backgroundColor: MODULE_COLORS.tripsBg }]} onPress={onCancel}>
                  <Text style={[styles.modalButtonText, { color: colors.text }]}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, { backgroundColor: MODULE_COLORS.trips }]} onPress={onSave}>
                  <Text style={[styles.modalButtonText, { color: '#fff' }]}>{editingId ? t('common.save') : t('common.add')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
});

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalScroll: {
    padding: 16,
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
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
  },
  flightTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  modeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  modeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  modeChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  flightTypeOption: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  flightTypeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  flightTimeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  flightTimeField: {},
  modalActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
