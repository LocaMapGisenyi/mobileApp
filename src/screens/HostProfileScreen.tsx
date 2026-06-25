import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import {
  Text,
  useTheme,
  Divider,
  Surface,
  Avatar,
  ProgressBar,
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { colors } from '../theme';

type HostScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const StatItem = ({ icon, label, value }: { icon: string; label: string; value: string | number }) => {
  return (
    <View style={styles.statItem}>
      <MaterialIcons name={icon as any} size={24} color={colors.primary} style={styles.statIcon} />
      <View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );
};

const ActionButton = ({ icon, label, onPress, primary = false }: { icon: string; label: string; onPress: () => void; primary?: boolean }) => {
  const theme = useTheme();
  
  return (
    <TouchableOpacity 
      style={[
        styles.actionButton,
        primary && { backgroundColor: theme.colors.primary }
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <MaterialIcons
        name={icon as any}
        size={20}
        color={primary ? colors.white : colors.inkSubtle}
      />
      <Text style={[
        styles.actionButtonText,
        primary && { color: colors.white }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const HostProfileScreen = () => {
  const theme = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<HostScreenNavigationProp>();
  
  // Fonction pour naviguer vers l'interface utilisateur régulière
  const handleSwitchToUser = () => {
    // Naviguer vers le MainTabs (l'interface principale avec les onglets)
    navigation.navigate('MainTabs');
  };
  
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      
      {/* Header with title and icons */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Menu</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.notificationIcon}>
            <MaterialIcons name="notifications-none" size={24} color={colors.primary} />
          </TouchableOpacity>
          <View style={styles.profileIconContainer}>
            <Text style={styles.profileIconText}>P</Text>
          </View>
        </View>
      </View>
      
      <ScrollView style={styles.container}>
        {/* Menu Items */}
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <MaterialIcons name="settings" size={24} color={colors.primary} />
            <Text style={styles.menuItemText}>Paramètres du compte</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={colors.inkSubtle} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <MaterialIcons name="menu-book" size={24} color={colors.primary} />
            <Text style={styles.menuItemText}>Ressources pour les hôtes</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={colors.inkSubtle} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <MaterialIcons name="help-outline" size={24} color={colors.primary} />
            <Text style={styles.menuItemText}>Obtenir de l'aide</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={colors.inkSubtle} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <MaterialIcons name="group" size={24} color={colors.primary} />
            <Text style={styles.menuItemText}>Trouver un co-hôte</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={colors.inkSubtle} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <MaterialIcons name="add-home" size={24} color={colors.primary} />
            <Text style={styles.menuItemText}>Créer une nouvelle annonce</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={colors.inkSubtle} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <MaterialIcons name="people-outline" size={24} color={colors.primary} />
            <Text style={styles.menuItemText}>Parrainer un hôte</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={colors.inkSubtle} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <MaterialIcons name="description" size={24} color={colors.primary} />
            <Text style={styles.menuItemText}>Juridique</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={colors.inkSubtle} />
        </TouchableOpacity>
        
        <View style={styles.divider} />
        
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <MaterialIcons name="logout" size={24} color={colors.primary} />
            <Text style={styles.menuItemText}>Déconnexion</Text>
          </View>
        </TouchableOpacity>
        
        {/* Switch mode button */}
        <View style={styles.switchModeContainer}>
          <TouchableOpacity 
            style={styles.switchModeButton}
            onPress={handleSwitchToUser}
          >
            <MaterialIcons name="swap-horiz" size={20} color={colors.white} />
            <Text style={styles.switchModeText}>Passer en mode Locataire</Text>
          </TouchableOpacity>
        </View>
        
        {/* Add padding at the bottom */}
        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceSunken,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.ink,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationIcon: {
    marginRight: 16,
    padding: 4,
  },
  profileIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    borderWidth: 1.5,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileIconText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    marginLeft: 16,
    fontSize: 18,
    color: colors.ink,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
    marginHorizontal: 20,
  },
  switchModeContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  switchModeButton: {
    backgroundColor: colors.primary,
    borderRadius: 25,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchModeText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  statIcon: {
    marginRight: 12,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink,
  },
  statLabel: {
    fontSize: 14,
    color: colors.inkSubtle,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: colors.surfaceSunken,
    marginBottom: 8,
  },
  actionButtonText: {
    marginLeft: 12,
    fontSize: 16,
    color: colors.ink,
    fontWeight: '500',
  },
});

export default HostProfileScreen; 