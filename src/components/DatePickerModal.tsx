import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, TouchableWithoutFeedback, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import i18n from '../i18n';
import { getLocale } from '../constants/languages';

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
  accentColor?: string;
}

function generateDateOptions(count: number, offset: number): Option[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + offset + i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const label = d.toLocaleDateString(getLocale(i18n.language), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
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

const ITEM_HEIGHT = 44;

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
  accentColor,
}) => {
  const { colors } = useTheme();
  const resolvedAccent = accentColor || colors.accent;
  const [dateInput, setDateInput] = useState('');
  const [customTime, setCustomTime] = useState('');
  const [manualDate, setManualDate] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const options = useMemo(() => {
    if (customOptions) return customOptions;
    if (mode === 'date') return generateDateOptions(dateCount, dateOffset);
    if (mode === 'time') return generateTimeOptions();
    return [];
  }, [customOptions, mode, dateCount, dateOffset]);

  const scrollToIndex = useCallback((index: number) => {
    if (scrollRef.current && index >= 0) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: true });
      }, 100);
    }
  }, []);

  const findDateIndex = useCallback((input: string): number => {
    const trimmed = input.trim();
    if (!trimmed) return -1;
    return options.findIndex(opt => opt.value === trimmed);
  }, [options]);

  const handleInputChange = useCallback((text: string) => {
    setDateInput(text);
    const trimmed = text.trim();
    if (!trimmed) return;

    let targetDate = '';
    if (/^\d{4}$/.test(trimmed)) {
      targetDate = `${trimmed}-01-01`;
    } else if (/^\d{4}-\d{1,2}$/.test(trimmed)) {
      const [y, m] = trimmed.split('-');
      targetDate = `${y}-${m.padStart(2, '0')}-01`;
    } else if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split('-');
      targetDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    if (targetDate) {
      const idx = options.findIndex(opt => opt.value === targetDate);
      if (idx >= 0) {
        scrollToIndex(idx);
      } else {
        const year = parseInt(trimmed.substring(0, 4), 10);
        if (!isNaN(year)) {
          const yearStr = String(year);
          const idxNear = options.findIndex(opt => opt.value.startsWith(yearStr));
          if (idxNear >= 0) scrollToIndex(idxNear);
        }
      }
    }
  }, [options, scrollToIndex]);

  const handleDateInputSubmit = useCallback(() => {
    const trimmed = dateInput.trim();
    let targetDate = '';
    if (/^\d{4}$/.test(trimmed)) {
      targetDate = `${trimmed}-01-01`;
    } else if (/^\d{4}-\d{1,2}$/.test(trimmed)) {
      const [y, m] = trimmed.split('-');
      targetDate = `${y}-${m.padStart(2, '0')}-01`;
    } else if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split('-');
      targetDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    if (targetDate && /^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      onSelect(targetDate);
      onClose();
    }
  }, [dateInput, onSelect, onClose]);

  const handleOpen = useCallback(() => {
    setManualDate('');
    if (mode === 'time') {
      setCustomTime(selectedValue || '');
      return;
    }
    setDateInput('');
    if (selectedValue) {
      const idx = options.findIndex(opt => opt.value === selectedValue);
      if (idx >= 0) scrollToIndex(idx);
    } else {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const idx = options.findIndex(opt => opt.value === todayStr);
      if (idx >= 0) scrollToIndex(idx);
    }
  }, [selectedValue, options, scrollToIndex, mode]);

  return (
    <Modal visible={visible} transparent animationType="slide" onShow={handleOpen}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.container, { backgroundColor: colors.surface }]}>
              <Text style={[styles.title, { color: colors.text, borderBottomColor: colors.border }]}>{title}</Text>
              {mode === 'date' && (
                <View style={[styles.dateInputRow, { borderBottomColor: colors.border }]}>
                  <TextInput
                    style={[styles.dateInput, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
                    value={dateInput}
                    onChangeText={handleInputChange}
                    placeholder="Skriv år eller dato (f.eks. 2025 eller 2025-04-15)"
                    placeholderTextColor={colors.textDisabled}
                    keyboardType="numbers-and-punctuation"
                    maxLength={10}
                    returnKeyType="search"
                    onSubmitEditing={handleDateInputSubmit}
                  />
                </View>
              )}
              <ScrollView ref={scrollRef} style={styles.scroll}>
                {options.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.option, { borderBottomColor: colors.border }, selectedValue === option.value && { backgroundColor: resolvedAccent }]}
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
                    onSubmitEditing={() => {
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
                    }}
                  />
                  <TouchableOpacity
                    style={[styles.customTimeButton, { backgroundColor: resolvedAccent }]}
                    onPress={() => {
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
                    }}
                  >
                    <Text style={styles.customTimeButtonText}>✓</Text>
                  </TouchableOpacity>
                </View>
              )}
              {mode === 'date' && (
                <View style={[styles.customTimeRow, { borderTopColor: colors.border }]}>
                  <Text style={[styles.customTimeLabel, { color: colors.textSecondary }]}>Eller skriv inn:</Text>
                  <TextInput
                    style={[styles.customTimeInput, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
                    value={manualDate}
                    onChangeText={setManualDate}
                    placeholder="f.eks. 2020-03-15"
                    placeholderTextColor={colors.textDisabled}
                    keyboardType="numbers-and-punctuation"
                    maxLength={10}
                    onSubmitEditing={() => {
                      if (!manualDate.trim()) return;
                      let normalized = manualDate.trim();
                      if (/^\d{4}$/.test(normalized)) {
                        normalized = `${normalized}-01-01`;
                      } else if (/^\d{4}-\d{1,2}$/.test(normalized)) {
                        const [y, m] = normalized.split('-');
                        normalized = `${y}-${m.padStart(2, '0')}-01`;
                      } else if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(normalized)) {
                        const [y, m, d] = normalized.split('-');
                        normalized = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                      }
                      if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
                        onSelect(normalized);
                        setManualDate('');
                        onClose();
                      }
                    }}
                  />
                  <TouchableOpacity
                    style={[styles.customTimeButton, { backgroundColor: resolvedAccent }]}
                    onPress={() => {
                      if (!manualDate.trim()) return;
                      let normalized = manualDate.trim();
                      if (/^\d{4}$/.test(normalized)) {
                        normalized = `${normalized}-01-01`;
                      } else if (/^\d{4}-\d{1,2}$/.test(normalized)) {
                        const [y, m] = normalized.split('-');
                        normalized = `${y}-${m.padStart(2, '0')}-01`;
                      } else if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(normalized)) {
                        const [y, m, d] = normalized.split('-');
                        normalized = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                      }
                      if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
                        onSelect(normalized);
                        setManualDate('');
                        onClose();
                      }
                    }}
                  >
                    <Text style={styles.customTimeButtonText}>✓</Text>
                  </TouchableOpacity>
                </View>
              )}
              <TouchableOpacity style={[styles.closeButton, { borderTopColor: colors.border }]} onPress={onClose}>
                <Text style={[styles.closeText, { color: resolvedAccent }]}>Lukk</Text>
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
  dateInputRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  dateInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  scroll: {
    maxHeight: 300,
  },
  option: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
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
