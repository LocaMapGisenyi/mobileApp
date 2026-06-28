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

const T = {
  labelDefault: '#2E4A4A',
  labelFocus:   '#0D6E6E',
  labelError:   '#C1440E',
  borderDefault:'#D0E8E8',
  borderFocus:  '#0D6E6E',
  borderError:  '#C1440E',
  bgDefault:    '#F3F8F8',
  bgFocus:      '#FFFFFF',
  bgError:      '#FDF2EF',
  iconDefault:  '#5A7878',
  iconFocus:    '#0D6E6E',
  iconError:    '#C1440E',
  inputText:    '#0F1F1F',
  placeholder:  '#5A7878',
  errorText:    '#C1440E',
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
    const labelColor  = showError ? T.labelError  : isFocused ? T.labelFocus  : T.labelDefault;
    const borderColor = showError ? T.borderError : isFocused ? T.borderFocus : T.borderDefault;
    const bgColor     = showError ? T.bgError     : isFocused ? T.bgFocus     : T.bgDefault;
    const iconColor   = showError ? T.iconError   : isFocused ? T.iconFocus   : T.iconDefault;

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
            onFocus={(e) => { setIsFocused(true); onFocus?.(e); }}
            onBlur={(e)  => { setIsFocused(false); onBlur?.(e); }}
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
  }
);

TextInputField.displayName = 'TextInputField';

export default TextInputField;

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
    width: '100%',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: 0.1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: 13,
    height: 52,
  },
  icon: {
    marginRight: 9,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: T.inputText,
    paddingVertical: 0,
  },
  toggleButton: {
    padding: 4,
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
