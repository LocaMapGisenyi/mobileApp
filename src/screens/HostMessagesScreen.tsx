import React from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  FlatList,
  Image,
} from 'react-native';
import {
  Text,
  useTheme,
  Divider,
  Avatar,
  Searchbar,
  Surface,
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { colors } from '../theme';

type HostScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const MessageItem = ({ item, onPress }: { item: any; onPress: () => void }) => {
  const theme = useTheme();
  
  return (
    <TouchableOpacity onPress={onPress} style={styles.messageItem} activeOpacity={0.7}>
      <View style={styles.avatarContainer}>
        <Avatar.Image source={{ uri: item.avatar }} size={50} />
        {item.unread && <View style={styles.unreadIndicator} />}
      </View>
      
      <View style={styles.messageContent}>
        <View style={styles.messageHeader}>
          <Text style={[styles.senderName, item.unread && styles.unreadText]}>
            {item.sender}
          </Text>
          <Text style={styles.timestamp}>{item.timestamp}</Text>
        </View>
        
        <Text style={styles.propertyName} numberOfLines={1}>
          {item.property}
        </Text>
        
        <Text style={[styles.lastMessage, item.unread && styles.unreadText]} numberOfLines={2}>
          {item.lastMessage}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const HostMessagesScreen = () => {
  const theme = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<HostScreenNavigationProp>();
  const [searchQuery, setSearchQuery] = React.useState('');
  
  const onChangeSearch = (query: string) => setSearchQuery(query);

  const navigateToConversation = (messageId: string) => {
    // Navigation vers la conversation
    console.log(`Navigating to conversation ${messageId}`);
    // navigation.navigate('Conversation', { conversationId: messageId });
  };
  
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messagerie</Text>
      </View>
      
      <Surface elevation={1} style={styles.searchContainer}>
        <Searchbar
          placeholder="Rechercher dans les messages"
          onChangeText={onChangeSearch}
          value={searchQuery}
          style={styles.searchbar}
          inputStyle={styles.searchInput}
          iconColor={colors.inkSubtle}
        />
      </Surface>
      
      <Animated.View entering={FadeInUp.duration(500)} style={{ flex: 1 }}>
        {([] as any[]).length > 0 ? (
          <FlatList
            data={[] as any[]}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <MessageItem item={item} onPress={() => navigateToConversation(item.id)} />
            )}
            ItemSeparatorComponent={() => <Divider style={styles.divider} />}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="chat-bubble-outline" size={80} color={colors.inkDisabled} />
            <Text style={styles.emptyText}>Aucun message</Text>
            <Text style={styles.emptySubtext}>
              Vos conversations avec les voyageurs apparaîtront ici.
            </Text>
          </View>
        )}
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
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.ink,
  },
  searchContainer: {
    padding: 8,
    backgroundColor: colors.white,
  },
  searchbar: {
    borderRadius: 30,
    height: 40,
    backgroundColor: colors.surfaceSunken,
  },
  searchInput: {
    fontSize: 14,
  },
  messageItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: colors.white,
  },
  avatarContainer: {
    marginRight: 16,
    position: 'relative',
  },
  unreadIndicator: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.white,
  },
  messageContent: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  senderName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.ink,
  },
  unreadText: {
    fontWeight: '700',
    color: colors.ink,
  },
  timestamp: {
    fontSize: 12,
    color: colors.inkSubtle,
  },
  propertyName: {
    fontSize: 14,
    color: colors.inkSubtle,
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: colors.inkSubtle,
    lineHeight: 20,
  },
  divider: {
    marginLeft: 80,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.inkSubtle,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.inkSubtle,
    textAlign: 'center',
    maxWidth: '80%',
  },
});

export default HostMessagesScreen; 