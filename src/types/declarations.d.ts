declare module '@gorhom/bottom-sheet' {
  const BottomSheet: any;
  const BottomSheetView: any;
  const BottomSheetModal: any;
  const BottomSheetModalProvider: any;
  const useBottomSheet: any;
  export default BottomSheet;
  export { BottomSheet, BottomSheetView, BottomSheetModal, BottomSheetModalProvider, useBottomSheet };
}

// Allow axios if not installed (will use any types)
declare module 'axios' {
  const axios: any;
  export default axios;
  export const create: any;
  export const get: any;
  export const post: any;
}

declare module 'uuid' {
  export function v4(): string;
  export function v1(): string;
  export function v3(name: string | Uint8Array, namespace: string): string;
  export function v5(name: string | Uint8Array, namespace: string): string;
}

declare module '*.svg' {
  import React from 'react';
  import { SvgProps } from "react-native-svg";
  const content: React.FC<SvgProps>;
  export default content;
}

declare module "*.png" {
  const value: any;
  export default value;
}

declare module "*.jpg" {
  const value: any;
  export default value;
}

declare module "*.jpeg" {
  const value: any;
  export default value;
} 