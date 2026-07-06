import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../services/firebase';
import { useUserStore } from '../store/userStore';
import { useTheme } from '../theme/ThemeContext';
import { createOrUpdateUser, getUserProfile, joinFamilyByInviteCode } from '../services/familyService';
import { getErrorMessage } from '../utils/validation';
import { crossAlert } from '../utils/alert';
import { useTranslation } from 'react-i18next';

export const AuthScreen: React.FC = () => {
  const { t } = useTranslation();
  const setUser = useUserStore((state) => state.setUser);
  const setFamily = useUserStore((state) => state.setFamily);
  const pendingInviteCode = useUserStore((state) => state.pendingInviteCode);
  const pendingInviteFamilyName = useUserStore((state) => state.pendingInviteFamilyName);
  const setPendingInviteCode = useUserStore((state) => state.setPendingInviteCode);
  const { colors } = useTheme();

  const hasInvite = !!pendingInviteCode;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLogin, setIsLogin] = useState(!hasInvite);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (hasInvite) setIsLogin(false);
  }, [hasInvite]);

  const handleJoin = async () => {
    if (!pendingInviteCode) return;
    try {
      const joinResult = await joinFamilyByInviteCode(pendingInviteCode);
      setFamily(joinResult.familyId, joinResult.familyName, 'member');
      setPendingInviteCode(null);
      try { localStorage.removeItem('pendingInviteCode'); } catch {}
      try { localStorage.removeItem('pendingInviteFamilyName'); } catch {}
    } catch (joinError) {
      crossAlert(t('common.error'), getErrorMessage(joinError) + '\n\n' + t('auth.inviteJoinHint'));
    }
  };

  const handleAuth = async () => {
    if (!email || !password || (!isLogin && !name)) {
      crossAlert(t('common.error'), 'Vennligst fyll inn alle feltene');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const result = await signInWithEmailAndPassword(auth, email, password);
        const userProfile = await getUserProfile(result.user.uid);
        const displayName = userProfile?.displayName || result.user.displayName || 'User';
        setUser({
          uid: result.user.uid,
          email: result.user.email || '',
          displayName,
        });

        if (hasInvite) {
          await handleJoin();
        }
      } else {
        try {
          const result = await createUserWithEmailAndPassword(auth, email, password);
          const uid = result.user.uid;
          const userEmail = result.user.email || '';
          await updateProfile(result.user, { displayName: name });
          await createOrUpdateUser(uid, {
            uid,
            email: userEmail,
            displayName: name,
          });

          if (hasInvite) {
            await handleJoin();
          }

          setUser({
            uid,
            email: userEmail,
            displayName: name,
          });
        } catch (registerError: any) {
          if (registerError?.code === 'auth/email-already-in-use') {
            const result = await signInWithEmailAndPassword(auth, email, password);
            const userProfile = await getUserProfile(result.user.uid);
            const displayName = userProfile?.displayName || result.user.displayName || name;
            setUser({
              uid: result.user.uid,
              email: result.user.email || '',
              displayName,
            });

            if (hasInvite) {
              await handleJoin();
            }
          } else {
            throw registerError;
          }
        }
      }
    } catch (error: any) {
      crossAlert(t('common.error'), getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Image source={require('../../assets/icon.png')} style={{ width: 100, height: 100, borderRadius: 24, marginBottom: 16, alignSelf: 'center' }} />
      <Text style={[styles.title, { color: '#0097A7' }]}>{t('auth.title')}</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {hasInvite ? t('auth.inviteTitle') : isLogin ? t('auth.login') : t('auth.register')}
      </Text>

      {hasInvite && (
        <View style={[styles.inviteBanner, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
          <Text style={[styles.inviteBannerText, { color: colors.text }]}>
            {t('auth.inviteBanner')} <Text style={{ fontWeight: 'bold' }}>{pendingInviteFamilyName || 'en familie'}</Text>
          </Text>
          <Text style={[styles.inviteBannerSubtext, { color: colors.textSecondary }]}>
            {isLogin ? t('auth.inviteLoginHint') : t('auth.inviteRegisterHint')}
          </Text>
        </View>
      )}

      {!isLogin && (
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
          placeholder={t('auth.name')}
          placeholderTextColor={colors.textDisabled}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
      )}

      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
        placeholder={t('auth.email')}
        placeholderTextColor={colors.textDisabled}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
        placeholder={t('auth.password')}
        placeholderTextColor={colors.textDisabled}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#0097A7', opacity: loading ? 0.6 : 1 }]}
        onPress={handleAuth}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? '...' : hasInvite ? (isLogin ? t('auth.inviteLoginButton') : t('auth.inviteRegisterButton')) : isLogin ? t('auth.loginButton') : t('auth.registerButton')}
        </Text>
      </TouchableOpacity>

      {!hasInvite && (
        <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
          <Text style={[styles.switchText, { color: '#0097A7' }]}>
            {isLogin ? t('auth.noAccount') : t('auth.hasAccount')}
          </Text>
        </TouchableOpacity>
      )}

      {!hasInvite && !isLogin && (
        <Text style={[styles.hintText, { color: colors.textDisabled }]}>
          {t('auth.registerHint')}
        </Text>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 32,
  },
  inviteBanner: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    alignItems: 'center',
  },
  inviteBannerText: {
    fontSize: 16,
    textAlign: 'center',
  },
  inviteBannerSubtext: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  input: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  switchText: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 14,
  },
  hintText: {
    textAlign: 'center',
    marginTop: 12,
    fontSize: 13,
  },
});
