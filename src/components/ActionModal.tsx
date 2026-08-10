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
}

export const ActionModal: React.FC<ActionModalProps> = React.memo(({
  visible, title, subtitle, onEdit, onDelete, onCancel, accentColor,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const resolvedAccent = accentColor || colors.accent;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.container, { backgroundColor: colors.surface }]}>
              <Image source={require('../../assets/icon.png')} style={styles.logo} />
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>{title}</Text>
              {subtitle ? <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text> : null}

              {onEdit && (
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: resolvedAccent }]}
                  onPress={() => { onEdit(); onCancel(); }}
                >
                  <Text style={[styles.buttonText, { color: '#fff' }]}>✎ {t('actionModal.edit')}</Text>
                </TouchableOpacity>
              )}

              {onDelete && (
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: '#E53935' }]}
                  onPress={() => { onDelete(); onCancel(); }}
                >
                  <Text style={[styles.buttonText, { color: '#fff' }]}>🗑️ {t('actionModal.delete')}</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.inputBackground }]}
                onPress={onCancel}
              >
                <Text style={[styles.buttonText, { color: colors.textSecondary }]}>{t('actionModal.cancel')}</Text>
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
