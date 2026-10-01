import React from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { HostTabParamList } from '../types';
import { colors } from '../theme';
import HostTodayScreen from '../screens/HostTodayScreen';
import HostCalendarScreen from '../screens/HostCalendarScreen';
import HostListingsScreen from '../screens/HostListingsScreen';
import HostMessagesScreen from '../screens/HostMessagesScreen';
import HostProfileScreen from '../screens/HostProfileScreen';

const Tab = createBottomTabNavigator<HostTabParamList>();
const tabs = [
  { name: 'HostToday', label: 'today', icon: 'today' },
  { name: 'HostAvailability', label: 'calendar', icon: 'calendar-month' },
  { name: 'HostProperties', label: 'listings', icon: 'home-work' },
  { name: 'HostInbox', label: 'messages', icon: 'chat-bubble-outline' },
  { name: 'HostMenu', label: 'menu', icon: 'menu' },
] as const;

function HostTabBar({ state, navigation, insets }: BottomTabBarProps) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  return <View style={[s.bar, { paddingBottom: Math.max(insets.bottom, 8), paddingLeft: insets.left, paddingRight: insets.right }]}>
    <View style={s.items}>{state.routes.map((route, index) => {
      const item = tabs.find(tab => tab.name === route.name)!;
      const selected = state.index === index;
      return <Pressable key={route.key} accessibilityRole="tab" accessibilityState={{ selected }}
        accessibilityLabel={t(`hostFlow.tabs.${item.label}`)}
        onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
        onPress={() => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!selected && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        }} style={({ pressed }) => [s.item, pressed && { opacity: 0.6 }]}>
        <View style={[s.indicator, selected && { backgroundColor: colors.primaryLight }]}>
          <MaterialIcons name={item.icon} size={23} color={selected ? colors.primary : colors.inkSubtle} />
        </View>
        <Text style={[s.label, width < 360 && { fontSize: 12, letterSpacing: -0.4 }, selected && { color: colors.primaryDark, fontWeight: '600' }]}>{t(`hostFlow.tabs.${item.label}`)}</Text>
      </Pressable>;
    })}</View>
  </View>;
}
export default function HostNavigator() {
  return <Tab.Navigator tabBar={props => <HostTabBar {...props} />} screenOptions={{ headerShown: false }} backBehavior="history">
    <Tab.Screen name="HostToday" component={HostTodayScreen} />
    <Tab.Screen name="HostAvailability" component={HostCalendarScreen} />
    <Tab.Screen name="HostProperties" component={HostListingsScreen} />
    <Tab.Screen name="HostInbox" component={HostMessagesScreen} />
    <Tab.Screen name="HostMenu" component={HostProfileScreen} />
  </Tab.Navigator>;
}
const s = StyleSheet.create({
  bar: { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 },
  items: { flexDirection: 'row', width: '100%', maxWidth: 760, alignSelf: 'center' },
  item: { flex: 1, minHeight: 56, alignItems: 'center', gap: 4, paddingHorizontal: 1 },
  indicator: { paddingHorizontal: 14, paddingVertical: 3, borderRadius: 12 },
  label: { width: '100%', fontSize: 13, lineHeight: 18, color: colors.inkSubtle, textAlign: 'center' },
});
