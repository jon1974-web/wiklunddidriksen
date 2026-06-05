import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { TouchableOpacity, Text } from 'react-native';

import { auth } from './src/services/firebase';
import { useUserStore } from './src/store/userStore';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { getUserProfile, createOrUpdateUser, isAdmin } from './src/services/familyService';
import { configureNotifications, requestNotificationPermission } from './src/services/notificationService';

import { AuthScreen } from './src/screens/AuthScreen';
import { EventsScreen } from './src/screens/EventsScreen';
import { AddEventScreen } from './src/screens/AddEventScreen';
import { EventDetailScreen } from './src/screens/EventDetailScreen';
import { ShoppingListsScreen } from './src/screens/ShoppingListsScreen';
import { ShoppingListDetailScreen } from './src/screens/ShoppingListDetailScreen';
import { ChatScreen } from './src/screens/ChatScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { VoiceEventScreen } from './src/screens/VoiceEventScreen';
import { OfflineBanner } from './src/components/OfflineBanner';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const EventsStack = () => {
  const { colors } = useTheme();
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="EventsList"
        component={EventsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddEvent"
        component={AddEventScreen}
        options={{
          title: 'Nytt arrangement',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />
      <Stack.Screen
        name="EventDetail"
        component={EventDetailScreen}
        options={{
          title: 'Rediger',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />
      <Stack.Screen
        name="VoiceEvent"
        component={VoiceEventScreen}
        options={{
          title: 'Tal til arrangement',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />
    </Stack.Navigator>
  );
};

const ShoppingStack = () => {
  const { colors } = useTheme();
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ShoppingLists"
        component={ShoppingListsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ShoppingListDetail"
        component={ShoppingListDetailScreen}
        options={({ route }: any) => ({
          title: route.params?.list?.title || 'Handleliste',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        })}
      />
    </Stack.Navigator>
  );
};

const ChatStack = () => {
  const { colors } = useTheme();
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ChatMain"
        component={ChatScreen}
        options={{
          headerShown: false,
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />
    </Stack.Navigator>
  );
};

const ProfileStack = () => {
  const { colors } = useTheme();
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

const TabIcon = ({ label, focused }: { label: string; focused: boolean }) => (
  <Text style={[{ fontSize: 20 }, focused && { transform: [{ scale: 1.1 }] }]}>{label}</Text>
);

const AppContent = () => {
  const [loading, setLoading] = useState(true);
  const user = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);
  const setFamily = useUserStore((state) => state.setFamily);
  const { colors } = useTheme();

  useEffect(() => {
    configureNotifications();
    if (user) {
      getUserProfile(user.uid).then((profile) => {
        if (profile?.notificationsEnabled !== false) {
          requestNotificationPermission();
        }
      });
    }
  }, [user?.uid]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userEmail = firebaseUser.email || '';
        const userData = {
          uid: firebaseUser.uid,
          email: userEmail,
          displayName: firebaseUser.displayName || 'User',
          role: isAdmin(userEmail) ? 'admin' as const : 'member' as const,
        };
        setUser(userData);

        try {
          let profile = await getUserProfile(firebaseUser.uid);
          if (!profile) {
            await createOrUpdateUser(firebaseUser.uid, {
              uid: firebaseUser.uid,
              email: userEmail,
              displayName: firebaseUser.displayName || 'User',
            });
            profile = await getUserProfile(firebaseUser.uid);
          }
          if (profile) {
            setUser({ ...userData, avatarUrl: profile.avatarUrl || undefined });
          }
          if (profile?.familyId) {
            setFamily(profile.familyId, profile.familyName);
          }
        } catch (error) {
          console.log('Error loading profile:', error);
        }
      } else {
        setUser(null);
        setFamily(null, null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <OfflineBanner />
        {user ? (
          <Tab.Navigator
            screenOptions={{
              headerShown: false,
              tabBarShowLabel: false,
              tabBarActiveTintColor: colors.accent,
              tabBarInactiveTintColor: colors.textDisabled,
              tabBarStyle: {
                backgroundColor: colors.surface,
                borderTopColor: colors.border,
                paddingBottom: 8,
                paddingTop: 8,
                height: 60,
              },
              tabBarLabelStyle: {
                fontSize: 12,
                fontWeight: '600',
              },
            }}
          >
            <Tab.Screen
              name="Events"
              component={EventsStack}
              options={{
                tabBarLabel: 'Arrangementer',
                tabBarIcon: ({ focused }) => <TabIcon label="📅" focused={focused} />,
              }}
            />
            <Tab.Screen
              name="Shopping"
              component={ShoppingStack}
              options={{
                tabBarLabel: 'Handleliste',
                tabBarIcon: ({ focused }) => <TabIcon label="🛒" focused={focused} />,
              }}
            />
            <Tab.Screen
              name="Chat"
              component={ChatStack}
              options={{
                tabBarLabel: 'Chat',
                tabBarIcon: ({ focused }) => <TabIcon label="💬" focused={focused} />,
              }}
            />
            <Tab.Screen
              name="Profile"
              component={ProfileStack}
              options={{
                tabBarLabel: 'Profil',
                tabBarIcon: ({ focused }) => <TabIcon label="👤" focused={focused} />,
              }}
            />
          </Tab.Navigator>
        ) : (
          <AuthScreen />
        )}
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
