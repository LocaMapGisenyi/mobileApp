import React, { useRef, useState } from 'react';
import { StyleSheet, View, TextInput as RNTextInput, TextInputProps, Animated } from 'react-native';
import { Text, TouchableRipple } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { darkColors as dc } from '../theme';

interface TextInputFieldProps extends TextInputProps {
  label: string;
  error?: string;
  icon?: string;
  secureTextEntry?: boolean;
  touched?: boolean;
}

const TextInputField = ({
  label,
  error,
  icon,
  secureTextEntry = false,
  touched,
  ...props
}: TextInputFieldProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const animatedOpacity = useRef(new Animated.Value(0.7)).current;

  React.useEffect(() => {
    Animated.timing(animatedOpacity, {
      toValue: isFocused || props.value ? 1 : 0.7,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [isFocused, props.value]);

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(v => !v);
  };

  const iconColor = error && touched
    ? dc.border.error
    : isFocused
    ? dc.border.focus
    : dc.text.secondary;

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.label,
          isFocused && styles.focusedLabel,
          error && touched && styles.errorLabel,
        ]}
        accessibilityLabel={label}
      >
        {label}
      </Text>

      <View
        style={[
          styles.inputContainer,
          isFocused && styles.focusedContainer,
          error && touched && styles.errorContainer,
        ]}
      >
        {icon && (
          <Animated.View style={{ opacity: animatedOpacity }}>
            <MaterialCommunityIcons
              name={icon as any}
              size={20}
              color={iconColor}
              style={styles.icon}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          </Animated.View>
        )}

        <RNTextInput
          style={styles.input}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholderTextColor={dc.text.placeholder}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          selectionColor={dc.border.focus}
          accessibilityLabel={label}
          {...props}
        />

        {secureTextEntry && (
          <TouchableRipple
            onPress={togglePasswordVisibility}
            rippleColor="rgba(79, 70, 229, 0.2)"
            style={styles.toggleButton}
            accessibilityRole="button"
            accessibilityLabel={isPasswordVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          >
            <MaterialCommunityIcons
              name={isPasswordVisible ? 'eye-off' : 'eye'}
              size={22}
              color={dc.text.secondary}
            />
          </TouchableRipple>
        )}
      </View>

      {error && touched && (
        <Text style={styles.errorText} accessibilityRole="alert">
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
    color: dc.text.primary,
    fontWeight: '500',
  },
  focusedLabel: {
    color: dc.border.focus,
    fontWeight: '600',
  },
  errorLabel: {
    color: dc.border.error,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: dc.background.input,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: dc.border.default,
    paddingHorizontal: 12,
    height: 56,
  },
  focusedContainer: {
    borderColor: dc.border.focus,
    backgroundColor: dc.background.inputFocused,
  },
  errorContainer: {
    borderColor: dc.border.error,
    backgroundColor: dc.background.error,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: dc.text.primary,
    paddingVertical: 10,
  },
  toggleButton: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: dc.border.error,
    fontSize: 12,
    marginTop: 4,
    paddingLeft: 4,
  },
});

export default TextInputField;
