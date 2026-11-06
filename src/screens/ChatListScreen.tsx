import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Image,
  ActivityIndicator,
  TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp, ParamListBase } from '@react-navigation/native';
import { ConversationListItem, UserProfile } from '../types';
import {
  listenToConversations,
  createGroupConversation,
  getOrCreateDmConversation,
  hasUnreadConversation,
  getMemberProfiles,
  leaveGroup,
  ensureFamilyConversation,
  getActiveTypingUids,
} from '../services/chatService';
import { getFamilyMembersWithRoles } from '../services/familyService';
import { useUserStore } from '../store/userStore';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { AppIcon } from '../components/AppIcon';
import { ActionModal } from '../components/ActionModal';
import { HelpCenter } from '../components/HelpCenter';
import { getErrorMessage } from '../utils/validation';
import { crossAlert } from '../utils/alert';
import { LOCALE } from '../constants/limits';

// Web-only style (removes the browser focus outline); not part of RN's TextStyle typings.
const WEB_NO_OUTLINE = { outlineStyle: 'none' } as unknown as TextStyle;
const GROUP_ICONS = ['👥', '🏖️', '🎂', '⚽', '🎉', '🏠', '🏫', '🚗', '❤️', '✈️'];

interface ChatRowData extends ConversationListItem {
  displayName: string;
  avatarUrl?: string;
  initials: string;
  icon?: string;
  unread: boolean;
  /** "Ole skriver…" when a convo member is actively typing */
  typingPreview?: string;
}

// --- Row component (memoized for list performance) ---

interface ChatRowProps {
  item: ChatRowData;
  timeText: string;
  onPress: (conversationId: string) => void;
  onLongPress: (conversationId: string) => void;
}

const ChatRow = React.memo(({ item, timeText, onPress, onLongPress }: ChatRowProps) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const pinned = item.type === 'family';
  const isGroup = !!item.icon && !pinned;

  const avatarBody = pinned ? (
    <View style={[styles.familyAvatar]}>
      <AppIcon name="chat" size={22} color="#fff" />
    </View>
  ) : isGroup ? (
    <Text style={{ fontSize: 20 }}>{item.icon}</Text>
  ) : item.avatarUrl ? (
    <Image source={{ uri: item.avatarUrl }} style={[styles.avatar, { backgroundColor: colors.accent + '40' }]} />
  ) : (
    <Text style={styles.avatarInitials}>{item.initials}</Text>
  );

  const previewText = item.typingPreview
    ? item.typingPreview
    : item.lastMessage
      ? item.lastMessage.hasImage && !item.lastMessage.text
        ? `📷 ${t('chat.photoMessage')}`
        : item.type !== 'dm' && item.lastMessage.senderName
          ? `${item.lastMessage.senderName}: ${item.lastMessage.text}`
          : item.lastMessage.text
      : t('chat.noMessages');

  return (
    <TouchableOpacity
      onPress={() => onPress(item.id)}
      onLongPress={() => onLongPress(item.id)}
      style={[
        styles.row,
        { backgroundColor: colors.background },
        pinned && { backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1, marginTop: 4 },
      ]}
      activeOpacity={0.6}
    >
      {pinned && <View style={[styles.pinFlag, { backgroundColor: colors.accent }]} />}
      <View
        style={[
          styles.avatar,
          { backgroundColor: colors.accent + '40' },
          pinned && { backgroundColor: colors.accent },
        ]}
      >
        {avatarBody}
      </View>
      <View style={styles.rowMain}>
        <View style={styles.rowTop}>
          <Text
            numberOfLines={1}
            style={[
              styles.rowName,
              { color: item.unread ? colors.text : colors.text },
              pinned && { color: colors.text },
            ]}
          >
            {item.displayName}
            {pinned && (
              <Text style={[styles.tag, { color: colors.accent, backgroundColor: colors.accent + '20' }]}>
                {` ${t('chat.familyTag')}`}
              </Text>
            )}
          </Text>
          <Text style={[styles.rowTime, { color: colors.textSecondary }]}>{timeText}</Text>
        </View>
        <View style={styles.rowPreview}>
          <Text
            numberOfLines={1}
            style={[styles.rowMsg, { color: item.unread ? colors.text : colors.textSecondary }, !item.lastMessage && { fontStyle: 'italic' }]}
          >
            {previewText}
          </Text>
          {item.unread && <View style={[styles.unreadDot, { backgroundColor: colors.accent }]} />}
        </View>
      </View>
    </TouchableOpacity>
  );
});

