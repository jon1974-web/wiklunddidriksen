import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { LANDING_FAQ, BRAND_COLORS } from '../../constants/marketing';

const FaqItem: React.FC<{
  question: string;
  answer: string;
  open: boolean;
  onToggle: () => void;
  isLast: boolean;
}> = ({ question, answer, open, onToggle, isLast }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.item, !isLast && { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
      <TouchableOpacity style={styles.qRow} onPress={onToggle} activeOpacity={0.7}>
        <Text style={[styles.q, { color: colors.text }]}>{question}</Text>
        <Text style={[styles.marker, { color: BRAND_COLORS.accent }]}>{open ? '–' : '+'}</Text>
      </TouchableOpacity>
      {open && <Text style={[styles.a, { color: colors.textSecondary }]}>{answer}</Text>}
    </View>
  );
};

export const LandingFaq: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <View style={styles.section}>
      <Text style={[styles.title, { color: colors.text }]}>{t('landing.faqTitle')}</Text>
      <Text style={[styles.sub, { color: colors.textSecondary }]}>{t('landing.faqSub')}</Text>
      <View>
        {LANDING_FAQ.map((item, index) => (
          <FaqItem
            key={item.qKey}
            question={t(item.qKey)}
            answer={t(item.aKey)}
            open={openIndex === index}
            onToggle={() => setOpenIndex(openIndex === index ? null : index)}
            isLast={index === LANDING_FAQ.length - 1}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginTop: 34,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  sub: {
    fontSize: 13.5,
    marginBottom: 10,
  },
  item: {
    paddingVertical: 13,
  },
  qRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  q: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  marker: {
    fontSize: 17,
    fontWeight: '700',
  },
  a: {
    fontSize: 13,
    lineHeight: 19,
    paddingTop: 7,
    paddingRight: 24,
  },
});
