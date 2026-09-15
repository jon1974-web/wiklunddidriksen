import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { DatePickerModal } from '../components/DatePickerModal';
import { useUserStore } from '../store/userStore';
import { AppIcon } from '../components/AppIcon';
import { crossAlert } from '../utils/alert';
import { MODULE_COLORS } from '../constants/moduleColors';
import { getErrorMessage } from '../utils/validation';
import { formatDate } from '../utils/dateUtils';
import { getLocale } from '../constants/languages';
import i18n from '../i18n';
import { Home, HomeProject } from '../types';
import { getHomeProjects, addHomeProject, updateHomeProject, deleteHomeProject } from '../services/homeService';
import { ActionModal } from '../components/ActionModal';

const HOME_THEME = MODULE_COLORS.home;

const STATUS_OPTIONS = [
  { value: 'active', icon: '▶', color: '#43A047' },
  { value: 'on-hold', icon: '⏸', color: '#F9A825' },
  { value: 'completed', icon: '✓', color: '#43A047' },
] as const;

interface HomeProjectListScreenProps {
  navigation: any;
  route: { params: { home: Home } };
}

export const HomeProjectListScreen: React.FC<HomeProjectListScreenProps> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const user = useUserStore((state) => state.user);
  const familyId = useUserStore((state) => state.familyId);
  const { home } = route.params;

  const [projects, setProjects] = useState<HomeProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [actionModal, setActionModal] = useState<{ visible: boolean; id: string; title: string }>({ visible: false, id: '', title: '' });

  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formBudget, setFormBudget] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'completed' | 'on-hold'>('active');
  const [activePicker, setActivePicker] = useState<'startDate' | null>(null);
  const [saving, setSaving] = useState(false);

  const loadProjects = useCallback(async () => {
    if (!familyId) return;
    try {
      const data = await getHomeProjects(familyId, home.id);
      data.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
      setProjects(data);
    } catch (error) {
      crossAlert(t('common.error'), getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [familyId, home.id]);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  const resetForm = () => {
    setFormTitle('');
    setFormDescription('');
    setFormBudget('');
    setFormStartDate(new Date().toISOString().split('T')[0]);
    setFormStatus('active');
    setEditingProject(null);
  };

  const handleSave = async () => {
    if (!formTitle.trim()) {
      crossAlert(t('common.error'), t('homes.projectTitleRequired'));
      return;
    }
    if (!familyId) return;
    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const data: any = {
        homeId: home.id,
        title: formTitle.trim(),
        description: formDescription.trim(),
        budget: parseFloat(formBudget) || 0,
        startDate: formStartDate,
        status: formStatus,
        familyId,
      };
      if (editingProject) {
        if (formStatus === 'completed' && !editingProject.endDate) {
          data.endDate = today;
        }
        await updateHomeProject(editingProject, data);
      } else {
        await addHomeProject(data);
      }
      resetForm();
      setShowAddModal(false);
      loadProjects();
    } catch (error) {
      crossAlert(t('common.error'), getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!actionModal.id) return;
    try {
      await deleteHomeProject(actionModal.id);
      setActionModal({ visible: false, id: '', title: '' });
      loadProjects();
    } catch (error) {
      crossAlert(t('common.error'), getErrorMessage(error));
    }
  };

  const handleEdit = () => {
    const project = projects.find((p) => p.id === actionModal.id);
    if (project) {
      setEditingProject(project.id);
      setFormTitle(project.title);
      setFormDescription(project.description);
      setFormBudget(String(project.budget || ''));
      setFormStartDate(project.startDate || new Date().toISOString().split('T')[0]);
      setFormStatus(project.status);
      setShowAddModal(true);
    }
    setActionModal({ visible: false, id: '', title: '' });
  };

  const getStatusStyle = (status: string) => {
    if (status === 'active') return { bg: '#E8F5E9', color: '#43A047', label: t('homes.projectActive') };
    if (status === 'on-hold') return { bg: '#FFF8E1', color: '#F9A825', label: t('homes.projectOnHold') };
    return { bg: '#E8F5E9', color: '#43A047', label: t('homes.projectCompleted') };
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <ActivityIndicator size="large" color={HOME_THEME} style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: HOME_THEME, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: HOME_THEME, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, marginTop: 8 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <AppIcon name="activities" size={28} color={HOME_THEME} />
            <Text style={[styles.screenTitle, { color: colors.text }]}>{t('homes.projects')}</Text>
          </View>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: HOME_THEME }]}
            onPress={() => { resetForm(); setShowAddModal(true); }}
          >
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '600', textAlign: 'center', lineHeight: 36 }}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView style={styles.content}>
        {projects.map((project) => {
            const statusStyle = getStatusStyle(project.status);
            return (
              <TouchableOpacity
                key={project.id}
                style={[styles.projectCard, { backgroundColor: colors.surface }]}
                onPress={() => navigation.navigate('HomeProjectDetail', { home, project })}
                onLongPress={() => setActionModal({ visible: true, id: project.id, title: project.title })}
              >
                <View style={styles.projectCardHeader}>
                  <Text style={[styles.projectCardTitle, { color: colors.text }]} numberOfLines={1}>{project.title}</Text>
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                    {project.status !== 'completed' && (
                      <TouchableOpacity
                        style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: '#E8F5E9' }}
                        onPress={async () => {
                          try {
                            const today = new Date().toISOString().split('T')[0];
                            await updateHomeProject(project.id, { status: 'completed', endDate: today });
                            loadProjects();
                          } catch (error) {
                            crossAlert(t('common.error'), getErrorMessage(error));
                          }
                        }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: '600', color: '#43A047' }}>{t('homes.completeProject')}</Text>
                      </TouchableOpacity>
                    )}
                    <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                      <Text style={{ fontSize: 10, fontWeight: '600', color: statusStyle.color }}>{statusStyle.label}</Text>
                    </View>
                  </View>
                </View>
                {project.description ? (
                  <Text style={[styles.projectCardDesc, { color: colors.textSecondary }]} numberOfLines={2}>{project.description}</Text>
                ) : null}
                {project.startDate ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <AppIcon name="calendar" size={12} color={colors.textDisabled} />
                    <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                      {new Date(project.startDate).toLocaleDateString(getLocale(i18n.language), { day: 'numeric', month: 'short', year: 'numeric' })}{project.endDate ? ` – ${new Date(project.endDate).toLocaleDateString(getLocale(i18n.language), { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
      </ScrollView>

      <ActionModal
        visible={actionModal.visible}
        title={actionModal.title}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCancel={() => setActionModal({ visible: false, id: '', title: '' })}
        accentColor={HOME_THEME}
      />

      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHandleBar} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{editingProject ? t('homes.editProject') : t('homes.addProject')}</Text>

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>{t('homes.projectTitle')}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
                  value={formTitle}
                  onChangeText={setFormTitle}
                  placeholder={t('homes.projectTitlePlaceholder')}
                  placeholderTextColor={colors.textDisabled}
                />
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>{t('homes.description')}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text }, { minHeight: 80, textAlignVertical: 'top' }]}
                  value={formDescription}
                  onChangeText={setFormDescription}
                  placeholder={t('homes.descriptionPlaceholder')}
                  placeholderTextColor={colors.textDisabled}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>{t('homes.budget')}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
                  value={formBudget}
                  onChangeText={setFormBudget}
                  placeholder={t('homes.budgetPlaceholder')}
                  placeholderTextColor={colors.textDisabled}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>{t('homes.startDate')}</Text>
                <TouchableOpacity
                  style={[styles.input, { backgroundColor: colors.surface }]}
                  onPress={() => setActivePicker('startDate')}
                >
                  <Text style={{ color: colors.text }}>{formStartDate || '—'}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>{t('homes.status')}</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {STATUS_OPTIONS.map((opt) => {
                    const isSelected = formStatus === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={[styles.statusOption, { backgroundColor: colors.surface, borderColor: isSelected ? HOME_THEME : colors.border }, isSelected && { backgroundColor: HOME_THEME }]}
                        onPress={() => setFormStatus(opt.value)}
                      >
                        <Text style={{ fontSize: 12, color: isSelected ? '#fff' : colors.text }}>{opt.icon} {opt.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                <TouchableOpacity style={[styles.button, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, flex: 1 }]} onPress={() => { setShowAddModal(false); resetForm(); }}>
                  <Text style={[styles.buttonText, { color: colors.text }]}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: HOME_THEME, opacity: saving ? 0.5 : 1, flex: 1 }]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  <Text style={styles.buttonText}>{saving ? '...' : t('common.save')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <DatePickerModal
        visible={activePicker !== null}
        title={t('homes.startDate')}
        mode="date"
        dateOffset={-30}
        dateCount={760}
        selectedValue={formStartDate}
        onSelect={(value) => { setFormStartDate(value); setActivePicker(null); }}
        onClose={() => setActivePicker(null)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  screenTitle: { fontSize: 22, fontWeight: '700' },
  addButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, padding: 16 },
  emptyState: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText: { fontSize: 16, fontWeight: '600' },
  projectCard: { borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e0e0e0' },
  projectCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  projectCardTitle: { fontSize: 16, fontWeight: '700', flex: 1 },
  projectCardDesc: { fontSize: 13, lineHeight: 18 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRight: 20, maxHeight: '85%', padding: 20 },
  modalHandleBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ccc', alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 22, fontWeight: '700', marginBottom: 16 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { padding: 14, borderRadius: 10, fontSize: 16 },
  statusOption: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, alignItems: 'center' },
  button: { padding: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
