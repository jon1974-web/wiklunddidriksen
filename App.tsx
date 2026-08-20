import React, { useEffect, useState, Suspense, useRef } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { View, TouchableOpacity, Text, ActivityIndicator, Image, Animated } from 'react-native';
import Svg, { Rect, Line, Path, Circle, Polygon, Polyline } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { CustomTabBar } from './src/components/CustomTabBar';
import { QuickCreateModal } from './src/components/QuickCreateModal';

import './src/i18n';
import i18n from './src/i18n';

import { auth } from './src/services/firebase';
import { useUserStore } from './src/store/userStore';
import { useChatStore } from './src/store/chatStore';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { getUserProfile, createOrUpdateUser } from './src/services/familyService';
import { configureNotifications, requestNotificationPermission } from './src/services/notificationService';
import { crossAlert } from './src/utils/alert';

import { AuthScreen } from './src/screens/AuthScreen';
import { EventsScreen } from './src/screens/EventsScreen';
import { ShoppingListsScreen } from './src/screens/ShoppingListsScreen';
import { ChatScreen } from './src/screens/ChatScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { BirthdayScreen } from './src/screens/BirthdayScreen';
import { SpacesScreen } from './src/screens/SpacesScreen';
import { TripsScreen } from './src/screens/TripsScreen';
import { HealthSpaceScreen } from './src/screens/HealthSpaceScreen';
import { BirthdaySpaceScreen } from './src/screens/BirthdaySpaceScreen';
import { PetSpaceScreen } from './src/screens/PetSpaceScreen';
import { PetVetDetailScreen } from './src/screens/PetVetDetailScreen';
import { PetVaccDetailScreen } from './src/screens/PetVaccDetailScreen';
import { PetMedDetailScreen } from './src/screens/PetMedDetailScreen';
import { PetGroomDetailScreen } from './src/screens/PetGroomDetailScreen';
import { HealthApptDetailScreen } from './src/screens/HealthApptDetailScreen';
import { HealthMedDetailScreen } from './src/screens/HealthMedDetailScreen';
import { HealthVaccDetailScreen } from './src/screens/HealthVaccDetailScreen';
import { SchoolSpaceScreen } from './src/screens/SchoolSpaceScreen';
import { KindergartenSpaceScreen } from './src/screens/KindergartenSpaceScreen';
import { KindergartenContactDetailScreen } from './src/screens/KindergartenContactDetailScreen';
import { SchoolContactDetailScreen } from './src/screens/SchoolContactDetailScreen';
import { MealPlanScreen } from './src/screens/MealPlanScreen';
import { OfflineBanner } from './src/components/OfflineBanner';

const AddEventScreen = React.lazy(() => import('./src/screens/AddEventScreen').then(m => ({ default: m.AddEventScreen })));
const EventDetailScreen = React.lazy(() => import('./src/screens/EventDetailScreen').then(m => ({ default: m.EventDetailScreen })));
const ShoppingListDetailScreen = React.lazy(() => import('./src/screens/ShoppingListDetailScreen').then(m => ({ default: m.ShoppingListDetailScreen })));
const RecipeDetailScreen = React.lazy(() => import('./src/screens/RecipeDetailScreen').then(m => ({ default: m.RecipeDetailScreen })));
const VoiceEventScreen = React.lazy(() => import('./src/screens/VoiceEventScreen').then(m => ({ default: m.VoiceEventScreen })));
const PhotoEventScreen = React.lazy(() => import('./src/screens/PhotoEventScreen').then(m => ({ default: m.PhotoEventScreen })));
const PhotoRecipeScreen = React.lazy(() => import('./src/screens/PhotoRecipeScreen').then(m => ({ default: m.PhotoRecipeScreen })));
const AddTripScreen = React.lazy(() => import('./src/screens/AddTripScreen').then(m => ({ default: m.AddTripScreen })));
const TripDetailScreen = React.lazy(() => import('./src/screens/TripDetailScreen').then(m => ({ default: m.TripDetailScreen })));
const TransportDetailScreen = React.lazy(() => import('./src/screens/TransportDetailScreen').then(m => ({ default: m.TransportDetailScreen })));
const SpondEventDetailScreen = React.lazy(() => import('./src/screens/SpondEventDetailScreen').then(m => ({ default: m.SpondEventDetailScreen })));
const TripItemDetailScreen = React.lazy(() => import('./src/screens/TripItemDetailScreen').then(m => ({ default: m.TripItemDetailScreen })));
const PackingListDetailScreen = React.lazy(() => import('./src/screens/PackingListDetailScreen').then(m => ({ default: m.PackingListDetailScreen })));
const SchoolAIScreen = React.lazy(() => import('./src/screens/SchoolAIScreen').then(m => ({ default: m.SchoolAIScreen })));

const SuspenseFallback = () => (
  <ActivityIndicator size="large" style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} />
);

import { Event, Trip, SpondEvent, SpondRespondent, TripHotel, TripRestaurant, TripActivity } from './src/types';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<RootStackParamList>();

