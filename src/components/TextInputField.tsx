import React, { forwardRef, useState } from 'react';
import {
  StyleSheet,
  View,
  TextInput as RNTextInput,
  TextInputProps,
  TouchableOpacity,
  Text,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme';

const T = {
  labelDefault: colors.inkMid,
  labelFocus: colors.primary,
  labelError: colors.error,
  borderDefault: colors.borderMid,
  borderFocus: colors.primary,
  borderError: colors.error,
  bgDefault: colors.background,
  bgFocus: colors.surface,
  bgError: '#FDF2EF',
  iconDefault: colors.inkSubtle,
  iconFocus: colors.primary,
  iconError: colors.error,
  inputText: colors.ink,
  placeholder: colors.inkSubtle,
  errorText: colors.error,
};

interface TextInputFieldProps extends TextInputProps {
  label: string;
  error?: string;
  icon?: string;
  secureTextEntry?: boolean;
  touched?: boolean;
}

const TextInputField = forwardRef<RNTextInput, TextInputFieldProps>(
  ({ label, error, icon, secureTextEntry = false, touched, onFocus, onBlur, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    const showError = !!(error && touched);
    const labelColor = showError ? T.labelError : isFocused ? T.labelFocus : T.labelDefault;
    const borderColor = showError ? T.borderError : isFocused ? T.borderFocus : T.borderDefault;
    const bgColor = showError ? T.bgError : isFocused ? T.bgFocus : T.bgDefault;
    const iconColor = showError ? T.iconError : isFocused ? T.iconFocus : T.iconDefault;

    return (
      <View style={styles.container}>
        <Text style={[styles.label, { color: labelColor }]}>{label}</Text>

        <View style={[styles.inputContainer, { borderColor, backgroundColor: bgColor }]}>
          {icon && (
            <MaterialCommunityIcons
              name={icon as any}
              size={20}
              color={iconColor}
              style={styles.icon}
            />
          )}

          <RNTextInput
            ref={ref}
            style={styles.input}
            onFocus={e => {
              setIsFocused(true);
              onFocus?.(e);
            }}
            onBlur={e => {
              setIsFocused(false);
              onBlur?.(e);
            }}
            placeholderTextColor={T.placeholder}
            secureTextEntry={secureTextEntry && !isPasswordVisible}
            selectionColor={T.borderFocus}
            accessibilityLabel={label}
            {...props}
          />

          {secureTextEntry && (
            <TouchableOpacity
              onPress={() => setIsPasswordVisible(v => !v)}
              style={styles.toggleButton}
              accessibilityRole="button"
              accessibilityLabel={isPasswordVisible ? 'Masquer' : 'Afficher'}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons
                name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
                size={22}
                color={T.iconDefault}
              />
            </TouchableOpacity>
          )}
        </View>

        {showError && (
          <View style={styles.errorRow}>
            <MaterialCommunityIcons name="alert-circle-outline" size={13} color={T.errorText} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>
    );
  },
);

TextInputField.displayName = 'TextInputField';

export default TextInputField;

const styles = StyleSheet.create({
  container: {
    marginBottom: 18,
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 13,
    minHeight: 54,
  },
  icon: {
    marginRight: 9,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: T.inputText,
    paddingVertical: 0,
  },
  toggleButton: {
    width: 44,
    minHeight: 44,
    marginLeft: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
    paddingLeft: 2,
  },
  errorText: {
    fontSize: 12,
    color: T.errorText,
    flex: 1,
  },
});
