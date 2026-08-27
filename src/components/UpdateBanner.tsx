import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export const UpdateBanner: React.FC = () => {
  const [show, setShow] = useState(false);
  const { colors } = useTheme();

  useEffect(() => {
    const checkForUpdate = async () => {
      try {
        const res = await fetch('/version.json?' + Date.now());
        const data = await res.json();
        const stored = localStorage.getItem('app_version');
        if (stored && stored !== data.version) {
          setShow(true);
        }
        localStorage.setItem('app_version', data.version);
      } catch {
        // Ignore fetch errors
      }
    };

    checkForUpdate();
    const interval = setInterval(checkForUpdate, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (!show) return null;

  return (
    <View style={[styles.banner, { backgroundColor: colors.accent }]}>
      <Text style={styles.text}>En ny versjon er tilgjengelig</Text>
      <TouchableOpacity style={styles.button} onPress={() => window.location.reload()}>
        <Text style={styles.buttonText}>Oppdater</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  text: { color: '#fff', fontSize: 14, fontWeight: '600' },
  button: { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  buttonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