// --- Main screen ---

export const ChatListScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const user = useUserStore((state) => state.user);
  const familyId = useUserStore((state) => state.familyId);
  const familyName = useUserStore((state) => state.familyName);
  const { colors } = useTheme();

  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  const [members, setMembers] = useState<{ profile: UserProfile; role: string }[]>([]);
  const [filteredProfileIds, setFilteredProfileIds] = useState<string[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNewChat, setShowNewChat] = useState(false);
  const [sheetMode, setSheetMode] = useState<'dm' | 'group'>('dm');
  const [groupMode, setGroupMode] = useState<Record<string, boolean>>({});
  const [groupName, setGroupName] = useState('');
  const [groupIcon, setGroupIcon] = useState(GROUP_ICONS[0]);
  const [creating, setCreating] = useState(false);
  const [leaveTarget, setLeaveTarget] = useState<ConversationListItem | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Load family members (for new-chat picker)
  useEffect(() => {
    if (!familyId) return;
    (async () => {
      try {
        const list = await getFamilyMembersWithRoles(familyId);
        setMembers(list);
      } catch (error) {
        console.error('Failed to load family members:', error);
      }
    })();
  }, [familyId]);

  // Live conversation list
  useEffect(() => {
    if (!familyId || !user) return undefined;
    // Make sure the pinned family conversation exists (lazy creation)
    ensureFamilyConversation(familyId, user.uid);
    const unsubscribe = listenToConversations(familyId, user.uid, (convos) => {
      setConversations(convos);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [familyId, user?.uid]);

  // Resolve display info (names/avatars) for all member uids that appear
  useEffect(() => {
    if (conversations.length === 0 || !user) return;
    const missing = new Set<string>();
    conversations.forEach((c) => {
      (c.memberIds || []).forEach((uid) => {
        if (uid !== user.uid && !profiles[uid]) missing.add(uid);
      });
    });
    if (missing.size === 0) return;
    (async () => {
      try {
        const fetched = await getMemberProfiles([...missing]);
        setProfiles((prev) => ({ ...prev, ...fetched }));
      } catch (error) {
        console.error('Failed to load profiles:', error);
      }
    })();
  }, [conversations, user?.uid]);

  const formatTime = useCallback(
    (timestamp: number): string => {
      const date = new Date(timestamp);
      const now = new Date();
      const dayMs = 24 * 60 * 60 * 1000;
      const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      if (timestamp >= startToday) {
        return date.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' });
      }
      if (timestamp >= startToday - dayMs) return t('chat.yesterday');
      if (timestamp >= startToday - 6 * dayMs) {
        return date.toLocaleDateString(LOCALE, { weekday: 'short' });
      }
      return date.toLocaleDateString(LOCALE, { day: 'numeric', month: 'numeric' });
    },
    [t]
  );

  const rows = useMemo<ChatRowData[]>(() => {
    if (!user) return [];
    const search = searchText.trim().toLowerCase();
    return conversations
      .map((conv) => {
        let displayName = conv.title || '';
        let avatarUrl: string | undefined;
        let initials = '👤';
        let icon = conv.icon;
        if (conv.type === 'dm') {
          const otherUid = (conv.memberIds || []).find((id) => id !== user.uid);
          const other = otherUid ? profiles[otherUid] : undefined;
          displayName = other?.displayName || displayName || t('chat.noMembers');
          avatarUrl = other?.avatarUrl || undefined;
          initials = (displayName || '?').trim().slice(0, 2).toUpperCase();
        } else if (conv.type === 'family') {
          displayName = familyName || conv.title || t('chat.familyChat');
          initials = 'FH';
        }
        if (search && !displayName.toLowerCase().includes(search)) return null;
        // Typing indicator in the row preview
        const typingUids = getActiveTypingUids(conv.typing).filter((uid) => uid !== user.uid);
        const typeNames = Array.from(new Set(
          typingUids.map((uid) => (uid === user.uid ? '' : profiles[uid]?.displayName || uid.slice(0, 6)))
        ));
        const typingPreview = typeNames.length > 0 ? `${typeNames.join(', ')} ${t('chat.isTyping')}` : undefined;
        return {
          ...conv,
          displayName,
          avatarUrl,
          initials,
          unread: hasUnreadConversation(conv, user.uid),
          typingPreview,
        } as ChatRowData;
      })
      .filter((r): r is ChatRowData => r !== null);
  }, [conversations, profiles, user, searchText, familyName, t]);

  const sortedRows = useMemo(() => {
    const family = rows.filter((r) => r.type === 'family');
    const rest = rows.filter((r) => r.type !== 'family');
    return [...family, ...rest];
  }, [rows]);

  const handleOpen = useCallback(
    (conversationId: string) => {
      const conv = conversations.find((c) => c.id === conversationId);
      if (!conv) return;
      let title = conv.title || '';
      if (conv.type === 'family') title = familyName || t('chat.familyChat');
      if (conv.type === 'dm') {
        const otherUid = (conv.memberIds || []).find((id) => id !== user?.uid);
        title = (otherUid && profiles[otherUid]?.displayName) || title;
      }
      navigation.navigate('ChatThread', {
        conversationId,
        conversationType: conv.type,
        conversationTitle: title,
      });
    },
    [conversations, profiles, familyName, user?.uid, navigation, t]
  );

  const handleLongPress = useCallback(
    (conversationId: string) => {
      const conv = conversations.find((c) => c.id === conversationId);
      if (!conv || conv.type !== 'group') return; // DMs/family chat cannot be left
      setLeaveTarget(conv);
    },
    [conversations]
  );

  const handleLeaveGroup = useCallback(async () => {
    if (!leaveTarget || !user || leaving) return;
    setLeaving(true);
    try {
      await leaveGroup(leaveTarget.id, user.uid);
      setLeaveTarget(null);
    } catch (error) {
      crossAlert(t('common.error'), getErrorMessage(error));
    } finally {
      setLeaving(false);
    }
  }, [leaveTarget, user, leaving, t]);

  // --- New chat sheet helpers ---

  const toggleGroupMember = (uid: string) => setGroupMode((prev) => ({ ...prev, [uid]: !prev[uid] }));

  const openDmWith = async (otherUid: string) => {
    if (!familyId || !user) return;
    try {
      const conv = await getOrCreateDmConversation(familyId, user.uid, otherUid);
      setShowNewChat(false);
      navigation.navigate('ChatThread', {
        conversationId: conv.id,
        conversationType: 'dm',
        conversationTitle: profiles[otherUid]?.displayName || '',
      });
    } catch (error) {
      crossAlert(t('common.error'), getErrorMessage(error));
    }
  };

  const handleCreateGroup = async () => {
    if (!familyId || !user || creating) return;
    const name = groupName.trim();
    if (!name) return;
    const selectedUids = Object.keys(groupMode).filter((uid) => groupMode[uid]);
    setCreating(true);
    try {
      const conv = await createGroupConversation(familyId, name, groupIcon, user.uid, 'group', selectedUids);
      setGroupName('');
      setGroupMode({});
      setGroupIcon(GROUP_ICONS[0]);
      setShowNewChat(false);
      navigation.navigate('ChatThread', {
        conversationId: conv.id,
        conversationType: 'group',
        conversationTitle: name,
      });
    } catch (error) {
      crossAlert(t('common.error'), getErrorMessage(error));
    } finally {
      setCreating(false);
    }
  };

  const renderRow = useCallback(
    ({ item }: { item: ChatRowData }) => (
      <ChatRow item={item} timeText={item.lastMessage ? formatTime(item.lastMessage.timestamp) : ''} onPress={handleOpen} onLongPress={handleLongPress} />
    ),
    [formatTime, handleOpen, handleLongPress]
  );

  const family = sortedRows.find((r) => r.type === 'family');
  const dmRows = sortedRows.filter((r) => r.type === 'dm');
  const groupRows = sortedRows.filter((r) => r.type === 'group');

  const data = useMemo(
    () => [...(family ? [family] : []), ...(dmRows.length ? ['dm-header' as const, ...dmRows] : []), ...(groupRows.length ? ['group-header' as const, ...groupRows] : [])],
    [family, dmRows, groupRows]
  );

  const isHeaderItem = (item: ChatRowData | 'dm-header' | 'group-header') => item === 'dm-header' || item === 'group-header';

  const renderItem = useCallback(
    ({ item }: { item: ChatRowData | 'dm-header' | 'group-header' }) => {
      if (item === 'dm-header') {
        return <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>{t('chat.directMessages')}</Text>;
      }
      if (item === 'group-header') {
        return <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>{t('chat.groups')}</Text>;
      }
      return renderRow({ item });
    },
    [renderRow, t, colors]
  );

  const selectedGroupUids = Object.keys(groupMode).filter((uid) => groupMode[uid]);
  const canCreateGroup = groupName.trim().length > 0 && selectedGroupUids.length > 0 && !creating;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <AppIcon name="chat" size={28} color={colors.accent} />
            <Text style={[styles.title, { color: colors.text }]}>{t('chat.title')}</Text>
            <TouchableOpacity
              style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}
              onPress={() => setShowHelp(true)}
              accessibilityLabel={t('helpCenter.title')}
            >
              <View style={{ width: 15, height: 15, borderRadius: 7.5, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ width: 11, height: 11, borderRadius: 5.5, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 8, fontWeight: '800' }}>i</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.newChatBtn, { backgroundColor: colors.accent }]}
            onPress={() => setShowNewChat(true)}
            accessibilityLabel={t('chat.newChat')}
          >
            <Text style={styles.newChatBtnText}>＋</Text>
          </TouchableOpacity>
        </View>
        {familyName ? <Text style={[styles.familySubtitle, { color: colors.textSecondary }]}>{familyName}</Text> : null}
      </View>

      {/* Search */}
      <View style={[styles.searchWrap, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TextInput
          style={[styles.searchInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }, WEB_NO_OUTLINE]}
          value={searchText}
          onChangeText={setSearchText}
          placeholder={t('chat.searchPlaceholder')}
          placeholderTextColor={colors.textDisabled}
          autoCorrect={false}
        />
      </View>

      {/* Conversation list */}
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={(item) => (isHeaderItem(item) ? item : item.id)}
        contentContainerStyle={styles.listContent}
        removeClippedSubviews
        maxToRenderPerBatch={10}
        windowSize={10}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={{ marginTop: 32 }} color={colors.accent} />
          ) : (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('chat.noConversations')}</Text>
          )
        }
      />

      {/* New chat bottom sheet */}
      <Modal visible={showNewChat} transparent animationType="slide" onRequestClose={() => setShowNewChat(false)}>
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowNewChat(false)} />
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.grabber, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>{t('chat.newChat')}</Text>
            <Text style={[styles.sheetDesc, { color: colors.textSecondary }]}>{t('chat.newChatDesc')}</Text>

            {/* Segmented control */}
            <View style={[styles.segment, { backgroundColor: colors.background }]}>
              <TouchableOpacity
                style={[styles.segmentBtn, { backgroundColor: sheetMode === 'dm' ? colors.accent : 'transparent' }]}
                onPress={() => setSheetMode('dm')}
              >
                <Text style={[styles.segmentText, sheetMode === 'dm' && { color: '#fff' }, { color: sheetMode === 'dm' ? '#fff' : colors.textSecondary }]}>
                  {t('chat.directMessages')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segmentBtn, { backgroundColor: sheetMode === 'group' ? colors.accent : 'transparent' }]}
                onPress={() => setSheetMode('group')}
              >
                <Text style={[styles.segmentText, { color: sheetMode === 'group' ? '#fff' : colors.textSecondary }]}>
                  {t('chat.groups')}
                </Text>
              </TouchableOpacity>
            </View>

            {sheetMode === 'dm' ? (
              // DM picker: one tap opens/creates the conversation
              <>
                {members
                  .filter((m) => m.profile.uid !== user?.uid)
                  .map((m) => (
                    <TouchableOpacity key={m.profile.uid} style={styles.sheetRow} onPress={() => openDmWith(m.profile.uid)} activeOpacity={0.6}>
                      <View style={[styles.sheetAvatar, { backgroundColor: colors.accent + '40' }]}>
                        {m.profile.avatarUrl ? (
                          <Image source={{ uri: m.profile.avatarUrl }} style={styles.sheetAvatarImg} />
                        ) : (
                          <Text style={[styles.sheetAvatarText, { color: colors.accent }]}>
                            {(m.profile.displayName || '?').trim().slice(0, 2).toUpperCase()}
                          </Text>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.sheetRowName, { color: colors.text }]} numberOfLines={1}>
                          {m.profile.displayName}
                        </Text>
                        <Text style={[styles.sheetRowRole, { color: colors.textSecondary }]}>
                          {m.role === 'owner' ? t('chat.owner') : m.role === 'admin' ? t('chat.admin') : t('chat.roleMember')}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                {members.filter((m) => m.profile.uid !== user?.uid).length === 0 && (
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('family.noMembers')}</Text>
                )}
              </>
            ) : (
              // Group creator: name + icon + member checkboxes
              <>
                <TextInput
                  style={[styles.groupNameInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }, WEB_NO_OUTLINE]}
                  value={groupName}
                  onChangeText={setGroupName}
                  placeholder={t('chat.groupName')}
                  placeholderTextColor={colors.textDisabled}
                  underlineColorAndroid="transparent"
                  autoCorrect={false}
                />
                <View style={styles.iconRow}>
                  {GROUP_ICONS.map((ic) => (
                    <TouchableOpacity
                      key={ic}
                      onPress={() => setGroupIcon(ic)}
                      style={[styles.iconOption, groupIcon === ic && { backgroundColor: colors.accent + '30', borderColor: colors.accent }]}
                    >
                      <Text style={{ fontSize: 20 }}>{ic}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={[styles.memberHeader, { color: colors.text }]}>{t('chat.selectMembers')}</Text>
                {members
                  .filter((m) => m.profile.uid !== user?.uid)
                  .map((m) => (
                    <TouchableOpacity key={m.profile.uid} style={styles.sheetRow} onPress={() => toggleGroupMember(m.profile.uid)} activeOpacity={0.6}>
                      <View style={[styles.sheetAvatar, { backgroundColor: colors.accent + '40' }]}>
                        {m.profile.avatarUrl ? (
                          <Image source={{ uri: m.profile.avatarUrl }} style={styles.sheetAvatarImg} />
                        ) : (
                          <Text style={[styles.sheetAvatarText, { color: colors.accent }]}>
                            {(m.profile.displayName || '?').trim().slice(0, 2).toUpperCase()}
                          </Text>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.sheetRowName, { color: colors.text }]} numberOfLines={1}>
                          {m.profile.displayName}
                        </Text>
                        <Text style={[styles.sheetRowRole, { color: colors.textSecondary }]}>
                          {m.role === 'owner' ? t('chat.owner') : m.role === 'admin' ? t('chat.admin') : t('chat.roleMember')}
                        </Text>
                      </View>
                      <View style={[styles.checkbox, { borderColor: colors.border }, groupMode[m.profile.uid] && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
                        {groupMode[m.profile.uid] && <Text style={styles.checkboxText}>✓</Text>}
                      </View>
                    </TouchableOpacity>
                  ))}
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: canCreateGroup ? colors.accent : colors.border }]}
                  onPress={handleCreateGroup}
                  disabled={!canCreateGroup}
                >
                  {creating ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={[styles.primaryBtnText, { color: canCreateGroup ? '#fff' : colors.textSecondary }]}>{t('chat.createGroup')}</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      <HelpCenter
        visible={showHelp}
        onClose={() => setShowHelp(false)}
        title={t('chat.helpTitle')}
        sections={[
          { icon: '📋', title: t('chat.helpWhat'), text: t('chat.helpWhatText') },
          { icon: '👉', title: t('chat.helpHow'), text: t('chat.helpHowText'), tip: t('chat.helpTip') },
        ]}
      />

      {/* Long-press group → leave group confirmation (branded ActionModal) */}
      <ActionModal
        visible={!!leaveTarget}
        title={leaveTarget?.title || ''}
        subtitle={t('chat.leaveGroupBody')}
        onDelete={handleLeaveGroup}
        confirmText={leaving ? `${t('chat.leaveGroup')}…` : t('chat.leaveGroup')}
        confirmColor={colors.accent}
        onCancel={() => setLeaveTarget(null)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  newChatBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newChatBtnText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 38,
    textAlign: 'center',
    marginTop: 0,
  },
  familySubtitle: {
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 2,
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    fontSize: 16,
  },
  listContent: {
    paddingVertical: 8,
    flexGrow: 1,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  pinFlag: {
    position: 'absolute',
    left: 4,
    top: 8,
    bottom: 8,
    width: 4,
    borderRadius: 4,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  familyAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  rowName: {
    fontSize: 16,
    fontWeight: '700',
    flexShrink: 1,
  },
  tag: {
    fontSize: 11,
    fontWeight: '700',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    overflow: 'hidden',
  },

  rowTime: {
    fontSize: 12,
    marginLeft: 8,
  },
  rowPreview: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowMsg: {
    fontSize: 14,
    flexShrink: 1,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 8,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 15,
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    maxHeight: '85%',
  },
  grabber: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  sheetDesc: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 14,
  },
  segment: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '700',
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: 12,
  },
  sheetAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sheetAvatarImg: {
    width: 40,
    height: 40,
  },
  sheetAvatarText: {
    fontSize: 15,
    fontWeight: '700',
  },
  sheetRowName: {
    fontSize: 15,
    fontWeight: '600',
  },
  sheetRowRole: {
    fontSize: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  groupNameInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 10,
  },
  iconRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  iconOption: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberHeader: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 14,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
