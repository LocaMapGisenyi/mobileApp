import React, { Component, ErrorInfo } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from 'react-native-paper';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../theme';
import { useTranslation } from 'react-i18next';

// Screens
import HomeScreen from '../screens/HomeScreen';
import ExplorerScreen from '../screens/ExplorerScreen';
import SearchScreen from '../screens/SearchScreen';
import LogementDetailScreen from '../screens/LogementDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import PreferenceCarouselScreen from '../screens/PreferenceCarouselScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import SavedScreen from '../screens/SavedScreen';
import MapScreen from '../screens/MapScreen';
import MessageListScreen from '../screens/MessageListScreen';
import ConversationScreen from '../screens/ConversationScreen';
import NewMessageScreen from '../screens/NewMessageScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import AlertPreferencesScreen from '../screens/AlertPreferencesScreen';
import LeaveReviewScreen from '../screens/LeaveReviewScreen';
import LocalGuideScreen from '../screens/LocalGuideScreen';
import GuideDetailScreen from '../screens/GuideDetailScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import HostDashboardScreen from '../screens/HostDashboardScreen';
import HostOnboardingScreen from '../screens/HostOnboardingScreen';
import CreateListingScreen from '../screens/CreateListingScreen';

// Navigators
import AuthNavigator from './AuthNavigator';

// State
import { useUserStore } from '../store/user';
import { useMessagesStore } from '../store/messages';
import { useFavoritesStore } from '../store/favorites';

// Types
import { RootStackParamList } from '../types';

class NavigationErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Navigation error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: colors.gray[700], fontSize: typography.fontSize.base }}>
            Une erreur inattendue s'est produite. Veuillez redémarrer l'application.
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

// ─── Custom Tab Bar ───────────────────────────────────────────────────────────
const TAB_CONFIGS = [
  { name: 'Explorer',     icon: 'search',            labelKey: 'tabs.explorer' },
  { name: 'Favorites',    icon: 'favorite-border',   labelKey: 'tabs.favorites' },
  { name: 'MessagesList', icon: 'chat-bubble-outline', labelKey: 'tabs.messages' },
  { name: 'Profile',      icon: 'account-circle',    labelKey: 'tabs.profile' },
] as const;

const CustomTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const { t } = useTranslation();
  const { totalUnreadCount } = useMessagesStore();
  const { favoriteIds } = useFavoritesStore();

  const getBadge = (name: string) => {
    if (name === 'Favorites') return favoriteIds.length > 0 ? String(favoriteIds.length > 9 ? '9+' : favoriteIds.length) : null;
    if (name === 'MessagesList') return totalUnreadCount > 0 ? String(totalUnreadCount > 9 ? '9+' : totalUnreadCount) : null;
    return null;
  };

  return (
    <View style={tabStyles.wrapper} pointerEvents="box-none">
      <View style={tabStyles.bar}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const cfg = TAB_CONFIGS.find(c => c.name === route.name)!;
          const badge = getBadge(route.name);

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name as any);
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.8}
              style={tabStyles.tab}
              accessibilityRole="button"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={t(cfg.labelKey) as string}
            >
              {/* Icon + badge */}
              <View style={tabStyles.iconWrap}>
                <MaterialIcons
                  name={cfg.icon as any}
                  size={26}
                  color={isFocused ? colors.primary : colors.inkDisabled}
                />
                {badge && (
                  <View style={tabStyles.badge}>
                    <Text style={tabStyles.badgeTxt}>{badge}</Text>
                  </View>
                )}
              </View>
              {/* Label */}
              <Text style={[tabStyles.label, isFocused && tabStyles.labelActive]}>
                {t(cfg.labelKey) as string}
              </Text>
              {/* Active dot */}
              {isFocused && <View style={tabStyles.dot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const tabStyles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 28,
    paddingHorizontal: 8,
    paddingVertical: 10,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
      },
      android: { elevation: 10 },
    }),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    gap: 2,
  },
  iconWrap: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -7,
    backgroundColor: colors.primary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  badgeTxt: {
    color: colors.white,
    fontSize: 8,
    fontWeight: '700',
  },
  label: {
    fontSize: 10,
    color: colors.inkDisabled,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  labelActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginTop: 1,
  },
});

