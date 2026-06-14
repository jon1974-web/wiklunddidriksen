import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../services/firebase';
import { useTheme } from '../theme/ThemeContext';
import { uriToBlob } from '../utils/upload';
import { getErrorMessage } from '../utils/validation';

interface TripDocumentUploadProps {
  tripId: string;
  onUploaded: (url: string, fileName: string) => void;
}

export const TripDocumentUpload: React.FC<TripDocumentUploadProps> = React.memo(({ tripId, onUploaded }) => {
  const [uploading, setUploading] = useState(false);
  const { colors } = useTheme();

  const handlePickFile = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const fileName = asset.fileName || `document_${Date.now()}`;
      const storageRef = ref(storage, `trips/${tripId}/documents/${fileName}`);

      setUploading(true);

      const blob = await uriToBlob(asset.uri);

      await uploadBytes(storageRef, blob);
      const downloadUrl = await getDownloadURL(storageRef);
      onUploaded(downloadUrl, fileName);
    } catch (error) {
      Alert.alert('Feil', getErrorMessage(error));
    } finally {
      setUploading(false);
    }
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
