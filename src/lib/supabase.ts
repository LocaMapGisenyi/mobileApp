import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import { resilientFetch } from './network';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Variables manquantes : EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY\n' +
    'Crée un fichier .env à la racine du projet avec ces deux valeurs.\n' +
    'Trouve-les dans : Supabase Dashboard → Settings → API'
  );
}

const ExpoSecureStoreAdapter = {
  getItem: SecureStore.getItemAsync,
  setItem: SecureStore.setItemAsync,
  removeItem: SecureStore.deleteItemAsync,
};

export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    global: { fetch: resilientFetch },
    auth: {
      storage: Platform.OS === 'web' ? AsyncStorage : ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
