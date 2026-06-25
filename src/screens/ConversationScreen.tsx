import React, { useEffect, useRef, useState } from 'react';
import { 
  StyleSheet, 
  View, 
  FlatList, 
  KeyboardAvoidingView, 
  Platform, 
  SafeAreaView,
  ActivityIndicator,
  Text
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { colors, spacing, typography } from '../theme';
import { useMessagesStore } from '../store/messages';
import ChatHeader from '../components/ChatHeader';
import ChatBubble from '../components/ChatBubble';
import MessageInputBar from '../components/MessageInputBar';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { StatusBar } from 'expo-status-bar';
import { Message } from '../data/mockMessages'; // Import Message type

type ConversationScreenRouteProp = RouteProp<RootStackParamList, 'Conversation'>;

const ConversationScreen = () => {
  const { t } = useTranslation();
  const route = useRoute<ConversationScreenRouteProp>();
  const { conversationId } = route.params;
  const flatListRef = useRef<FlatList<Message>>(null); // Specify Message type for FlatList ref
  const [isLoading, setIsLoading] = useState(true);
  
  const { getConversation, sendMessage, markConversationAsRead } = useMessagesStore();
  const conversation = getConversation(conversationId);
  
  // Simulate loading message history
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800); // Keep existing loading simulation
    
    return () => clearTimeout(timer);
  }, []);
  
  useEffect(() => {
    // Mark conversation as read when opened
    if (conversation && conversation.unreadCount > 0) {
      markConversationAsRead(conversationId);
    }
  }, [conversationId, conversation]); // Added conversation to dependency array
  
  // Scroll to bottom when new messages are added or keyboard shows for inverted list
  useEffect(() => {
    if (conversation?.messages.length && flatListRef.current) {
      // For inverted FlatList, scrolling to offset 0 brings the latest message into view.
      // A short timeout can help ensure the layout is complete.
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 100);
    }
  }, [conversation?.messages.length]); // Re-scroll when message count changes
  
  const handleSendMessage = async (text: string) => {
    // The sendMessage in store already simulates a response.
    // No need to add another setTimeout here unless we want a different behavior.
    await sendMessage(conversationId, text);
  };
  
  const renderItem = ({ item, index }: { item: Message; index: number }) => { // Specify item type
    // For an inverted list, messages are effectively processed in reverse for display.
    // The logic for shouldShowAvatar might need to be aware of this if it depends on "next" message.
    // However, the current shouldShowAvatar logic looks at messages[index+1] which becomes messages[index-1] effectively for inverted list.
    // The data is reversed before passing to FlatList, so index still refers to original order.
    const isLastInGroup = shouldShowAvatar(item, index, reversedMessages);
    
    return (
      <ChatBubble 
        message={item} 
        isLastInGroup={isLastInGroup}
      />
    );
  };
  
  // Determine if we should show the avatar
  // Adjusted for potentially reversed list of messages if needed, but data is reversed before passing.
  const shouldShowAvatar = (currentMessage: Message, currentIndex: number, messages: Message[]) => {
    if (!currentMessage) return false;
    
    const previousMessage = currentIndex > 0 ? messages[currentIndex - 1] : null;
      
    // Show avatar if:
    // 1. It's the first message in the list (newest in inverted view)
    // 2. Or, the previous message (older in inverted view) is from a different user.
    return !previousMessage || previousMessage.user.id !== currentMessage.user.id;
  };
  
  if (!conversation) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <Text>{t('messages.conversationNotFound', 'Conversation not found')}</Text>
      </SafeAreaView>
    );
  }
  
  // Reverse messages for inverted FlatList: newest messages at the bottom (rendered first by inverted list)
  const reversedMessages = conversation ? [...conversation.messages].reverse() : [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        // Adjust keyboardVerticalOffset as needed. Standard for iOS is often around 64 (header height)
        // or dynamically calculated. For now, keeping it simple.
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0} 
      >
        <ChatHeader 
          userName={conversation.otherUser.name}
          userAvatar={conversation.otherUser.avatar || ''}
          propertyTitle={conversation.propertyTitle}
        />
        
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <Animated.View 
            entering={FadeIn.duration(300)}
            style={styles.chatContainer}
          >
            {reversedMessages.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>{t('messages.noMessagesYet', 'No messages yet. Start the conversation!')}</Text>
              </View>
            ) : (
              <FlatList
                ref={flatListRef}
                data={reversedMessages} // Use reversed messages
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.messagesContainer}
                showsVerticalScrollIndicator={false}
                inverted={true} // Key change for chat behavior
                // Remove initialNumToRender and onContentSizeChange if not specifically needed
                // for inverted lists as behavior might differ.
                // Let's keep them for now and test.
                initialNumToRender={15} 
                maxToRenderPerBatch={10}
                // onContentSizeChange is often not needed with inverted and scrollToOffset(0)
              />
            )}
          </Animated.View>
        )}
        
        <MessageInputBar 
          onSend={handleSendMessage} 
          placeholder={t('messages.typeMessage', 'Type a message...')}
          // sendButtonText is not used by MessageInputBar, it uses an icon
        />
      </KeyboardAvoidingView>
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
    backgroundColor: colors.white, // Changed from gray[50] to white to match safeArea
  },
  chatContainer: {
    flex: 1,
    backgroundColor: colors.gray[50], // Keep chat background slightly different
  },
  messagesContainer: {
    paddingVertical: spacing[2], // Reduced vertical padding for denser look
    paddingHorizontal: spacing[2],
    // For inverted FlatList, contentContainerStyle grows from bottom up.
    // justifyContent: 'flex-end' can be useful if list is short, but usually not needed with inverted.
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.gray[50], // Match chatContainer background
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
    transform: [{ scaleY: -1 }], // Counter the FlatList inversion for empty state
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: colors.gray[500],
    textAlign: 'center',
    lineHeight: typography.lineHeight.relaxed,
    transform: [{ scaleY: -1 }], // Counter the FlatList inversion for text
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
});

export default ConversationScreen; 