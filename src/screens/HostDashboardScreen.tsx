import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Platform,
} from 'react-native';
import { colors } from '../theme';
import {
  Text,
  useTheme,
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import HostListingsScreen from './HostListingsScreen';
import HostMessagesScreen from './HostMessagesScreen';
import HostProfileScreen from './HostProfileScreen';

type HostDashboardScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'HostDashboard'>;

// Composant carnet/notebook pour l'illustration
const NotebookIllustration = () => {
  return (
    <View style={styles.bookContainer}>
      <View style={styles.bookCover}>
        <View style={styles.bookSide} />
        <View style={styles.bookCenter}>
          <View style={styles.bookSpiral} />
          <View style={styles.bookSpiral} />
          <View style={styles.bookSpiral} />
          <View style={styles.bookSpiral} />
          <View style={styles.bookSpiral} />
          <View style={styles.bookSpiral} />
        </View>
        <View style={styles.bookPage}>
          <View style={styles.bookGrid}>
            <View style={styles.bookGridRow}>
              <View style={styles.bookGridCell} />
              <View style={styles.bookGridCell} />
            </View>
            <View style={styles.bookGridRow}>
              <View style={styles.bookGridCell} />
              <View style={styles.bookGridCell} />
            </View>
            <View style={styles.bookGridRow}>
              <View style={styles.bookGridCell} />
              <View style={styles.bookGridCell} />
            </View>
          </View>
        </View>
      </View>
      <View style={styles.bookmarkRibbon} />
    </View>
  );
};

const HostDashboardScreen = () => {
  const theme = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<HostDashboardScreenNavigationProp>();
  const [activeFilter, setActiveFilter] = useState<'today' | 'upcoming'>('today');
  const [activeTab, setActiveTab] = useState('today');

  const handleFilterChange = (filter: 'today' | 'upcoming') => {
    setActiveFilter(filter);
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  // Rendu dynamique du contenu selon l'onglet actif
  const renderContent = () => {
    switch (activeTab) {
      case 'listings':
        return <HostListingsScreen />;
      case 'messages':
        return <HostMessagesScreen />;
      case 'menu':
        return <HostProfileScreen />;
      case 'calendar':
        return (
          <>
            <View style={styles.headerContainer}>
              <Text style={styles.headerTitle}>Calendrier</Text>
            </View>
            
            <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
              <View style={styles.calendarInfoContainer}>
                <Text style={styles.calendarInfoText}>
                  Lorsque vous aurez publié une annonce, c'est ici que vous pourrez voir et modifier votre calendrier.
                </Text>
                
                <View style={styles.divider} />
                
                <TouchableOpacity
                  style={styles.refreshButton}
                  activeOpacity={0.7}
                >
                  <Text style={styles.refreshButtonText}>Rafraîchir</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </>
        );
      case 'today':
      default:
        return (
          <>
            {/* Filter Buttons - Styled exactly like the screenshot */}
            <Animated.View entering={FadeIn.duration(500)} style={styles.filterContainer}>
              <View style={styles.filterButtonsContainer}>
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    activeFilter === 'today' && styles.activeFilterButton
                  ]}
                  onPress={() => handleFilterChange('today')}
                >
                  <Text style={[
                    styles.filterButtonText,
                    activeFilter === 'today' && styles.activeFilterButtonText
                  ]}>
                    Aujourd'hui
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    activeFilter === 'upcoming' && styles.activeFilterButton
                  ]}
                  onPress={() => handleFilterChange('upcoming')}
                >
                  <Text style={[
                    styles.filterButtonText,
                    activeFilter === 'upcoming' && styles.activeFilterButtonText
                  ]}>
                    À venir
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
            
            <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
              {/* Empty State */}
              <Animated.View entering={FadeInUp.delay(300).duration(500)} style={styles.emptyStateContainer}>
                {/* Calendar/Book Illustration */}
                <View style={styles.illustrationContainer}>
                  <NotebookIllustration />
                </View>
                
                <Text style={styles.emptyStateText}>
                  Vous n'avez aucune réservation
                </Text>
              </Animated.View>
            </ScrollView>
          </>
        );
    }
  };

  const HOST_TABS = [
    { id: 'today',    icon: 'bookmark-border',    label: "Aujourd'hui" },
    { id: 'calendar', icon: 'calendar-today',      label: 'Calendrier' },
    { id: 'listings', icon: 'featured-play-list',  label: 'Annonces' },
    { id: 'messages', icon: 'chat-bubble-outline', label: 'Messages' },
    { id: 'menu',     icon: 'person-outline',      label: 'Profil' },
  ] as const;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      
      {/* Render content based on active tab */}
      {renderContent()}

      {/* Bottom Navigation Bar — pill identique à la navbar principale */}
      <View style={styles.navWrapper} pointerEvents="box-none">
        <View style={styles.bottomNavigation}>
          {HOST_TABS.map(tab => {
            const active = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={styles.navItem}
                onPress={() => handleTabChange(tab.id)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={tab.label}
              >
                <MaterialIcons
                  name={tab.icon as any}
                  size={26}
                  color={active ? colors.primary : colors.gray[400]}
                />
                <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                  {tab.label}
                </Text>
                {active && <View style={styles.navDot} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.white,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 100, // Espace pour la bannière inférieure + navigation
  },
  filterContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    alignItems: 'center',
  },
  filterButtonsContainer: {
    flexDirection: 'row',
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
    width: '85%',
  },
  filterButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
  },
  activeFilterButton: {
    backgroundColor: '#222222', // Noir comme sur la capture d'écran
    margin: 4,
  },
  filterButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#717171',
  },
  activeFilterButtonText: {
    color: '#FFFFFF',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginTop: 20,
  },
  illustrationContainer: {
    marginBottom: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Styles pour notre composant d'illustration personnalisé
  bookContainer: {
    width: 200,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  bookCover: {
    flexDirection: 'row',
    height: 120,
    width: 180,
    position: 'relative',
  },
  bookSide: {
    width: 10,
    height: '100%',
    backgroundColor: '#E8E0D0',
    borderTopLeftRadius: 5,
    borderBottomLeftRadius: 5,
  },
  bookCenter: {
    width: 15,
    height: '100%',
    backgroundColor: '#D0D0D0',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 10,
  },
  bookSpiral: {
    width: 8,
    height: 4,
    backgroundColor: '#A0A0A0',
    borderRadius: 2,
    marginVertical: 3,
  },
  bookPage: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderTopRightRadius: 5,
    borderBottomRightRadius: 5,
    padding: 15,
  },
  bookGrid: {
    flex: 1,
    justifyContent: 'space-around',
  },
  bookGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bookGridCell: {
    width: '45%',
    height: 15,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  bookmarkRibbon: {
    position: 'absolute',
    right: 45,
    top: -5,
    width: 20,
    height: 30,
    backgroundColor: '#FF5A5F',
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
    transform: [{ translateY: 5 }],
  },
  emptyStateText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#222222',
    textAlign: 'center',
    maxWidth: '80%',
  },
  navWrapper: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  bottomNavigation: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 28,
    paddingHorizontal: 8,
    paddingVertical: 10,
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.10,
        shadowRadius: 24,
      },
      android: { elevation: 12 },
    }),
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    gap: 2,
  },
  navLabel: {
    fontSize: 10,
    color: colors.gray[400],
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  navLabelActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  navDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginTop: 1,
  },
  headerContainer: {
    padding: 20,
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#222222',
    marginLeft: 5,
  },
  calendarInfoContainer: {
    padding: 20,
  },
  calendarInfoText: {
    fontSize: 18,
    color: '#222222',
    textAlign: 'left',
    marginBottom: 30,
    lineHeight: 26,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    width: '100%',
    marginBottom: 30,
  },
  refreshButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderColor: '#222222',
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'white',
  },
  refreshButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#222222',
  },
});

export default HostDashboardScreen; 