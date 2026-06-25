import React from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity } from 'react-native';
import { Conversation } from '../types';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';

interface ConversationListItemProps {
  conversation: Conversation;
  onPress: (conversationId: string) => void;
}

const ConversationListItem: React.FC<ConversationListItemProps> = ({ conversation, onPress }) => {
  // Format date for last message time display
  const formatLastMessageTime = (dateInput: Date | string | number | undefined | null): string => {
    if (!dateInput) {
      return ''; // Or some placeholder like '--:--'
    }

    let date: Date;
    if (dateInput instanceof Date) {
      date = dateInput;
    } else if (typeof dateInput === 'string') {
      date = new Date(dateInput);
    } else if (typeof dateInput === 'number') {
      date = new Date(dateInput); // Assuming it's a timestamp
    } else {
      return ''; // Should not happen if types are correct, but good fallback
    }

    // Check if the parsed date is valid
    if (isNaN(date.getTime())) {
      return ''; // Invalid date string or number provided
    }

    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      // Today - show time only
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      // Yesterday
      return 'Hier'; // TODO: Consider i18n for "Yesterday"
    } else if (diffDays < 7) {
      // Within a week - show day name
      // TODO: Consider i18n for day names
      const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
      return days[date.getDay()];
    } else {
      // More than a week - show date
      return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
    }
  };
  
  // Get last message
  const lastMessage = conversation.messages.length > 0 
    ? conversation.messages[conversation.messages.length - 1] 
    : null;
  
  // Determine if the last message is from the current user
  const isLastMessageFromMe = lastMessage && lastMessage.user.id === 'user-1';
  
  // Get preview text
  const getPreviewText = () => {
    if (!lastMessage) return '';
    
    const previewLength = 35;
    let text = lastMessage.text;
    
    if (isLastMessageFromMe) {
      text = 'Vous: ' + text;
    }
    
    if (text.length > previewLength) {
      return text.substring(0, previewLength) + '...';
    }
    
    return text;
  };
  
  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={() => onPress(conversation.id)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        <Image 
          source={{ uri: conversation.otherUser.avatar }} 
          style={styles.avatar} 
        />
        {conversation.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadCount}>
              {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.name} numberOfLines={1}>
            {conversation.otherUser.name}
          </Text>
          <Text style={styles.time}>
            {formatLastMessageTime(conversation.lastMessageAt)}
          </Text>
        </View>
        
        <View style={styles.messageRow}>
          <Text 
            style={[
              styles.messagePreview,
              conversation.unreadCount > 0 && styles.unreadMessagePreview
            ]}
            numberOfLines={1}
          >
            {getPreviewText()}
          </Text>
        </View>
        
        <Text style={styles.propertyTitle} numberOfLines={1}>
          {conversation.propertyTitle}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: spacing[4],
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  avatarContainer: {
    position: 'relative',
    marginRight: spacing[3],
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  unreadBadge: {
    position: 'absolute',
    right: -2,
    top: -2,
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.white,
  },
  unreadCount: {
    color: colors.white,
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[1],
  },
  name: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.gray[800],
    flex: 1,
    marginRight: spacing[2],
  },
  time: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[500],
  },
  messageRow: {
    marginBottom: spacing[1],
  },
  messagePreview: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
  },
  unreadMessagePreview: {
    fontWeight: '600',
    color: colors.gray[800],
  },
  propertyTitle: {
    fontSize: typography.fontSize.xs,
    color: colors.primary,
  },
});

export default ConversationListItem; 