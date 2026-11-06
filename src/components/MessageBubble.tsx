import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Modal, Pressable, ActivityIndicator, Linking } from 'react-native';
import { ChatMessage, MessageReaction, MessageReplyRef } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { LOCALE } from '../constants/limits';

interface MessageBubbleProps {
  message: ChatMessage;
  isOwnMessage: boolean;
  currentUserId?: string;
  onReaction?: (messageId: string, type: MessageReaction['type']) => void;
  liveAvatarUrl?: string;
  onRequestAction?: (message: ChatMessage) => void;
  /** Grouping: false hides the avatar + sender name (consecutive messages) */
  showHeader?: boolean;
  /** Newest timestamp read by any other member (read receipts for own messages) */
  maxOtherReadTs?: number;
}

const REACTIONS = [
  { type: 'like' as const, emoji: '👍' },
  { type: 'smile' as const, emoji: '😊' },
  { type: 'heart' as const, emoji: '❤️' },
];

const URL_PATTERN = /(https?:\/\/[^\s]+)/g;

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .filter(Boolean)
    .slice(0, 3)
    .join('')
    .toUpperCase();
};

// Renders text with plain URLs turned into clickable links
const RichLinkText = ({ text, color, style }: { text: string; color: string; style?: object }) => {
  const parts = text.split(URL_PATTERN);
  return (
    <Text style={[style, { color }]}>
      {parts.map((part, index) =>
        part.startsWith('http://') || part.startsWith('https://') ? (
          <Text
            key={`link-${index}`}
            style={{ textDecorationLine: 'underline', color }}
            onPress={() => Linking.openURL(part).catch(() => undefined)}
          >
            {part}
          </Text>
        ) : (
          <Text key={`txt-${index}`}>{part}</Text>
        )
      )}
    </Text>
  );
};

// Reply quote rendered above the bubble content
const ReplyQuote = ({ replyTo, accent }: { replyTo?: MessageReplyRef; accent: string }) => {
  if (!replyTo) return null;
  return (
    <View style={[styles.replyQuote, { borderLeftColor: accent }]}>
      <Text numberOfLines={1} style={[styles.replyQuoteName, { color: accent }]}>
        {replyTo.senderName}
      </Text>
      <Text numberOfLines={2} style={styles.replyQuoteText}>
        {replyTo.hasImage && !replyTo.text ? '📷' : replyTo.text}
      </Text>
    </View>
  );
};

// Small inline audio player for voice messages
const VoicePlayer = ({ uri, duration }: { uri: string; duration?: number }) => {
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const soundRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync?.().catch?.(() => undefined);
      }
    };
  }, []);

  const togglePlay = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { Audio } = await import('expo-av');
      if (soundRef.current && playing) {
        await soundRef.current.stopAsync?.();
        await soundRef.current.unloadAsync?.();
        soundRef.current = null;
        setPlaying(false);
        setBusy(false);
        return;
      }
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true, progressUpdateIntervalMillis: 500 },
      );
      soundRef.current = sound;
      setPlaying(true);
      sound.setOnPlaybackStatusUpdate?.((status: any) => {
        if (status?.didJustFinish) {
          setPlaying(false);
          sound.unloadAsync?.().catch(() => undefined);
          soundRef.current = null;
        }
      });
    } catch (error) {
      console.error('Voice playback failed:', error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.voiceRow}>
      <TouchableOpacity
        onPress={togglePlay}
        disabled={busy}
        style={[styles.voicePlayBtn, { backgroundColor: colors.surfaceVariant }]}
        accessibilityLabel="Play voice message"
      >
        {busy && !playing ? (
          <ActivityIndicator size="small" color={colors.accent} />
        ) : (
          <Text style={{ fontSize: 16 }}>{playing ? '⏸' : '▶'}</Text>
        )}
      </TouchableOpacity>
      <Text style={{ fontSize: 13, fontWeight: '600' }}>
        🎙 {duration ? `${duration}s` : `~`}
      </Text>
    </View>
  );
};

