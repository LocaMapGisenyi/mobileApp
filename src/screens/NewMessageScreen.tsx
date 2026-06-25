import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform, 
  SafeAreaView,
  StatusBar,
  Image,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { useMessagesStore } from '../store/messages';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Appbar, Text, useTheme, Button, Snackbar } from 'react-native-paper';

type NewMessageScreenRouteProp = RouteProp<RootStackParamList, 'NewMessage'>;
type NewMessageScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'NewMessage'>;

const NewMessageScreen = () => {
  const theme = useTheme();
  const { colors } = theme;
  const { t } = useTranslation();
  const route = useRoute<NewMessageScreenRouteProp>();
  const navigation = useNavigation<NewMessageScreenNavigationProp>();
  const { propertyId, propertyTitle, ownerId, ownerName, ownerAvatar } = route.params;
  
  const [message, setMessage] = useState('');
  const { startNewConversation, sendMessage } = useMessagesStore();
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  const handleSend = async () => {
    if (message.trim().length === 0) return;
    
    const conversationId = startNewConversation(
      propertyId,
      propertyTitle,
      ownerId,
      ownerName,
      ownerAvatar || ''
    );
    
    await sendMessage(conversationId, message.trim());
    
    setSnackbarMessage(t('message.new.sentConfirmation', { name: ownerName }));
    setSnackbarVisible(true);
    
    setTimeout(() => {
    navigation.replace('Conversation', { conversationId });
    }, 1500);
  };
  
  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
      paddingHorizontal: 16,
    },
    propertyContainer: {
      paddingVertical: 16,
      marginBottom: 8,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.onSurface,
      marginBottom: 12,
    },
    propertyCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      backgroundColor: colors.surfaceVariant,
      borderRadius: 12,
    },
    propertyImage: {
      width: 50,
      height: 50,
      borderRadius: 25,
      marginRight: 12,
      backgroundColor: colors.secondaryContainer,
    },
    propertyInfo: {
      flex: 1,
    },
    ownerName: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.onSurfaceVariant,
      marginBottom: 4,
    },
    propertyTitleText: {
      fontSize: 14,
      color: colors.onSurfaceVariant,
    },
    messageContainer: {
      paddingBottom: 16,
    },
    textInputContainer: {
      backgroundColor: colors.surfaceVariant,
      borderRadius: 12,
      minHeight: 150,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    textInput: {
      flex: 1,
      fontSize: 16,
      color: colors.onSurfaceVariant,
      minHeight: 140,
      textAlignVertical: 'top',
    },
    tipContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 12,
      padding: 12,
      backgroundColor: colors.primaryContainer,
      borderRadius: 8,
    },
    tipText: {
      flex: 1,
      marginLeft: 8,
      fontSize: 14,
      color: colors.onPrimaryContainer,
      lineHeight: 20,
    },
    footer: {
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: colors.outlineVariant,
      backgroundColor: colors.surface,
    },
    sendButton: {
    },
    sendButtonText: {
    },
    snackbar: {
      backgroundColor: colors.onSurface,
    },
    snackbarText: {
      color: colors.surface,
    }
  });
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      
      <Appbar.Header
        style={{ backgroundColor: colors.surface }}
        statusBarHeight={Platform.OS === 'ios' ? undefined : 0}
      >
        <Appbar.BackAction onPress={() => navigation.goBack()} color={colors.primary} />
        <Appbar.Content title={t('message.new.title')} titleStyle={{color: colors.onSurface}} />
      </Appbar.Header>
      
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
          <Animated.View 
            entering={FadeIn.duration(300)}
            style={styles.propertyContainer}
          >
            <Text style={styles.sectionTitle}>{t('message.new.propertyInfo')}</Text>
            
            <View style={styles.propertyCard}>
              {ownerAvatar ? (
                <Image 
                  source={{ uri: ownerAvatar }}
                  style={styles.propertyImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.propertyImage, { justifyContent: 'center', alignItems: 'center'}]}>
                  <Ionicons name="business-outline" size={24} color={colors.onSecondaryContainer} />
                </View>
              )}
              
              <View style={styles.propertyInfo}>
                <Text style={styles.ownerName} numberOfLines={1}>
                  {ownerName}
                </Text>
                <Text style={styles.propertyTitleText} numberOfLines={2}>
                  {propertyTitle}
                </Text>
              </View>
            </View>
          </Animated.View>
          
          <Animated.View 
            entering={FadeInDown.delay(100).duration(300)}
            style={styles.messageContainer}
          >
            <Text style={styles.sectionTitle}>{t('message.new.yourMessage')}</Text>
            
            <View style={styles.textInputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder={t('message.new.placeholder')}
                placeholderTextColor={colors.onSurfaceDisabled}
                multiline
                value={message}
                onChangeText={setMessage}
                autoFocus
              />
            </View>
            
            <View style={styles.tipContainer}>
              <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
              <Text style={styles.tipText}>
                {t('message.new.tip')}
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
        
        <View style={styles.footer}>
          <Button
            mode="contained"
            onPress={handleSend}
            disabled={message.trim().length === 0}
            icon={() => <Ionicons name="send-outline" size={18} color={message.trim().length > 0 ? colors.onPrimary : colors.onSurfaceDisabled} />}
            style={styles.sendButton}
            labelStyle={styles.sendButtonText}
            theme={{ roundness: 30 }}
          >
            {t('message.send')}
          </Button>
        </View>
      </KeyboardAvoidingView>
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={Snackbar.DURATION_SHORT}
        style={[styles.snackbar, { backgroundColor: colors.inverseSurface }]}
        action={{
          label: t('common.ok'),
          onPress: () => setSnackbarVisible(false),
        }}
      >
         <Text style={[styles.snackbarText, { color: colors.inverseOnSurface }]}>{snackbarMessage}</Text>
      </Snackbar>
    </SafeAreaView>
  );
};

export default NewMessageScreen; 