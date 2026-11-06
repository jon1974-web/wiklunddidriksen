import React from 'react';
import { View, Text, TouchableOpacity, Image, Modal, TouchableWithoutFeedback, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';

interface ActionModalProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onCancel: () => void;
  accentColor?: string;
  editColor?: string;
  cancelText?: string;
  /** Label for the onDelete button. Defaults to the delete label. Use for non-delete confirmations (e.g. log out). */
  confirmText?: string;
  /** Background for the onDelete button. Defaults to red (danger). */
  confirmColor?: string;
  /** Optional copy action (message long-press menu). */
  onCopy?: () => void;
  /** Optional custom label for the onEdit button (defaults to the translate "Rediger"). */
  editText?: string;
  /** Extra labelled actions rendered between edit and delete (message menus). */
  extraActions?: { label: string; emoji?: string; onPress: () => void }[];
}

export const ActionModal: React.FC<ActionModalProps> = React.memo(({
  visible, title, subtitle, onEdit, onDelete, onCancel, accentColor, editColor, cancelText, confirmText, confirmColor, onCopy, editText, extraActions,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const resolvedAccent = accentColor || colors.accent;
  const resolvedEditColor = editColor || resolvedAccent;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.container, { backgroundColor: colors.surface }]}>
              <Image source={require('../../assets/icon.png')} style={styles.logo} />
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>{title}</Text>
              {subtitle ? <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text> : null}

              {onCopy && (
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: resolvedAccent }]}
                  onPress={() => { onCopy(); onCancel(); }}
                >
                  <Text style={[styles.buttonText, { color: '#fff' }]}>📋 {t('chat.copy')}</Text>
                </TouchableOpacity>
              )}

              {onEdit && (
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: resolvedEditColor }]}
                  onPress={() => { onEdit(); onCancel(); }}
                >
                  <Text style={[styles.buttonText, { color: '#fff' }]}>✎ {editText || t('actionModal.edit')}</Text>
                </TouchableOpacity>
              )}

              {(extraActions || []).map((action, index) => (
                <TouchableOpacity
                  key={`${action.label}_${index}`}
                  style={[styles.button, { backgroundColor: colors.inputBackground }]}
                  onPress={() => { action.onPress(); onCancel(); }}
                >
                  <Text style={[styles.buttonText, { color: resolvedAccent }]}>
                    {action.emoji ? `${action.emoji} ` : ''}{action.label}
                  </Text>
                </TouchableOpacity>
              ))}

              {onDelete && (
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: confirmColor || '#E53935' }]}
                  onPress={() => { onDelete(); onCancel(); }}
                >
                  <Text style={[styles.buttonText, { color: '#fff' }]}>{confirmText ? confirmText : `🗑️ ${t('actionModal.delete')}`}</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.inputBackground }]}
                onPress={onCancel}
              >
                <Text style={[styles.buttonText, { color: colors.textSecondary }]}>{cancelText || t('actionModal.cancel')}</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 14,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
