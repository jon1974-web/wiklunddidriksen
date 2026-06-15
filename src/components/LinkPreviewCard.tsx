import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { TripLink } from '../types';
import { useTheme } from '../theme/ThemeContext';

interface LinkPreviewCardProps {
  link: TripLink;
  onPress: () => void;
  onLongPress: () => void;
}

export const LinkPreviewCard: React.FC<LinkPreviewCardProps> = React.memo(({ link, onPress, onLongPress }) => {
  const { colors } = useTheme();

  let domain = '';
  try {
    domain = new URL(link.url).hostname.replace('www.', '');
  } catch {
    domain = link.url;
  }

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface }]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <View style={styles.thumbnailContainer}>
        {link.previewImageUrl ? (
          <Image source={{ uri: link.previewImageUrl }} style={styles.thumbnail} resizeMode="cover" />
        ) : (
          <View style={[styles.thumbnailFallback, { backgroundColor: colors.inputBackground }]}>
            <Text style={styles.linkIcon}>🔗</Text>
          </View>
        )}
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {link.previewTitle || link.title}
        </Text>
        {link.previewDescription ? (
          <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
            {link.previewDescription}
          </Text>
        ) : null}
        <Text style={[styles.domain, { color: colors.accent }]} numberOfLines={1}>
          🔗 {domain}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 8,
  },
  thumbnailContainer: {
    width: 120,
    height: 80,
  },
  thumbnail: {
    width: 120,
    height: 80,
  },
  thumbnailFallback: {
    width: 120,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkIcon: {
    fontSize: 28,
  },
  content: {
    flex: 1,
    padding: 10,
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 4,
  },
  domain: {
    fontSize: 11,
    fontWeight: '500',
  },
});
