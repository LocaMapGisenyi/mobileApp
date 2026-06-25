import React, { useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  FlatList, 
  Text, 
  TouchableOpacity, 
  StatusBar 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, shadows } from '../theme';
import { useMessagesStore } from '../store/messages';
import ConversationListItem from '../components/ConversationListItem';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

type MessageListScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'MessagesList'>;

const MessageListScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<MessageListScreenNavigationProp>();
  const { conversations } = useMessagesStore();
  
  const handleConversationPress = (conversationId: string) => {
    navigation.navigate('Conversation', { conversationId });
  };
  
  const sortedConversations = [...conversations].sort((a, b) => {
    let timeA = 0;
    if (a.lastMessageAt) {
      if (a.lastMessageAt instanceof Date) {
        timeA = a.lastMessageAt.getTime();
      } else if (typeof a.lastMessageAt === 'string') {
        timeA = new Date(a.lastMessageAt).getTime();
      } else if (typeof a.lastMessageAt === 'number') { // Handle if it's already a timestamp
        timeA = a.lastMessageAt;
      }
    }

    let timeB = 0;
    if (b.lastMessageAt) {
      if (b.lastMessageAt instanceof Date) {
        timeB = b.lastMessageAt.getTime();
      } else if (typeof b.lastMessageAt === 'string') {
        timeB = new Date(b.lastMessageAt).getTime();
      } else if (typeof b.lastMessageAt === 'number') { // Handle if it's already a timestamp
        timeB = b.lastMessageAt;
      }
    }
    // Fallback for NaN times from invalid date strings
    if (isNaN(timeA)) timeA = 0;
    if (isNaN(timeB)) timeB = 0;

    return timeB - timeA;
  });
  
  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubble-ellipses-outline" size={60} color={colors.gray[300]} />
      <Text style={styles.emptyTitle}>{t('messages.noMessages')}</Text>
      <Text style={styles.emptyText}>
        {t('messages.startConversation')}
      </Text>
    </View>
  );
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      
      <View style={styles.header}>
        <Text style={styles.title}>{t('messages.title')}</Text>
        <TouchableOpacity style={styles.searchButton}>
          <Ionicons name="search" size={22} color={colors.gray[800]} />
        </TouchableOpacity>
      </View>
      
      <Animated.View 
        entering={FadeIn.duration(300)}
        style={styles.listContainer}
      >
        <FlatList
          data={sortedConversations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ConversationListItem 
              conversation={item} 
              onPress={handleConversationPress}
            />
          )}
          ListEmptyComponent={renderEmptyList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            sortedConversations.length === 0 ? { flex: 1 } : undefined
          }
        />
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.gray[800],
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.gray[800],
    marginTop: spacing[4],
    marginBottom: spacing[2],
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: colors.gray[600],
    textAlign: 'center',
    lineHeight: typography.lineHeight.md,
  },
});

export default MessageListScreen; 