export const MessageBubble: React.FC<MessageBubbleProps> = React.memo(({
  message, isOwnMessage, currentUserId, onReaction, liveAvatarUrl, onRequestAction, showHeader = true, maxOtherReadTs,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [showFullImage, setShowFullImage] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const avatarUrl = liveAvatarUrl || message.senderAvatarUrl;
  const readByOthers = !!isOwnMessage && maxOtherReadTs !== undefined && message.timestamp <= maxOtherReadTs;

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

  const isVoiceMessage = !!message.voiceUrl;

  return (
    <>
      <Pressable
        style={[styles.container, isOwnMessage ? styles.ownContainer : styles.otherContainer]}
        onLongPress={onRequestAction ? () => onRequestAction(message) : undefined}
        delayLongPress={350}
      >
        {!isOwnMessage && showHeader && (
          <View style={styles.avatarColumn}>
            {avatarUrl && avatarUrl.length > 0 && !avatarFailed ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} onError={() => setAvatarFailed(true)} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.accent + '40' }]}>
                <Text style={[styles.avatarInitial, { color: colors.accent }]}>
                  {getInitials(message.senderName)}
                </Text>
              </View>
            )}
          </View>
        )}
        <View style={[styles.bubbleWrapper, isOwnMessage && styles.bubbleWrapperOwn]}>
          <View style={[styles.bubble, isOwnMessage ? { backgroundColor: colors.chatBubbleOwn } : { backgroundColor: colors.chatBubbleOther }]}>
            {!isOwnMessage && showHeader && (
              <Text style={[styles.senderName, { color: colors.textSecondary }]}>{message.senderName}</Text>
            )}
            {!isOwnMessage && message.replyTo && (
              <ReplyQuote replyTo={message.replyTo} accent={colors.accent} />
            )}
            {isOwnMessage && message.replyTo && (
              <ReplyQuote replyTo={message.replyTo} accent={colors.surfaceVariant} />
            )}
            {message.imageUrl && (
              <TouchableOpacity onPress={() => setShowFullImage(true)}>
                <Image
                  source={{ uri: message.imageUrl }}
                  style={styles.image}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            )}
            {isVoiceMessage && (
              <View style={isOwnMessage ? styles.voiceOwn : styles.voiceOther}>
                <VoicePlayer uri={message.voiceUrl as string} duration={message.voiceDuration} />
              </View>
            )}
            {message.text && message.text.length > 0 && (
              <RichLinkText
                text={message.text}
                color={isOwnMessage ? colors.chatTextOwn : colors.chatTextOther}
                style={styles.text}
              />
            )}
            {!!message.translations?.[(i18n.language || 'nb').slice(0, 2)] && (
              <Text style={[styles.translatedText, { color: isOwnMessage ? colors.chatTextOwn : colors.chatTextOther }]}>
                🌐 {message.translations[(i18n.language || 'nb').slice(0, 2)]}
              </Text>
            )}
            <Text style={[styles.timestamp, { color: isOwnMessage ? colors.chatTextOwn : colors.textDisabled }, isOwnMessage && styles.timestampOwn]}>
              {formatTimestamp(message.timestamp)}
              {isOwnMessage ? (
                <Text style={[styles.tickText, { color: colors.chatTextOwn }]}>{readByOthers ? ' ✓✓' : ' ✓'}</Text>
              ) : null}
              {message.edited ? (
                <Text style={[styles.editedTag, { color: isOwnMessage ? colors.chatTextOwn : colors.textDisabled }]}>
                  {` · ${t('chat.edited')}`}
                </Text>
              ) : null}
            </Text>
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
      </Pressable>

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
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  otherContainer: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  avatarColumn: {
    marginRight: 6,
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
    marginBottom: 2,
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
  bubbleWrapperOwn: {
    alignSelf: 'flex-end',
  },
  replyQuote: {
    borderLeftWidth: 3,
    paddingLeft: 8,
    paddingVertical: 2,
    marginBottom: 6,
    borderRadius: 4,
  },
  replyQuoteName: {
    fontSize: 11,
    fontWeight: '700',
  },
  replyQuoteText: {
    fontSize: 13,
    opacity: 0.85,
  },
  voiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  voicePlayBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceOwn: {
    alignSelf: 'flex-end',
  },
  voiceOther: {
    alignSelf: 'flex-start',
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
    marginTop: 4,
    textAlign: 'right',
  },
  timestampOwn: {
    opacity: 0.75,
  },
  tickText: {
    fontSize: 10,
    fontWeight: '700',
  },
  editedTag: {
    fontSize: 9,
    fontStyle: 'italic',
  },
  translatedText: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 4,
    opacity: 0.9,
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
