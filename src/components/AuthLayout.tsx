import React from 'react';
import {
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import AppLogo from './AppLogo';
import { colors } from '../theme';

interface Props {
  title: string;
  subtitle?: string;
  compact?: boolean;
  onBack?: () => void;
  children: React.ReactNode;
}

export default function AuthLayout({ title, subtitle, compact, onBack, children }: Props) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const wide = width >= 900;
  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          s.scroll,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 },
        ]}
      >
        <View style={s.brandRow}>
          <AppLogo size={72} />
          <View style={s.place}>
            <MaterialIcons name="place" size={16} color={colors.primary} />
            <Text style={s.placeText}>{t('explore.locationGisenyi')}</Text>
          </View>
        </View>
        <View style={[s.layout, wide && s.layoutWide]}>
          {(!compact || wide) && (
            <ImageBackground
              source={require('../assets/images/gisenyi_header.png')}
              imageStyle={s.sceneImage}
              style={[s.scene, wide && s.sceneWide]}
              accessibilityLabel={t('pro.lakeView')}
            >
              {wide && (
                <View style={s.sceneCaption}>
                  <Text style={s.sceneTitle}>{t('pro.authSceneTitle')}</Text>
                  <Text style={s.sceneDescription}>{t('pro.authSceneDescription')}</Text>
                </View>
              )}
            </ImageBackground>
          )}
          <View style={[s.form, wide && s.formWide]}>
            {onBack && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('common.back')}
                onPress={onBack}
                style={s.back}
              >
                <MaterialIcons name="arrow-back" size={21} color={colors.ink} />
                <Text style={s.backText}>{t('common.back')}</Text>
              </Pressable>
            )}
            <View style={s.heading}>
              <Text accessibilityRole="header" style={s.title}>
                {title}
              </Text>
              {!!subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
            </View>
            {children}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  scroll: { flexGrow: 1, paddingHorizontal: 24 },
  brandRow: {
    width: '100%',
    maxWidth: 1104,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  place: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 },
  placeText: { fontSize: 13, lineHeight: 20, color: colors.inkSubtle },
  layout: { width: '100%', maxWidth: 480, alignSelf: 'center' },
  layoutWide: {
    maxWidth: 1104,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 64,
    flexGrow: 1,
    paddingBottom: 24,
  },
  scene: {
    height: 156,
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: colors.surfaceSunken,
  },
  sceneImage: { resizeMode: 'cover' },
  sceneWide: { flex: 1, height: undefined, minHeight: 620, justifyContent: 'flex-end' },
  sceneCaption: { padding: 32, backgroundColor: 'rgba(28, 42, 23, 0.86)' },
  sceneTitle: {
    color: colors.white,
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '600',
    marginBottom: 12,
  },
  sceneDescription: { color: colors.white, fontSize: 16, lineHeight: 25 },
  form: { paddingTop: 28 },
  formWide: { width: 416, alignSelf: 'center', paddingVertical: 24 },
  heading: { gap: 8, marginBottom: 28 },
  title: {
    fontSize: 28,
    lineHeight: 35,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: colors.ink,
  },
  subtitle: { fontSize: 15, lineHeight: 23, color: colors.inkSubtle, maxWidth: 400 },
  back: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    marginBottom: 16,
  },
  backText: { color: colors.inkSubtle, fontSize: 14 },
});
