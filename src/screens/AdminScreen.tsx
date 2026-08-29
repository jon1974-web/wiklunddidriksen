import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Dimensions, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useUserStore } from '../store/userStore';
import { auth } from '../services/firebase';

const ADMIN_STATS_URL = 'https://us-central1-familiesenter-837bb.cloudfunctions.net/getAdminStats';
const GET_FAMILY_LIST_URL = 'https://us-central1-familiesenter-837bb.cloudfunctions.net/getFamilyList';
const GET_FAMILY_DETAIL_URL = 'https://us-central1-familiesenter-837bb.cloudfunctions.net/getFamilyDetail';

interface FamilyItem {
  id: string;
  name: string;
  memberCount: number;
  createdAt?: number;
}

interface FamilyMember {
  uid: string;
  displayName?: string;
  role: 'owner' | 'admin' | 'member';
  email?: string;
}

interface FamilyDetail {
  id: string;
  name: string;
  owner?: string;
  members: Record<string, FamilyMember>;
  memberCount: number;
  dataCounts?: {
    events?: number;
    health?: number;
    vetVisits?: number;
    school?: number;
    kindergarten?: number;
    pets?: number;
    trips?: number;
  };
}

interface AdminScreenProps {
  navigation: any;
}

type TabKey = 'dashboard' | 'families' | 'users' | 'usage' | 'settings';

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
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<any>(null);

  // Families tab state
  const [families, setFamilies] = useState<FamilyItem[]>([]);
  const [familiesLoading, setFamiliesLoading] = useState(false);
  const [familySearch, setFamilySearch] = useState('');
  const [selectedFamily, setSelectedFamily] = useState<FamilyDetail | null>(null);
  const [familyDetailLoading, setFamilyDetailLoading] = useState(false);
  const [showFamilyDetail, setShowFamilyDetail] = useState(false);

  // Usage tab state
  const [usageStats, setUsageStats] = useState<any>(null);
  const [usageLoading, setUsageLoading] = useState(false);

  const GET_USAGE_STATS_URL = 'https://us-central1-familiesenter-837bb.cloudfunctions.net/getUsageStats';
