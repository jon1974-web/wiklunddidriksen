import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Modal } from 'react-native';
import { ChatMessage, MessageReaction } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { LOCALE } from '../constants/limits';

interface MessageBubbleProps {
  message: ChatMessage;
  isOwnMessage: boolean;
  currentUserId?: string;
  onReaction?: (messageId: string, type: MessageReaction['type']) => void;
  liveAvatarUrl?: string;
}

const REACTIONS = [
  { type: 'like' as const, emoji: '👍' },
  { type: 'smile' as const, emoji: '😊' },
  { type: 'heart' as const, emoji: '❤️' },
];

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .filter(Boolean)
    .slice(0, 3)
    .join('')
    .toUpperCase();
};

export const MessageBubble: React.FC<MessageBubbleProps> = React.memo(({ message, isOwnMessage, currentUserId, onReaction, liveAvatarUrl }) => {
  const { colors } = useTheme();
  const [showFullImage, setShowFullImage] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const avatarUrl = liveAvatarUrl || message.senderAvatarUrl;

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' });
  };

  const reactionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    message.reactions?.forEach((r) => {
      counts[r.type] = (counts[r.type] || 0) + 1;
    });
    return counts;
  }, [message.reactions]);

  const userReactions = useMemo(() => {
    if (!currentUserId) return new Set<string>();
    return new Set(
      message.reactions?.filter((r) => r.userId === currentUserId).map((r) => r.type) || []
    );
  }, [message.reactions, currentUserId]);

  const handleReactionPress = (type: MessageReaction['type']) => {
    onReaction?.(message.id, type);
    setShowReactionPicker(false);
  };

  return (
    <>
      <View style={[styles.container, isOwnMessage ? styles.ownContainer : styles.otherContainer]}>
        <View style={styles.senderRow}>
          {avatarUrl && avatarUrl.length > 0 && !avatarFailed ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} onError={() => setAvatarFailed(true)} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.accent + '40' }]}>
              <Text style={[styles.avatarInitial, { color: colors.accent }]}>
                {getInitials(message.senderName)}
              </Text>
            </View>
          )}
          <Text style={[styles.senderName, { color: colors.textSecondary }]}>{message.senderName}</Text>
        </View>
        <View style={styles.bubbleWrapper}>
          <View style={[styles.bubble, isOwnMessage ? { backgroundColor: colors.chatBubbleOwn } : { backgroundColor: colors.chatBubbleOther }]}>
            {message.imageUrl && (
              <TouchableOpacity onPress={() => setShowFullImage(true)}>
                <Image
                  source={{ uri: message.imageUrl }}
                  style={styles.image}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            )}
            {message.text && message.text.length > 0 ? (
              <Text style={[styles.text, { color: isOwnMessage ? colors.chatTextOwn : colors.chatTextOther }]}>
                {message.text}
              </Text>
            ) : null}
          </View>
          {(reactionCounts.like || reactionCounts.smile || reactionCounts.heart) ? (
            <View style={[styles.reactionsOverlay, isOwnMessage ? styles.reactionsOverlayOwn : styles.reactionsOverlayOther]}>
              {REACTIONS.map(({ type, emoji }) => {
                const count = reactionCounts[type];
                const isActive = userReactions.has(type);
                if (!count) return null;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[styles.reactionBadge, { backgroundColor: isActive ? colors.accent + '30' : colors.surfaceVariant }]}
                    onPress={() => handleReactionPress(type)}
                  >
                    <Text style={styles.reactionEmoji}>{emoji}</Text>
                    {count > 1 && (
                      <Text style={[styles.reactionCount, { color: isActive ? colors.accent : colors.textSecondary }]}>
                        {count}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}
          <TouchableOpacity
            style={[styles.addReactionBtn, isOwnMessage ? styles.addReactionBtnOwn : styles.addReactionBtnOther]}
            onPress={() => setShowReactionPicker(!showReactionPicker)}
          >
            <Text style={[styles.addReactionText, { color: colors.textDisabled }]}>+</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.timestamp, { color: colors.textDisabled }, isOwnMessage && styles.ownTimestamp]}>
          {formatTimestamp(message.timestamp)}
        </Text>
      </View>

      {showReactionPicker && (
        <View style={[styles.reactionPicker, isOwnMessage ? styles.reactionPickerOwn : styles.reactionPickerOther]}>
          {REACTIONS.map(({ type, emoji }) => (
            <TouchableOpacity
              key={type}
              style={[styles.reactionOption, userReactions.has(type) && { backgroundColor: colors.accent + '20' }]}
              onPress={() => handleReactionPress(type)}
            >
              <Text style={styles.reactionOptionEmoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Modal visible={showFullImage} transparent animationType="fade">
        <TouchableOpacity
          style={styles.fullImageOverlay}
          onPress={() => setShowFullImage(false)}
          activeOpacity={1}
        >
          <Image
            source={{ uri: message.imageUrl }}
            style={styles.fullImage}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </Modal>
    </>
  );
});

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    marginHorizontal: 12,
    maxWidth: '80%',
  },
  ownContainer: {
    alignSelf: 'flex-end',
  },
  otherContainer: {
    alignSelf: 'flex-start',
  },
  senderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    marginLeft: 4,
    gap: 6,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  senderName: {
    fontSize: 12,
  },
  bubble: {
    padding: 12,
    borderRadius: 16,
  },
  bubbleWrapper: {
    position: 'relative',
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  reactionsOverlay: {
    position: 'absolute',
    top: -10,
    flexDirection: 'row',
    gap: 4,
  },
  reactionsOverlayOther: {
    right: -4,
  },
  reactionsOverlayOwn: {
    left: -4,
  },
  image: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: 4,
  },
  text: {
    fontSize: 16,
  },
  addReactionBtn: {
    position: 'absolute',
    top: -10,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0,
  },
  addReactionBtnOther: {
    right: -28,
  },
  addReactionBtnOwn: {
    left: -28,
  },
  addReactionText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 2,
  },
  reactionEmoji: {
    fontSize: 12,
  },
  reactionCount: {
    fontSize: 11,
    fontWeight: '600',
  },
  reactionPicker: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 4,
    marginHorizontal: 16,
    marginBottom: 4,
    alignSelf: 'flex-start',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  reactionPickerOwn: {
    alignSelf: 'flex-end',
  },
  reactionPickerOther: {
    alignSelf: 'flex-start',
  },
  reactionOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionOptionEmoji: {
    fontSize: 20,
  },
  timestamp: {
    fontSize: 10,
    marginTop: 2,
  },
  ownTimestamp: {
    textAlign: 'right',
  },
  fullImageOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '90%',
    height: '80%',
  },
});
