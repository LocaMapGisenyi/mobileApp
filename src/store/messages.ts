import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Conversation, Message } from '../types';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface MessagesState {
  conversations: Conversation[];
  totalUnreadCount: number;
  
  // Actions
  sendMessage: (conversationId: string, text: string) => Promise<void>;
  markConversationAsRead: (conversationId: string) => void;
  getConversation: (conversationId: string) => Conversation | undefined;
  startNewConversation: (propertyId: string, propertyTitle: string, ownerId: string, ownerName: string, ownerAvatar: string) => string;
  deleteConversation: (conversationId: string) => void;
  clearAllConversations: () => void;
}

// Helper to check if a string is a valid ISO date string
const isISODateString = (value: any): value is string => {
  if (typeof value !== 'string') return false;
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|([+-]\d{2}:\d{2}))$/;
  return isoDateRegex.test(value);
};

export const useMessagesStore = create<MessagesState>()(
  persist(
    (set, get) => ({
      conversations: [],
      totalUnreadCount: 0,
      
      sendMessage: async (conversationId: string, text: string) => {
        return new Promise<void>((resolve) => {
          // Check if the conversation exists
          const { conversations } = get();
          const conversationIndex = conversations.findIndex(c => c.id === conversationId);
          
          if (conversationIndex === -1) {
            resolve();
            return;
          }
          
          // Create a new message
          const newMessage: Message = {
            id: uuidv4(),
            text,
            createdAt: new Date(),
            user: { id: 'me', name: 'Moi', avatar: undefined },
            sent: true,
            received: false,
            read: false,
          };
          
          // Update the conversation
          const updatedConversations = [...conversations];
          updatedConversations[conversationIndex] = {
            ...updatedConversations[conversationIndex],
            messages: [...updatedConversations[conversationIndex].messages, newMessage],
            lastMessageAt: newMessage.createdAt,
          };
          
          // Update state
          set({ conversations: updatedConversations });
          
          // Simulate network delay for sending
          setTimeout(() => {
            resolve();
            
            // Mark message as received after delay
            setTimeout(() => {
              const { conversations } = get();
              const conversationIndex = conversations.findIndex(c => c.id === conversationId);
              
              if (conversationIndex === -1) return;
              
              const updatedMessages = [...conversations[conversationIndex].messages];
              const messageIndex = updatedMessages.findIndex(m => m.id === newMessage.id);
              
              if (messageIndex === -1) return;
              
              updatedMessages[messageIndex] = {
                ...updatedMessages[messageIndex],
                received: true,
              };
              
              const updatedConversations = [...conversations];
              updatedConversations[conversationIndex] = {
                ...updatedConversations[conversationIndex],
                messages: updatedMessages,
              };
              
              set({ conversations: updatedConversations });
              
              // Simulate owner typing (show indicator after 1-3 seconds)
              const typingDelay = 1000 + Math.random() * 2000;
              setTimeout(() => {
                // Simulate owner response after 2-4 more seconds
                const responseDelay = 2000 + Math.random() * 2000;
                setTimeout(() => {
                  const { conversations } = get();
                  const conversationIndex = conversations.findIndex(c => c.id === conversationId);
                  
                  if (conversationIndex === -1) return;
                  
                  const ownerResponse: Message = {
                    id: uuidv4(),
                    text: 'Je vous répondrai bientôt.',
                    createdAt: new Date(),
                    user: {
                      id: conversations[conversationIndex].otherUser.id,
                      name: conversations[conversationIndex].otherUser.name,
                      avatar: conversations[conversationIndex].otherUser.avatar,
                    },
                    sent: true,
                    received: true,
                    read: false,
                  };
                  
                  const updatedConversations = [...conversations];
                  updatedConversations[conversationIndex] = {
                    ...updatedConversations[conversationIndex],
                    messages: [...updatedConversations[conversationIndex].messages, ownerResponse],
                    unreadCount: updatedConversations[conversationIndex].unreadCount + 1,
                    lastMessageAt: ownerResponse.createdAt,
                  };
                  
                  set({ 
                    conversations: updatedConversations,
                    totalUnreadCount: get().totalUnreadCount + 1,
                  });
                }, responseDelay);
              }, typingDelay);
            }, 800); // Received delay
          }, 500); // Sending delay
        });
      },
      
      markConversationAsRead: (conversationId: string) => {
        const { conversations } = get();
        const conversationIndex = conversations.findIndex(c => c.id === conversationId);
        
        if (conversationIndex === -1) return;
        
        const previousUnreadCount = conversations[conversationIndex].unreadCount;
        
        // Mark all messages as read
        const updatedMessages = conversations[conversationIndex].messages.map(message => ({
          ...message,
          read: true,
        }));
        
        const updatedConversations = [...conversations];
        updatedConversations[conversationIndex] = {
          ...updatedConversations[conversationIndex],
          messages: updatedMessages,
          unreadCount: 0,
        };
        
        set({ 
          conversations: updatedConversations,
          totalUnreadCount: get().totalUnreadCount - previousUnreadCount,
        });
      },
      
      getConversation: (conversationId: string) => {
        return get().conversations.find(c => c.id === conversationId);
      },
      
      startNewConversation: (propertyId: string, propertyTitle: string, ownerId: string, ownerName: string, ownerAvatar: string) => {
        // Check if a conversation already exists
        const { conversations } = get();
        const existingConversation = conversations.find(
          c => c.propertyId === propertyId && c.otherUser.id === ownerId
        );
        
        if (existingConversation) {
          return existingConversation.id;
        }
        
        // Create a new conversation
        const newConversationId = uuidv4();
        const newConversation: Conversation = {
          id: newConversationId,
          propertyId,
          propertyTitle,
          otherUser: {
            id: ownerId,
            name: ownerName,
            avatar: ownerAvatar,
            isOwner: true,
          },
          messages: [],
          unreadCount: 0,
          lastMessageAt: new Date(),
        };
        
        set({
          conversations: [...conversations, newConversation],
        });
        
        return newConversationId;
      },
      
      deleteConversation: (conversationId: string) => {
        const { conversations } = get();
        const conversation = conversations.find(c => c.id === conversationId);
        
        if (!conversation) return;
        
        const updatedConversations = conversations.filter(c => c.id !== conversationId);
        
        set({
          conversations: updatedConversations,
          totalUnreadCount: get().totalUnreadCount - conversation.unreadCount,
        });
      },
      
      clearAllConversations: () => {
        set({
          conversations: [],
          totalUnreadCount: 0,
        });
      },
    }),
    {
      name: 'messages-storage',
      version: 2,
      migrate: () => ({ conversations: [], totalUnreadCount: 0 }),
      storage: createJSONStorage(() => AsyncStorage, {
        reviver: (key, value) => {
          if (key === 'lastMessageAt' && isISODateString(value)) {
            return new Date(value);
          }
          return value;
        },
      }),
    }
  )
); 