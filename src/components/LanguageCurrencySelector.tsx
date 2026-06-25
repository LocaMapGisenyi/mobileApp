import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Text, Dialog, Portal, RadioButton } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { usePreferences, Language, Currency } from '../store/preferences';
import { useTranslation } from 'react-i18next';
import { colors, spacing, typography, borderRadius } from '../theme';

type SelectorType = 'language' | 'currency';

/**
 * Composant pour afficher et modifier la langue et la devise
 */
const LanguageCurrencySelector: React.FC = () => {
  const { language, currency, setLanguage, setCurrency } = usePreferences();
  const { t } = useTranslation();
  
  const [visible, setVisible] = useState<SelectorType | null>(null);
  
  // Ouvrir le sélecteur de langue
  const openLanguageSelector = () => setVisible('language');
  
  // Ouvrir le sélecteur de devise
  const openCurrencySelector = () => setVisible('currency');
  
  // Fermer le sélecteur
  const hideDialog = () => setVisible(null);
  
  // Sélectionner une langue
  const selectLanguage = async (value: Language) => {
    await setLanguage(value);
    hideDialog();
  };
  
  // Sélectionner une devise
  const selectCurrency = async (value: Currency) => {
    await setCurrency(value);
    hideDialog();
  };
  
  // Liste des langues disponibles
  const languages: { code: Language; label: string; icon: string }[] = [
    { code: 'fr', label: t('languages.fr'), icon: '🇫🇷' },
    { code: 'en', label: t('languages.en'), icon: '🇬🇧' },
    { code: 'rw', label: t('languages.rw'), icon: '🇷🇼' },
    { code: 'sw', label: t('languages.sw'), icon: '🇹🇿' },
  ];
  
  // Liste des devises disponibles
  const currencies: { code: Currency; label: string; icon: string }[] = [
    { code: 'RWF', label: t('currencies.RWF'), icon: 'FRw' },
    { code: 'USD', label: t('currencies.USD'), icon: '$' },
    { code: 'EUR', label: t('currencies.EUR'), icon: '€' },
  ];
  
  // Obtenir le nom de la langue actuelle
  const getCurrentLanguageName = () => {
    const currentLang = languages.find(lang => lang.code === language);
    return currentLang ? currentLang.label : '';
  };
  
  // Obtenir le nom de la devise actuelle
  const getCurrentCurrencyName = () => {
    const currentCurr = currencies.find(curr => curr.code === currency);
    return currentCurr ? currentCurr.label : '';
  };
  
  // Obtenir l'icône de la langue actuelle
  const getCurrentLanguageIcon = () => {
    const currentLang = languages.find(lang => lang.code === language);
    return currentLang ? currentLang.icon : '';
  };
  
  // Obtenir l'icône de la devise actuelle
  const getCurrentCurrencyIcon = () => {
    const currentCurr = currencies.find(curr => curr.code === currency);
    return currentCurr ? currentCurr.icon : '';
  };
  
  return (
    <View style={styles.container}>
      {/* Sélecteur de langue */}
      <TouchableOpacity 
        style={styles.selector} 
        onPress={openLanguageSelector}
      >
        <View style={styles.iconContainer}>
          <Text style={styles.flagIcon}>{getCurrentLanguageIcon()}</Text>
        </View>
        <View style={styles.labelContainer}>
          <Text style={styles.label}>{t('preferences.language')}</Text>
          <Text style={styles.value}>{getCurrentLanguageName()}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />
      </TouchableOpacity>
      
      {/* Sélecteur de devise */}
      <TouchableOpacity 
        style={styles.selector} 
        onPress={openCurrencySelector}
      >
        <View style={styles.iconContainer}>
          <Text style={styles.currencyIcon}>{getCurrentCurrencyIcon()}</Text>
        </View>
        <View style={styles.labelContainer}>
          <Text style={styles.label}>{t('preferences.currency')}</Text>
          <Text style={styles.value}>{getCurrentCurrencyName()}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />
      </TouchableOpacity>
      
      {/* Dialog pour la sélection de langue */}
      <Portal>
        <Dialog 
          visible={visible === 'language'} 
          onDismiss={hideDialog}
          style={styles.dialog}
        >
          <Dialog.Title>{t('preferences.chooseLanguage')}</Dialog.Title>
          <Dialog.Content>
            <ScrollView>
              <RadioButton.Group 
                onValueChange={value => selectLanguage(value as Language)} 
                value={language}
              >
                {languages.map((lang) => (
                  <TouchableOpacity
                    key={lang.code}
                    style={styles.radioItem}
                    onPress={() => selectLanguage(lang.code)}
                  >
                    <Text style={styles.flagIcon}>{lang.icon}</Text>
                    <Text style={styles.radioLabel}>{lang.label}</Text>
                    <RadioButton value={lang.code} />
                  </TouchableOpacity>
                ))}
              </RadioButton.Group>
            </ScrollView>
          </Dialog.Content>
        </Dialog>
      </Portal>
      
      {/* Dialog pour la sélection de devise */}
      <Portal>
        <Dialog 
          visible={visible === 'currency'} 
          onDismiss={hideDialog}
          style={styles.dialog}
        >
          <Dialog.Title>{t('preferences.chooseCurrency')}</Dialog.Title>
          <Dialog.Content>
            <ScrollView>
              <RadioButton.Group 
                onValueChange={value => selectCurrency(value as Currency)} 
                value={currency}
              >
                {currencies.map((curr) => (
                  <TouchableOpacity
                    key={curr.code}
                    style={styles.radioItem}
                    onPress={() => selectCurrency(curr.code)}
                  >
                    <Text style={styles.currencyIcon}>{curr.icon}</Text>
                    <Text style={styles.radioLabel}>{curr.label}</Text>
                    <RadioButton value={curr.code} />
                  </TouchableOpacity>
                ))}
              </RadioButton.Group>
            </ScrollView>
          </Dialog.Content>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing[4],
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    marginBottom: spacing[3],
    ...Platform.select({
      ios: {
        shadowColor: colors.gray[300],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  iconContainer: {
    marginRight: spacing[3],
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.full,
  },
  flagIcon: {
    fontSize: 20,
  },
  currencyIcon: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  labelContainer: {
    flex: 1,
  },
  label: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    marginBottom: 2,
  },
  value: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: colors.gray[800],
  },
  dialog: {
    borderRadius: borderRadius.lg,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  radioLabel: {
    flex: 1,
    marginLeft: spacing[3],
    fontSize: typography.fontSize.base,
    color: colors.gray[800],
  },
});

export default LanguageCurrencySelector; 