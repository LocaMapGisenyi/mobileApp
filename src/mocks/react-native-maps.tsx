import React from 'react';
import { View, Text } from 'react-native';

const MapView = (props: any) => (
  <View {...props} style={[{ backgroundColor: '#e0e0e0', alignItems: 'center', justifyContent: 'center' }, props.style]}>
    <Text style={{ color: '#666', fontWeight: 'bold' }}>Interactive Map Unavailable in Web Preview</Text>
    <Text style={{ color: '#888', fontSize: 12 }}>Showing placeholder for simulation</Text>
  </View>
);

export const Marker = (props: any) => (
  <View {...props}>
    {props.children}
  </View>
);

export const PROVIDER_GOOGLE = 'google';

export default MapView;
