import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useUserStore } from '../store/userStore';
import Svg, { Rect, Line, Circle, Path } from 'react-native-svg';

interface AdminScreenProps {
  navigation: any;
}

type TabKey = 'dashboard' | 'families' | 'users' | 'settings';

const useResponsive = () => {
  const [width, setWidth] = useState(Dimensions.get('window').width);
  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => setWidth(window.width));
    return () => sub?.remove();
  }, []);
  return {
    isMobile: width < 768,
    isTablet: width >= 768 && width < 1024,
    isDesktop: width >= 1024,
    width,
  };
};

export const AdminScreen: React.FC<AdminScreenProps> = ({ navigation }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const appRole = useUserStore((state) => state.appRole);
  const { isMobile, isTablet, isDesktop } = useResponsive();
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  const isAdmin = appRole === 'appOwner';

  useEffect(() => {
    if (!isAdmin) {
      navigation.goBack();
      return;
    }
    // TODO: Fetch admin stats from Cloud Function
    setTimeout(() => {
      setStats({
        totalFamilies: 0,
        totalUsers: 0,
        newThisWeek: 0,
        apiCallsToday: 0,
        storageUsed: '0 MB',
      });
      setLoading(false);
    }, 1000);
  }, [isAdmin, navigation]);

  if (!isAdmin) return null;

  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: 'dashboard', label: t('admin.dashboard'), icon: '📊' },
    { key: 'families', label: t('admin.families'), icon: '👨‍👩‍👧‍👦' },
    { key: 'users', label: t('admin.users'), icon: '👤' },
    { key: 'settings', label: t('admin.settings'), icon: '⚙️' },
  ];

  const renderDashboard = () => (
    <View style={isMobile ? styles.mobileGrid : styles.desktopGrid}>
      {[
        { label: t('admin.totalFamilies'), value: stats?.totalFamilies ?? '—', color: '#3b5a75' },
        { label: t('admin.totalUsers'), value: stats?.totalUsers ?? '—', color: '#C67B5C' },
        { label: t('admin.newThisWeek'), value: stats?.newThisWeek ?? '—', color: '#6B8F71' },
        { label: t('admin.apiCallsToday'), value: stats?.apiCallsToday ?? '—', color: '#E6A817' },
      ].map((card, i) => (
        <View key={i} style={[styles.statCard, { borderLeftColor: card.color, backgroundColor: colors.surface }]}>
          <Text style={[styles.statValue, { color: card.color }]}>{card.value}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{card.label}</Text>
        </View>
      ))}
    </View>
  );

  const renderFamilies = () => (
    <View style={[styles.placeholderCard, { backgroundColor: colors.surface }]}>
      <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>{t('admin.familiesComingSoon')}</Text>
    </View>
  );

  const renderUsers = () => (
    <View style={[styles.placeholderCard, { backgroundColor: colors.surface }]}>
      <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>{t('admin.usersComingSoon')}</Text>
    </View>
  );

  const renderSettings = () => (
    <View style={[styles.placeholderCard, { backgroundColor: colors.surface }]}>
      <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>{t('admin.settingsComingSoon')}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { borderColor: colors.accent }]}>
          <Text style={{ color: colors.accent, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('admin.title')}</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Tab bar */}
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && { borderBottomColor: colors.accent }]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, { color: activeTab === tab.key ? colors.accent : colors.textSecondary }]}>
              {tab.icon} {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
        ) : (
          <>
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'families' && renderFamilies()}
            {activeTab === 'users' && renderUsers()}
            {activeTab === 'settings' && renderSettings()}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: { fontSize: 13, fontWeight: '600' },
  content: { flex: 1 },
  contentContainer: { padding: 16 },
  mobileGrid: {
    flexDirection: 'column',
    gap: 12,
  },
  desktopGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    marginBottom: 0,
  },
  statValue: { fontSize: 28, fontWeight: '700' },
  statLabel: { fontSize: 13, marginTop: 4 },
  placeholderCard: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  placeholderText: { fontSize: 14 },
});
