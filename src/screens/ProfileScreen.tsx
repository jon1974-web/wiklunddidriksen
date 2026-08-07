import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  Image,
  ActivityIndicator,
  Platform,
  Linking,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { signOut, updateProfile } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { auth, storage } from '../services/firebase';
import { useUserStore } from '../store/userStore';
import { useTheme } from '../theme/ThemeContext';
import {
  createOrUpdateUser,
  getUserProfile,
  updateDisplayName,
  createFamily,
  leaveFamily,
  removeFamilyMember,
  generateInviteCode,
  getFamilyMembersWithRoles,
  listenToFamily,
  updateMemberRole,
} from '../services/familyService';
import {
  requestCalendarPermission,
  pickCalendar,
  getCalendarName,
} from '../services/calendarService';
import { getErrorMessage } from '../utils/validation';
import { crossAlert } from '../utils/alert';
import { uriToBlob } from '../utils/upload';
import { IMAGE_QUALITY } from '../constants/limits';
import { SpondGroup, SpondMember, SpondGroupMember, UserProfile, Family } from '../types';
import { loginSpond, getSpondGroups, getSpondMembers, saveSpondConfig, getSpondConfig, clearSpondToken } from '../services/spondService';
import { useTranslation } from 'react-i18next';
import { setLanguage } from '../i18n';
import { LANGUAGES } from '../constants/languages';
import i18n from '../i18n';
import { HelpCenter } from '../components/HelpCenter';
import { AppIcon } from '../components/AppIcon';

