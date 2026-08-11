import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Rect, Line, Path, Circle, Polyline } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';

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

const TAB_LABELS: Record<string, string> = {
  Events: 'Arrangementer',
  Chat: 'Chat',
  Trips: 'Våre steder',
  Profile: 'Profil',
};

export const CustomTabBar: React.FC<TabBarProps> = React.memo(({ state, descriptors, navigation, onCreatePress }) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.tabBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
      {state.routes.map((route: any, index: number) => {
        const isFocused = state.index === index;
        const icon = TAB_ICONS[route.name] || 'calendar';
        const label = TAB_LABELS[route.name] || route.name;

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

      <TouchableOpacity style={[styles.centerBtn, { backgroundColor: colors.accent }]} onPress={onCreatePress} activeOpacity={0.8}>
        <Text style={styles.plus}>+</Text>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 8,
    paddingBottom: 8,
    borderTopWidth: 1,
    height: 82,
    position: 'relative',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
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
    top: -28,
    left: '50%',
    marginLeft: -28,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  plus: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '300',
    lineHeight: 34,
  },
});
