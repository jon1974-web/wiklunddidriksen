import React from 'react';
import { View, Text, TouchableOpacity, Image, Modal, TouchableWithoutFeedback, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface InfoModalProps {
  visible: boolean;
  title: string;
  message?: string;
  onConfirm?: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = React.memo(({
  visible, title, message, onConfirm,
}) => {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableWithoutFeedback onPress={onConfirm}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.container, { backgroundColor: colors.surface }]}>
              <Image source={require('../../assets/icon.png')} style={styles.logo} />
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>{title}</Text>
              {message ? <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text> : null}

              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.accent }]}
                onPress={onConfirm}
              >
                <Text style={[styles.buttonText, { color: '#fff' }]}>OK</Text>
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
  message: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
