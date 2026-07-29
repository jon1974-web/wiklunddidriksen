import React from 'react';
import { View, Text, Modal, TouchableWithoutFeedback, TouchableOpacity, ScrollView, StyleSheet, Image } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';

interface HelpSection {
  icon: string;
  title: string;
  text: string;
  tip?: string;
}

interface HelpCenterProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  sections: HelpSection[];
}

export const HelpCenter: React.FC<HelpCenterProps> = React.memo(({ visible, onClose, title, subtitle, sections }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.container, { backgroundColor: colors.surface }]}>
              <View style={styles.header}>
                <Image source={require('../../assets/icon.png')} style={styles.logo} />
                <Text style={styles.headerTitle}>Hjelpesenter</Text>
                <Text style={styles.headerSubtitle}>{title}</Text>
              </View>

              <ScrollView style={styles.body}>
                <View style={styles.bodyContent}>
                  {sections.map((section, i) => (
                    <View key={i} style={[styles.section, i < sections.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 16 }]}>
                      <Text style={[styles.sectionTitle, { color: '#0097A7' }]}>
                        {section.icon} {section.title}
                      </Text>
                      <Text style={[styles.sectionText, { color: colors.text }]}>{section.text}</Text>
                      {section.tip && (
                        <View style={[styles.tip, { backgroundColor: '#E0F7FA', borderLeftColor: '#0097A7' }]}>
                          <Text style={[styles.tipText, { color: '#006064' }]}>💡 <Text style={{ fontWeight: '600' }}>Tips:</Text> {section.tip}</Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              </ScrollView>

              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Text style={styles.closeBtnText}>{t('common.close')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    borderRadius: 20,
    width: 340,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  header: {
    backgroundColor: '#0097A7',
    padding: 24,
    alignItems: 'center',
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 14,
    marginBottom: 12,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    marginTop: 4,
  },
  body: {
    maxHeight: 420,
  },
  bodyContent: {
    padding: 20,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  tip: {
    borderLeftWidth: 3,
    padding: 10,
    paddingTop: 8,
    paddingBottom: 8,
    marginTop: 8,
    borderRadius: 4,
  },
  tipText: {
    fontSize: 13,
    lineHeight: 18,
  },
  closeBtn: {
    width: '100%',
    paddingVertical: 14,
    backgroundColor: '#0097A7',
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
