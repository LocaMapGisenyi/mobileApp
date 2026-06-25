import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Text, Dialog, Portal, RadioButton } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { usePreferences, Language } from '../store/preferences';
import { useTranslation } from 'react-i18next';
import { colors, spacing, typography, borderRadius } from '../theme';

interface LanguageSelectorProps {
  compact?: boolean;
}

/**
 * Component to display and change the app language
 */
const LanguageSelector: React.FC<LanguageSelectorProps> = ({ compact = false }) => {
  const { language, setLanguage } = usePreferences();
  const { t } = useTranslation();
  
  const [visible, setVisible] = useState(false);
  
  // Open the language selector
  const openLanguageSelector = () => setVisible(true);
  
  // Close the selector
  const hideDialog = () => setVisible(false);
  
  // Select a language
  const selectLanguage = async (value: Language) => {
    await setLanguage(value);
    hideDialog();
  };
  
  // Available languages
  const languages: { code: Language; label: string; icon: string }[] = [
    { code: 'fr', label: t('languages.fr'), icon: '🇫🇷' },
    { code: 'en', label: t('languages.en'), icon: '🇬🇧' },
    { code: 'rw', label: t('languages.rw'), icon: '🇷🇼' },
    { code: 'sw', label: t('languages.sw'), icon: '🇹🇿' },
  ];
  
  // Get current language name
  const getCurrentLanguageName = () => {
    const currentLang = languages.find(lang => lang.code === language);
    return currentLang ? currentLang.label : '';
  };
  
  // Get current language icon
  const getCurrentLanguageIcon = () => {
    const currentLang = languages.find(lang => lang.code === language);
    return currentLang ? currentLang.icon : '';
  };

  return (
    <View style={styles.container}>
      {/* Language selector */}
      <TouchableOpacity 
        style={[styles.selector, compact && styles.compactSelector]} 
        onPress={openLanguageSelector}
      >
        <View style={styles.iconContainer}>
          <Text style={styles.flagIcon}>{getCurrentLanguageIcon()}</Text>
        </View>
        {!compact && (
          <View style={styles.labelContainer}>
            <Text style={styles.label}>{t('preferences.language')}</Text>
            <Text style={styles.value}>{getCurrentLanguageName()}</Text>
          </View>
        )}
        {!compact && <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />}
      </TouchableOpacity>
      
      {/* Dialog for language selection */}
      <Portal>
        <Dialog 
          visible={visible} 
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing[2],
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
  compactSelector: {
    padding: spacing[2],
    marginBottom: 0,
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

export default LanguageSelector; 