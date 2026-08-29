import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useUserStore } from '../store/userStore';
import { auth } from '../services/firebase';

const ADMIN_STATS_URL = 'https://us-central1-familiesenter-837bb.cloudfunctions.net/getAdminStats';

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

    const fetchStats = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) return;
        const idToken = await currentUser.getIdToken();
        const res = await fetch(ADMIN_STATS_URL, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.log('Failed to fetch admin stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5 * 60 * 1000); // Refresh every 5 min
    return () => clearInterval(interval);
  }, [isAdmin, navigation]);

  if (!isAdmin) return null;

  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: 'dashboard', label: t('admin.dashboard'), icon: '📊' },
    { key: 'families', label: t('admin.families'), icon: '👨‍👩‍👧‍👦' },
    { key: 'users', label: t('admin.users'), icon: '👤' },
    { key: 'settings', label: t('admin.settings'), icon: '⚙️' },
  ];

  const renderDashboard = () => {
    const cards = [
      { label: t('admin.totalFamilies'), value: stats?.totalFamilies ?? '—', color: '#3b5a75', icon: '👨‍👩‍👧‍👦' },
      { label: t('admin.totalUsers'), value: stats?.totalUsers ?? '—', color: '#C67B5C', icon: '👤' },
      { label: t('admin.newThisWeek'), value: stats?.newThisWeek ?? '—', color: '#6B8F71', icon: '📈' },
      { label: t('admin.apiCallsToday'), value: stats?.apiCallsToday ?? '—', color: '#E6A817', icon: '⚡' },
    ];

    const maxVal = Math.max(...cards.map(c => typeof c.value === 'number' ? c.value : 0), 1);

    return (
      <View>
        {/* Metric cards */}
        <View style={isMobile ? styles.mobileGrid : styles.desktopGrid}>
          {cards.map((card, i) => (
            <TouchableOpacity key={i} style={[styles.statCard, { borderLeftColor: card.color, backgroundColor: colors.surface }]} activeOpacity={0.7}>
              <View style={styles.statCardHeader}>
                <Text style={styles.statIcon}>{card.icon}</Text>
                <Text style={[styles.statValue, { color: card.color }]}>{card.value}</Text>
              </View>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{card.label}</Text>
              {/* Mini bar */}
              <View style={[styles.barBg, { backgroundColor: card.color + '15' }]}>
                <View style={[styles.barFill, { backgroundColor: card.color, width: `${((typeof card.value === 'number' ? card.value : 0) / maxVal) * 100}%` }]} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Last updated */}
        {stats?.lastUpdated && (
          <Text style={[styles.lastUpdated, { color: colors.textDisabled }]}>
            {t('admin.lastUpdated')}: {new Date(stats.lastUpdated).toLocaleString('nb-NO')}
          </Text>
        )}

        {/* Quick stats row */}
        <View style={[styles.quickStatsRow, { backgroundColor: colors.surface }]}>
          <View style={styles.quickStat}>
            <Text style={[styles.quickStatValue, { color: colors.text }]}>{stats?.totalEvents ?? '—'}</Text>
            <Text style={[styles.quickStatLabel, { color: colors.textSecondary }]}>{t('admin.totalEvents')}</Text>
          </View>
          <View style={[styles.quickStatDivider, { backgroundColor: colors.border }]} />
          <View style={styles.quickStat}>
            <Text style={[styles.quickStatValue, { color: colors.text }]}>{stats?.storageUsed ?? '—'}</Text>
            <Text style={[styles.quickStatLabel, { color: colors.textSecondary }]}>{t('admin.storageUsed')}</Text>
          </View>
        </View>
      </View>
    );
  };

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
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statIcon: { fontSize: 20 },
  statValue: { fontSize: 28, fontWeight: '700' },
  statLabel: { fontSize: 13, marginTop: 4 },
  barBg: {
    height: 4,
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
  },
  lastUpdated: {
    fontSize: 11,
    marginTop: 12,
    textAlign: 'center',
  },
  quickStatsRow: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    alignItems: 'center',
  },
  quickStat: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatValue: { fontSize: 20, fontWeight: '700' },
  quickStatLabel: { fontSize: 12, marginTop: 2 },
  quickStatDivider: {
    width: 1,
    height: 30,
  },
  placeholderCard: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  placeholderText: { fontSize: 14 },
});
