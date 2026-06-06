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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  joinFamily,
  leaveFamily,
  searchFamilyByName,
  UserProfile,
  Family,
} from '../services/familyService';
import {
  requestCalendarPermission,
  pickCalendar,
  getCalendarName,
} from '../services/calendarService';
import { isAdmin } from '../services/familyService';
import { getErrorMessage } from '../utils/validation';
import { crossAlert } from '../utils/alert';
import { uriToBlob } from '../utils/upload';
import { IMAGE_QUALITY } from '../constants/limits';
import { SpondGroup, SpondMember } from '../types';
import { loginSpond, getSpondGroups, getSpondMembers, saveSpondConfig, getSpondConfig, clearSpondToken } from '../services/spondService';

export const ProfileScreen: React.FC = () => {
  const user = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);
  const familyId = useUserStore((state) => state.familyId);
  const familyName = useUserStore((state) => state.familyName);
  const setFamily = useUserStore((state) => state.setFamily);
  const { colors, mode, setMode } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.displayName || '');
  const [showCreateFamily, setShowCreateFamily] = useState(false);
  const [showJoinFamily, setShowJoinFamily] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Family[]>([]);
  const [loading, setLoading] = useState(true);
  const [calendarName, setCalendarName] = useState<string | null>(null);
  const [calendarEmail, setCalendarEmail] = useState('');
  const [calendarProvider, setCalendarProvider] = useState<'google' | 'outlook' | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [spondEmail, setSpondEmail] = useState('');
  const [spondPassword, setSpondPassword] = useState('');
  const [spondGroups, setSpondGroups] = useState<SpondGroup[]>([]);
  const [spondSelectedGroups, setSpondSelectedGroups] = useState<string[]>([]);
  const [spondConnected, setSpondConnected] = useState(false);
  const [spondLoading, setSpondLoading] = useState(false);
  const [spondAllMembers, setSpondAllMembers] = useState<SpondMember[]>([]);
  const [spondRespondents, setSpondRespondents] = useState<string[]>([]);

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
        setFamily(userProfile.familyId, userProfile.familyName);
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
      if (userProfile?.familyId) {
        const spondConfig = await getSpondConfig(userProfile.familyId);
        if (spondConfig) {
          setSpondEmail(spondConfig.email);
          setSpondConnected(true);
          setSpondSelectedGroups(spondConfig.groups.map((g) => g.id));
          if (spondConfig.respondents) {
            setSpondRespondents(spondConfig.respondents.map((r) => r.spondId));
          }
        }
      }
      setLoading(false);
    };

    loadProfile();
  }, [user?.uid]);

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

  const handleCreateFamily = useCallback(async () => {
    if (!newFamilyName.trim() || !user) return;
    try {
      const id = await createFamily(newFamilyName.trim(), user.uid);
      setFamily(id, newFamilyName.trim());
      setNewFamilyName('');
      setShowCreateFamily(false);
      Alert.alert('Suksess', `Familie "${newFamilyName.trim()}" er opprettet`);
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error));
    }
  }, [newFamilyName, user, setFamily]);

  const handleSearchFamily = useCallback(async () => {
    if (!searchQuery.trim()) return;
    try {
      const results = await searchFamilyByName(searchQuery.trim());
      setSearchResults(results.filter((f) => f.id !== familyId));
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error));
    }
  }, [searchQuery, familyId]);

  const handleJoinFamily = useCallback(async (family: Family) => {
    if (!user) return;
    try {
      const success = await joinFamily(family.id, user.uid);
      if (success) {
        setFamily(family.id, family.name);
        setShowJoinFamily(false);
        setSearchQuery('');
        setSearchResults([]);
        Alert.alert('Suksess', `Du har blitt med i "${family.name}"`);
      } else {
        Alert.alert('Error', 'Kunne ikke bli med i familien');
      }
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error));
    }
  }, [user, setFamily]);

  const handleLeaveFamily = () => {
    if (!user) return;
    crossAlert(
      'Forlat familie',
      'Er du sikker på at du vil forlate denne familien?',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Forlat',
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
    setUploading(true);
    try {
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
      const storageRef = ref(storage, `avatars/${user.uid}`);
      await uploadBytes(storageRef, blob);
      const downloadUrl = await getDownloadURL(storageRef);
      await createOrUpdateUser(user.uid, { avatarUrl: downloadUrl });
      setProfile((prev) => prev ? { ...prev, avatarUrl: downloadUrl } : prev);
    } catch (error) {
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
    setProfile((prev) => prev ? { ...prev, calendarId: calendar.id } : prev);
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
            setProfile((prev) => prev ? { ...prev, calendarId: null } : prev);
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
      setProfile((prev) => prev ? { ...prev, calendarEmail: calendarEmail.trim(), calendarProvider: provider } : prev);
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
      setProfile((prev) => prev ? { ...prev, calendarEmail: null, calendarProvider: null } : prev);
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  }, [user]);

  const handleToggleNotifications = useCallback(async (value: boolean) => {
    if (!user) return;
    try {
      await createOrUpdateUser(user.uid, { notificationsEnabled: value });
      setNotificationsEnabled(value);
      setProfile((prev) => prev ? { ...prev, notificationsEnabled: value } : prev);
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
      setSpondGroups(groups);
      setSpondConnected(true);

      const allMembers: SpondMember[] = [];
      for (const group of groups) {
        try {
          const members = await getSpondMembers(spondEmail.trim(), spondPassword, group.id);
          allMembers.push(...members);
        } catch {
          // Continue
        }
      }
      const unique = allMembers.filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i);
      setSpondAllMembers(unique);

      crossAlert('Suksess', `Koblet til Spond. ${groups.length} gruppe(r) funnet.`);
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    } finally {
      setSpondLoading(false);
    }
  }, [spondEmail, spondPassword]);

  const handleToggleSpondGroup = useCallback((groupId: string) => {
    setSpondSelectedGroups((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  }, []);

  const handleToggleSpondRespondent = useCallback((spondId: string) => {
    setSpondRespondents((prev) =>
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
        .map((m) => ({ uid: '', spondId: m.id, firstName: m.firstName, lastName: m.lastName }));
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
        <Text style={[styles.title, { color: colors.text }]}>Profil</Text>
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface, alignItems: 'center' }]}>
        <TouchableOpacity onPress={handlePickImage} disabled={uploading}>
          {profile?.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
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
          <Text style={[styles.changePhotoText, { color: colors.accent }]}>Ta bilde</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Konto</Text>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Navn</Text>
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
                <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Avbryt</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.valueRow, { backgroundColor: colors.inputBackground }]}
              onPress={() => setEditingName(true)}
            >
              <Text style={[styles.value, { color: colors.text }]}>{user?.displayName}</Text>
              <Text style={[styles.editIcon, { color: colors.accent }]}>Rediger</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>E-post</Text>
          <View style={[styles.valueRow, { backgroundColor: colors.inputBackground }]}>
            <Text style={[styles.value, { color: colors.text }]}>{user?.email}</Text>
          </View>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Kalender</Text>
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
              <Text style={[styles.leaveButtonText, { color: colors.danger }]}>Koble fra</Text>
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
              <Text style={[styles.leaveButtonText, { color: colors.danger }]}>Koble fra kalender</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.familyButton, { backgroundColor: colors.accent }]}
            onPress={handleConnectCalendar}
          >
            <Text style={styles.familyButtonText}>Koble til kalender</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Tema</Text>
        <View style={styles.themeOptions}>
          {(['light', 'dark', 'system'] as const).map((themeMode) => (
            <TouchableOpacity
              key={themeMode}
              style={[
                styles.themeOption,
                { backgroundColor: colors.inputBackground, borderColor: colors.border },
                mode === themeMode && { backgroundColor: colors.accent, borderColor: colors.accent },
              ]}
              onPress={() => setMode(themeMode)}
            >
              <Text style={[styles.themeText, { color: mode === themeMode ? '#fff' : colors.text }]}>
                {themeMode === 'light' ? 'Lys' : themeMode === 'dark' ? 'Mørk' : 'System'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {Platform.OS !== 'web' && (
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Varsler</Text>
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
                {notificationsEnabled ? 'På' : 'Av'}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.noFamily, { color: colors.textDisabled, marginTop: 8 }]}>
            {notificationsEnabled ? 'Påminnelser sendes før arrangementer.' : 'Varsler er deaktivert.'}
          </Text>
        </View>
      )}

      {isAdmin(user?.email) && (
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Familie</Text>

          {familyId ? (
            <View>
              <View style={[styles.familyCard, { backgroundColor: colors.inputBackground }]}>
                <Text style={[styles.familyName, { color: colors.text }]}>{familyName}</Text>
                <Text style={[styles.familyId, { color: colors.textSecondary }]}>ID: {familyId}</Text>
              </View>
              <TouchableOpacity
                style={[styles.leaveButton, { borderColor: colors.danger }]}
                onPress={handleLeaveFamily}
              >
                <Text style={[styles.leaveButtonText, { color: colors.danger }]}>Forlat familie</Text>
              </TouchableOpacity>
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
                <TouchableOpacity
                  style={[styles.familyButton, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                  onPress={() => setShowJoinFamily(true)}
                >
                  <Text style={[styles.familyButtonText, { color: colors.text }]}>Bli med i familie</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}

      {isAdmin(user?.email) && (
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Spond konfigurasjon</Text>

          {spondConnected && spondGroups.length > 0 ? (
            <View>
              <View style={[styles.valueRow, { backgroundColor: colors.inputBackground }]}>
                <Text style={[styles.value, { color: colors.text }]}>{spondEmail}</Text>
                <Text style={[styles.editIcon, { color: colors.accent }]}>Koblet til</Text>
              </View>

              <Text style={[styles.label, { color: colors.textSecondary, marginTop: 12 }]}>Velg grupper</Text>
              {spondGroups.map((group) => (
                <TouchableOpacity
                  key={group.id}
                  style={[styles.valueRow, { backgroundColor: colors.inputBackground, marginBottom: 6 }]}
                  onPress={() => handleToggleSpondGroup(group.id)}
                >
                  <Text style={[styles.value, { color: colors.text }]}>{group.name}</Text>
                  <Text style={[styles.editIcon, { color: spondSelectedGroups.includes(group.id) ? colors.accent : colors.textDisabled }]}>
                    {spondSelectedGroups.includes(group.id) ? '✅' : '⬜'}
                  </Text>
                </TouchableOpacity>
              ))}

              {spondAllMembers.length > 0 && (
                <>
                  <Text style={[styles.label, { color: colors.textSecondary, marginTop: 16 }]}>Velg respondenter (hvem kan svare)</Text>
                  {spondAllMembers.map((member) => (
                    <TouchableOpacity
                      key={member.id}
                      style={[styles.valueRow, { backgroundColor: colors.inputBackground, marginBottom: 6 }]}
                      onPress={() => handleToggleSpondRespondent(member.id)}
                    >
                      <Text style={[styles.value, { color: colors.text }]}>{member.firstName} {member.lastName}</Text>
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
                  <Text style={styles.familyButtonText}>Lagre</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.leaveButton, { borderColor: colors.danger }]}
                  onPress={handleDisconnectSpond}
                >
                  <Text style={[styles.leaveButtonText, { color: colors.danger }]}>Koble fra</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View>
              <Text style={[styles.noFamily, { color: colors.textSecondary }]}>
                Koble til Spond for å vise lagets arrangementer.
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
                <Text style={styles.familyButtonText}>{spondLoading ? 'Kobler til...' : 'Koble til Spond'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      <TouchableOpacity style={[styles.logoutButton, { backgroundColor: colors.danger }]} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logg ut</Text>
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
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Avbryt</Text>
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

      <Modal visible={showJoinFamily} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Bli med i familie</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.inputBackground, color: colors.text }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Søk etter familienavn"
              placeholderTextColor={colors.textDisabled}
              onSubmitEditing={handleSearchFamily}
            />
            <TouchableOpacity
              style={[styles.searchButton, { backgroundColor: colors.accent }]}
              onPress={handleSearchFamily}
            >
              <Text style={styles.searchButtonText}>Søk</Text>
            </TouchableOpacity>

            {searchResults.length > 0 && (
              <View style={styles.searchResults}>
                {searchResults.map((family) => (
                  <TouchableOpacity
                    key={family.id}
                    style={[styles.searchResultItem, { borderBottomColor: colors.border }]}
                    onPress={() => handleJoinFamily(family)}
                  >
                    <Text style={[styles.searchResultName, { color: colors.text }]}>{family.name}</Text>
                    <Text style={[styles.searchResultMembers, { color: colors.textSecondary }]}>
                      {family.members.length} medlemmer
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => { setShowJoinFamily(false); setSearchQuery(''); setSearchResults([]); }}
              >
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Lukk</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </ScrollView>
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
