import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, auth } from '../services/firebase';
import { useTheme } from '../theme/ThemeContext';
import { getErrorMessage } from '../utils/validation';
import { useTranslation } from 'react-i18next';
import { SchoolActivityDocument } from '../types';

interface DocumentUploadProps {
  storagePath: string;
  onUploaded: (doc: SchoolActivityDocument) => void;
  accentColor?: string;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = React.memo(({ storagePath, onUploaded, accentColor }) => {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const { colors } = useTheme();
  const btnColor = accentColor || colors.accent;

  const handlePickFile = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.gif,.webp';
    input.multiple = true;
    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const files = target.files;
      if (!files || files.length === 0) return;

      setUploading(true);
      try {
        const { webUploadFile } = await import('../services/webStorage');
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const fileName = file.name || `document_${Date.now()}_${i}`;
          const path = `${storagePath}/${fileName}`;
          const downloadUrl = await webUploadFile(path, file);
          const isImage = file.type.startsWith('image/');
          onUploaded({ url: downloadUrl, fileName, type: isImage ? 'image' : 'document' });
        }
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
        <ActivityIndicator color={btnColor} />
      ) : (
        <Text style={[styles.uploadText, { color: colors.textSecondary }]}>📎 {t('documents.chooseFile')}</Text>
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
