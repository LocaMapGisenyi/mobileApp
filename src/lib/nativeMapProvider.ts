export function nativeMapProvider(platform: string): 'google' | 'apple' {
  return platform === 'ios' ? 'apple' : 'google';
}
