import React, { useState, useMemo, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Modal, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface SearchableDropdownProps {
  options: { key: string; label: string; color: string }[];
  value: string;
  onSelect: (key: string) => void;
  placeholder?: string;
}

export const SearchableDropdown: React.FC<SearchableDropdownProps> = ({ options, value, onSelect, placeholder = 'Velg...' }) => {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const searchRef = useRef<TextInput>(null);

  const selected = options.find(o => o.key === value);
  const isCustom = value && !selected;

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(q));
  }, [options, search]);

  return (
    <>
      <TouchableOpacity
        style={[styles.trigger, { backgroundColor: colors.inputBackground, borderColor: selected ? selected.color : isCustom ? '#999' : colors.border }]}
        onPress={() => { setSearch(''); setShowCustom(false); setCustomValue(''); setVisible(true); }}
      >
        {selected ? (
          <View style={[styles.selectedBadge, { backgroundColor: selected.color }]}>
            <Text style={styles.selectedText}>{selected.label}</Text>
          </View>
        ) : isCustom ? (
          <View style={[styles.selectedBadge, { backgroundColor: '#999' }]}>
            <Text style={styles.selectedText}>{value}</Text>
          </View>
        ) : (
          <Text style={[styles.placeholder, { color: colors.textDisabled }]}>{placeholder}</Text>
        )}
        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>▼</Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setVisible(false)}>
            <TouchableOpacity activeOpacity={1} style={[styles.dropdown, { backgroundColor: colors.surface }]}>
              <TextInput
                ref={searchRef}
                style={[styles.searchInput, { backgroundColor: colors.inputBackground, color: colors.text }]}
                value={search}
                onChangeText={setSearch}
                placeholder="Søk eller skriv ny rolle..."
                placeholderTextColor={colors.textDisabled}
              />
              <FlatList
                data={filtered}
                keyExtractor={(item) => item.key}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.option, value === item.key && { backgroundColor: item.color + '15' }]}
                    onPress={() => { onSelect(item.key); setVisible(false); }}
                  >
                    <View style={[styles.optionDot, { backgroundColor: item.color }]} />
                    <Text style={[styles.optionText, { color: colors.text }]}>{item.label}</Text>
                    {value === item.key && <Text style={{ color: item.color, fontWeight: '700' }}>✓</Text>}
                  </TouchableOpacity>
                )}
                ListFooterComponent={
                  search.trim() && !options.some(o => o.label.toLowerCase() === search.toLowerCase()) ? (
                    <TouchableOpacity
                      style={[styles.option, { borderBottomWidth: 0 }]}
                      onPress={() => {
                        onSelect(search.trim());
                        setVisible(false);
                      }}
                    >
                      <View style={[styles.optionDot, { backgroundColor: colors.accent }]} />
                      <Text style={[styles.optionText, { color: colors.accent, fontWeight: '600' }]}>+ Legg til "{search}"</Text>
                    </TouchableOpacity>
                  ) : null
                }
                ListEmptyComponent={<Text style={[styles.empty, { color: colors.textSecondary }]}>Ingen treff</Text>}
              />
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    minHeight: 44,
  },
  selectedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  selectedText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  placeholder: {
    fontSize: 14,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  dropdown: {
    borderRadius: 12,
    maxHeight: '60%',
    overflow: 'hidden',
  },
  searchInput: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    fontSize: 14,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f0f0f0',
  },
  optionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  optionText: {
    flex: 1,
    fontSize: 14,
  },
  empty: {
    padding: 16,
    textAlign: 'center',
    fontSize: 14,
  },
});
