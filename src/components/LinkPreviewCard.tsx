import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { TripLink } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { getFaviconUrl, extractDomain } from '../utils/favicon';

interface LinkPreviewCardProps {
  link: TripLink;
  onPress: () => void;
  onLongPress?: () => void;
}

export const LinkPreviewCard: React.FC<LinkPreviewCardProps> = React.memo(({ link, onPress, onLongPress }) => {
  const { colors } = useTheme();

  const domain = extractDomain(link.url);
  let hostname = '';
  try {
    hostname = new URL(link.url).hostname;
  } catch {
    hostname = link.url;
  }

  const faviconUrl = getFaviconUrl(link.url);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface }]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <View style={styles.thumbnailContainer}>
        {faviconUrl ? (
          <Image source={{ uri: faviconUrl }} style={styles.favicon} resizeMode="contain" />
        ) : (
          <View style={[styles.faviconFallback, { backgroundColor: colors.inputBackground }]}>
            <Text style={styles.linkIcon}>🔗</Text>
          </View>
        )}
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {link.title}
        </Text>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  favicon: {
    width: 48,
    height: 48,
  },
  faviconFallback: {
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
  domain: {
    fontSize: 11,
    fontWeight: '500',
  },
});