// Tab Navigator Component
const TabNavigator = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Explorer"     component={ExplorerScreen} />
      <Tab.Screen name="Favorites"    component={FavoritesScreen} />
      <Tab.Screen name="MessagesList" component={MessageListScreen} />
      <Tab.Screen name="Profile"      component={ProfileScreen} />
    </Tab.Navigator>
  );
};

// Root Navigator Component
const AppNavigator = () => {
  const theme = useTheme();
  const isAuthenticated = useUserStore(state => state.user.isLoggedIn);
  const hasCompletedOnboarding = useUserStore(state => state.user.hasCompletedOnboarding);

  const screenOptions = {
    headerShown: true,
    headerTitleStyle: {
      fontWeight: '600' as const,
      fontSize: typography.fontSize.lg,
      color: colors.gray[800],
    },
    headerStyle: {
      backgroundColor: colors.white,
      shadowColor: 'transparent',
      borderBottomWidth: 0,
    },
    headerShadowVisible: false,
    headerBackTitleVisible: false,
    headerTintColor: colors.gray[800],
    contentStyle: {
      backgroundColor: colors.white,
    },
    animation: 'slide_from_right' as const,
  } as const;

  return (
    <NavigationErrorBoundary>
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={screenOptions}
      >
        {!isAuthenticated ? (
          // Flux d'authentification
          <Stack.Screen
            name="Auth"
            component={AuthNavigator}
            options={{ headerShown: false }}
          />
        ) : (
          // Flux après authentification
          !hasCompletedOnboarding ? (
            <Stack.Screen 
              name="PreferenceCarousel" 
              component={PreferenceCarouselScreen}
              options={{ headerShown: false }}
            />
          ) : (
            // Flux principal une fois les préférences définies
            <>
              <Stack.Screen
                name="MainTabs"
                component={TabNavigator}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="PropertyDetails"
                component={LogementDetailScreen}
                options={{
                  headerTransparent: true,
                  headerTitle: '',
                  headerBackVisible: true,
                  animation: 'slide_from_right',
                }}
              />
              <Stack.Screen
                name="Search"
                component={SearchScreen}
                options={{
                  headerShown: false,
                  animation: 'slide_from_right',
                }}
              />
              <Stack.Screen
                name="MapScreen"
                component={MapScreen}
                options={{
                  headerShown: false,
                  animation: 'slide_from_bottom',
                }}
              />
              <Stack.Screen
                name="Conversation"
                component={ConversationScreen}
                options={{
                  headerShown: false,
                  animation: 'slide_from_right',
                }}
              />
              <Stack.Screen
                name="NewMessage"
                component={NewMessageScreen}
                options={{
                  headerShown: false,
                  animation: 'slide_from_bottom',
                }}
              />
              <Stack.Screen
                name="LeaveReview"
                component={LeaveReviewScreen}
                options={{
                  headerShown: false,
                  animation: 'slide_from_bottom',
                }}
              />
              <Stack.Screen
                name="GuideDetail"
                component={GuideDetailScreen}
                options={{
                  headerShown: false,
                  animation: 'slide_from_right',
                }}
              />
              <Stack.Screen
                name="LocalGuide"
                component={LocalGuideScreen}
                options={{
                  headerShown: false,
                  animation: 'slide_from_right',
                }}
              />
              <Stack.Screen
                name="AlertPreferences"
                component={AlertPreferencesScreen}
                options={{
                  headerShown: false,
                  animation: 'slide_from_bottom',
                }}
              />
              <Stack.Screen
                name="EditProfile"
                component={EditProfileScreen}
                options={{
                  headerShown: false,
                  animation: 'slide_from_right',
                }}
              />
              <Stack.Screen
                name="HostDashboard"
                component={HostDashboardScreen}
                options={{
                  headerShown: false,
                  animation: 'slide_from_right',
                }}
              />
              <Stack.Screen
                name="HostOnboarding"
                component={HostOnboardingScreen}
                options={{
                  headerShown: false,
                  animation: 'slide_from_bottom',
                }}
              />
              <Stack.Screen
                name="CreateListing"
                component={CreateListingScreen}
                options={{
                  headerShown: false,
                  animation: 'slide_from_bottom',
                }}
              />
            </>
          )
        )}
      </Stack.Navigator>
    </NavigationContainer>
    </NavigationErrorBoundary>
  );
};

const styles = StyleSheet.create({});

export default AppNavigator; 