const TRIGGER_STATS_URL = 'https://us-central1-familiesenter-837bb.cloudfunctions.net/triggerAdminStats';

  const fetchStats = useCallback(async () => {
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
  }, []);

  const triggerStats = useCallback(async () => {
    setRefreshing(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      const idToken = await currentUser.getIdToken();
      await fetch(TRIGGER_STATS_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      await fetchStats();
    } catch (error) {
      console.log('Failed to trigger stats:', error);
    } finally {
      setRefreshing(false);
    }
  }, [fetchStats]);

  const fetchFamilies = useCallback(async () => {
    setFamiliesLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      const idToken = await currentUser.getIdToken();
      const res = await fetch(GET_FAMILY_LIST_URL, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFamilies(data.families || data || []);
      }
    } catch (error) {
      console.log('Failed to fetch families:', error);
    } finally {
      setFamiliesLoading(false);
    }
  }, []);

  const fetchUsageStats = useCallback(async () => {
    setUsageLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      const idToken = await currentUser.getIdToken();
      const res = await fetch(GET_USAGE_STATS_URL, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsageStats(data);
      }
    } catch (error) {
      console.log('Failed to fetch usage stats:', error);
    } finally {
      setUsageLoading(false);
    }
  }, []);

  const fetchFamilyDetail = useCallback(async (familyId: string) => {
    setFamilyDetailLoading(true);
    setShowFamilyDetail(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      const idToken = await currentUser.getIdToken();
      const res = await fetch(`${GET_FAMILY_DETAIL_URL}?familyId=${familyId}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedFamily(data);
      }
    } catch (error) {
      console.log('Failed to fetch family detail:', error);
    } finally {
      setFamilyDetailLoading(false);
    }
  }, []);

  const isAdmin = appRole === 'appOwner';

  useEffect(() => {
    if (!isAdmin) {
      navigation.goBack();
      return;
    }
    fetchStats();
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isAdmin, navigation, fetchStats]);

  useEffect(() => {
    if (isAdmin && activeTab === 'families') {
      fetchFamilies();
    }
  }, [isAdmin, activeTab, fetchFamilies]);

  useEffect(() => {
    if (isAdmin && activeTab === 'usage') {
      fetchUsageStats();
    }
  }, [isAdmin, activeTab, fetchUsageStats]);

  if (!isAdmin) return null;

  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: 'dashboard', label: t('admin.dashboard'), icon: '📊' },
    { key: 'families', label: t('admin.families'), icon: '👨‍👩‍👧‍👦' },
    { key: 'users', label: t('admin.users'), icon: '👤' },
    { key: 'usage', label: t('admin.usage'), icon: '📈' },
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

  const renderFamilies = () => {
    const filteredFamilies = families.filter(f =>
      (f.name || '').toLowerCase().includes(familySearch.toLowerCase())
    );

    return (
      <View>
        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: colors.text, fontSize: 16 }]}
            placeholder={t('admin.searchFamilies')}
            placeholderTextColor={colors.textDisabled}
            value={familySearch}
            onChangeText={setFamilySearch}
            autoCorrect={false}
          />
          {familySearch.length > 0 && (
            <TouchableOpacity onPress={() => setFamilySearch('')} style={styles.clearBtn}>
              <Text style={{ color: colors.textSecondary }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {familiesLoading ? (
          <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
        ) : filteredFamilies.length === 0 ? (
          <View style={[styles.placeholderCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
              {t('admin.noFamiliesFound')}
            </Text>
          </View>
        ) : (
          <View style={isMobile ? styles.familyList : styles.familyGrid}>
            {filteredFamilies.map((family) => (
              <TouchableOpacity
                key={family.id}
                style={[styles.familyCard, { backgroundColor: colors.surface }]}
                onPress={() => fetchFamilyDetail(family.id)}
                activeOpacity={0.7}
              >
                <View style={styles.familyCardHeader}>
                  <View style={[styles.familyIcon, { backgroundColor: '#3b5a75' }]}>
                    <Text style={styles.familyIconText}>👨‍👩‍👧‍👦</Text>
                  </View>
                  <View style={styles.familyCardInfo}>
                    <Text style={[styles.familyName, { color: colors.text }]} numberOfLines={1}>
                      {family.name}
                    </Text>
                    <Text style={[styles.familyMemberCount, { color: colors.textSecondary }]}>
                      {family.memberCount} {t('admin.members')}
                    </Text>
                  </View>
                  <Text style={[styles.arrow, { color: colors.textDisabled }]}>›</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <FamilyDetailModal
          visible={showFamilyDetail}
          onClose={() => { setShowFamilyDetail(false); setSelectedFamily(null); }}
          family={selectedFamily}
          loading={familyDetailLoading}
          t={t}
          colors={colors}
        />
      </View>
    );
  };

  const FamilyDetailModal: React.FC<{
    visible: boolean;
    onClose: () => void;
    family: FamilyDetail | null;
    loading: boolean;
    t: any;
    colors: any;
  }> = ({ visible, onClose, family, loading, t, colors }) => {
    const dataCards = family?.dataCounts ? [
      { label: t('admin.events'), value: family.dataCounts.events || 0, color: '#3b5a75', icon: '📅' },
      { label: t('admin.healthAppointments'), value: family.dataCounts.health || 0, color: '#C67B5C', icon: '🏥' },
      { label: t('admin.vetBesøk'), value: family.dataCounts.vetVisits || 0, color: '#9B7DB8', icon: '🐾' },
      { label: t('admin.schoolActivities'), value: family.dataCounts.school || 0, color: '#6B8F71', icon: '🏫' },
      { label: t('admin.kindergartenActivities'), value: family.dataCounts.kindergarten || 0, color: '#E8836A', icon: '🎒' },
      { label: t('admin.pets'), value: family.dataCounts.pets || 0, color: '#9B7DB8', icon: '🐕' },
      { label: t('admin.trips'), value: family.dataCounts.trips || 0, color: '#7EC8E3', icon: '✈️' },
    ] : [];

    const roleLabel = (role: string) => {
      if (role === 'owner') return t('admin.owner');
      if (role === 'admin') return t('admin.admin');
      return t('admin.member');
    };

    const roleColor = (role: string) => {
      if (role === 'owner') return '#E6A817';
      if (role === 'admin') return '#C67B5C';
      return '#6B8F71';
    };

    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={onClose} style={[styles.backBtn, { borderColor: colors.accent }]}>
              <Text style={{ color: colors.accent, fontSize: 18 }}>←</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('admin.familyDetail')}</Text>
            <View style={{ width: 36 }} />
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
          ) : family ? (
            <ScrollView style={styles.modalContent} contentContainerStyle={{ padding: 16 }}>
              <View style={[styles.detailHeader, { backgroundColor: colors.surface }]}>
                <View style={[styles.detailIcon, { backgroundColor: '#3b5a75' }]}>
                  <Text style={styles.detailIconText}>👨‍👩‍👧‍👦</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.detailName, { color: colors.text }]}>{family.name}</Text>
                  {family.owner && (
                    <Text style={[styles.detailOwner, { color: colors.textSecondary }]}>
                      {t('admin.owner')}: {family.owner}
                    </Text>
                  )}
                  <Text style={[styles.detailCount, { color: colors.textSecondary }]}>
                    {family.memberCount} {t('admin.members')}
                  </Text>
                </View>
              </View>

              {dataCards.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('admin.dataCounts')}</Text>
                  <View style={styles.dataGrid}>
                    {dataCards.map((card, i) => (
                      <View key={i} style={[styles.dataCard, { backgroundColor: colors.surface, borderLeftColor: card.color }]}>
                        <View style={styles.dataCardHeader}>
                          <Text style={styles.dataCardIcon}>{card.icon}</Text>
                          <Text style={[styles.dataCardValue, { color: card.color }]}>{card.value}</Text>
                        </View>
                        <Text style={[styles.dataCardLabel, { color: colors.textSecondary }]}>{card.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {family.members && Object.keys(family.members).length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('admin.members')}</Text>
                  <View style={[styles.memberList, { backgroundColor: colors.surface }]}>
                    {Object.entries(family.members).map(([uid, member], index) => (
                      <View key={uid}>
                        <View style={styles.memberRow}>
                          <View style={[styles.memberAvatar, { backgroundColor: roleColor(member.role) }]}>
                            <Text style={styles.memberAvatarText}>
                              {(member.displayName || member.email || uid).charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <View style={styles.memberInfo}>
                            <Text style={[styles.memberName, { color: colors.text }]} numberOfLines={1}>
                              {member.displayName || member.email || uid}
                            </Text>
                            {member.email && member.email !== member.displayName && (
                              <Text style={[styles.memberEmail, { color: colors.textSecondary }]} numberOfLines={1}>
                                {member.email}
                              </Text>
                            )}
                          </View>
                          <View style={[styles.roleBadge, { backgroundColor: roleColor(member.role) + '20' }]}>
                            <Text style={[styles.roleText, { color: roleColor(member.role) }]}>
                              {roleLabel(member.role)}
                            </Text>
                          </View>
                        </View>
                        {index < Object.keys(family.members!).length - 1 && (
                          <View style={[styles.memberDivider, { backgroundColor: colors.border }]} />
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>
          ) : (
            <View style={[styles.placeholderCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>{t('admin.noFamiliesFound')}</Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    );
  };

  const renderUsage = () => {
    if (usageLoading) {
      return <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />;
    }

    if (!usageStats) {
      return (
        <View style={[styles.placeholderCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>{t('admin.usageNoData')}</Text>
        </View>
      );
    }

    const { totalCalls, totalCost, byFunction, dailyStats } = usageStats;

    const maxDailyCount = Math.max(...(dailyStats || []).map((d: any) => d.count || 0), 1);

    const chartBarColor = colors.accent;

    return (
      <View>
        {/* Summary cards */}
        <View style={isMobile ? styles.mobileGrid : styles.desktopGrid}>
          <View style={[styles.statCard, { borderLeftColor: '#3b5a75', backgroundColor: colors.surface }]}>
            <View style={styles.statCardHeader}>
              <Text style={styles.statIcon}>⚡</Text>
              <Text style={[styles.statValue, { color: '#3b5a75' }]}>{totalCalls ?? '—'}</Text>
            </View>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('admin.usageTotalCalls')}</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: '#C67B5C', backgroundColor: colors.surface }]}>
            <View style={styles.statCardHeader}>
              <Text style={styles.statIcon}>💰</Text>
              <Text style={[styles.statValue, { color: '#C67B5C' }]}>{totalCost != null ? `$${totalCost.toFixed(2)}` : '—'}</Text>
            </View>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('admin.estimatedCost')}</Text>
          </View>
        </View>

        {/* Daily bar chart */}
        {dailyStats && dailyStats.length > 0 && (
          <View style={[styles.usageChartCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('admin.usageDailyChart')}</Text>
            <View style={styles.chartContainer}>
              {dailyStats.map((day: any, index: number) => {
                const barHeight = maxDailyCount > 0 ? (day.count / maxDailyCount) * 120 : 0;
                const dayLabel = day.date ? new Date(day.date).toLocaleDateString('nb-NO', { weekday: 'short', day: 'numeric' }) : '';
                return (
                  <View key={index} style={styles.chartBarWrapper}>
                    <Text style={[styles.chartBarCount, { color: colors.text }]}>{day.count || 0}</Text>
                    <View style={[styles.chartBarBg, { height: 120 }]}>
                      <View style={[styles.chartBarFill, { height: Math.max(barHeight, 2), backgroundColor: chartBarColor }]} />
                    </View>
                    <Text style={[styles.chartBarLabel, { color: colors.textSecondary }]} numberOfLines={1}>{dayLabel}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Function breakdown */}
        {byFunction && byFunction.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('admin.usageByFunction')}</Text>
            <View style={[styles.usageFunctionList, { backgroundColor: colors.surface }]}>
              {byFunction.map((fn: any, index: number) => (
                <View key={index}>
                  <View style={styles.usageFunctionRow}>
                    <View style={[styles.usageFunctionDot, { backgroundColor: chartBarColor }]} />
                    <View style={styles.usageFunctionInfo}>
                      <Text style={[styles.usageFunctionName, { color: colors.text }]} numberOfLines={1}>{fn.name}</Text>
                      <Text style={[styles.usageFunctionCalls, { color: colors.textSecondary }]}>
                        {fn.count} {t('admin.usageCalls')}
                      </Text>
                    </View>
                    <Text style={[styles.usageFunctionCost, { color: '#C67B5C' }]}>
                      {fn.cost != null ? `$${fn.cost.toFixed(4)}` : '—'}
                    </Text>
                  </View>
                  {index < byFunction.length - 1 && (
                    <View style={[styles.usageFunctionDivider, { backgroundColor: colors.border }]} />
                  )}
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

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
        <TouchableOpacity
          style={[styles.refreshBtn, { borderColor: colors.accent }]}
          onPress={triggerStats}
          disabled={refreshing}
        >
          <Text style={{ color: colors.accent, fontSize: 14 }}>{refreshing ? '⏳' : '🔄'}</Text>
        </TouchableOpacity>
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
            {activeTab === 'usage' && renderUsage()}
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
  refreshBtn: {
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
  },
  clearBtn: { padding: 8 },
  familyList: { flexDirection: 'column', gap: 8 },
  familyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  familyCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  familyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  familyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  familyIconText: { fontSize: 20 },
  familyCardInfo: { flex: 1, marginLeft: 12 },
  familyName: { fontSize: 16, fontWeight: '600' },
  familyMemberCount: { fontSize: 13, marginTop: 2 },
  arrow: { fontSize: 24, fontWeight: '300' },
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalContent: { flex: 1 },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  detailIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  detailIconText: { fontSize: 28 },
  detailName: { fontSize: 20, fontWeight: '700' },
  detailOwner: { fontSize: 13, marginTop: 4 },
  detailCount: { fontSize: 13, marginTop: 2 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  dataGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dataCard: {
    width: '48%',
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
  },
  dataCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dataCardIcon: { fontSize: 16 },
  dataCardValue: { fontSize: 20, fontWeight: '700' },
  dataCardLabel: { fontSize: 12, marginTop: 4 },
  memberList: { borderRadius: 12, overflow: 'hidden' },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  memberInfo: { flex: 1, marginLeft: 12 },
  memberName: { fontSize: 15, fontWeight: '500' },
  memberEmail: { fontSize: 12, marginTop: 2 },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: { fontSize: 11, fontWeight: '600' },
  memberDivider: { height: 1, marginLeft: 64 },
  usageChartCard: {
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 16,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 12,
    paddingHorizontal: 4,
  },
  chartBarWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  chartBarCount: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  chartBarBg: {
    width: '70%',
    maxWidth: 32,
    borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  chartBarFill: {
    width: '100%',
    borderRadius: 4,
  },
  chartBarLabel: {
    fontSize: 9,
    marginTop: 4,
    textAlign: 'center',
  },
  usageFunctionList: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  usageFunctionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  usageFunctionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  usageFunctionInfo: {
    flex: 1,
  },
  usageFunctionName: {
    fontSize: 15,
    fontWeight: '500',
  },
  usageFunctionCalls: {
    fontSize: 12,
    marginTop: 2,
  },
  usageFunctionCost: {
    fontSize: 14,
    fontWeight: '600',
  },
  usageFunctionDivider: {
    height: 1,
    marginLeft: 34,
  },
});
