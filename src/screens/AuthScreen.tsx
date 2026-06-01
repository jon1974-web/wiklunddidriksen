import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';
import { useUserStore } from '../store/userStore';
import { useTheme } from '../theme/ThemeContext';
import { createOrUpdateUser, autoJoinFamily, isAdmin } from '../services/familyService';

export const AuthScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const setUser = useUserStore((state) => state.setUser);
  const { colors } = useTheme();

  const handleAuth = async () => {
    if (!email || !password || (!isLogin && !name)) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      if (isLogin) {
        const result = await signInWithEmailAndPassword(auth, email, password);
        setUser({
          uid: result.user.uid,
          email: result.user.email || '',
          displayName: name || result.user.displayName || 'User',
        });
      } else {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        const uid = result.user.uid;
        const userEmail = result.user.email || '';
        const role = isAdmin(userEmail) ? 'admin' : 'member';
        await createOrUpdateUser(uid, {
          uid,
          email: userEmail,
          displayName: name,
        });
        await autoJoinFamily(uid);
        setUser({
          uid,
          email: userEmail,
          displayName: name,
          role,
        });
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.accent }]}>Familiesenter</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{isLogin ? 'Logg inn' : 'Registrer deg'}</Text>

      {!isLogin && (
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
          placeholder="Navn"
          placeholderTextColor={colors.textDisabled}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
      )}

      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
        placeholder="E-post"
        placeholderTextColor={colors.textDisabled}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
        placeholder="Passord"
        placeholderTextColor={colors.textDisabled}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={[styles.button, { backgroundColor: colors.accent }]} onPress={handleAuth}>
        <Text style={styles.buttonText}>{isLogin ? 'Logg inn' : 'Registrer'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
        <Text style={[styles.switchText, { color: colors.accent }]}>
          {isLogin ? 'Har du ikke en konto? Registrer deg' : 'Har du allerede en konto? Logg inn'}
        </Text>
      </TouchableOpacity>
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
});
