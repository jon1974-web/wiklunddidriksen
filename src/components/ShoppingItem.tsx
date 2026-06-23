import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ShoppingItem as ShoppingItemType } from '../types';
import { useTheme } from '../theme/ThemeContext';

interface ShoppingItemProps {
  item: ShoppingItemType;
  onToggle: () => void;
  onDelete?: () => void;
  onRename?: () => void;
}

export const ShoppingItem: React.FC<ShoppingItemProps> = React.memo(({ item, onToggle, onDelete, onRename }) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <TouchableOpacity style={styles.toggleArea} onPress={onToggle}>
        <View style={[styles.checkbox, { borderColor: colors.accent }, item.checked && { backgroundColor: colors.accent }]}>
          {item.checked && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={[styles.text, { color: item.checked ? colors.textDisabled : colors.text }, item.checked && styles.textChecked]}>
          {item.name}
        </Text>
      </TouchableOpacity>
      <View style={styles.actions}>
        {onRename && (
          <TouchableOpacity style={styles.actionButton} onPress={onRename}>
            <Text style={[styles.actionText, { color: colors.textSecondary }]}>✎</Text>
          </TouchableOpacity>
        )}
        {onDelete && (
          <TouchableOpacity style={styles.actionButton} onPress={onDelete}>
            <Text style={[styles.actionText, { color: colors.danger }]}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  toggleArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  text: {
    fontSize: 16,
  },
  textChecked: {
    textDecorationLine: 'line-through',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 12,
  },
  actionText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});
