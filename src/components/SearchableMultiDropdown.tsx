import React, { useState, useMemo, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Modal, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface SearchableMultiDropdownProps {
  options: { key: string; label: string; color: string }[];
  value: string[];
  onChange: (keys: string[]) => void;
  placeholder?: string;
}

export const SearchableMultiDropdown: React.FC<SearchableMultiDropdownProps> = ({ options, value = [], onChange, placeholder = 'Velg roller...' }) => {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState('');

  const safeValue = Array.isArray(value) ? value : [];
  const selected = options.filter(o => safeValue.includes(o.key));
  const customItems = safeValue.filter(v => !options.some(o => o.key === v));

  const filtered = useMemo(() => {
    const base = search.trim()
      ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
      : options;
    return base;
  }, [options, search]);

  const toggle = (key: string) => {
    const next = safeValue.includes(key) ? safeValue.filter(k => k !== key) : [...safeValue, key];
    onChange(next);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.trigger, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
        onPress={() => { setSearch(''); setVisible(true); }}
      >
        {safeValue.length > 0 || customItems.length > 0 ? (
          <View style={styles.badgeRow}>
            {[...selected, ...customItems.map(k => ({ key: k, label: k, color: '#607D8B' }))].slice(0, 3).map((item) => (
              <View key={item.key} style={[styles.badge, { backgroundColor: item.color }]}>
                <Text style={styles.badgeText}>{item.label}</Text>
                <TouchableOpacity onPress={() => toggle(item.key)}><Text style={styles.badgeX}>×</Text></TouchableOpacity>
              </View>
            ))}
            {(safeValue.length) > 3 && (
              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>+{safeValue.length - 3}</Text>
            )}
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
                    style={[styles.option, safeValue.includes(item.key) && { backgroundColor: item.color + '15' }]}
                    onPress={() => toggle(item.key)}
                  >
                    <View style={[styles.optionDot, { backgroundColor: safeValue.includes(item.key) ? item.color : colors.border }]} />
                    <Text style={[styles.optionText, { color: colors.text }]}>{item.label}</Text>
                    {safeValue.includes(item.key) && <Text style={{ color: item.color, fontWeight: '700' }}>✓</Text>}
                  </TouchableOpacity>
                )}
                ListFooterComponent={
                  search.trim() && !options.some(o => o.label.toLowerCase() === search.toLowerCase()) ? (
                    <TouchableOpacity
                      style={[styles.option, { borderBottomWidth: 0 }]}
                      onPress={() => { toggle(search.trim()); setSearch(''); }}
                    >
                      <View style={[styles.optionDot, { backgroundColor: colors.accent }]} />
                      <Text style={[styles.optionText, { color: colors.accent, fontWeight: '600' }]}>+ Legg til "{search}"</Text>
                    </TouchableOpacity>
                  ) : null
                }
                ListEmptyComponent={<Text style={[styles.empty, { color: colors.textSecondary }]}>Ingen treff</Text>}
              />
              <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: colors.accent }]} onPress={() => setVisible(false)}>
                <Text style={styles.confirmText}>Ferdig ({safeValue.length})</Text>
              </TouchableOpacity>
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
    padding: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    minHeight: 44,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    flex: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  badgeX: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
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
  confirmBtn: {
    padding: 14,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  confirmText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
