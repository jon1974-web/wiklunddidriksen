import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Modal, TouchableOpacity, Image, TextInput, StyleSheet, ActivityIndicator, TextStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { Conversation, UserProfile } from '../types';
import { getFamilyMembersWithRoles } from '../services/familyService';
import {
  addGroupMembers,
  removeGroupMember,
  leaveGroup,
  updateGroup,
  getMemberProfiles,
} from '../services/chatService';
import { ActionModal } from './ActionModal';
import { getErrorMessage } from '../utils/validation';
import { crossAlert } from '../utils/alert';

const WEB_NO_OUTLINE = { outlineStyle: 'none' } as unknown as TextStyle;
const GROUP_ICONS = ['👥', '🏖️', '🎂', '⚽', '🎉', '🏠', '🏫', '🚗', '❤️', '✈️'];

interface Props {
  visible: boolean;
  conversation: Conversation | null;
  currentUid: string;
  onClose: () => void;
}

export const ChatGroupInfoSheet: React.FC<Props> = ({ visible, conversation, currentUid, onClose }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [isAdmin, setIsAdmin] = useState(false);
  const [memberProfiles, setMemberProfiles] = useState<Record<string, UserProfile>>({});
  const [availableMembers, setAvailableMembers] = useState<{ profile: UserProfile; role: string }[]>([]);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editIcon, setEditIcon] = useState('👥');
  const [saving, setSaving] = useState(false);
  const [removeTargetUid, setRemoveTargetUid] = useState<string | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const memberUids = useMemo(
    () => Object.entries(conversation?.members || {}).map(([uid, m]) => ({ uid, role: m.role })),
    [conversation]
  );

  // Resolve real member profiles (names/avatars)
  useEffect(() => {
    if (!visible || !conversation) return;
    const uids = memberUids.map((m) => m.uid);
    if (uids.length === 0) return;
    (async () => {
      try {
        const profiles = await getMemberProfiles(uids);
        setMemberProfiles(profiles);
      } catch (error) {
        console.error('Failed to load member profiles:', error);
      }
    })();
  }, [visible, conversation?.id]);

  // Reset edit state whenever the sheet opens
  useEffect(() => {
    if (visible && conversation) {
      setIsAdmin(
        conversation.members?.[currentUid]?.role === 'admin'
      );
      setEditTitle(conversation.title || '');
      setEditIcon(conversation.icon && !conversation.icon.includes('_') ? conversation.icon : '👥');
      setAvailableMembers([]);
      setAdding(false);
      setEditing(false);
    }
  }, [visible, conversation?.id]);

  // Load family members not already in the group (admin "add members" flow)
  useEffect(() => {
    if (!visible || !adding || !conversation) return;
    (async () => {
      try {
        const all = await getFamilyMembersWithRoles(conversation.familyId);
        const inGroup = new Set(memberUids.map((m) => m.uid));
        setAvailableMembers(all.filter((m) => !inGroup.has(m.profile.uid)));
      } catch (error) {
        console.error('Failed to load family members:', error);
      }
    })();
  }, [adding, conversation?.id, visible]);

  if (!visible || !conversation) return null;

  const handleAddMember = async (uid: string) => {
    if (!isAdmin || saving) return;
    setSaving(true);
    try {
      await addGroupMembers(conversation.id, [uid], currentUid);
      setAvailableMembers((prev) => prev.filter((m) => m.profile.uid !== uid));
      setSaving(false);
      onClose(); // trigger parent refresh
    } catch (error) {
      setSaving(false);
      crossAlert(t('common.error'), getErrorMessage(error));
    }
  };

  const handleRemoveMember = async () => {
    if (!removeTargetUid || !isAdmin) return;
    setSaving(true);
    try {
      await removeGroupMember(conversation.id, removeTargetUid);
      setRemoveTargetUid(null);
      setSaving(false);
      onClose();
    } catch (error) {
      setSaving(false);
      crossAlert(t('common.error'), getErrorMessage(error));
    }
  };

  const handleLeaveGroup = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await leaveGroup(conversation.id, currentUid);
      setShowLeaveConfirm(false);
      setSaving(false);
      onClose();
    } catch (error) {
      setSaving(false);
      crossAlert(t('common.error'), getErrorMessage(error));
    }
  };

  const handleSaveEdits = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await updateGroup(conversation.id, { title: editTitle.trim(), icon: editIcon });
      setEditing(false);
      setSaving(false);
      onClose();
    } catch (error) {
      setSaving(false);
      crossAlert(t('common.error'), getErrorMessage(error));
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={[styles.grabber, { backgroundColor: colors.border }]} />

          {/* Group header */}
          <View style={styles.headerRow}>
            <View style={[styles.groupAvatar, { backgroundColor: colors.accent + '30' }]}>
              <Text style={{ fontSize: 22 }}>{conversation.icon || '👥'}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              {editing ? (
                <>
                  <TextInput
                    style={[styles.editInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }, WEB_NO_OUTLINE]}
                    value={editTitle}
                    onChangeText={setEditTitle}
                    placeholder={t('chat.groupName')}
                    placeholderTextColor={colors.textDisabled}
                    autoCorrect={false}
                  />
                  <View style={styles.iconRow}>
                    {GROUP_ICONS.map((ic) => (
                      <TouchableOpacity
                        key={ic}
                        onPress={() => setEditIcon(ic)}
                        style={[styles.iconOption, editIcon === ic && { backgroundColor: colors.accent + '30' }]}
                      >
                        <Text style={{ fontSize: 18 }}>{ic}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              ) : (
                <>
                  <Text numberOfLines={1} style={[styles.groupName, { color: colors.text }]}>{conversation.title}</Text>
                  <Text style={[styles.groupSub, { color: colors.textSecondary }]}>
                    {memberUids.length} {t('chat.members')}
                  </Text>
                </>
              )}
            </View>
            {isAdmin && !editing && (
              <TouchableOpacity
                onPress={() => { setEditing(true); setEditTitle(conversation.title || ''); }}
                style={[styles.actionChip, { borderColor: colors.border }]}
              >
                <Text style={{ fontSize: 14 }}>✏️</Text>
              </TouchableOpacity>
            )}
            {editing && (
              <TouchableOpacity
                onPress={handleSaveEdits}
                disabled={saving || !editTitle.trim()}
                style={[styles.actionChip, { backgroundColor: colors.accent, borderColor: colors.accent }]}
              >
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{t('chat.save')}</Text>}
              </TouchableOpacity>
            )}
          </View>

          {/* Members */}
          <Text style={[styles.memberHeader, { color: colors.textSecondary }]}>
            {(t('chat.members') || '').toUpperCase()} ({memberUids.length})
          </Text>
          {memberUids.map(({ uid, role }) => {
            const profile = memberProfiles[uid];
            const fallback = uid === currentUid ? 'DU' : uid.slice(0, 2).toUpperCase();
            return (
              <View key={uid} style={styles.memberRow}>
                <View style={[styles.memberAvatar, { backgroundColor: colors.accent + '40' }]}>
                  {profile?.avatarUrl ? (
                    <Image source={{ uri: profile.avatarUrl }} style={styles.memberAvatarImg} />
                  ) : (
                    <Text style={[styles.memberAvatarText, { color: colors.accent }]}>{fallback}</Text>
                  )}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text numberOfLines={1} style={[styles.memberName, { color: colors.text }]}>
                      {uid === currentUid
                        ? `${profile?.displayName || ''} (${t('common.you')})`
                        : profile?.displayName || uid.slice(0, 6) + '…'}
                    </Text>
                    {role === 'admin' && (
                      <Text style={[styles.roleTag, { color: colors.accent, backgroundColor: colors.accent + '20' }]}>{t('chat.admin')}</Text>
                    )}
                  </View>
                </View>
                {isAdmin && uid !== currentUid && (
                  <TouchableOpacity onPress={() => setRemoveTargetUid(uid)} style={styles.removeBtn}>
                    <Text style={{ color: colors.danger, fontWeight: '700' }}>{t('chat.removeMember')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}

          {/* Add members (admin) */}
          {isAdmin && (
            <View>
              {!adding ? (
                <TouchableOpacity onPress={() => setAdding(true)} style={[styles.primaryBtn, { backgroundColor: colors.accent }]}>
                  <Text style={[styles.primaryBtnText, { color: '#fff' }]}>＋ {t('chat.addMembers')}</Text>
                </TouchableOpacity>
              ) : (
                <View>
                  <Text style={[styles.memberHeader, { color: colors.text }]}>{t('chat.selectMembers')}</Text>
                  {availableMembers.map((m) => (
                    <TouchableOpacity key={m.profile.uid} style={styles.memberRow} onPress={() => handleAddMember(m.profile.uid)} disabled={saving}>
                      <View style={[styles.memberAvatar, { backgroundColor: colors.accent + '40' }]}>
                        {m.profile.avatarUrl ? (
                          <Image source={{ uri: m.profile.avatarUrl }} style={styles.memberAvatarImg} />
                        ) : (
                          <Text style={[styles.memberAvatarText, { color: colors.accent }]}>
                            {(m.profile.displayName || '?').trim().slice(0, 2).toUpperCase()}
                          </Text>
                        )}
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text numberOfLines={1} style={[styles.memberName, { color: colors.text }]}>{m.profile.displayName}</Text>
                        <Text style={[styles.groupSub, { color: colors.textSecondary }]}>
                          {m.role === 'owner' ? t('chat.owner') : m.role === 'admin' ? t('chat.admin') : t('chat.roleMember')}
                        </Text>
                      </View>
                      {saving ? <ActivityIndicator size="small" color={colors.accent} /> : <Text style={{ color: colors.accent, fontWeight: '700' }}>＋</Text>}
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity onPress={() => setAdding(false)} style={[styles.primaryBtn, { backgroundColor: colors.inputBackground }]}>
                    <Text style={[styles.primaryBtnText, { color: colors.textSecondary }]}>{t('common.back')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Leave group */}
          <TouchableOpacity onPress={() => setShowLeaveConfirm(true)} style={[styles.primaryBtn, { backgroundColor: colors.danger }]}>
            <Text style={[styles.primaryBtnText, { color: '#fff' }]}>🚪 {t('chat.leaveGroup')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Remove member confirmation */}
      <ActionModal
        visible={!!removeTargetUid}
        title={t('chat.removeMemberTitle')}
        subtitle={t('chat.removeMemberBody')}
        onDelete={handleRemoveMember}
        onCancel={() => setRemoveTargetUid(null)}
      />

      {/* Leave confirmation */}
      <ActionModal
        visible={showLeaveConfirm}
        title={t('chat.leaveGroupTitle')}
        subtitle={t('chat.leaveGroupBody')}
        onDelete={handleLeaveGroup}
        confirmText={t('chat.leaveGroup')}
        confirmColor={colors.accent}
        onCancel={() => setShowLeaveConfirm(false)}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: '85%',
  },
  grabber: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  groupAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupName: {
    fontSize: 19,
    fontWeight: '800',
  },
  groupSub: {
    fontSize: 12,
    marginTop: 2,
  },
  actionChip: {
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 16,
  },
  iconRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  iconOption: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberHeader: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginVertical: 6,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  memberAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  memberAvatarImg: {
    width: 38,
    height: 38,
  },
  memberAvatarText: {
    fontSize: 14,
    fontWeight: '700',
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
  },
  roleTag: {
    fontSize: 10,
    fontWeight: '700',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  removeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
