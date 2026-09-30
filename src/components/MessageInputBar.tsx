import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  Platform,
  Keyboard,
  Animated as RNAnimated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';
import { useTranslation } from 'react-i18next';

interface MessageInputBarProps {
  onSend: (text: string) => void | Promise<void>;
  placeholder?: string;
  sendButtonText?: string;
}

const MessageInputBar: React.FC<MessageInputBarProps> = ({
  onSend,
  placeholder,
  sendButtonText
}) => {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const scaleAnim = useRef(new RNAnimated.Value(1)).current;

  const handlePressIn = () => {
    RNAnimated.spring(scaleAnim, {
      toValue: 0.95,
      friction: 7,
      tension: 40,
      useNativeDriver: true
    }).start();
  };

  const handlePressOut = () => {
    RNAnimated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true
    }).start();
  };

  const handleSend = async () => {
    if (text.trim().length === 0 || sending) return;
    setSending(true);
    try {
      await onSend(text.trim());
      setText('');
      Keyboard.dismiss();
    } catch { /* The conversation displays the service error; retain the draft for retry. */ }
    finally { setSending(false); }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder={placeholder || t('messages.typeMessage')}
          placeholderTextColor={colors.gray[500]}
          value={text}
          onChangeText={setText}
          multiline
          editable={!sending}
          maxLength={500}
          returnKeyType="default"
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            text.trim().length === 0 && styles.sendButtonDisabled
          ]}
          onPress={handleSend}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={sending || text.trim().length === 0}
          activeOpacity={0.8}
        >
          <RNAnimated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <Ionicons
              name="paper-plane"
              size={20}
              color={text.trim().length === 0 ? colors.gray[400] : colors.white}
            />
          </RNAnimated.View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
    ...Platform.select({
      ios: {
        paddingBottom: spacing[6], // Extra padding for iOS to avoid keyboard
      },
    }),
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: Platform.OS === 'ios' ? spacing[1] : 0,
    minHeight: 40,
  },
  input: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.gray[800],
    maxHeight: 100, // Maximum height before scrolling
    paddingVertical: Platform.OS === 'ios' ? spacing[1] : spacing[2],
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing[1],
    ...shadows.sm,
  },
  sendButtonDisabled: {
    backgroundColor: colors.gray[300],
  },
});

export default MessageInputBar;