type RootStackParamList = {
  EventsList: undefined;
  AddEvent: { event?: Event } | undefined;
  EventDetail: { event: Event };
  EventDetail_Spond: { event: SpondEvent; spondRespondents: SpondRespondent[]; spondConfig: { email: string; password: string } | null };
  VoiceEvent: undefined;
  PhotoEvent: undefined;
  PhotoRecipe: undefined;
  ShoppingLists: undefined;
  ShoppingListDetail: { list: import('./src/types').ShoppingList };
  MealPlan: undefined;
  RecipeDetail: { recipe: import('./src/types').Recipe };
  ChatMain: undefined;
  TripsList: undefined;
  SpacesList: undefined;
  HealthSpace: undefined;
  BirthdaySpace: undefined;
  PetSpace: undefined;
  PetVetDetail: { visit: import('./src/types').PetVetVisit; petName?: string };
  PetVaccDetail: { vaccination: import('./src/types').PetVaccination; petName?: string };
  KindergartenContactDetail: { contact: import('./src/types').KindergartenContact; childId?: string; yearId?: string };
  PetMedDetail: { medication: import('./src/types').PetMedication; petName?: string };
  PetGroomDetail: { grooming: import('./src/types').PetGrooming; petName?: string };
  HealthApptDetail: { appointment: import('./src/types').HealthAppointment };
  HealthMedDetail: { medication: import('./src/types').HealthMedication };
  HealthVaccDetail: { vaccination: import('./src/types').HealthVaccination };
  SchoolSpace: undefined;
  KindergartenSpace: undefined;
  SchoolAI: { childId: string; yearId: string; familyId: string };
  SchoolContactDetail: { contact: any };
  AddTrip: undefined;
  TripDetail: { trip: Trip };
  TransportDetail: { flight: import('./src/types').TripFlight; tripId: string };
  TripItemDetail: { item: any; tripId: string; trip: Trip; itemType: 'hotel' | 'restaurant' | 'activity' };
  PackingListDetail: { list: any; tripId: string };
  ProfileMain: undefined;
  Birthday: undefined;
};

const BackButton = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={() => navigation.goBack()}
      style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: colors.accent, justifyContent: 'center', alignItems: 'center', marginLeft: 8 }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Text style={{ color: colors.accent, fontSize: 16, lineHeight: 18 }}>←</Text>
    </TouchableOpacity>
  );
};

const EventsStack = () => {
  const { colors } = useTheme();
  return (
    <Suspense fallback={<SuspenseFallback />}>
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
            headerLeft: () => <BackButton />,
          }}
        />
        <Stack.Screen
          name="EventDetail"
          component={EventDetailScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="VoiceEvent"
          component={VoiceEventScreen}
          options={{
            title: i18n.t('voice.title'),
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
            headerLeft: () => <BackButton />,
          }}
        />
        <Stack.Screen
          name="PhotoEvent"
          component={PhotoEventScreen}
          options={{
            title: i18n.t('photoEvent.title'),
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
            headerLeft: () => <BackButton />,
          }}
        />
        <Stack.Screen
          name="EventDetail_Spond"
          component={SpondEventDetailScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </Suspense>
  );
};

