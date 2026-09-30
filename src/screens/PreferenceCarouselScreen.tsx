import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  useWindowDimensions,
  TouchableOpacity,
  ScrollView,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CarouselSlide from '../components/CarouselSlide';
import { usePreferences, Language, Currency } from '../store/preferences';
import { useUserActions } from '../store/user';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../theme';
import { useTranslation } from 'react-i18next';

const PreferenceCarouselScreen = () => {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const { setLanguage, setCurrency, setNotifications } = usePreferences();
  const { setOnboardingCompleted } = useUserActions();
  const { t, i18n } = useTranslation();

  // Current slide index
  const [currentIndex, setCurrentIndex] = useState(0);

  // Selected preferences
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('fr');
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('RWF');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  // Pour suivre si les préférences sont en cours de sauvegarde
  const [isSaving, setIsSaving] = useState(false);

  // Mettre à jour la langue de i18n lors du changement
  useEffect(() => {
    i18n.changeLanguage(selectedLanguage);
  }, [selectedLanguage, i18n]);

  useEffect(() => {
    scrollViewRef.current?.scrollTo({ x: currentIndex * width, animated: false });
  }, [width]);

  // Slide data
  const getSlides = () => [
    {
      title: t('preferences.chooseLanguage'),
      description: t('preferences.languageDescription'),
      type: 'radio' as const,
      options: [
        { key: 'fr', label: t('languages.fr'), value: 'fr', icon: 'language' },
        { key: 'en', label: t('languages.en'), value: 'en', icon: 'language' },
        { key: 'rw', label: t('languages.rw'), value: 'rw', icon: 'language' },
        { key: 'sw', label: t('languages.sw'), value: 'sw', icon: 'language' },
      ],
      selectedValue: selectedLanguage,
      onSelect: (value: string) => setSelectedLanguage(value as Language),
    },
    {
      title: t('preferences.chooseCurrency'),
      description: t('preferences.currencyDescription'),
      type: 'radio' as const,
      options: [{ key: 'RWF', label: t('currencies.RWF'), value: 'RWF', icon: 'cash' }],
      selectedValue: selectedCurrency,
      onSelect: (value: string) => setSelectedCurrency(value as Currency),
    },
    {
      title: t('preferences.notifications'),
      description: t('preferences.notificationsDescription'),
      type: 'switch' as const,
      options: [
        {
          key: 'notifications',
          label: t('preferences.enableNotifications'),
          value: true,
          icon: 'notifications-outline',
        },
      ],
      selectedValue: notificationsEnabled,
      onSelect: (value: boolean) => setNotificationsEnabled(value),
    },
  ];

  const handleNext = async () => {
    if (currentIndex < getSlides().length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      scrollViewRef.current?.scrollTo({ x: nextIndex * width, animated: true });
    } else {
      // Indiquer que nous sommes en train de sauvegarder
      setIsSaving(true);

      try {
        // Sauvegarder les préférences
        await setLanguage(selectedLanguage);
        await setCurrency(selectedCurrency);
        await setNotifications(notificationsEnabled);

        // Marquer l'onboarding comme terminé
        await setOnboardingCompleted(true);
      } catch (error) {
        console.error('Erreur lors de la sauvegarde des préférences:', error);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      scrollViewRef.current?.scrollTo({ x: prevIndex * width, animated: true });
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const xOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(xOffset / width);
    if (index !== currentIndex) {
      setCurrentIndex(index);
    }
  };

  const slides = getSlides();

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {slides.map((slide, index) => (
          <View key={index} style={[styles.slide, { width }]}>
            <CarouselSlide
              title={slide.title}
              description={slide.description}
              options={slide.options}
              selectedValue={slide.selectedValue}
              onSelect={slide.onSelect as (value: string | boolean) => void}
              type={slide.type}
              index={index}
            />
          </View>
        ))}
      </ScrollView>

      <View style={styles.navigationContainer}>
        <View style={styles.progressContainer}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[styles.progressDot, currentIndex === index && styles.activeDot]}
            />
          ))}
        </View>

        <View style={styles.buttonsContainer}>
          {currentIndex > 0 && (
            <TouchableOpacity onPress={handlePrevious} style={styles.prevButton}>
              <Ionicons name="arrow-back" size={22} color={colors.gray[600]} />
              <Text style={styles.prevButtonText}>{t('common.previous')}</Text>
            </TouchableOpacity>
          )}

          <View key={currentIndex} style={styles.nextButtonContainer}>
            <Button
              mode="contained"
              buttonColor={colors.accent}
              textColor={colors.onAccent}
              onPress={handleNext}
              loading={isSaving}
              disabled={isSaving}
              style={styles.nextButton}
              labelStyle={styles.nextButtonLabel}
            >
              {currentIndex === slides.length - 1 ? t('common.finish') : t('common.next')}
            </Button>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    height: '100%',
  },
  navigationContainer: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[8],
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing[6],
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.gray[300],
    marginHorizontal: spacing[1],
  },
  activeDot: {
    backgroundColor: colors.primary,
    width: 24,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  prevButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[2],
  },
  prevButtonText: {
    color: colors.gray[600],
    fontWeight: '500',
    marginLeft: spacing[1],
  },
  nextButtonContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  nextButton: {
    minWidth: 120,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.button,
  },
  nextButtonLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    paddingVertical: spacing[1],
  },
});

export default PreferenceCarouselScreen;
