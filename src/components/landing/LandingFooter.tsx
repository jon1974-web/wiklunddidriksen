import React from 'react';
import { View, Text, Image, Linking, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { docUrls, CONTACT_EMAIL } from '../../constants/marketing';

export const LandingFooter: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const lang = i18n.language || 'nb';

  return (
    <View style={[styles.footer, { borderTopColor: colors.border }]}>
      <Image source={require('../../../assets/icon.png')} style={styles.logo} />
      <Text style={[styles.copyright, { color: colors.textSecondary }]}>
        © {new Date().getFullYear()} fampad
      </Text>
      <View style={styles.links}>
        <TouchableOpacity onPress={() => Linking.openURL(docUrls.privacy(lang))}>
          <Text style={[styles.link, { color: colors.textSecondary }]}>{t('landing.linkPrivacy')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => Linking.openURL(docUrls.terms(lang))}>
          <Text style={[styles.link, { color: colors.textSecondary }]}>{t('landing.linkTerms')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)}>
          <Text style={[styles.link, { color: colors.textSecondary }]}>{t('landing.linkContact')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    marginTop: 34,
    paddingTop: 22,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  logo: {
    width: 26,
    height: 26,
    borderRadius: 6,
  },
  copyright: {
    fontSize: 12,
    flexShrink: 1,
  },
  links: {
    flexDirection: 'row',
    gap: 16,
    marginLeft: 'auto',
  },
  link: {
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
