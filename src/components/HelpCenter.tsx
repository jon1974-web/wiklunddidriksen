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

const ACCENT = '#3b5a75';
const ACCENT_LIGHT = '#D6EDED';

export const HelpCenter: React.FC<HelpCenterProps> = React.memo(({ visible, onClose, title, subtitle, sections }) => {
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.container, { backgroundColor: '#fff' }]}>
              <View style={[styles.header, { backgroundColor: ACCENT }]}>
                <Image source={require('../../assets/icon.png')} style={styles.logo} />
                <Text style={styles.headerTitle}>Hjelpesenter</Text>
                <Text style={styles.headerSubtitle}>{title}</Text>
              </View>

              <ScrollView style={styles.body}>
                <View style={styles.bodyContent}>
                  {sections.map((section, i) => (
                    <View key={i} style={[styles.section, i < sections.length - 1 && { borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 16 }]}>
                      <Text style={[styles.sectionTitle, { color: ACCENT }]}>
                        {section.icon} {section.title}
                      </Text>
                      <Text style={[styles.sectionText, { color: '#333' }]}>{section.text}</Text>
                      {section.tip && (
                        <View style={[styles.tip, { backgroundColor: ACCENT_LIGHT, borderLeftColor: ACCENT }]}>
                          <Text style={[styles.tipText, { color: '#1a3a4a' }]}>💡 <Text style={{ fontWeight: '600' }}>Tips:</Text> {section.tip}</Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              </ScrollView>

              <TouchableOpacity style={[styles.closeBtn, { backgroundColor: ACCENT }]} onPress={onClose}>
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
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
