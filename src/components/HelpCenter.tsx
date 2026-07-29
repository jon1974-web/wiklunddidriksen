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
                <View style={styles.logo}>
                  <Image source={require('../../assets/icon.png')} style={styles.logoImg} />
                </View>
                <Text style={styles.headerTitle}>Hjelpesenter</Text>
                <Text style={styles.headerSubtitle}>{title}</Text>
                {subtitle && <Text style={styles.headerDesc}>{subtitle}</Text>}
              </View>

              <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
                {sections.map((section, i) => (
                  <View key={i} style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: '#0097A7' }]}>
                      {section.icon} {section.title}
                    </Text>
                    <Text style={[styles.sectionText, { color: colors.text }]}>{section.text}</Text>
                    {section.tip && (
                      <View style={styles.tip}>
                        <Text style={styles.tipText}>💡 <Text style={{ fontWeight: '600' }}>Tips:</Text> {section.tip}</Text>
                      </View>
                    )}
                  </View>
                ))}
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
    width: '100%',
    maxWidth: 360,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  header: {
    background: 'linear-gradient(135deg, #0097A7, #00ACC1)',
    backgroundColor: '#0097A7',
    padding: 24,
    alignItems: 'center',
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#fff',
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoImg: {
    width: 56,
    height: 56,
    borderRadius: 14,
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
  headerDesc: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center',
  },
  body: {
    maxHeight: 400,
  },
  bodyContent: {
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 1.5,
  },
  tip: {
    backgroundColor: '#E0F7FA',
    borderLeftWidth: 3,
    borderLeftColor: '#0097A7',
    padding: 10,
    paddingTop: 8,
    paddingBottom: 8,
    marginTop: 8,
    borderRadius: 4,
  },
  tipText: {
    fontSize: 13,
    color: '#006064',
    lineHeight: 1.4,
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
