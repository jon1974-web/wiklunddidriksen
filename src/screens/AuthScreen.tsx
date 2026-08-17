import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, User } from 'firebase/auth';
import { auth } from '../services/firebase';
import { useUserStore } from '../store/userStore';
import { useTheme } from '../theme/ThemeContext';
import { createOrUpdateUser, getUserProfile, joinFamilyByInviteCode, createFamily } from '../services/familyService';
import { getErrorMessage } from '../utils/validation';
import { crossAlert } from '../utils/alert';
import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '../constants/languages';
import { setLanguage } from '../i18n';

const TEAL = '#0097A7';

type Step = 'account' | 'language' | 'family';

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
  const [step, setStep] = useState<Step>(hasInvite ? 'language' : 'account');
  const [selectedLanguage, setSelectedLanguage] = useState('nb');
  const [familyName, setFamilyName] = useState('');
  const [authUser, setAuthUser] = useState<User | null>(null);

  useEffect(() => {
    if (hasInvite) setStep('language');
  }, [hasInvite]);

  const handleJoin = async (user: User) => {
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

    // If already authenticated (went back from step 2/3), just proceed
    if (authUser) {
      setStep('language');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const result = await signInWithEmailAndPassword(auth, email, password);
        const userProfile = await getUserProfile(result.user.uid);
        const displayName = userProfile?.displayName || result.user.displayName || 'User';
        setAuthUser(result.user);
        setUser({
          uid: result.user.uid,
          email: result.user.email || '',
          displayName,
          avatarUrl: userProfile?.avatarUrl || undefined,
        });

        if (hasInvite) {
          await handleJoin(result.user);
        }
      } else {
        try {
          const result = await createUserWithEmailAndPassword(auth, email, password);
          const uid = result.user.uid;
          const userEmail = result.user.email || '';
          const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          await updateProfile(result.user, { displayName: name });
          await createOrUpdateUser(uid, {
            uid,
            email: userEmail,
            displayName: name,
            timezone,
          });

          setAuthUser(result.user);

          if (hasInvite) {
            await handleJoin(result.user);
          } else {
            setStep('language');
          }
        } catch (registerError: any) {
          if (registerError?.code === 'auth/email-already-in-use') {
            const result = await signInWithEmailAndPassword(auth, email, password);
            const userProfile = await getUserProfile(result.user.uid);
            const displayName = userProfile?.displayName || result.user.displayName || name;
            const timezone = userProfile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
            if (!userProfile?.timezone) {
              await createOrUpdateUser(result.user.uid, { timezone });
            }
            setAuthUser(result.user);
            setUser({
              uid: result.user.uid,
              email: result.user.email || '',
              displayName,
              avatarUrl: userProfile?.avatarUrl || undefined,
              timezone,
            });

            if (hasInvite) {
              await handleJoin(result.user);
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

  const handleLanguageSelect = () => {
    setLanguage(selectedLanguage);
    if (hasInvite && authUser) {
      handleJoin(authUser);
    } else {
      setStep('family');
    }
  };

  const handleCreateFamily = async () => {
    if (!familyName.trim()) {
      crossAlert(t('common.error'), t('auth.familyNameRequired'));
      return;
    }
    setLoading(true);
    try {
      const result = await createFamily(familyName.trim());
      setFamily(result.familyId, familyName.trim(), 'owner');
      if (authUser) {
        const userProfile = await getUserProfile(authUser.uid);
        setUser({
          uid: authUser.uid,
          email: authUser.email || '',
          displayName: userProfile?.displayName || authUser.displayName || name,
          avatarUrl: userProfile?.avatarUrl || undefined,
        });
      }
    } catch (error: any) {
      crossAlert(t('common.error'), getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const renderAccountStep = () => (
    <>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {isLogin ? t('auth.login') : t('auth.register')}
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
        style={[styles.button, { backgroundColor: TEAL, opacity: loading ? 0.6 : 1 }]}
        onPress={handleAuth}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? '...' : hasInvite ? (isLogin ? t('auth.inviteLoginButton') : t('auth.inviteRegisterButton')) : isLogin ? t('auth.loginButton') : t('auth.registerButton')}
        </Text>
      </TouchableOpacity>

      {!hasInvite && (
        <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
          <Text style={[styles.switchText, { color: TEAL }]}>
            {isLogin ? t('auth.noAccount') : t('auth.hasAccount')}
          </Text>
        </TouchableOpacity>
      )}

      {!hasInvite && !isLogin && (
        <Text style={[styles.hintText, { color: colors.textDisabled }]}>
          {t('auth.registerHint')}
        </Text>
      )}
    </>
  );

  const renderLanguageStep = () => (
    <>
      <TouchableOpacity onPress={() => setStep('account')} style={[styles.backBtn, { borderColor: TEAL }]}>
        <Text style={{ color: TEAL, fontSize: 18 }}>←</Text>
      </TouchableOpacity>

      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {t('auth.selectLanguage')}
      </Text>

      <View style={styles.languageRow}>
        {LANGUAGES.filter(l => l.hasTranslation).map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={[
              styles.langChip,
              {
                backgroundColor: selectedLanguage === lang.code ? TEAL : colors.surface,
                borderColor: selectedLanguage === lang.code ? TEAL : colors.border,
              },
            ]}
            onPress={() => setSelectedLanguage(lang.code)}
          >
            <Text style={styles.langFlag}>{lang.flag}</Text>
            <Text style={[styles.langCode, { color: selectedLanguage === lang.code ? '#fff' : colors.text }]}>
              {lang.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: TEAL, opacity: loading ? 0.6 : 1 }]}
        onPress={handleLanguageSelect}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? '...' : t('common.continue')}</Text>
      </TouchableOpacity>
    </>
  );

  const renderFamilyStep = () => (
    <>
      <TouchableOpacity onPress={() => setStep('language')} style={[styles.backBtn, { borderColor: TEAL }]}>
        <Text style={{ color: TEAL, fontSize: 18 }}>←</Text>
      </TouchableOpacity>

      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {t('auth.createFamily')}
      </Text>

      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
        placeholder={t('auth.familyName')}
        placeholderTextColor={colors.textDisabled}
        value={familyName}
        onChangeText={setFamilyName}
        autoCapitalize="words"
      />

      <TouchableOpacity
        style={[styles.button, { backgroundColor: TEAL, opacity: loading ? 0.6 : 1 }]}
        onPress={handleCreateFamily}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? '...' : t('auth.createFamilyButton')}</Text>
      </TouchableOpacity>
    </>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Image source={require('../../assets/icon.png')} style={{ width: 100, height: 100, borderRadius: 24, marginBottom: 16, alignSelf: 'center' }} />
        <Text style={[styles.title, { color: TEAL }]}>{t('auth.title')}</Text>

        {step !== 'account' && (
          <View style={styles.progressRow}>
            {['account', 'language', 'family'].map((s, i) => (
              <View key={s} style={[styles.progressDot, { backgroundColor: i <= ['account', 'language', 'family'].indexOf(step) ? TEAL : colors.border }]} />
            ))}
          </View>
        )}

        {step === 'account' && renderAccountStep()}
        {step === 'language' && renderLanguageStep()}
        {step === 'family' && renderFamilyStep()}

        {/* Language selector on login page */}
        {step === 'account' && (
          <View style={styles.loginLangRow}>
            {LANGUAGES.filter(l => l.hasTranslation).map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.loginLangChip,
                  {
                    backgroundColor: selectedLanguage === lang.code ? TEAL : colors.surface,
                    borderColor: selectedLanguage === lang.code ? TEAL : colors.border,
                  },
                ]}
                onPress={() => {
                  setSelectedLanguage(lang.code);
                  setLanguage(lang.code);
                }}
              >
                <Text style={styles.loginLangFlag}>{lang.flag}</Text>
                <Text style={[styles.loginLangCode, { color: selectedLanguage === lang.code ? '#fff' : colors.text }]}>
                  {lang.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Legal text */}
        <Text style={[styles.legalText, { color: colors.textDisabled }]}>
          {t('auth.legalPrefix')}{' '}
          <Text style={[styles.legalLink, { color: TEAL }]} onPress={() => Linking.openURL(`/docs/terms-${selectedLanguage}.html`)}>{t('auth.termsLink')}</Text>
          {' '}{t('auth.legalAnd')}{' '}
          <Text style={[styles.legalLink, { color: TEAL }]} onPress={() => Linking.openURL(`/docs/privacy-${selectedLanguage}.html`)}>{t('auth.privacyLink')}</Text>
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 60,
    flexGrow: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 32,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
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
  languageRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  langChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  langFlag: {
    fontSize: 16,
  },
  langCode: {
    fontSize: 12,
    fontWeight: '700',
  },
  legalText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 32,
    lineHeight: 18,
  },
  legalLink: {
    fontWeight: '600',
  },
  loginLangRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 24,
    marginBottom: 8,
  },
  loginLangChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  loginLangFlag: {
    fontSize: 14,
  },
  loginLangCode: {
    fontSize: 10,
    fontWeight: '700',
  },
});
