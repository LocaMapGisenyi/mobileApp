import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { colors } from '../theme';
import i18n from '../utils/i18n';
import { captureError } from '../lib/diagnostics';
export default class AppErrorBoundary extends React.Component<
  React.PropsWithChildren,
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    captureError('render', error);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <View style={s.page}>
        <Text accessibilityRole="alert" style={s.title}>
          {i18n.t('common.error')}
        </Text>
        <Text style={s.body}>
          {i18n.t(
            'readiness.recovery',
            'Une erreur empêche d’afficher cette page. Vous pouvez réessayer.',
          )}
        </Text>
        <Pressable
          accessibilityRole="button"
          style={s.button}
          onPress={() => this.setState({ failed: false })}
        >
          <Text style={s.label}>{i18n.t('common.retry')}</Text>
        </Pressable>
      </View>
    );
  }
}
const s = StyleSheet.create({
  page: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
    backgroundColor: colors.background,
    gap: 16,
  },
  title: { fontSize: 24, fontWeight: '700', color: colors.ink },
  body: {
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 440,
    textAlign: 'center',
    color: colors.inkSubtle,
  },
  button: {
    minHeight: 48,
    paddingHorizontal: 24,
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: 12,
  },
  label: { fontSize: 16, fontWeight: '600', color: colors.onAccent },
});
