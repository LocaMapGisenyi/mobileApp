import React from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, shadows } from '../theme';
import Animated, { FadeIn } from 'react-native-reanimated';

interface ChatHeaderProps {
  userName: string;
  userAvatar: string;
  propertyTitle: string;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ userName, userAvatar, propertyTitle }) => {
  const navigation = useNavigation();
  const statusBarHeight = StatusBar.currentHeight || 0;
  const iosStatusBarHeight = 47; // Approximate iOS status bar height
  
  return (
    <Animated.View 
      entering={FadeIn.duration(300)}
      style={[
        styles.container,
        { 
          paddingTop: Platform.OS === 'ios' ? iosStatusBarHeight : statusBarHeight,
          height: Platform.OS === 'ios' ? 88 + statusBarHeight : 64 + statusBarHeight,
        }
      ]}
    >
      <View style={styles.leftSection}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={colors.gray[800]} />
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity style={styles.centerSection} activeOpacity={0.8}>
        <Image 
          source={{ uri: userAvatar }} 
          style={styles.avatar} 
        />
        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>
            {userName}
          </Text>
          <Text style={styles.propertyTitle} numberOfLines={1}>
            {propertyTitle}
          </Text>
        </View>
      </TouchableOpacity>
      
      <View style={styles.rightSection}>
        <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
          <Ionicons name="call-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[3],
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
    ...shadows.sm,
    zIndex: 10,
  },
  leftSection: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backButton: {
    padding: spacing[1],
    borderRadius: 20,
  },
  centerSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: spacing[2],
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold as '600',
    color: colors.gray[800],
  },
  propertyTitle: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[600],
    marginTop: 2,
  },
  rightSection: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  actionButton: {
    padding: spacing[1],
    borderRadius: 20,
  },
});

export default ChatHeader; 