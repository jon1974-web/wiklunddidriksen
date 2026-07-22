import React from 'react';
import { View, Text, TouchableOpacity, Image, Linking, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { getStaticMapUrl, getGoogleMapsUrl } from '../utils/maps';

interface AddressItemCardProps {
  name: string;
  address?: string;
  detail?: string;
  note?: string;
  onPress: () => void;
  onLongPress?: () => void;
}

export const AddressItemCard: React.FC<AddressItemCardProps> = React.memo(({
  name, address, detail, note, onPress, onLongPress,
}) => {
  const { colors } = useTheme();
  const mapUrl = address ? getStaticMapUrl(address) : null;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surfaceVariant }]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <View style={styles.row}>
        <View style={styles.content}>
          <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
          {address && <Text style={[styles.detail, { color: colors.textSecondary }]}>{address}</Text>}
          {detail && <Text style={[styles.detail, { color: colors.textSecondary }]}>{detail}</Text>}
          {note && <Text style={[styles.note, { color: colors.textSecondary }]}>{note}</Text>}
        </View>
        {mapUrl && (
          <TouchableOpacity
            style={styles.mapContainer}
            onPress={() => Linking.openURL(getGoogleMapsUrl(address!))}
          >
            <Image source={{ uri: mapUrl }} style={styles.mapImage} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  detail: {
    fontSize: 14,
    marginTop: 2,
  },
  note: {
    fontSize: 13,
    marginTop: 4,
    fontStyle: 'italic',
  },
  mapContainer: {
    marginLeft: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  mapImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
});
