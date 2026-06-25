import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Animated } from 'react-native';

interface SocialLoginButtonProps {
  provider: 'google' | 'facebook';
  onPress: () => void;
  style?: ViewStyle;
}

const SocialLoginButton = ({ provider, onPress, style }: SocialLoginButtonProps) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      friction: 8,
      tension: 80,
      useNativeDriver: true,
    }).start();
  };
  
  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };
  
  const getProviderConfig = () => {
    switch (provider) {
      case 'google':
        return {
          icon: 'google',
          text: 'Continuer avec Google',
          backgroundColor: '#1E1E1E',
          textColor: '#E5E5E5',
          borderColor: '#2A2A2A',
          iconColor: '#4285f4'
        };
      case 'facebook':
        return {
          icon: 'facebook',
          text: 'Continuer avec Facebook',
          backgroundColor: '#1877f2',
          textColor: '#ffffff',
          borderColor: '#1877f2',
          iconColor: '#ffffff'
        };
      default:
        return {
          icon: 'account',
          text: 'Continuer',
          backgroundColor: '#1E1E1E',
          textColor: '#E5E5E5',
          borderColor: '#2A2A2A',
          iconColor: '#E5E5E5'
        };
    }
  };
  
  const config = getProviderConfig();
  
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.buttonContainer, style]}
    >
      <Animated.View
        style={[
          styles.button,
          {
            backgroundColor: config.backgroundColor,
            borderColor: config.borderColor,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <MaterialCommunityIcons
          name={config.icon as any}
          size={20}
          color={config.iconColor}
          style={styles.icon}
        />
        <Text
          style={[
            styles.buttonText,
            { color: config.textColor },
          ]}
        >
          {config.text}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    width: '100%',
    marginBottom: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  icon: {
    marginRight: 12,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

export default SocialLoginButton; 