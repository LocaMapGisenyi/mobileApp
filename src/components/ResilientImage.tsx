import React, { useEffect, useState } from 'react';
import { Image, type ImageProps } from 'react-native';
export default function ResilientImage({ source, onError, ...props }: ImageProps) {
  const [failed, setFailed] = useState(false);
  const identity = JSON.stringify(source);
  useEffect(() => setFailed(false), [identity]);
  return (
    <Image
      {...props}
      source={failed ? require('../assets/images/house-logo.png') : source}
      resizeMode={failed ? 'contain' : props.resizeMode}
      onError={event => {
        setFailed(true);
        onError?.(event);
      }}
    />
  );
}
