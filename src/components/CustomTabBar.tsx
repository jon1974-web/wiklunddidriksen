import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Rect, Line, Path, Circle, Polyline } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useChatStore } from '../store/chatStore';

interface TabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
  onCreatePress: () => void;
}

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

  if (icon === 'chat') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </Svg>
  );

  if (icon === 'house') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
      <Polyline points="9 22 9 12 15 12 15 22"/>
    </Svg>
  );

  if (icon === 'person') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
      <Circle cx="12" cy="7" r="4"/>
    </Svg>
  );

  return null;
};

const TAB_ICONS: Record<string, string> = {
  Events: 'calendar',
  Chat: 'chat',
  Trips: 'house',
  Profile: 'person',
};

const TAB_KEYS: Record<string, string> = {
  Events: 'tabs.events',
  Chat: 'tabs.chat',
  Trips: 'tabs.trips',
  Profile: 'tabs.profile',
};

export const CustomTabBar: React.FC<TabBarProps> = React.memo(({ state, descriptors, navigation, onCreatePress }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const chatInputFocused = useChatStore((s) => s.inputFocused);

  return (
    <View style={[styles.tabBar, { backgroundColor: colors.surface, borderColor: colors.accent }]}>
      {state.routes.map((route: any, index: number) => {
        const isFocused = state.index === index;
        const icon = TAB_ICONS[route.name] || 'calendar';
        const label = t(TAB_KEYS[route.name] || route.name);

        const onPress = () => {
          if (route.name === 'Trips') {
            navigation.navigate('Trips', { screen: 'SpacesList' });
          } else {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity key={route.key} style={styles.tabItem} onPress={onPress} activeOpacity={0.7}>
            <TabIcon icon={icon} focused={isFocused} accentColor={colors.accent} />
            <Text style={[styles.tabLabel, { color: isFocused ? colors.accent : colors.textDisabled }, isFocused && styles.tabLabelActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity
        style={[styles.centerBtn, { backgroundColor: colors.accent }, chatInputFocused && styles.centerBtnHidden]}
        onPress={onCreatePress}
        activeOpacity={0.8}
        disabled={chatInputFocused}
      >
        <Text style={styles.plus}>+</Text>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 6,
    paddingBottom: 4,
    borderWidth: 1.5,
    borderRadius: 28,
    height: 62,
    position: 'relative',
    marginHorizontal: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingTop: 4,
  },
  tabLabel: {
    fontSize: 10,
  },
  tabLabelActive: {
    fontWeight: '600',
  },
  centerBtn: {
    position: 'absolute',
    top: -14,
    left: '50%',
    marginLeft: -26,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    opacity: 1,
    transform: [{ scale: 1 }],
  },
  centerBtnHidden: {
    opacity: 0,
    transform: [{ scale: 0.5 }],
    pointerEvents: 'none' as const,
  },
  plus: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '300',
    lineHeight: 32,
  },
});
