import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, TouchableWithoutFeedback, StyleSheet } from 'react-native';
import { GooglePlacesInput } from './GooglePlacesInput';
import { useTranslation } from 'react-i18next';
import { AppIcon } from './AppIcon';

export interface TransportForm {
  transportType: 'fly' | 'tog' | 'bil' | 'boat' | 'taxi' | 'ferry';
  type: 'utreise' | 'hjemreise';
  isOneWay?: boolean;
  airline: string;
  flightNumber: string;
  reference: string;
  seatNumber: string;
  wagon: string;
  driver: string;
  passengers: string;
  address: string;
  departureAddress?: string;
  arrivalAddress?: string;
  departureDate: string;
  departureTime: string;
  arrivalDate: string;
  arrivalTime: string;
  phone: string;
  note: string;
  routeName?: string;
  cabin?: string;
  hasCar?: boolean;
  carRegistration?: string;
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
  onTransportTypeChange?: (type: 'fly' | 'tog' | 'bil' | 'boat' | 'taxi' | 'ferry') => void;
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

  const handleTransportTypeChange = (tt: 'fly' | 'tog' | 'bil' | 'boat' | 'taxi' | 'ferry') => {
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
                <AppIcon name={transportForm.transportType === 'fly' ? 'fly' : transportForm.transportType === 'tog' ? 'train' : transportForm.transportType === 'boat' ? 'boat' : transportForm.transportType === 'ferry' ? 'ferry' : transportForm.transportType === 'taxi' ? 'taxi' : 'car'} size={28} color="#0097A7" />
                <Text style={[styles.modalTitle, { color: colors.text, borderBottomColor: 'transparent' }]}>
                  {editingId ? t('detail.edit') : t('common.add')} {t('transport.title')}
                </Text>
              </View>
              <ScrollView style={styles.modalScroll}>
                <View style={styles.flightTypeRow}>
                  <TouchableOpacity
                    style={[styles.flightTypeOption, { backgroundColor: transportForm.type === 'utreise' ? colors.accent : colors.inputBackground }]}
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
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.text }]}>
                    {transportForm.transportType === 'fly' ? t('transport.airline') : transportForm.transportType === 'tog' ? t('transport.trainOperator') : t('transport.rentalCompany')}
                  </Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                    value={transportForm.airline}
                    onChangeText={(v) => set({ airline: v })}
                    placeholder={transportForm.transportType === 'fly' ? 'F.eks. Norwegian, SAS' : transportForm.transportType === 'tog' ? 'F.eks. Vy, SJ' : 'F.eks. Hertz, Avis'}
                    placeholderTextColor={colors.textDisabled}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.text }]}>
                    {transportForm.transportType === 'fly' ? t('transport.flightNumber') : transportForm.transportType === 'tog' ? t('transport.trainRoute') : t('transport.bookingNumber')}
                  </Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                    value={transportForm.flightNumber}
                    onChangeText={(v) => set({ flightNumber: v })}
                    placeholder={transportForm.transportType === 'fly' ? 'F.eks. DY1234' : transportForm.transportType === 'tog' ? 'F.eks. 521, 71' : 'F.eks. AB 12345'}
                    placeholderTextColor={colors.textDisabled}
                    autoCapitalize={transportForm.transportType === 'bil' ? 'characters' : 'none'}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.text }]}>
                    {t('transport.reference')}
                  </Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                    value={transportForm.reference}
                    onChangeText={(v) => set({ reference: v })}
                    placeholder="F.eks. ABC123"
                    placeholderTextColor={colors.textDisabled}
                    autoCapitalize="characters"
                  />
                </View>
                {transportForm.transportType === 'fly' && (
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('transport.seatNumber')}</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                      value={transportForm.seatNumber}
                      onChangeText={(v) => set({ seatNumber: v })}
                      placeholder="F.eks. 12A"
                      placeholderTextColor={colors.textDisabled}
                      autoCapitalize="characters"
                    />
                  </View>
                )}
                {transportForm.transportType === 'tog' && (
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('transport.wagon')}</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                      value={transportForm.wagon}
                      onChangeText={(v) => set({ wagon: v })}
                      placeholder="F.eks. Vogn 3, Plass 22"
                      placeholderTextColor={colors.textDisabled}
                    />
                  </View>
                )}
                {transportForm.transportType === 'bil' && (
                  <>
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('common.driver')}</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                        value={transportForm.driver}
                        onChangeText={(v) => set({ driver: v })}
                        placeholder="Navn på fører"
                        placeholderTextColor={colors.textDisabled}
                      />
                    </View>
                  </>
                )}
                {transportForm.type === 'utreise' && (
                  <View style={styles.field}>
                    <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} onPress={() => onTransportFormChange((f: any) => ({ ...f, isOneWay: !f.isOneWay }))}>
                      <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: transportForm.isOneWay ? colors.accent : colors.textDisabled, backgroundColor: transportForm.isOneWay ? colors.accent : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
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
                      placeholder="Søk etter adresse..."
                      onSelect={(v) => set({ address: v })}
                    />
                  </View>
                )}
                {transportForm.transportType !== 'bil' && transportForm.transportType !== 'taxi' && (
                  <>
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>{transportForm.transportType === 'fly' ? t('transport.departureAirport') : transportForm.transportType === 'boat' || transportForm.transportType === 'ferry' ? t('transport.departureTerminal') : t('transport.departureTerminal')}</Text>
                      <GooglePlacesInput
                        value={transportForm.departureAddress || ''}
                        onChangeText={(v) => onTransportFormChange((f: any) => ({ ...f, departureAddress: v }))}
                        placeholder={transportForm.transportType === 'fly' ? 'Avgangsflyplass adresse...' : 'Avgangsterminal adresse...'}
                        onSelect={(v) => onTransportFormChange((f: any) => ({ ...f, departureAddress: v }))}
                      />
                    </View>
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>{transportForm.transportType === 'fly' ? t('transport.arrivalAirport') : transportForm.transportType === 'boat' || transportForm.transportType === 'ferry' ? t('transport.arrivalTerminal') : t('transport.arrivalTerminal')}</Text>
                      <GooglePlacesInput
                        value={transportForm.arrivalAddress || ''}
                        onChangeText={(v) => onTransportFormChange((f: any) => ({ ...f, arrivalAddress: v }))}
                        placeholder={transportForm.transportType === 'fly' ? 'Ankomstflyplass adresse...' : 'Ankomstterminal adresse...'}
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
                        placeholder="Henteadresse..."
                        onSelect={(v) => onTransportFormChange((f: any) => ({ ...f, departureAddress: v }))}
                      />
                    </View>
                    {!transportForm.isOneWay && (
                      <View style={styles.field}>
                        <Text style={[styles.label, { color: colors.text }]}>{t('transport.arrivalAddress')}</Text>
                        <GooglePlacesInput
                          value={transportForm.arrivalAddress || ''}
                          onChangeText={(v) => onTransportFormChange((f: any) => ({ ...f, arrivalAddress: v }))}
                          placeholder="Leveringsadresse..."
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
                      style={[styles.input, { backgroundColor: colors.inputBackground }]}
                      onPress={() => onOpenPicker('flightDepDate')}
                    >
                      <Text style={{ color: transportForm.departureDate ? colors.text : colors.textDisabled, fontSize: 16 }}>
                        {transportForm.departureDate || 'Velg dato'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.flightTimeField, { flex: 1 }]}>
                    <Text style={[styles.label, { color: colors.text }]}>
                      {transportForm.transportType === 'bil' ? 'Hentetid' : t('transport.departureTimeLabel')}
                    </Text>
                    <TouchableOpacity
                      style={[styles.input, { backgroundColor: colors.inputBackground }]}
                      onPress={() => onOpenPicker('flightDepTime')}
                    >
                      <Text style={{ color: transportForm.departureTime ? colors.text : colors.textDisabled, fontSize: 16 }}>
                        {transportForm.departureTime || 'Velg tid'}
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
                      style={[styles.input, { backgroundColor: colors.inputBackground }]}
                      onPress={() => onOpenPicker('flightArrDate')}
                    >
                      <Text style={{ color: transportForm.arrivalDate ? colors.text : colors.textDisabled, fontSize: 16 }}>
                        {transportForm.arrivalDate || 'Velg dato'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.flightTimeField, { flex: 1 }]}>
                    <Text style={[styles.label, { color: colors.text }]}>
                      {transportForm.transportType === 'bil' ? t('transport.dropoff') : t('transport.arrivalTimeLabel')}
                    </Text>
                    <TouchableOpacity
                      style={[styles.input, { backgroundColor: colors.inputBackground }]}
                      onPress={() => onOpenPicker('flightArrTime')}
                    >
                      <Text style={{ color: transportForm.arrivalTime ? colors.text : colors.textDisabled, fontSize: 16 }}>
                        {transportForm.arrivalTime || 'Velg tid'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                )}
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.text }]}>{t('common.phone')}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                    value={transportForm.phone}
                    onChangeText={(v) => set({ phone: v })}
                    placeholder="F.eks. +47 000 00 000"
                    placeholderTextColor={colors.textDisabled}
                    keyboardType="phone-pad"
                  />
                </View>
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.text }]}>{t('common.notes')}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                    value={transportForm.note}
                    onChangeText={(v) => set({ note: v })}
                    placeholder="..."
                    placeholderTextColor={colors.textDisabled}
                  />
                </View>
              </ScrollView>
              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.inputBackground }]} onPress={onCancel}>
                  <Text style={[styles.modalButtonText, { color: colors.text }]}>Avbryt</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.accent }]} onPress={onSave}>
                  <Text style={[styles.modalButtonText, { color: '#fff' }]}>{editingId ? 'Lagre' : 'Legg til'}</Text>
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
