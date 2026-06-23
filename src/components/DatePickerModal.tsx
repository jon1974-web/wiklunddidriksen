import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, TouchableWithoutFeedback, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface Option {
  label: string;
  value: string;
}

interface DatePickerModalProps {
  visible: boolean;
  title: string;
  selectedValue: string;
  onSelect: (value: string) => void;
  onClose: () => void;
  options?: Option[];
  mode?: 'date' | 'time';
  dateCount?: number;
  dateOffset?: number;
}

function generateDateOptions(count: number, offset: number): Option[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + offset + i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const label = d.toLocaleDateString('nb-NO', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    return { label, value: dateStr };
  });
}

function generateTimeOptions(): Option[] {
  return Array.from({ length: 48 }, (_, i) => {
    const h = Math.floor(i / 2);
    const m = (i % 2) * 30;
    const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    return { label: value, value };
  });
}

function isValidTimeFormat(input: string): boolean {
  return /^\d{1,2}:\d{2}$/.test(input);
}

export const DatePickerModal: React.FC<DatePickerModalProps> = React.memo(({
  visible,
  title,
  options: customOptions,
  selectedValue,
  onSelect,
  onClose,
  mode,
  dateCount = 365,
  dateOffset = 0,
}) => {
  const { colors } = useTheme();
  const [customTime, setCustomTime] = useState('');

  const options = useMemo(() => {
    if (customOptions) return customOptions;
    if (mode === 'date') return generateDateOptions(dateCount, dateOffset);
    if (mode === 'time') return generateTimeOptions();
    return [];
  }, [customOptions, mode, dateCount, dateOffset]);

  const handleCustomTimeSubmit = () => {
    if (!customTime.trim()) return;
    let normalized = customTime.trim();
    if (/^\d{1,2}$/.test(normalized)) {
      normalized = `${normalized.padStart(2, '0')}:00`;
    } else if (/^\d{1,2}:\d{1,2}$/.test(normalized)) {
      const [h, m] = normalized.split(':');
      normalized = `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
    }
    if (/^([01]\d|2[0-3]):([0-5]\d)$/.test(normalized)) {
      onSelect(normalized);
      setCustomTime('');
      onClose();
    }
  };

  const handleOpen = () => {
    setCustomTime(selectedValue || '');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onShow={handleOpen}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.container, { backgroundColor: colors.surface }]}>
              <Text style={[styles.title, { color: colors.text, borderBottomColor: colors.border }]}>{title}</Text>
              <ScrollView style={styles.scroll}>
                {options.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.option, { borderBottomColor: colors.border }, selectedValue === option.value && { backgroundColor: colors.accent }]}
                    onPress={() => { onSelect(option.value); onClose(); }}
                  >
                    <Text style={[styles.optionText, { color: selectedValue === option.value ? '#fff' : colors.text }]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {mode === 'time' && (
                <View style={[styles.customTimeRow, { borderTopColor: colors.border }]}>
                  <Text style={[styles.customTimeLabel, { color: colors.textSecondary }]}>Eller skriv inn:</Text>
                  <TextInput
                    style={[styles.customTimeInput, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
                    value={customTime}
                    onChangeText={setCustomTime}
                    placeholder="f.eks. 10:35"
                    placeholderTextColor={colors.textDisabled}
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                    onSubmitEditing={handleCustomTimeSubmit}
                  />
                  <TouchableOpacity
                    style={[styles.customTimeButton, { backgroundColor: colors.accent }]}
                    onPress={handleCustomTimeSubmit}
                  >
                    <Text style={styles.customTimeButtonText}>✓</Text>
                  </TouchableOpacity>
                </View>
              )}
              <TouchableOpacity style={[styles.closeButton, { borderTopColor: colors.border }]} onPress={onClose}>
                <Text style={[styles.closeText, { color: colors.accent }]}>Lukk</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  scroll: {
    maxHeight: 340,
  },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  optionText: {
    fontSize: 16,
  },
  customTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    borderTopWidth: 1,
    gap: 8,
  },
  customTimeLabel: {
    fontSize: 13,
    flexShrink: 0,
  },
  customTimeInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  customTimeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customTimeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
  },
  closeText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
