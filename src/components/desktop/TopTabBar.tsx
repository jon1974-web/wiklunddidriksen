import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { TabIcon } from '../CustomTabBar';

interface TopTabBarProps {
  activeIndex: number;
  profileActive?: boolean;
  onSelect: (name: string) => void;
  onCreatePress: () => void;
  userInitial: string;
  onProfilePress: () => void;
}

const TABS = [
  { name: 'Events', labelKey: 'tabs.events', icon: 'calendar' },
  { name: 'Chat', labelKey: 'spaces.chat', icon: 'chat' },
  { name: 'Trips', labelKey: 'tabs.trips', icon: 'house' },
];

const hexToRgba = (hex: string, alpha: number): string => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * Browser-only top navigation bar. Mirrors the bottom CustomTabBar
 * (same tabs, same i18n keys, same icons) but rendered as a horizontal
 * web-style bar with a labelled "+ Ny" primary action. Only mounted
 * when useDesktopLayout() reports isDesktop.
 */
export const TopTabBar: React.FC<TopTabBarProps> = React.memo(
  ({ activeIndex, profileActive = false, onSelect, onCreatePress, userInitial, onProfilePress }) => {
    const { colors } = useTheme();
    const { t } = useTranslation();

    return (
      <View style={[styles.bar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.tabs}>
          {TABS.map((tab, index) => {
            const isFocused = activeIndex === index;
            return (
              <TouchableOpacity
                key={tab.name}
                style={[styles.tab, isFocused && { backgroundColor: hexToRgba(colors.accent, 0.12) }]}
                onPress={() => onSelect(tab.name)}
                activeOpacity={0.7}
              >
                <TabIcon icon={tab.icon} focused={isFocused} accentColor={colors.accent} />
                <Text style={[styles.tabLabel, { color: isFocused ? colors.accent : colors.textSecondary }]}>
                  {t(tab.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.right}>
          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: colors.accent }]}
            onPress={onCreatePress}
            activeOpacity={0.8}
          >
            <Text style={styles.createText}>+ {t('common.newShort')}</Text>
          </TouchableOpacity>
          <View style={[styles.avatarRing, { borderColor: profileActive ? colors.accent : 'transparent' }]}>
            <TouchableOpacity style={[styles.avatar, { backgroundColor: colors.accent }]} onPress={onProfilePress} activeOpacity={0.8}>
              <Text style={styles.avatarText}>{userInitial}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    minHeight: 60,
  },
  tabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 999,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 'auto',
  },
  createBtn: {
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  createText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  avatarRing: {
    padding: 2.5,
    borderRadius: 20,
    borderWidth: 2,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
});
