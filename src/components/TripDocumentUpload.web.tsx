import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../services/firebase';
import { useTheme } from '../theme/ThemeContext';
import { getErrorMessage } from '../utils/validation';

interface TripDocumentUploadProps {
  tripId: string;
  onUploaded: (url: string, fileName: string) => void;
}

export const TripDocumentUpload: React.FC<TripDocumentUploadProps> = React.memo(({ tripId, onUploaded }) => {
  const [uploading, setUploading] = useState(false);
  const { colors } = useTheme();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handlePickFile = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.gif,.webp';
    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;

      const fileName = file.name || `document_${Date.now()}`;
      const storageRef = ref(storage, `trips/${tripId}/documents/${fileName}`);

      setUploading(true);
      try {
        await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(storageRef);
        onUploaded(downloadUrl, fileName);
      } catch (error) {
        window.alert('Feil: ' + getErrorMessage(error));
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  return (
    <TouchableOpacity
      style={[styles.uploadButton, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
      onPress={handlePickFile}
      disabled={uploading}
    >
      {uploading ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <Text style={[styles.uploadText, { color: colors.textSecondary }]}>📎 Velg fil</Text>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  uploadButton: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  uploadText: {
    fontSize: 16,
  },
});