export const ProfileScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [langKey, setLangKey] = useState(0);
  const user = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);
  const familyId = useUserStore((state) => state.familyId);
  const familyName = useUserStore((state) => state.familyName);
  const familyRole = useUserStore((state) => state.familyRole);
  const setFamily = useUserStore((state) => state.setFamily);
  const { colors, mode, setMode } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.displayName || '');
  const [editingPhone, setEditingPhone] = useState(false);
  const [newPhone, setNewPhone] = useState(profile?.phoneNumber || '');
  const [showCreateFamily, setShowCreateFamily] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState('');
  const [familyMembers, setFamilyMembers] = useState<{ profile: UserProfile; role: 'owner' | 'admin' | 'member' }[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteCode, setInviteCode] = useState('');
  const [inviteFamilyName, setInviteFamilyName] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [familyListener, setFamilyListener] = useState<(() => void) | null>(null);
  const [calendarName, setCalendarName] = useState<string | null>(null);
  const [calendarEmail, setCalendarEmail] = useState('');
  const [calendarProvider, setCalendarProvider] = useState<'google' | 'outlook' | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [minUkeSections, setMinUkeSections] = useState<Record<string, boolean>>({ birthdays: true, meals: true });
  const [uploading, setUploading] = useState(false);
  const [spondEmail, setSpondEmail] = useState('');
  const [spondPassword, setSpondPassword] = useState('');
  const [spondGroups, setSpondGroups] = useState<SpondGroup[]>([]);
  const [spondSelectedGroups, setSpondSelectedGroups] = useState<string[]>([]);
  const [spondConnected, setSpondConnected] = useState(false);
  const [spondLoading, setSpondLoading] = useState(false);
  const [spondAllMembers, setSpondAllMembers] = useState<SpondGroupMember[]>([]);
  const [spondRespondents, setSpondRespondents] = useState<string[]>([]);
  const [showRespondents, setShowRespondents] = useState(false);
  const [showHelpCalendar, setShowHelpCalendar] = useState(false);
  const [showHelpNotifications, setShowHelpNotifications] = useState(false);
  const [showHelpMinUke, setShowHelpMinUke] = useState(false);
  const [showHelpMatsenter, setShowHelpMatsenter] = useState(false);
  const [showHelpBirthdays, setShowHelpBirthdays] = useState(false);
  const [showHelpFamily, setShowHelpFamily] = useState(false);
  const [showHelpMembers, setShowHelpMembers] = useState(false);
  const [showHelpSpond, setShowHelpSpond] = useState(false);

  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      let userProfile = await getUserProfile(user.uid);
      if (!userProfile) {
        await createOrUpdateUser(user.uid, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
        });
        userProfile = await getUserProfile(user.uid);
      }
      setProfile(userProfile);
      if (userProfile?.familyId) {
        setFamily(userProfile.familyId, userProfile.familyName, userProfile.familyRole);
      }
      if (userProfile?.calendarId) {
        const name = await getCalendarName(userProfile.calendarId);
        setCalendarName(name);
      }
      if (userProfile?.calendarEmail) {
        setCalendarEmail(userProfile.calendarEmail);
      }
      if (userProfile?.calendarProvider) {
        setCalendarProvider(userProfile.calendarProvider);
      }
      if (userProfile?.notificationsEnabled !== undefined) {
        setNotificationsEnabled(userProfile.notificationsEnabled);
      }
      if (userProfile?.minUkeSections) {
        setMinUkeSections(userProfile.minUkeSections);
      }
      if (userProfile?.familyId) {
        try {
          const spondConfig = await getSpondConfig(userProfile.familyId);
          if (spondConfig) {
            setSpondEmail(spondConfig.email);
            setSpondPassword(spondConfig.password);
            setSpondConnected(true);
            setSpondGroups(spondConfig.groups);
            setSpondSelectedGroups(spondConfig.groups.map((g) => g.id));
            if (spondConfig.respondents) {
              setSpondRespondents(spondConfig.respondents.map((r) => r.spondId));
            }
            setSpondLoading(true);
            const allMembers: any[] = [];
            for (const group of spondConfig.groups) {
              try {
                const members = await getSpondMembers(spondConfig.email, spondConfig.password, group.id);
                members.forEach((m: any) => allMembers.push({ ...m, groupId: group.id, groupName: group.name }));
              } catch {}
            }
            setSpondAllMembers(allMembers);
            setSpondLoading(false);
          }
        } catch (e) {
          console.log('Error loading Spond config:', e);
        }
      }
      setLoading(false);
    };

    loadProfile();
  }, [user?.uid]);

  useEffect(() => {
    if (!familyId) {
      setFamilyMembers([]);
      return;
    }
    let cancelled = false;
    getFamilyMembersWithRoles(familyId).then((members) => {
      if (!cancelled) setFamilyMembers(members);
    });
    return () => { cancelled = true; };
  }, [familyId]);

  useEffect(() => {
    if (!familyId) return;
    const unsub = listenToFamily(familyId, (family) => {
      if (family && user) {
        const myMember = family.members[user.uid];
        if (myMember) {
          setFamily(familyId, family.name, myMember.role);
        }
      }
    });
    return () => unsub();
  }, [familyId, user?.uid]);

  const handleUpdateName = useCallback(async () => {
    if (!newName.trim() || !user) return;
    try {
      await updateDisplayName(user.uid, newName.trim());
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: newName.trim() });
      }
      setUser({ ...user!, displayName: newName.trim() });
      setEditingName(false);
      Alert.alert('Suksess', 'Navnet er oppdatert');
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error));
    }
  }, [newName, user, setUser]);

  const handleUpdatePhone = useCallback(async () => {
    if (!user) return;
    try {
      await createOrUpdateUser(user.uid, { phoneNumber: newPhone.trim() || undefined });
      setProfile((prev: UserProfile | null) => prev ? { ...prev, phoneNumber: newPhone.trim() || undefined } : prev);
      setEditingPhone(false);
      Alert.alert('Suksess', 'Telefonnummer er oppdatert');
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error));
    }
  }, [newPhone, user]);

  const handleCreateFamily = useCallback(async () => {
    if (!newFamilyName.trim() || !user) return;
    try {
      const id = await createFamily(newFamilyName.trim(), user.uid);
      setFamily(id, newFamilyName.trim(), 'owner');
      setNewFamilyName('');
      setShowCreateFamily(false);
      Alert.alert('Suksess', `Familie "${newFamilyName.trim()}" er opprettet`);
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error));
    }
  }, [newFamilyName, user, setFamily]);

  const handleGenerateInvite = useCallback(async () => {
    if (!familyId) return;
    setInviteLoading(true);
    try {
      const result = await generateInviteCode(familyId);
      setInviteCode(result.code);
      setInviteFamilyName(result.familyName);
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error));
    } finally {
      setInviteLoading(false);
    }
  }, [familyId]);

  const handleShareInvite = useCallback(async () => {
    const link = `https://familiesenter-837bb.web.app/invite/${inviteCode}?name=${encodeURIComponent(inviteFamilyName || familyName || '')}`;
    const message = `Bli med i ${inviteFamilyName || familyName}: ${link}`;
    if (Platform.OS === 'web') {
      if (navigator.share) {
        try {
          await navigator.share({ title: 'Invitasjon', text: message });
        } catch {}
      } else if (navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(message);
          Alert.alert('Kopiert', 'Lenken er kopiert til utklippstavlen.');
        } catch {
          window.prompt('Kopier lenken:', message);
        }
      } else {
        window.prompt('Kopier lenken:', message);
      }
    } else {
      await Share.share({ message });
    }
  }, [inviteCode, inviteFamilyName, familyName]);

  const handleLeaveFamily = () => {
    if (!user) return;
    crossAlert(
      t('profile.leaveFamily'),
      t('profile.leaveFamily') + '?',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: async () => {
            await leaveFamily(user.uid);
            setFamily(null, null);
            crossAlert('Suksess', 'Du har forlatt familien');
          },
        },
      ]
    );
  };

  const handleRemoveMember = (targetUid: string, targetName: string) => {
    if (!familyId || !user) return;
    crossAlert(
      t('profile.remove') + ' medlem',
      `Er du sikker på at du vil fjerne ${targetName}?`,
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: t('profile.remove'),
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFamilyMember(familyId, targetUid);
              const updated = await getFamilyMembersWithRoles(familyId);
              setFamilyMembers(updated);
            } catch (error) {
              Alert.alert('Error', getErrorMessage(error));
            }
          },
        },
      ]
    );
  };

  const handleChangeRole = (targetUid: string, targetName: string, currentRole: 'owner' | 'admin' | 'member') => {
    if (!familyId || !user || currentRole === 'owner') return;
    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    const label = newRole === 'admin' ? 'Admin' : 'Medlem';
    crossAlert(
      t('profile.admin') + ' ▾',
      `Sett ${targetName} som ${label}?`,
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: label,
          onPress: async () => {
            try {
              await updateMemberRole(familyId, targetUid, newRole);
              const updated = await getFamilyMembersWithRoles(familyId);
              setFamilyMembers(updated);
            } catch (error) {
              Alert.alert('Error', getErrorMessage(error));
            }
          },
        },
      ]
    );
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: IMAGE_QUALITY,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      await uploadAvatar(result.assets[0].uri, result.assets[0].base64 || null);
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Tillatelse', 'Vi trenger tilgang til kameraet.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: IMAGE_QUALITY,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      await uploadAvatar(result.assets[0].uri, result.assets[0].base64 || null);
    }
  };

  const uploadAvatar = async (uri: string, base64Data: string | null = null) => {
    if (!user) return;
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert('Feil', 'Du må være logget inn for å laste opp bilder.');
      return;
    }
    setUploading(true);
    try {
      await currentUser.getIdToken(true);
      let blob: Blob;
      if (base64Data && Platform.OS === 'web') {
        const byteString = atob(base64Data);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        blob = new Blob([ab], { type: 'image/jpeg' });
      } else {
        blob = await uriToBlob(uri);
      }
      if (blob.size === 0) {
        throw new Error('Bildet er tomt');
      }
      let downloadUrl: string;
      if (Platform.OS === 'web') {
        const { webUploadFile } = await import('../services/webStorage');
        downloadUrl = await webUploadFile(`avatars/${user.uid}`, blob);
      } else {
        const storageRef = ref(storage, `avatars/${user.uid}`);
        await uploadBytes(storageRef, blob);
        downloadUrl = await getDownloadURL(storageRef);
      }
      await createOrUpdateUser(user.uid, { avatarUrl: downloadUrl });
      setProfile((prev: UserProfile | null) => prev ? { ...prev, avatarUrl: downloadUrl } : prev);
      setUser({ ...user, avatarUrl: downloadUrl });
    } catch (error) {
      console.error('Avatar upload failed:', error);
      Alert.alert('Error', 'Kunne ikke laste opp bildet.');
    } finally {
      setUploading(false);
    }
  };

  const handleConnectCalendar = async () => {
    if (!user) return;
    const hasPermission = await requestCalendarPermission();
    if (!hasPermission) {
      Alert.alert('Tillatelse', 'Du må gi tillatelse til å bruke kalenderen.');
      return;
    }
    const calendar = await pickCalendar();
    if (!calendar) return;

    await createOrUpdateUser(user.uid, { calendarId: calendar.id });
    setProfile((prev: UserProfile | null) => prev ? { ...prev, calendarId: calendar.id } : prev);
    setCalendarName(calendar.title);
    Alert.alert('Suksess', `Koblet til "${calendar.title}"`);
  };

  const handleDisconnectCalendar = async () => {
    if (!user) return;
    crossAlert(
      'Koble fra kalender',
      'Arrangementer vil ikke lenger synkroniseres med kalenderen din.',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Koble fra',
          style: 'destructive',
          onPress: async () => {
            await createOrUpdateUser(user.uid, { calendarId: null });
            setProfile((prev: UserProfile | null) => prev ? { ...prev, calendarId: null } : prev);
            setCalendarName(null);
            crossAlert('Suksess', 'Kalender frakoblet');
          },
        },
      ]
    );
  };

  const handleSaveCalendarPreference = useCallback(async (provider: 'google' | 'outlook') => {
    if (!user || !calendarEmail.trim()) return;
    try {
      await createOrUpdateUser(user.uid, {
        calendarEmail: calendarEmail.trim(),
        calendarProvider: provider,
      });
      setCalendarProvider(provider);
      setProfile((prev: UserProfile | null) => prev ? { ...prev, calendarEmail: calendarEmail.trim(), calendarProvider: provider } : prev);
      crossAlert('Suksess', `Kalender koblet til ${provider === 'google' ? 'Google' : 'Outlook'}`);
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  }, [user, calendarEmail]);

  const handleDisconnectCalendarEmail = useCallback(async () => {
    if (!user) return;
    try {
      await createOrUpdateUser(user.uid, { calendarEmail: null, calendarProvider: null });
      setCalendarEmail('');
      setCalendarProvider(null);
      setProfile((prev: UserProfile | null) => prev ? { ...prev, calendarEmail: null, calendarProvider: null } : prev);
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  }, [user]);

  const handleToggleNotifications = useCallback(async (value: boolean) => {
    if (!user) return;
    try {
      await createOrUpdateUser(user.uid, { notificationsEnabled: value });
      setNotificationsEnabled(value);
      setProfile((prev: UserProfile | null) => prev ? { ...prev, notificationsEnabled: value } : prev);
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  }, [user]);

  const handleConnectSpond = useCallback(async () => {
    if (!spondEmail.trim() || !spondPassword.trim()) {
      crossAlert('Error', 'Vennligst fyll inn e-post og passord for Spond.');
      return;
    }
    setSpondLoading(true);
    try {
      const groups = await getSpondGroups(spondEmail.trim(), spondPassword);
      // Merge with saved logoUrls from existing config
      const savedConfig = familyId ? await getSpondConfig(familyId) : null;
      const savedLogos: Record<string, string> = {};
      if (savedConfig?.groups) {
        savedConfig.groups.forEach(g => { if (g.logoUrl) savedLogos[g.id] = g.logoUrl; });
      }
      const merged = groups.map(g => savedLogos[g.id] ? { ...g, logoUrl: savedLogos[g.id] } : g);
      setSpondGroups(merged);
      setSpondConnected(true);

      const allMembers: SpondGroupMember[] = [];
      for (const group of groups) {
        try {
          const members = await getSpondMembers(spondEmail.trim(), spondPassword, group.id);
          members.forEach((m) => allMembers.push({ ...m, groupId: group.id, groupName: group.name }));
        } catch {
          // Continue
        }
      }
      setSpondAllMembers(allMembers);

      crossAlert('Suksess', `Koblet til Spond. ${groups.length} gruppe(r) funnet.`);
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    } finally {
      setSpondLoading(false);
    }
  }, [spondEmail, spondPassword]);

  const handleToggleSpondGroup = useCallback((groupId: string) => {
    setSpondSelectedGroups((prev: string[]) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  }, []);

  const handleToggleSpondRespondent = useCallback((spondId: string) => {
    setSpondRespondents((prev: string[]) =>
      prev.includes(spondId) ? prev.filter((id) => id !== spondId) : [...prev, spondId]
    );
  }, []);

  const handleSaveSpondConfig = useCallback(async () => {
    if (!familyId) {
      crossAlert('Error', 'Du må være med i en familie for å lagre Spond-konfigurasjon.');
      return;
    }
    try {
      const selectedGroups = spondGroups.filter((g) => spondSelectedGroups.includes(g.id));
      const respondents = spondAllMembers
        .filter((m) => spondRespondents.includes(m.id))
        .map((m) => {
          const r: any = { uid: '', spondId: m.id, profileId: m.profileId || m.id, firstName: m.firstName, lastName: m.lastName, groupId: m.groupId, groupName: m.groupName };
          if (m.childId) r.childId = m.childId;
          return r;
        });
      await saveSpondConfig(familyId, {
        email: spondEmail.trim(),
        password: spondPassword,
        groups: selectedGroups,
        respondents,
      });
      clearSpondToken();
      crossAlert('Suksess', `Spond konfigurasjon lagret. ${selectedGroups.length} gruppe(r) aktivert, ${respondents.length} respondenter.`);
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  }, [familyId, spondEmail, spondPassword, spondGroups, spondSelectedGroups, spondAllMembers, spondRespondents]);

  const handleDisconnectSpond = useCallback(async () => {
    if (!familyId) return;
    crossAlert('Koble fra Spond', 'Er du sikker?', [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Koble fra',
        style: 'destructive',
        onPress: async () => {
          await saveSpondConfig(familyId, { email: '', password: '', groups: [], respondents: [] });
          setSpondEmail('');
          setSpondPassword('');
          setSpondGroups([]);
          setSpondSelectedGroups([]);
          setSpondAllMembers([]);
          setSpondRespondents([]);
          setSpondConnected(false);
          clearSpondToken();
        },
      },
    ]);
  }, [familyId]);

  const handleLogout = async () => {
    crossAlert('Logg ut', 'Er du sikker på at du vil logge ut?', [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Logg ut',
        style: 'destructive',
        onPress: async () => {
          await signOut(auth);
          setUser(null);
          setFamily(null, null);
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]} edges={['top']}>
        <Text style={{ color: colors.textSecondary }}>Laster...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <AppIcon name="person" size={28} color={colors.accent} />
            <Text style={[styles.title, { color: colors.text }]}>{t('profile.title')}</Text>
          </View>
          <Image source={require('../../assets/icon.png')} style={{ width: 36, height: 36, borderRadius: 9 }} />
        </View>
        {familyName ? <Text style={[styles.familySubtitle, { color: colors.textSecondary }]}>{familyName}</Text> : null}
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface, alignItems: 'center' }]}>
        <TouchableOpacity onPress={handlePickImage} disabled={uploading}>
          {profile?.avatarUrl ? (
            <Image
              source={{ uri: profile.avatarUrl }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.inputBackground }]}>
              <Text style={[styles.avatarInitial, { color: colors.textSecondary }]}>
                {user?.displayName?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
          )}
          {uploading && (
            <View style={styles.avatarOverlay}>
              <ActivityIndicator size="small" color="#fff" />
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={handleTakePhoto} disabled={uploading}>
          <Text style={[styles.changePhotoText, { color: colors.accent }]}>{t('profile.changePhoto')}</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('profile.title')}</Text>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('common.name')}</Text>
          {editingName ? (
            <View style={styles.editRow}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                value={newName}
                onChangeText={setNewName}
                autoFocus
              />
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.accent }]}
                onPress={handleUpdateName}
              >
                <Text style={styles.saveButtonText}>Lagre</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: colors.surfaceVariant }]}
                onPress={() => { setEditingName(false); setNewName(user?.displayName || ''); }}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.valueRow, { backgroundColor: colors.inputBackground }]}
              onPress={() => setEditingName(true)}
            >
              <Text style={[styles.value, { color: colors.text }]}>{user?.displayName}</Text>
              <Text style={[styles.editIcon, { color: colors.accent }]}>{t('detail.edit')}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('profile.email')}</Text>
          <View style={[styles.valueRow, { backgroundColor: colors.inputBackground }]}>
            <Text style={[styles.value, { color: colors.text }]}>{user?.email}</Text>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('profile.phone')}</Text>
          {editingPhone ? (
            <View>
              <TextInput
                style={[styles.valueRow, { backgroundColor: colors.inputBackground, color: colors.text }]}
                value={newPhone}
                onChangeText={setNewPhone}
                placeholder="Legg til telefonnummer"
                placeholderTextColor={colors.textDisabled}
                keyboardType="phone-pad"
                autoFocus
              />
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <TouchableOpacity
                  style={[styles.saveButton, { backgroundColor: colors.accent }]}
                  onPress={handleUpdatePhone}
                >
                  <Text style={styles.saveButtonText}>Lagre</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.cancelButton, { borderColor: colors.border }]}
                  onPress={() => { setEditingPhone(false); setNewPhone(profile?.phoneNumber || ''); }}
                >
                  <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>{t('common.cancel')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.valueRow, { backgroundColor: colors.inputBackground }]}
              onPress={() => { setNewPhone(profile?.phoneNumber || ''); setEditingPhone(true); }}
            >
              <Text style={[styles.value, { color: profile?.phoneNumber ? colors.text : colors.textDisabled }]}>
                {profile?.phoneNumber || t('profile.addPhone')}
              </Text>
              <Text style={[styles.editIcon, { color: colors.accent }]}>{t('detail.edit')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginBottom: 0 }]}>{t('profile.calendar')}</Text>
          <TouchableOpacity style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#0097A7', alignItems: 'center', justifyContent: 'center' }} onPress={() => setShowHelpCalendar(true)}>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: '#0097A7', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 7, fontWeight: '800' }}>i</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
        {calendarProvider && calendarEmail ? (
          <View>
            <View style={[styles.valueRow, { backgroundColor: colors.inputBackground }]}>
              <Text style={[styles.value, { color: colors.text }]}>
                {calendarProvider === 'google' ? '📧 ' : '📧 '}{calendarEmail}
              </Text>
              <Text style={[styles.editIcon, { color: colors.accent }]}>
                {calendarProvider === 'google' ? 'Google' : 'Outlook'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.leaveButton, { borderColor: colors.danger, marginTop: 12 }]}
              onPress={handleDisconnectCalendarEmail}
            >
              <Text style={[styles.leaveButtonText, { color: colors.danger }]}>{t('profile.disconnectCalendar')}</Text>
            </TouchableOpacity>
          </View>
        ) : Platform.OS === 'web' ? (
          <View>
            <Text style={[styles.noFamily, { color: colors.textSecondary, marginBottom: 8 }]}>
              Lagre kalender-e-post for rask tilgang på arrangementer.
            </Text>
            <TextInput
              style={[styles.calendarInput, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
              value={calendarEmail}
              onChangeText={setCalendarEmail}
              placeholder="Din e-post (f.eks. navn@gmail.com)"
              placeholderTextColor={colors.textDisabled}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <TouchableOpacity
                style={[styles.calendarProviderButton, { backgroundColor: '#4285F4', opacity: calendarEmail.trim() ? 1 : 0.5 }]}
                onPress={() => handleSaveCalendarPreference('google')}
                disabled={!calendarEmail.trim()}
              >
                <Text style={styles.familyButtonText}>Google</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.calendarProviderButton, { backgroundColor: '#0078D4', opacity: calendarEmail.trim() ? 1 : 0.5 }]}
                onPress={() => handleSaveCalendarPreference('outlook')}
                disabled={!calendarEmail.trim()}
              >
                <Text style={styles.familyButtonText}>Outlook</Text>
              </TouchableOpacity>
            </View>
            <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, marginTop: 12 }}>
              <Text style={[styles.noFamily, { color: colors.textSecondary }]}>
                Du kan også laste ned .ics-fil fra hvert enkelt arrangement.
              </Text>
            </View>
          </View>
        ) : calendarName ? (
          <View>
            <View style={[styles.valueRow, { backgroundColor: colors.inputBackground }]}>
              <Text style={[styles.value, { color: colors.text }]}>{calendarName}</Text>
              <Text style={[styles.editIcon, { color: colors.accent }]}>Koblet til</Text>
            </View>
            <TouchableOpacity
              style={[styles.leaveButton, { borderColor: colors.danger, marginTop: 12 }]}
              onPress={handleDisconnectCalendar}
            >
              <Text style={[styles.leaveButtonText, { color: colors.danger }]}>{t('profile.leaveFamily')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.familyButton, { backgroundColor: colors.accent }]}
            onPress={handleConnectCalendar}
          >
            <Text style={styles.familyButtonText}>{t('profile.calendar')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('profile.theme')}</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, paddingVertical: 8, alignItems: 'center' }}>
          {([
            { key: 'light' as const, color: '#4CAF50' },
            { key: 'dark' as const, color: '#333' },
            { key: 'orange' as const, color: '#E87C3E' },
            { key: 'deepblue' as const, color: '#1A3A5C' },
            { key: 'silver' as const, color: '#8E8E93' },
            { key: 'purple' as const, color: '#9C27B0' },
            { key: 'pink' as const, color: '#F48FB1' },
            { key: 'teal' as const, color: '#0097A7' },
            { key: 'system' as const, color: '#999' },
          ]).map((t) => (
            <TouchableOpacity
              key={t.key}
              onPress={() => setMode(t.key)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: t.color,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {mode === t.key && <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('profile.language')}</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 8 }}>
          {LANGUAGES.filter(l => l.hasTranslation).map((lang) => (
            <TouchableOpacity
              key={lang.code}
              onPress={() => { setLanguage(lang.code); setLangKey(k => k + 1); }}
              style={[
                styles.langOption,
                { backgroundColor: colors.inputBackground, borderColor: colors.border },
                i18n.language === lang.code && { backgroundColor: colors.accent, borderColor: colors.accent },
              ]}
            >
              <Text style={[styles.langText, { color: i18n.language === lang.code ? '#fff' : colors.text }]}>
                {lang.flag} {lang.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginBottom: 0 }]}>{t('profile.notifications')}</Text>
            <TouchableOpacity style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#0097A7', alignItems: 'center', justifyContent: 'center' }} onPress={() => setShowHelpNotifications(true)}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: '#0097A7', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 7, fontWeight: '800' }}>i</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
          <View style={styles.themeOptions}>
            <TouchableOpacity
              style={[
                styles.themeOption,
                { backgroundColor: colors.inputBackground, borderColor: colors.border },
                notificationsEnabled && { backgroundColor: colors.accent, borderColor: colors.accent },
              ]}
              onPress={() => handleToggleNotifications(!notificationsEnabled)}
            >
              <Text style={[styles.themeText, { color: notificationsEnabled ? '#fff' : colors.text }]}>
                {notificationsEnabled ? t('profile.notificationsOn') : t('profile.notificationsOff')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginBottom: 0 }]}>{t('profile.minUke')}</Text>
          <TouchableOpacity style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#0097A7', alignItems: 'center', justifyContent: 'center' }} onPress={() => setShowHelpMinUke(true)}>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: '#0097A7', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 7, fontWeight: '800' }}>i</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
        {[
          { key: 'birthdays', icon: 'birthday', label: t('birthdays.title') },
          { key: 'meals', icon: 'utensils', label: t('mealPlanner.weeklyPlan') },
          { key: 'reiser', icon: 'compass', label: t('trips.title') },
          { key: 'health', icon: 'transport', label: t('health.title') },
        ].map(section => (
          <TouchableOpacity
            key={section.key}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 }}
            onPress={() => {
              const updated = { ...minUkeSections, [section.key]: !minUkeSections[section.key] };
              setMinUkeSections(updated);
              if (user) createOrUpdateUser(user.uid, { minUkeSections: updated });
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <AppIcon name={section.icon as any} size={18} color={colors.accent} />
              <Text style={{ color: colors.text, fontSize: 15 }}>{section.label}</Text>
            </View>
            <View style={{ width: 50, height: 28, borderRadius: 14, backgroundColor: minUkeSections[section.key] !== false ? colors.accent : colors.inputBackground, justifyContent: 'center', padding: 2 }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', alignSelf: minUkeSections[section.key] !== false ? 'flex-end' : 'flex-start' }} />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginBottom: 0 }]}>{t('profile.matsenter')}</Text>
          <TouchableOpacity style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#0097A7', alignItems: 'center', justifyContent: 'center' }} onPress={() => setShowHelpMatsenter(true)}>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: '#0097A7', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 7, fontWeight: '800' }}>i</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
        {[
          { key: 'mealFrokost', icon: '🥞', label: t('mealPlanner.frokost') },
          { key: 'mealLunsj', icon: '🥪', label: t('mealPlanner.lunch') },
          { key: 'mealMiddag', icon: '🍽️', label: t('mealPlanner.dinner') },
        ].map(section => (
          <TouchableOpacity
            key={section.key}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 }}
            onPress={() => {
              const updated = { ...minUkeSections, [section.key]: minUkeSections[section.key] === false ? true : false };
              setMinUkeSections(updated);
              if (user) createOrUpdateUser(user.uid, { minUkeSections: updated });
            }}
          >
            <Text style={{ color: colors.text, fontSize: 15 }}>{section.icon} {section.label}</Text>
            <View style={{ width: 50, height: 28, borderRadius: 14, backgroundColor: minUkeSections[section.key] !== false ? colors.accent : colors.inputBackground, justifyContent: 'center', padding: 2 }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', alignSelf: minUkeSections[section.key] !== false ? 'flex-end' : 'flex-start' }} />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginBottom: 0 }]}>{t('birthdays.title')}</Text>
            <TouchableOpacity style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#0097A7', alignItems: 'center', justifyContent: 'center' }} onPress={() => setShowHelpBirthdays(true)}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: '#0097A7', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 7, fontWeight: '800' }}>i</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.familyButton, { backgroundColor: colors.accent }]}
            onPress={() => navigation.navigate('Birthday')}
          >
            <Text style={styles.familyButtonText}>{t('birthdays.add')}</Text>
          </TouchableOpacity>
        </View>

      <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginBottom: 0 }]}>{t('profile.family')}</Text>
            <TouchableOpacity style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#0097A7', alignItems: 'center', justifyContent: 'center' }} onPress={() => setShowHelpFamily(true)}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: '#0097A7', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 7, fontWeight: '800' }}>i</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {familyId ? (
            <View>
              <View style={[styles.familyCard, { backgroundColor: colors.inputBackground }]}>
                <Text style={[styles.familyName, { color: colors.text }]}>{familyName}</Text>
              </View>
              {familyMembers.length > 0 && (
                <View style={[styles.memberList, { borderTopColor: colors.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Text style={[styles.memberListTitle, { color: colors.text, marginBottom: 0 }]}>{t('profile.members')} ({familyMembers.length})</Text>
                    <TouchableOpacity style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#0097A7', alignItems: 'center', justifyContent: 'center' }} onPress={() => setShowHelpMembers(true)}>
                      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
                        <View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: '#0097A7', alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ color: '#fff', fontSize: 7, fontWeight: '800' }}>i</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  </View>
                  {familyMembers.map((m) => (
                    <View key={m.profile.uid} style={[styles.memberRow, { borderBottomColor: colors.border }]}>
                      <View style={styles.memberInfo}>
                        <Text style={[styles.memberName, { color: colors.text }]}>{m.profile.displayName}</Text>
                        <Text style={[styles.memberEmail, { color: colors.textSecondary }]}>{m.profile.email}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {(familyRole === 'owner' || familyRole === 'admin') && m.role !== 'owner' ? (
                          <TouchableOpacity onPress={() => handleChangeRole(m.profile.uid, m.profile.displayName, m.role)}>
                            <Text style={{ color: colors.accent, fontSize: 12, fontWeight: m.role === 'admin' ? '600' : '400' }}>
                              {m.role === 'admin' ? t('profile.admin') : t('profile.member')} ▾
                            </Text>
                          </TouchableOpacity>
                        ) : m.role === 'owner' ? (
                          <Text style={{ color: colors.accent, fontSize: 12, fontWeight: '600' }}>{t('profile.owner')}</Text>
                        ) : (
                          <Text style={{ color: colors.accent, fontSize: 12 }}>{m.role === 'admin' ? t('profile.admin') : t('profile.member')}</Text>
                        )}
                        {m.profile.uid === user?.uid && (
                          <Text style={[styles.memberBadge, { color: colors.accent }]}>{t('profile.you')}</Text>
                        )}
                        {(familyRole === 'owner' || familyRole === 'admin') && m.profile.uid !== user?.uid && m.role !== 'owner' && (
                          <TouchableOpacity onPress={() => handleRemoveMember(m.profile.uid, m.profile.displayName)}>
                            <Text style={{ color: colors.danger, fontSize: 12 }}>{t('profile.remove')}</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {(familyRole === 'owner' || familyRole === 'admin') && (
                <View style={{ marginTop: 12 }}>
                  <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 8 }]}>{t('profile.inviteMember')}</Text>
                  {inviteCode ? (
                    <View>
                      <View style={[styles.familyCard, { backgroundColor: colors.inputBackground, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                        <Text style={[styles.familyName, { color: colors.accent, fontSize: 20, fontWeight: 'bold', letterSpacing: 2 }]}>{inviteCode}</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{t('profile.codeValidFor')}</Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.familyButton, { backgroundColor: colors.accent, marginTop: 8 }]}
                        onPress={handleShareInvite}
                      >
                        <Text style={styles.familyButtonText}>{t('profile.shareLink')}</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.familyButton, { backgroundColor: colors.accent, opacity: inviteLoading ? 0.6 : 1 }]}
                      onPress={handleGenerateInvite}
                      disabled={inviteLoading}
                    >
                      <Text style={styles.familyButtonText}>{inviteLoading ? '...' : t('profile.generateLink')}</Text>
                    </TouchableOpacity>
                  )}
                  <Text style={{ color: colors.textDisabled, fontSize: 12, marginTop: 6 }}>
                    {t('profile.linkHint')}
                  </Text>
                </View>
              )}

              {familyRole !== 'owner' && (
                <TouchableOpacity
                  style={[styles.leaveButton, { borderColor: colors.danger, marginTop: 12 }]}
                  onPress={handleLeaveFamily}
                >
                  <Text style={[styles.leaveButtonText, { color: colors.danger }]}>Forlat familie</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View>
              <Text style={[styles.noFamily, { color: colors.textSecondary }]}>
                Du er ikke med i noen familie ennå.
              </Text>
              <View style={styles.familyActions}>
                <TouchableOpacity
                  style={[styles.familyButton, { backgroundColor: colors.accent }]}
                  onPress={() => setShowCreateFamily(true)}
                >
                  <Text style={styles.familyButtonText}>Opprett familie</Text>
                </TouchableOpacity>
              </View>
              <Text style={{ color: colors.textDisabled, fontSize: 13, marginTop: 8, textAlign: 'center' }}>
                Eller bruk en invitasjonslenke for å bli med i en eksisterende familie.
              </Text>
            </View>
          )}
        </View>

      {(familyRole === 'owner' || familyRole === 'admin') && (
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginBottom: 0 }]}>{t('profile.title')} — Spond</Text>
            <TouchableOpacity style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#0097A7', alignItems: 'center', justifyContent: 'center' }} onPress={() => setShowHelpSpond(true)}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: '#0097A7', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 7, fontWeight: '800' }}>i</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {spondConnected && spondGroups.length > 0 ? (
            <View>
              <View style={[styles.valueRow, { backgroundColor: colors.inputBackground }]}>
                <Text style={[styles.value, { color: colors.text }]}>{spondEmail}</Text>
                <Text style={[styles.editIcon, { color: colors.accent }]}>Koblet til</Text>
              </View>

              <Text style={[styles.label, { color: colors.textSecondary, marginTop: 12 }]}>{t('profile.members')}</Text>
              {spondGroups.map((group) => (
                <View key={group.id} style={{ marginBottom: 8 }}>
                  <TouchableOpacity
                    style={[styles.valueRow, { backgroundColor: colors.inputBackground }]}
                    onPress={() => handleToggleSpondGroup(group.id)}
                  >
                    {group.logoUrl ? (
                      <Image source={{ uri: group.logoUrl }} style={{ width: 32, height: 32, borderRadius: 6, marginRight: 10 }} />
                    ) : (
                      <View style={{ width: 32, height: 32, borderRadius: 6, backgroundColor: colors.inputBackground, borderColor: colors.border, borderWidth: 1, marginRight: 10, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 16 }}>🏟️</Text>
                      </View>
                    )}
                    <Text style={[styles.value, { color: colors.text, flex: 1 }]}>{group.name}</Text>
                    <Text style={[styles.editIcon, { color: spondSelectedGroups.includes(group.id) ? colors.accent : colors.textDisabled }]}>
                      {spondSelectedGroups.includes(group.id) ? '✅' : '⬜'}
                    </Text>
                  </TouchableOpacity>
                  {spondSelectedGroups.includes(group.id) && (
                    <TouchableOpacity
                      style={{ alignSelf: 'flex-end', marginTop: 4, paddingHorizontal: 8, paddingVertical: 4 }}
                      onPress={async () => {
                        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.5, base64: true });
                        if (!result.canceled && result.assets[0]) {
                          try {
                            const blob = await uriToBlob(result.assets[0].uri);
                            const storageRef = ref(storage, `spond-logos/${familyId}/${group.id}`);
                            await uploadBytes(storageRef, blob);
                            const url = await getDownloadURL(storageRef);
                            const updated = spondGroups.map(g => g.id === group.id ? { ...g, logoUrl: url } : g);
                            setSpondGroups(updated);
                            const selected = updated.filter(g => spondSelectedGroups.includes(g.id));
                            await saveSpondConfig(familyId, { email: spondEmail, password: spondPassword, groups: selected, respondents: spondAllMembers.filter(m => spondRespondents.includes(m.id)).map(m => ({ uid: '', spondId: m.id, profileId: m.profileId || m.id, firstName: m.firstName, lastName: m.lastName, groupId: m.groupId, groupName: m.groupName })) });
                          } catch (e) { console.error('Logo upload failed:', e); }
                        }
                      }}
                    >
                      <Text style={{ color: colors.accent, fontSize: 12 }}>📷 Last opp logo</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {spondAllMembers.length > 0 && (
                <>
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 8 }}
                    onPress={() => setShowRespondents(!showRespondents)}
                  >
                    <Text style={[styles.label, { color: colors.textSecondary, marginTop: 0, marginBottom: 0 }]}>Velg respondenter (hvem kan svare)</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{spondRespondents.length} valgt</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{showRespondents ? '▲' : '▼'}</Text>
                  </TouchableOpacity>
                  {showRespondents && spondAllMembers.map((member) => (
                    <TouchableOpacity
                      key={`${member.groupId}-${member.id}`}
                      style={[styles.valueRow, { backgroundColor: colors.inputBackground, marginBottom: 6 }]}
                      onPress={() => handleToggleSpondRespondent(member.id)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.value, { color: colors.text }]}>{member.firstName} {member.lastName} ({member.id})</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{member.groupName}</Text>
                      </View>
                      <Text style={[styles.editIcon, { color: spondRespondents.includes(member.id) ? colors.accent : colors.textDisabled }]}>
                        {spondRespondents.includes(member.id) ? '✅' : '⬜'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}

              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <TouchableOpacity
                  style={[styles.familyButton, { backgroundColor: colors.accent }]}
                  onPress={handleSaveSpondConfig}
                >
                  <Text style={styles.familyButtonText}>{t('common.save')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.familyButton, { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.danger }]}
                  onPress={handleDisconnectSpond}
                >
                  <Text style={[styles.familyButtonText, { color: colors.danger }]}>{t('profile.spondDisconnect')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View>
              <Text style={[styles.noFamily, { color: colors.textSecondary }]}>
                {t('profile.spondConnect')}
              </Text>
              <View style={styles.field}>
                <TextInput
                  style={[styles.calendarInput, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
                  value={spondEmail}
                  onChangeText={setSpondEmail}
                  placeholder="Spond e-post"
                  placeholderTextColor={colors.textDisabled}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.field}>
                <TextInput
                  style={[styles.calendarInput, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
                  value={spondPassword}
                  onChangeText={setSpondPassword}
                  placeholder="Spond passord"
                  placeholderTextColor={colors.textDisabled}
                  secureTextEntry
                />
              </View>
              <TouchableOpacity
                style={[styles.familyButton, { backgroundColor: colors.accent, opacity: spondLoading ? 0.5 : 1 }]}
                onPress={handleConnectSpond}
                disabled={spondLoading}
              >
                <Text style={styles.familyButtonText}>{spondLoading ? '...' : t('profile.spondConnect')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      <TouchableOpacity style={[styles.logoutButton, { backgroundColor: colors.danger }]} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>{t('profile.logout')}</Text>
      </TouchableOpacity>

      <Modal visible={showCreateFamily} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Opprett familie</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.inputBackground, color: colors.text }]}
              value={newFamilyName}
              onChangeText={setNewFamilyName}
              placeholder="Familienavn"
              placeholderTextColor={colors.textDisabled}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => { setShowCreateFamily(false); setNewFamilyName(''); }}
              >
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalCreateButton, { backgroundColor: colors.accent }]}
                onPress={handleCreateFamily}
              >
                <Text style={styles.modalCreateText}>Opprett</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {Platform.OS === 'web' && (
        <View style={[styles.section, { backgroundColor: colors.surface, marginHorizontal: 16, marginBottom: 16 }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('profile.app')}</Text>
          <TouchableOpacity
            style={[styles.themeOption, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
            onPress={async () => {
              if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const reg of registrations) await reg.unregister();
              }
              if ('caches' in window) {
                const keys = await caches.keys();
                for (const key of keys) await caches.delete(key);
              }
              window.location.reload();
            }}
          >
            <Text style={[styles.themeText, { color: colors.text }]}>{t('profile.reload')}</Text>
          </TouchableOpacity>
          <Text style={[styles.noFamily, { color: colors.textDisabled, marginTop: 8 }]}>
            {t('profile.reloadHelp')}
          </Text>
        </View>
      )}
      </ScrollView>

      <HelpCenter visible={showHelpCalendar} onClose={() => setShowHelpCalendar(false)} title={t('profile.helpCalendarTitle')} sections={[
        { icon: '📅', title: t('profile.helpCalendarWhat'), text: t('profile.helpCalendarWhatText') },
        { icon: '👉', title: t('profile.helpCalendarHow'), text: t('profile.helpCalendarHowText'), tip: t('profile.helpCalendarTip') },
      ]} />
      <HelpCenter visible={showHelpNotifications} onClose={() => setShowHelpNotifications(false)} title={t('profile.helpNotificationsTitle')} sections={[
        { icon: '🔔', title: t('profile.helpNotificationsWhat'), text: t('profile.helpNotificationsWhatText') },
        { icon: '👉', title: t('profile.helpNotificationsHow'), text: t('profile.helpNotificationsHowText') },
      ]} />
      <HelpCenter visible={showHelpMinUke} onClose={() => setShowHelpMinUke(false)} title={t('profile.helpMinUkeTitle')} sections={[
        { icon: '📋', title: t('profile.helpMinUkeWhat'), text: t('profile.helpMinUkeWhatText') },
        { icon: '👉', title: t('profile.helpMinUkeHow'), text: t('profile.helpMinUkeHowText'), tip: t('profile.helpMinUkeTip') },
      ]} />
      <HelpCenter visible={showHelpMatsenter} onClose={() => setShowHelpMatsenter(false)} title={t('profile.helpMatsenterTitle')} sections={[
        { icon: '🍽️', title: t('profile.helpMatsenterWhat'), text: t('profile.helpMatsenterWhatText') },
        { icon: '👉', title: t('profile.helpMatsenterHow'), text: t('profile.helpMatsenterHowText'), tip: t('profile.helpMatsenterTip') },
      ]} />
      <HelpCenter visible={showHelpBirthdays} onClose={() => setShowHelpBirthdays(false)} title={t('profile.helpBirthdaysTitle')} sections={[
        { icon: '🎂', title: t('profile.helpBirthdaysWhat'), text: t('profile.helpBirthdaysWhatText') },
        { icon: '👉', title: t('profile.helpBirthdaysHow'), text: t('profile.helpBirthdaysHowText'), tip: t('profile.helpBirthdaysTip') },
      ]} />
      <HelpCenter visible={showHelpFamily} onClose={() => setShowHelpFamily(false)} title={t('profile.helpFamilyTitle')} sections={[
        { icon: '👨‍👩‍👧‍👦', title: t('profile.helpFamilyWhat'), text: t('profile.helpFamilyWhatText') },
        { icon: '👉', title: t('profile.helpFamilyHow'), text: t('profile.helpFamilyHowText'), tip: t('profile.helpFamilyTip') },
      ]} />
      <HelpCenter visible={showHelpMembers} onClose={() => setShowHelpMembers(false)} title={t('profile.helpMembersTitle')} sections={[
        { icon: '👥', title: t('profile.helpMembersWhat'), text: t('profile.helpMembersWhatText') },
        { icon: '👑', title: t('profile.helpMembersOwner'), text: t('profile.helpMembersOwnerText') },
        { icon: '🛡️', title: t('profile.helpMembersAdmin'), text: t('profile.helpMembersAdminText') },
        { icon: '👤', title: t('profile.helpMembersMember'), text: t('profile.helpMembersMemberText') },
        { icon: '👉', title: t('profile.helpMembersHow'), text: t('profile.helpMembersHowText'), tip: t('profile.helpMembersTip') },
      ]} />
      <HelpCenter visible={showHelpSpond} onClose={() => setShowHelpSpond(false)} title={t('profile.helpSpondTitle')} sections={[
        { icon: '⚽', title: t('profile.helpSpondWhat'), text: t('profile.helpSpondWhatText') },
        { icon: '👉', title: t('profile.helpSpondHow'), text: t('profile.helpSpondHowText'), tip: t('profile.helpSpondTip') },
      ]} />

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  familySubtitle: {
    fontSize: 14,
    fontStyle: 'italic',
    marginLeft: 36,
    marginTop: 2,
    marginBottom: 8,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 8,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 50,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  changePhotoText: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
  },
  input: {
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    flex: 1,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
  },
  value: {
    fontSize: 16,
  },
  editIcon: {
    fontSize: 14,
    fontWeight: '600',
  },
  editRow: {
    flexDirection: 'row',
    gap: 8,
  },
  saveButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  cancelButtonText: {
    fontWeight: '600',
  },
  themeOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  themeOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  themeText: {
    fontWeight: '600',
  },
  langOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  langText: {
    fontSize: 13,
    fontWeight: '600',
  },
  familyCard: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  familyName: {
    fontSize: 18,
    fontWeight: '600',
  },
  familyId: {
    fontSize: 12,
    marginTop: 4,
  },
  memberList: {
    marginTop: 12,
    borderTopWidth: 1,
    paddingTop: 12,
  },
  memberListTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '500',
  },
  memberEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  memberBadge: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },
  noFamily: {
    fontSize: 14,
    marginBottom: 12,
  },
  familyActions: {
    flexDirection: 'row',
    gap: 8,
  },
  familyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  familyButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  leaveButton: {
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  leaveButtonText: {
    fontWeight: '600',
  },
  logoutButton: {
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 40,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
    width: '85%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  modalInput: {
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalCreateButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalCreateText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  searchButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  searchResults: {
    marginBottom: 16,
  },
  searchResultItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '600',
  },
  searchResultMembers: {
    fontSize: 14,
    marginTop: 2,
  },
  calendarInput: {
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
  },
  calendarProviderButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
});
