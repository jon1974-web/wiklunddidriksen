import React, { useRef } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { AuthScreen } from './AuthScreen';
import { HeroVisual } from '../components/landing/HeroVisual';
import { FeatureBento } from '../components/landing/FeatureBento';
import { LandingPricing } from '../components/landing/LandingPricing';
import { LandingFaq } from '../components/landing/LandingFaq';
import { LandingFooter } from '../components/landing/LandingFooter';
import { InstallPanel } from '../components/desktop/InstallPanel';
import { BRAND, BRAND_COLORS, TRUST_FLAGS } from '../constants/marketing';

const AUTH_RAIL_FLEX = 0.9;
const HERO_COPY_FLEX = 1.25;

export const LandingScreen: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const goAuth = () => scrollRef.current?.scrollTo({ y: 0, animated: true });

  return (
    <View style={[styles.shell, { backgroundColor: colors.background }]}>
      <ScrollView ref={scrollRef} style={styles.page} contentContainerStyle={styles.pageContent}>
        <View style={styles.wrap}>
          <View style={[styles.nav, { borderBottomColor: colors.border }]}>
            <View style={styles.brandRow}>
              <Image source={require('../../assets/icon.png')} style={styles.logoSm} />
              <Text style={styles.wordmark}>
                <Text style={{ color: BRAND_COLORS.accent }}>fam</Text>
                <Text style={{ color: colors.text }}>pad</Text>
              </Text>
            </View>
            <View style={styles.navRight}>
              <TouchableOpacity style={[styles.btnGhost, { borderColor: colors.border }]} onPress={goAuth} activeOpacity={0.8}>
                <Text style={[styles.btnGhostText, { color: colors.text }]}>{t('auth.loginButton')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnNav, { backgroundColor: BRAND_COLORS.blueDark }]} onPress={goAuth} activeOpacity={0.8}>
                <Text style={styles.btnNavText}>{t('common.startFree')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.split}>
            <View style={styles.heroCopy}>
              <View style={[styles.eyebrow, { backgroundColor: BRAND_COLORS.blueDarkTint }]}>
                <Text style={[styles.eyebrowText, { color: BRAND_COLORS.blueDark }]}>
                  {t('landing.heroEyebrow')}
                </Text>
              </View>

              <Text style={[styles.h1, { color: colors.text }]}>
                {t('landing.heroTitleStart')}{' '}
                <Text style={{ color: BRAND_COLORS.blueLight }}>{t('landing.heroTitleHighlight')}</Text>
              </Text>

              <Text style={[styles.sub, { color: colors.textSecondary }]}>{t('landing.heroSub')}</Text>

              <View style={styles.ctaRow}>
                <TouchableOpacity style={[styles.btnHero, { backgroundColor: BRAND_COLORS.blueDark }]} onPress={goAuth} activeOpacity={0.8}>
                  <Text style={[styles.btnHeroText, { color: '#fff' }]}>{t('common.startFree')}</Text>
                </TouchableOpacity>
                <Text style={[styles.heroMicro, { color: colors.textSecondary }]}>{t('landing.heroMicro')}</Text>
              </View>

              <View style={styles.trustRow}>
                <Text style={[styles.trustItem, { color: colors.textSecondary }]}>🔒 {t('landing.trustPrivacy')}</Text>
                <Text style={[styles.trustItem, { color: colors.textSecondary }]}>{TRUST_FLAGS} {t('landing.trustLanguages')}</Text>
              </View>

              <HeroVisual />
            </View>

            <View style={styles.railCol}>
              <View style={Platform.OS === 'web' ? ([styles.sticky, { position: 'sticky' }] as any) : styles.railColInner}>
                <View style={[styles.authCard, { borderColor: colors.border }]}>
                  <AuthScreen compact />
                </View>
              </View>
            </View>
          </View>

          <View style={styles.sectionWrap}>
            <FeatureBento />
          </View>

          <View style={styles.sectionWrap}>
            <LandingPricing onCtaPress={goAuth} />
          </View>

          <View style={styles.sectionWrap}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('landing.installTitle')}</Text>
            <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>{t('landing.installSub')}</Text>
            <InstallPanel horizontal />
          </View>

          <View style={styles.sectionWrap}>
            <LandingFaq />
          </View>

          <View style={styles.sectionWrap}>
            <LandingFooter />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  pageContent: {
    flexGrow: 1,
  },
  wrap: {
    width: '100%',
    maxWidth: 1160,
    alignSelf: 'center',
    paddingHorizontal: Platform.OS === 'web' ? 34 : 24,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  logoSm: {
    width: 34,
    height: 34,
    borderRadius: 8,
  },
  wordmark: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginLeft: 'auto',
  },
  btnGhost: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 18,
  },
  btnGhostText: {
    fontSize: 13,
    fontWeight: '700',
  },
  btnNav: {
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  btnNavText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  split: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 40,
    paddingVertical: 26,
    flexWrap: 'nowrap',
  },
  heroCopy: {
    flex: HERO_COPY_FLEX,
    minWidth: 0,
  },
  eyebrow: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 16,
  },
  eyebrowText: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  h1: {
    fontSize: 42,
    lineHeight: 48,
    fontWeight: '800',
    letterSpacing: -1,
    marginBottom: 16,
  },
  sub: {
    fontSize: 16.5,
    lineHeight: 25,
    marginBottom: 20,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 22,
    flexWrap: 'wrap',
  },
  btnHero: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 26,
  },
  btnHeroText: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  heroMicro: {
    fontSize: 12,
  },
  trustRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
  },
  trustItem: {
    fontSize: 12,
    fontWeight: '600',
  },
  railCol: {
    flex: AUTH_RAIL_FLEX,
    alignSelf: 'stretch',
    minWidth: 0,
  },
  railColInner: {
    flex: 1,
  },
  sticky: {
    top: 24,
  },
  authCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 480,
  },
  sectionWrap: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  sectionSub: {
    fontSize: 14,
    marginBottom: 16,
  },
});
