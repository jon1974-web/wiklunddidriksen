import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, TouchableWithoutFeedback, StyleSheet } from 'react-native';
import { GooglePlacesInput } from './GooglePlacesInput';

export interface FlightForm {
  transportType: 'fly' | 'tog' | 'bil';
  type: 'utreise' | 'hjemreise';
  airline: string;
  flightNumber: string;
  reference: string;
  seatNumber: string;
  wagon: string;
  driver: string;
  passengers: string;
  address: string;
  departureDate: string;
  departureTime: string;
  arrivalDate: string;
  arrivalTime: string;
  phone: string;
  note: string;
}

interface TransportFormModalProps {
  visible: boolean;
  editingId: string | null;
  flightForm: FlightForm;
  onFlightFormChange: React.Dispatch<React.SetStateAction<FlightForm>>;
  onSave: () => void;
  onCancel: () => void;
  onOpenPicker: (field: 'flightDepDate' | 'flightArrDate' | 'flightDepTime' | 'flightArrTime') => void;
  onDirectionChange?: (direction: 'utreise' | 'hjemreise') => void;
  onTransportTypeChange?: (type: 'fly' | 'tog' | 'bil') => void;
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
  flightForm,
  onFlightFormChange,
  onSave,
  onCancel,
  onOpenPicker,
  onDirectionChange,
  onTransportTypeChange,
  colors,
}) => {
  const set = (patch: Partial<FlightForm>) => onFlightFormChange(f => ({ ...f, ...patch }));

  const handleDirectionToggle = (dir: 'utreise' | 'hjemreise') => {
    if (onDirectionChange) {
      onDirectionChange(dir);
    } else {
      set({ type: dir });
    }
  };

  const handleTransportTypeChange = (tt: 'fly' | 'tog' | 'bil') => {
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
                        style={[styles.flightTypeOption, { backgroundColor: flightForm.transportType === tt ? colors.accent : colors.inputBackground }]}
                        onPress={() => handleTransportTypeChange(tt)}
                      >
                        <Text style={[styles.flightTypeText, { color: flightForm.transportType === tt ? '#fff' : colors.text }]}>
                          {tt === 'fly' ? '✈️ Fly' : tt === 'tog' ? '🚆 Tog' : '🚗 Bil'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={styles.flightTypeRow}>
                  <TouchableOpacity
                    style={[styles.flightTypeOption, { backgroundColor: flightForm.type === 'utreise' ? colors.accent : colors.inputBackground }]}
                    onPress={() => handleDirectionToggle('utreise')}
                  >
                    <Text style={[styles.flightTypeText, { color: flightForm.type === 'utreise' ? '#fff' : colors.text }]}>
                      {flightForm.transportType === 'bil' ? '🔑 Henting' : '🛫 Utreise'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.flightTypeOption, { backgroundColor: flightForm.type === 'hjemreise' ? '#E53935' : colors.inputBackground }]}
                    onPress={() => handleDirectionToggle('hjemreise')}
                  >
                    <Text style={[styles.flightTypeText, { color: flightForm.type === 'hjemreise' ? '#fff' : colors.text }]}>
                      {flightForm.transportType === 'bil' ? '📋 Levering' : '🛬 Hjemreise'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.text }]}>
                    {flightForm.transportType === 'fly' ? 'Flyselskap' : flightForm.transportType === 'tog' ? 'Togoperatør' : 'Utleieselskap'}
                  </Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                    value={flightForm.airline}
                    onChangeText={(v) => set({ airline: v })}
                    placeholder={flightForm.transportType === 'fly' ? 'F.eks. Norwegian, SAS' : flightForm.transportType === 'tog' ? 'F.eks. Vy, SJ' : 'F.eks. Hertz, Avis'}
                    placeholderTextColor={colors.textDisabled}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.text }]}>
                    {flightForm.transportType === 'fly' ? 'Flightnummer' : flightForm.transportType === 'tog' ? 'Togrute' : 'Registreringsnummer'}
                  </Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                    value={flightForm.flightNumber}
                    onChangeText={(v) => set({ flightNumber: v })}
                    placeholder={flightForm.transportType === 'fly' ? 'F.eks. DY1234' : flightForm.transportType === 'tog' ? 'F.eks. 521, 71' : 'F.eks. AB 12345'}
                    placeholderTextColor={colors.textDisabled}
                    autoCapitalize={flightForm.transportType === 'bil' ? 'characters' : 'none'}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.text }]}>
                    {flightForm.transportType === 'fly' ? 'Referanse (PNR)' : 'Referansenr'}
                  </Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                    value={flightForm.reference}
                    onChangeText={(v) => set({ reference: v })}
                    placeholder="F.eks. ABC123"
                    placeholderTextColor={colors.textDisabled}
                    autoCapitalize="characters"
                  />
                </View>
                {flightForm.transportType === 'fly' && (
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>Setenr</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                      value={flightForm.seatNumber}
                      onChangeText={(v) => set({ seatNumber: v })}
                      placeholder="F.eks. 12A"
                      placeholderTextColor={colors.textDisabled}
                      autoCapitalize="characters"
                    />
                  </View>
                )}
                {flightForm.transportType === 'tog' && (
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>Vogn og plass</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                      value={flightForm.wagon}
                      onChangeText={(v) => set({ wagon: v })}
                      placeholder="F.eks. Vogn 3, Plass 22"
                      placeholderTextColor={colors.textDisabled}
                    />
                  </View>
                )}
                {flightForm.transportType === 'bil' && (
                  <>
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>Fører</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                        value={flightForm.driver}
                        onChangeText={(v) => set({ driver: v })}
                        placeholder="Navn på fører"
                        placeholderTextColor={colors.textDisabled}
                      />
                    </View>
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>Adresse</Text>
                      <GooglePlacesInput
                        value={flightForm.address}
                        onChangeText={(v) => set({ address: v })}
                        placeholder="Søk etter adresse..."
                        onSelect={(v) => set({ address: v })}
                      />
                    </View>
                  </>
                )}
                {(flightForm.transportType === 'bil' ? flightForm.type === 'utreise' : true) && (
                <View style={styles.flightTimeRow}>
                  <View style={[styles.flightTimeField, { flex: 1 }]}>
                    <Text style={[styles.label, { color: colors.text }]}>
                      {flightForm.transportType === 'bil' ? 'Hentedato' : 'Avreisedato'}
                    </Text>
                    <TouchableOpacity
                      style={[styles.input, { backgroundColor: colors.inputBackground }]}
                      onPress={() => onOpenPicker('flightDepDate')}
                    >
                      <Text style={{ color: flightForm.departureDate ? colors.text : colors.textDisabled, fontSize: 16 }}>
                        {flightForm.departureDate || 'Velg dato'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.flightTimeField, { flex: 1 }]}>
                    <Text style={[styles.label, { color: colors.text }]}>
                      {flightForm.transportType === 'bil' ? 'Hentetid' : 'Avreisetid'}
                    </Text>
                    <TouchableOpacity
                      style={[styles.input, { backgroundColor: colors.inputBackground }]}
                      onPress={() => onOpenPicker('flightDepTime')}
                    >
                      <Text style={{ color: flightForm.departureTime ? colors.text : colors.textDisabled, fontSize: 16 }}>
                        {flightForm.departureTime || 'Velg tid'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                )}
                {(flightForm.transportType === 'bil' ? flightForm.type === 'hjemreise' : true) && (
                <View style={styles.flightTimeRow}>
                  <View style={[styles.flightTimeField, { flex: 1 }]}>
                    <Text style={[styles.label, { color: colors.text }]}>
                      {flightForm.transportType === 'bil' ? 'Leveringsdato' : 'Ankomstdato'}
                    </Text>
                    <TouchableOpacity
                      style={[styles.input, { backgroundColor: colors.inputBackground }]}
                      onPress={() => onOpenPicker('flightArrDate')}
                    >
                      <Text style={{ color: flightForm.arrivalDate ? colors.text : colors.textDisabled, fontSize: 16 }}>
                        {flightForm.arrivalDate || 'Velg dato'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.flightTimeField, { flex: 1 }]}>
                    <Text style={[styles.label, { color: colors.text }]}>
                      {flightForm.transportType === 'bil' ? 'Leveringstid' : 'Ankomsttid'}
                    </Text>
                    <TouchableOpacity
                      style={[styles.input, { backgroundColor: colors.inputBackground }]}
                      onPress={() => onOpenPicker('flightArrTime')}
                    >
                      <Text style={{ color: flightForm.arrivalTime ? colors.text : colors.textDisabled, fontSize: 16 }}>
                        {flightForm.arrivalTime || 'Velg tid'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                )}
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.text }]}>Telefon</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                    value={flightForm.phone}
                    onChangeText={(v) => set({ phone: v })}
                    placeholder="F.eks. +47 000 00 000"
                    placeholderTextColor={colors.textDisabled}
                    keyboardType="phone-pad"
                  />
                </View>
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.text }]}>Notater</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                    value={flightForm.note}
                    onChangeText={(v) => set({ note: v })}
                    placeholder="F.eks. Utreise, retur, bagasje..."
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
