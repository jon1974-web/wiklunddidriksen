import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { AppIcon } from '../components/AppIcon';
import { MODULE_COLORS } from '../constants/moduleColors';
import { Home } from '../types';

const HOME_THEME = MODULE_COLORS.home;

interface HomeDetailScreenProps {
  navigation: any;
  route: { params: { home: Home } };
}

export const HomeDetailScreen: React.FC<HomeDetailScreenProps> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { home } = route.params;

  const tiles = [
    { id: 'projects', icon: 'activities', label: t('homes.projects'), screen: 'HomeProjects', disabled: true },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: HOME_THEME, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: HOME_THEME, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, marginTop: 8 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <AppIcon name="house" size={28} color={HOME_THEME} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.screenTitle, { color: colors.text }]}>{home.name}</Text>
            {home.address ? (
              <Text style={{ fontSize: 13, color: colors.textSecondary }}>📍 {home.address}{home.postNumber ? `, ${home.postNumber} ${home.postCity}` : ''}</Text>
            ) : null}
          </View>
        </View>
      </View>
      <ScrollView style={styles.content}>
        {tiles.map((tile) => (
          <TouchableOpacity
            key={tile.id}
            style={[styles.tile, { backgroundColor: colors.surface, opacity: tile.disabled ? 0.5 : 1 }]}
            disabled={tile.disabled}
          >
            <View style={[styles.tileIcon, { backgroundColor: HOME_THEME }]}>
              <AppIcon name={tile.icon as any} size={24} color="#fff" />
            </View>
            <Text style={[styles.tileLabel, { color: colors.text }]}>{tile.label}</Text>
            {tile.disabled && <Text style={{ color: '#E53935', fontSize: 10, fontWeight: '600' }}>{t('homes.comingSoon')}</Text>}
          </TouchableOpacity>
        ))}
        {home.description ? (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{t('homes.description')}</Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 20 }}>{home.description}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  screenTitle: { fontSize: 22, fontWeight: '700' },
  content: { flex: 1, padding: 16 },
  tile: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 14, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1 },
  tileIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { fontSize: 16, fontWeight: '600', flex: 1 },
  card: { borderRadius: 14, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
});
