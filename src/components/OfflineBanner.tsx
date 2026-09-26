import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useNetworkStatus } from '../platform/NetworkStatus';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';

export const OfflineBanner: React.FC = () => {
  const isConnected = useNetworkStatus();
  const [animValue] = useState(new Animated.Value(0));
  const { colors } = useTheme();
  const { t } = useTranslation();

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: isConnected ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isConnected]);

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
      <Text style={styles.text}>{t('offlineBanner.noConnection')}</Text>
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
