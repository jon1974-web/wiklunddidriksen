import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { getLocale } from '../constants/languages';
import { ALL_CURRENCIES, CURRENCY_INFO, getCurrencyForCountry, getCurrencyForLanguage } from '../constants/currencies';
import { convertAmount, ExchangeRateResult } from '../services/currencyService';

interface CurrencyConverterProps {
  country: string;
  language: string;
}

const QUICK_AMOUNTS = [50, 100, 500, 1000];

export const CurrencyConverter: React.FC<CurrencyConverterProps> = React.memo(({ country, language }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const homeCurrency = getCurrencyForLanguage(language);
  const destCurrency = getCurrencyForCountry(country);

  const [fromCurrency, setFromCurrency] = useState(destCurrency?.code || homeCurrency.code);
  const [toCurrency, setToCurrency] = useState(homeCurrency.code);
  const [amount, setAmount] = useState('100');
  const [result, setResult] = useState<ExchangeRateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doConvert = useCallback(async () => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      setResult(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await convertAmount(num, fromCurrency, toCurrency);
      setResult(res);
    } catch (e) {
      setError(t('currency.error'));
    } finally {
      setLoading(false);
    }
  }, [amount, fromCurrency, toCurrency, t]);

  useEffect(() => {
    doConvert();
  }, [doConvert]);

  const handleSwap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const fromInfo = CURRENCY_INFO[fromCurrency];
  const toInfo = CURRENCY_INFO[toCurrency];

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Text style={styles.headerIcon}>💱</Text>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('currency.title')}</Text>
      </View>

      {/* Quick amounts */}
      <View style={styles.quickAmounts}>
        {QUICK_AMOUNTS.map((q) => (
          <TouchableOpacity
            key={q}
            style={[
              styles.quickBtn,
              { borderColor: colors.border },
              amount === String(q) && { backgroundColor: colors.accent, borderColor: colors.accent },
            ]}
            onPress={() => setAmount(String(q))}
          >
            <Text style={[styles.quickBtnText, { color: amount === String(q) ? '#fff' : colors.textSecondary }]}>
              {q.toLocaleString(getLocale(i18n.language))}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Amount input */}
      <View style={styles.amountRow}>
        <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>{t('currency.amount')}</Text>
        <View style={[styles.amountInputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
          <TextInput
            style={[styles.amountInput, { color: colors.text }]}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={colors.textDisabled}
          />
          <Text style={[styles.amountCurrency, { color: colors.textSecondary }]}>{fromCurrency}</Text>
        </View>
      </View>

      {/* Currency selectors */}
      <View style={styles.currencyRow}>
        <View style={styles.currencySelectWrapper}>
          <Text style={[styles.selectLabel, { color: colors.textSecondary }]}>{t('currency.from')}</Text>
          <View style={[styles.picker, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
            <Text style={[styles.pickerText, { color: colors.text }]}>
              {fromInfo?.flag} {fromCurrency}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={[styles.swapBtn, { borderColor: colors.border }]} onPress={handleSwap}>
          <Text style={[styles.swapBtnText, { color: colors.accent }]}>⇄</Text>
        </TouchableOpacity>

        <View style={styles.currencySelectWrapper}>
          <Text style={[styles.selectLabel, { color: colors.textSecondary }]}>{t('currency.to')}</Text>
          <View style={[styles.picker, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
            <Text style={[styles.pickerText, { color: colors.text }]}>
              {toInfo?.flag} {toCurrency}
            </Text>
          </View>
        </View>
      </View>

      {/* Result */}
      {loading ? (
        <View style={styles.resultBox}>
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      ) : error ? (
        <View style={[styles.resultBox, { borderColor: '#FFCDD2' }]}>
          <Text style={[styles.errorText, { color: '#E53935' }]}>{error}</Text>
        </View>
      ) : result ? (
        <View style={[styles.resultBox, { backgroundColor: colors.accentLight || '#f0f9fa', borderColor: colors.accent + '30' }]}>
          <Text style={[styles.resultMain, { color: colors.accent }]}>
            {result.amount?.toLocaleString(getLocale(i18n.language), { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {result.from} = {' '}
            {result.result?.toLocaleString(getLocale(i18n.language), { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {result.to}
          </Text>
          <Text style={[styles.resultRate, { color: colors.textSecondary }]}>
            1 {result.from} = {result.rate.toFixed(4)} {result.to}
          </Text>
          <Text style={[styles.resultSource, { color: colors.textDisabled }]}>
            {t('currency.source')} (ECB, {result.date})
          </Text>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  headerIcon: {
    fontSize: 18,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  quickBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  quickBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  amountRow: {
    marginBottom: 14,
  },
  amountLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  amountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 18,
    fontWeight: '600',
  },
  amountCurrency: {
    fontSize: 14,
    fontWeight: '600',
  },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  currencySelectWrapper: {
    flex: 1,
  },
  selectLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  picker: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  pickerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  swapBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  swapBtnText: {
    fontSize: 18,
    fontWeight: '700',
  },
  resultBox: {
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  resultMain: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  resultRate: {
    fontSize: 13,
    marginTop: 4,
  },
  resultSource: {
    fontSize: 11,
    marginTop: 6,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
