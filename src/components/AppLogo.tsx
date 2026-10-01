import React from 'react';
import { Image, type ImageStyle, type StyleProp } from 'react-native';

interface Props {
  size?: number;
  style?: StyleProp<ImageStyle>;
}

export default function AppLogo({ size = 96, style }: Props) {
  return <Image
    source={require('../../assets/icon.png')}
    resizeMode="contain"
    accessibilityLabel="LocaMap"
    style={[{ width: size, height: size }, style]}
  />;
}
