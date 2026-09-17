import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { HomePaintColor, HomeProject } from '../types';
import { MODULE_COLORS } from '../constants/moduleColors';
import { AppIcon } from '../components/AppIcon';

const HOME_COLOR = MODULE_COLORS.home;

interface Props {
  navigation: any;
  route: any;
}

export const HomeColorDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { color, project } = route.params as { color: HomePaintColor; project?: HomeProject };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.topBar}>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.closeBtn, { borderColor: colors.textSecondary }]}>
          <Text style={{ color: colors.textSecondary, fontSize: 18 }}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Large color swatch */}
        <View style={[styles.swatchCard, { backgroundColor: color.hexColor || '#e0e0e0', marginBottom: 16 }]}>
          <Text style={[styles.swatchCode, { color: '#fff' }]}>{color.code}</Text>
        </View>

        {/* Details */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          {color.name ? (
            <View style={styles.detailRow}>
              <View style={styles.detailLabel}><AppIcon name="paintColor" size={18} color={HOME_COLOR} /></View>
              <Text style={[styles.detailValue, { color: colors.text }]}>{color.name}</Text>
            </View>
          ) : null}
          {color.code ? (
            <View style={styles.detailRow}>
              <View style={styles.detailLabel}><Text style={{ fontSize: 14, fontWeight: '700', color: HOME_COLOR }}>#</Text></View>
              <Text style={[styles.detailValue, { color: colors.text }]}>{color.code}</Text>
            </View>
          ) : null}
          {color.hexColor ? (
            <View style={styles.detailRow}>
              <View style={styles.detailLabel}>
                <View style={{ width: 18, height: 18, borderRadius: 4, backgroundColor: color.hexColor, borderWidth: 1, borderColor: '#e0e0e0' }} />
              </View>
              <Text style={[styles.detailValue, { color: colors.text }]}>{color.hexColor}</Text>
            </View>
          ) : null}
          {color.brand ? (
            <View style={styles.detailRow}>
              <View style={styles.detailLabel}><AppIcon name="file" size={18} color={HOME_COLOR} /></View>
              <Text style={[styles.detailValue, { color: colors.text }]}>{color.brand}</Text>
            </View>
          ) : null}
          {project ? (
            <View style={styles.detailRow}>
              <View style={styles.detailLabel}><AppIcon name="activities" size={18} color={HOME_COLOR} /></View>
              <Text style={[styles.detailValue, { color: colors.text }]}>{project.title}</Text>
            </View>
          ) : null}
          {color.room ? (
            <View style={styles.detailRow}>
              <View style={styles.detailLabel}><Text style={{ fontSize: 14, color: HOME_COLOR }}>📍</Text></View>
              <Text style={[styles.detailValue, { color: colors.text }]}>{color.room}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', padding: 16 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, padding: 16 },
  swatchCard: { height: 160, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  swatchCode: { fontSize: 24, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  card: { borderRadius: 14, padding: 16, marginBottom: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 },
  detailLabel: { width: 24, alignItems: 'center' },
  detailValue: { fontSize: 15, flex: 1 },
});