const MealPlanStack = () => {
  const { colors } = useTheme();
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <Stack.Navigator>
        <Stack.Screen
          name="MealPlan"
          component={MealPlanScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="RecipeDetail"
          component={RecipeDetailScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="ShoppingListDetail"
          component={ShoppingListDetailScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="PhotoRecipe"
          component={PhotoRecipeScreen}
          options={{
            title: i18n.t('photoRecipe.title'),
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
            headerLeft: () => <BackButton />,
          }}
        />
      </Stack.Navigator>
    </Suspense>
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

const TripsStack = () => {
  const { colors } = useTheme();
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <Stack.Navigator>
        <Stack.Screen
          name="SpacesList"
          component={SpacesScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="HealthSpace"
          component={HealthSpaceScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="BirthdaySpace"
          component={BirthdaySpaceScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="PetSpace"
          component={PetSpaceScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="PetVetDetail"
          component={PetVetDetailScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="PetVaccDetail"
          component={PetVaccDetailScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="PetMedDetail"
          component={PetMedDetailScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="PetGroomDetail"
          component={PetGroomDetailScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="HealthApptDetail"
          component={HealthApptDetailScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="HealthMedDetail"
          component={HealthMedDetailScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="HealthVaccDetail"
          component={HealthVaccDetailScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="MealPlan"
          component={MealPlanScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SchoolSpace"
          component={SchoolSpaceScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="KindergartenSpace"
          component={KindergartenSpaceScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="KindergartenContactDetail"
          component={KindergartenContactDetailScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SchoolAI"
          component={SchoolAIScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SchoolContactDetail"
          component={SchoolContactDetailScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="TripsList"
          component={TripsScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AddTrip"
          component={AddTripScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="TripDetail"
          component={TripDetailScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="TransportDetail"
          component={TransportDetailScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="TripItemDetail"
          component={TripItemDetailScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="PackingListDetail"
          component={PackingListDetailScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="RecipeDetail"
          component={RecipeDetailScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ShoppingListDetail"
          component={ShoppingListDetailScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="PhotoRecipe"
          component={PhotoRecipeScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </Suspense>
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
      <Stack.Screen
        name="Birthday"
        component={BirthdayScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

const TabIcon = ({ icon, focused, accentColor }: { icon: string; focused: boolean; accentColor: string }) => {
  const color = focused ? accentColor : '#999';
  const size = 24;

  if (icon === 'calendar') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <Rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <Line x1="16" y1="2" x2="16" y2="6"/>
      <Line x1="8" y1="2" x2="8" y2="6"/>
      <Line x1="3" y1="10" x2="21" y2="10"/>
      <Rect x="7" y="13" width="4" height="4" rx="1" fill={color} stroke="none"/>
    </Svg>
  );

  if (icon === 'utensils') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
      <Path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2"/>
      <Line x1="7" y1="2" x2="7" y2="22"/>
      <Path d="M17 2c0 0 0 5 0 7 0 1.1-.9 2-2 2h-1v11"/>
      <Line x1="14" y1="2" x2="14" y2="22"/>
    </Svg>
  );

  if (icon === 'chat') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </Svg>
  );

  if (icon === 'compass') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="10"/>
      <Polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88" fill={color} stroke="none"/>
    </Svg>
  );

  if (icon === 'person') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
      <Circle cx="12" cy="7" r="4"/>
    </Svg>
  );

  if (icon === 'house') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
      <Polyline points="9 22 9 12 15 12 15 22"/>
    </Svg>
  );

  return null;
};

const navigationRef = createNavigationContainerRef();

const ChatTabBarWrapper = (props: any) => {
  const chatInputFocused = useChatStore((s) => s.inputFocused);
  if (chatInputFocused) return null;
  return <CustomTabBar {...props} onCreatePress={props.onCreatePress} />;
};

const AppContent = () => {
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const user = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);
  const setFamily = useUserStore((state) => state.setFamily);
  const setPendingInviteCode = useUserStore((state) => state.setPendingInviteCode);
  const { colors } = useTheme();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const match = window.location.pathname.match(/^\/invite\/([A-Z0-9]{6})$/);
      if (match) {
        const params = new URLSearchParams(window.location.search);
        const familyName = params.get('name') || null;
        setPendingInviteCode(match[1], familyName);
        try { localStorage.setItem('pendingInviteCode', match[1]); } catch {}
        try { if (familyName) localStorage.setItem('pendingInviteFamilyName', familyName); } catch {}
        window.history.replaceState({}, '', '/');
      } else {
        try {
          const storedCode = localStorage.getItem('pendingInviteCode');
          const storedName = localStorage.getItem('pendingInviteFamilyName');
          if (storedCode) {
            setPendingInviteCode(storedCode, storedName);
          }
        } catch {}
      }
    }
  }, []);

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
        };

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

          // If user has no familyId, they haven't completed registration wizard
          // Don't call setUser — let AuthScreen handle the wizard
          if (profile && !profile.familyId) {
            setLoading(false);
            return;
          }

          const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          setUser({ ...userData, avatarUrl: profile?.avatarUrl || undefined, timezone: profile?.timezone || detectedTimezone });
          if (profile?.familyId) {
            setFamily(profile.familyId, profile.familyName, profile.familyRole || null);
          }
          // Auto-save timezone if not set in profile
          if (!profile?.timezone && detectedTimezone) {
            createOrUpdateUser(userData.uid, { timezone: detectedTimezone }).catch(() => {});
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

  useEffect(() => {
    if (!loading) {
      Animated.timing(splashOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setShowSplash(false));
    }
  }, [loading]);

  // Navigate to Profile after Google Calendar OAuth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('calendar') === 'connected' && navigationRef.isReady()) {
      navigationRef.navigate('Profile');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  if (showSplash) {
    return (
      <Animated.View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', opacity: splashOpacity }}>
        <Image source={require('./assets/icon.png')} style={{ width: 120, height: 120, borderRadius: 28, marginBottom: 24 }} />
        <Text style={{ fontSize: 22, fontWeight: '600', color: colors.text }}>Velkommen til Familiesenter</Text>
      </Animated.View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef}>
        <OfflineBanner />
        {user ? (
          <>
            <Tab.Navigator
              tabBar={(props) => <ChatTabBarWrapper {...props} onCreatePress={() => setShowQuickCreate(true)} />}
              screenOptions={{
                headerShown: false,
              }}
            >
              <Tab.Screen name="Events" component={EventsStack} />
              <Tab.Screen name="Chat" component={ChatStack} />
              <Tab.Screen
                name="Trips"
                component={TripsStack}
                listeners={({ navigation }) => ({
                  tabPress: (e) => {
                    e.preventDefault();
                    navigation.navigate('Trips', { screen: 'SpacesList' });
                  },
                })}
              />
              <Tab.Screen name="Profile" component={ProfileStack} />
            </Tab.Navigator>
            <QuickCreateModal
              visible={showQuickCreate}
              onClose={() => setShowQuickCreate(false)}
              navigation={navigationRef}
            />
          </>
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
