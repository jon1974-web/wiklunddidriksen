import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useTheme } from '../theme/ThemeContext';

export const OfflineBanner: React.FC = () => {
  const [isConnected, setIsConnected] = useState(true);
  const [animValue] = useState(new Animated.Value(0));
  const { colors } = useTheme();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const connected = state.isConnected ?? true;
      setIsConnected(connected);

      Animated.timing(animValue, {
        toValue: connected ? 0 : 1,
        duration: 300,
        useNativeDriver: false,
      }).start();
    });

    return () => unsubscribe();
  }, []);

  if (isConnected) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.danger,
          opacity: animValue,
        },
      ]}
    >
      <Text style={styles.text}>Ingen internettforbindelse</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
