import React from 'react';
import { View, StyleSheet } from 'react-native';

interface CartIconProps {
  size?: number;
  color?: string;
}

export const CartIcon: React.FC<CartIconProps> = React.memo(({ size = 20, color = '#FFFFFF' }) => {
  const s = size / 20;

  return (
    <View style={[styles.root, { width: size, height: size }]}>
      {/* Handle */}
      <View
        style={{
          position: 'absolute',
          top: 1 * s,
          left: 1 * s,
          width: 5 * s,
          height: Math.max(1, 1.5 * s),
          backgroundColor: color,
          borderTopLeftRadius: 1 * s,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: 1 * s,
          left: 1 * s,
          width: Math.max(1, 1.5 * s),
          height: 4 * s,
          backgroundColor: color,
        }}
      />
      {/* Cart body */}
      <View
        style={{
          position: 'absolute',
          top: 5 * s,
          left: 0,
          width: 18 * s,
          height: 9 * s,
          borderTopWidth: Math.max(1, 2 * s),
          borderLeftWidth: Math.max(1, 2 * s),
          borderRightWidth: Math.max(1, 2 * s),
          borderBottomWidth: Math.max(1, 2 * s),
          borderColor: color,
          borderTopLeftRadius: 2 * s,
          borderTopRightRadius: 2 * s,
        }}
      />
      {/* Wheel 1 */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 4 * s,
          width: Math.max(2, 2.5 * s),
          height: Math.max(2, 2.5 * s),
          borderRadius: 100,
          backgroundColor: color,
        }}
      />
      {/* Wheel 2 */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 11 * s,
          width: Math.max(2, 2.5 * s),
          height: Math.max(2, 2.5 * s),
          borderRadius: 100,
          backgroundColor: color,
        }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    position: 'relative',
  },
});
