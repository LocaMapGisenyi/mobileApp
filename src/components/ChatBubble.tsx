import React from 'react';
import { StyleSheet, View, Text, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Message } from '../types';
import { colors, spacing, typography, borderRadius } from '../theme';

const currentUser = { id: 'me' };
import Animated, { FadeIn, SlideInLeft, SlideInRight } from 'react-native-reanimated';

interface ChatBubbleProps {
  message: Message;
  isLastInGroup?: boolean;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, isLastInGroup = false }) => {
  const isCurrentUser = message.user.id === currentUser.id;
  
  // Format time (HH:MM)
  const formatTime = (dateInput: Date | string | number | undefined | null): string => {
    if (!dateInput) {
      return '--:--'; // Placeholder for missing time
    }

    let date: Date;
    if (dateInput instanceof Date) {
      date = dateInput;
    } else if (typeof dateInput === 'string') {
      date = new Date(dateInput);
    } else if (typeof dateInput === 'number') {
      date = new Date(dateInput); // Assuming it's a timestamp
    } else {
      return '--:--';
    }

    if (isNaN(date.getTime())) {
      return '--:--'; // Invalid date
    }
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
    <Animated.View 
      entering={isCurrentUser ? SlideInRight.duration(300) : SlideInLeft.duration(300)}
      style={[
        styles.container,
        isCurrentUser ? styles.currentUserContainer : styles.otherUserContainer
      ]}
    >
      {!isCurrentUser && isLastInGroup && (
        <Image 
          source={{ uri: message.user.avatar || 'https://a0.muscache.com/defaults/user_pic-50x50.png?v=3' }} 
          style={styles.avatar}
        />
      )}
      
      <View style={styles.bubbleWrapper}>
        <View style={[
          styles.bubble,
          isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
        ]}>
          <Text style={[
            styles.messageText,
            isCurrentUser ? styles.currentUserText : styles.otherUserText
          ]}>
            {message.text}
          </Text>
        </View>
        
        <View style={[
          styles.messageInfo,
          isCurrentUser ? styles.messageInfoRight : styles.messageInfoLeft
        ]}>
          <Text style={styles.timeText}>{formatTime(message.createdAt)}</Text>
          
          {isCurrentUser && (
            <View style={styles.statusContainer}>
              {message.read ? (
                <Ionicons name="checkmark-done" size={14} color={colors.primary} style={styles.statusIcon} />
              ) : message.received ? (
                <Ionicons name="checkmark-done" size={14} color={colors.gray[500]} style={styles.statusIcon} />
              ) : message.sent ? (
                <Ionicons name="checkmark" size={14} color={colors.gray[500]} style={styles.statusIcon} />
              ) : null}
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: spacing[1],
    maxWidth: '85%',
  },
  currentUserContainer: {
    alignSelf: 'flex-end',
    marginLeft: spacing[8],
    marginRight: spacing[2],
  },
  otherUserContainer: {
    alignSelf: 'flex-start',
    marginRight: spacing[8],
    marginLeft: spacing[2],
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: spacing[1],
    alignSelf: 'flex-end',
    marginBottom: spacing[4],
  },
  bubbleWrapper: {
    flex: 1,
  },
  bubble: {
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    maxWidth: '100%',
  },
  currentUserBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: spacing[1],
  },
  otherUserBubble: {
    backgroundColor: colors.gray[100],
    borderBottomLeftRadius: spacing[1],
  },
  messageText: {
    fontSize: typography.fontSize.base,
    lineHeight: 20,
  },
  currentUserText: {
    color: colors.white,
  },
  otherUserText: {
    color: colors.gray[800],
  },
  messageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[1],
  },
  messageInfoRight: {
    justifyContent: 'flex-end',
    paddingRight: spacing[1],
  },
  messageInfoLeft: {
    justifyContent: 'flex-start',
    paddingLeft: spacing[1],
  },
  timeText: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[500],
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing[1],
  },
  statusIcon: {
    marginLeft: 2,
  },
});

export default ChatBubble; 