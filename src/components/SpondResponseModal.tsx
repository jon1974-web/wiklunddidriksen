import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  TouchableWithoutFeedback,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { SpondMember } from '../types';

interface SpondResponseModalProps {
  visible: boolean;
  type: 'accept' | 'decline';
  members: SpondMember[];
  onSend: (memberIds: string[]) => Promise<void>;
  onClose: () => void;
}

export const SpondResponseModal: React.FC<SpondResponseModalProps> = ({
  visible,
  type,
  members,
  onSend,
  onClose,
}) => {
  const { colors } = useTheme();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return members;
    const q = search.toLowerCase();
    return members.filter(
      (m) =>
        m.firstName.toLowerCase().includes(q) ||
        m.lastName.toLowerCase().includes(q)
    );
  }, [members, search]);

  const allFilteredSelected = filtered.length > 0 && filtered.every((m) => selected.has(m.id));

  const toggleMember = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allFilteredSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((m) => next.delete(m.id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((m) => next.add(m.id));
        return next;
      });
    }
  };

  const handleSend = async () => {
    if (selected.size === 0) return;
    setSending(true);
    try {
      await onSend(Array.from(selected));
      setSelected(new Set());
      setSearch('');
      onClose();
    } finally {
      setSending(false);
    }
  };

  const isAccept = type === 'accept';
  const buttonColor = isAccept ? colors.accent : colors.danger;
  const title = isAccept ? 'Aksepter' : 'Avslå';
  const buttonText = isAccept ? 'Aksepter for valgte' : 'Avslå for valgte';

  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.container, { backgroundColor: colors.surface }]}>
              <Text style={[styles.title, { color: colors.text, borderBottomColor: colors.border }]}>
                {title} arrangement
              </Text>

              <View style={[styles.searchContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder="Søk medlemmer..."
                  placeholderTextColor={colors.textDisabled}
                  value={search}
                  onChangeText={setSearch}
                />
              </View>

              <TouchableOpacity
                style={[styles.selectAll, { borderBottomColor: colors.border }]}
                onPress={toggleAll}
              >
                <Text style={[styles.selectAllText, { color: colors.accent }]}>
                  {allFilteredSelected ? 'Fjern alle' : 'Velg alle'}
                </Text>
                <Text style={[styles.selectCount, { color: colors.textSecondary }]}>
                  {selected.size} valgt
                </Text>
              </TouchableOpacity>

              <FlatList
                data={filtered}
                keyExtractor={(item) => item.id}
                style={styles.list}
                renderItem={({ item }) => {
                  const isSelected = selected.has(item.id);
                  return (
                    <TouchableOpacity
                      style={[styles.memberRow, { borderBottomColor: colors.border }]}
                      onPress={() => toggleMember(item.id)}
                    >
                      <View style={[styles.checkbox, { borderColor: isSelected ? buttonColor : colors.textDisabled }, isSelected && { backgroundColor: buttonColor }]}>
                        {isSelected && <Text style={styles.checkmark}>✓</Text>}
                      </View>
                      <Text style={[styles.memberName, { color: colors.text }]}>
                        {item.firstName} {item.lastName}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />

              <View style={[styles.footer, { borderTopColor: colors.border }]}>
                <TouchableOpacity style={[styles.cancelButton, { borderColor: colors.border }]} onPress={onClose}>
                  <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Avbryt</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sendButton, { backgroundColor: buttonColor, opacity: selected.size === 0 || sending ? 0.5 : 1 }]}
                  onPress={handleSend}
                  disabled={selected.size === 0 || sending}
                >
                  {sending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.sendText}>{buttonText}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  searchContainer: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchInput: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
  },
  selectAll: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  selectAllText: {
    fontSize: 15,
    fontWeight: '500',
  },
  selectCount: {
    fontSize: 14,
  },
  list: {
    maxHeight: 350,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  memberName: {
    fontSize: 16,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
    borderTopWidth: 1,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
  },
  sendButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  sendText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
