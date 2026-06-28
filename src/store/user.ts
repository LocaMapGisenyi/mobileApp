import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { User } from '../types';

export type AuthProvider = 'manual' | 'google' | 'facebook' | null;

interface UserState {
  user: {
    id: string | null;
    fullName: string | null;
    email: string | null;
    phoneNumber: string | null;
    photoURL: string | null;
    authProvider: AuthProvider;
    isLoggedIn: boolean;
    hasCompletedOnboarding: boolean;
    token: string | null;
  };
  loading: boolean;
  error: string | null;
  actions: {
    initAuth: () => Promise<void>;
    login: (email: string, password: string) => Promise<void>;
    register: (userData: {
      fullName: string;
      email: string;
      password: string;
      phoneNumber?: string;
    }) => Promise<void>;
    logout: () => Promise<void>;
    updateUserData: (data: Partial<User>) => Promise<void>;
    setOnboardingCompleted: (completed: boolean) => Promise<void>;
    fetchCurrentUser: () => Promise<void>;
    uploadAvatar: (formData: FormData) => Promise<void>;
    changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
    clearError: () => void;
  };
}

const BLANK_USER = {
  id: null, fullName: null, email: null, phoneNumber: null,
  photoURL: null, authProvider: null as AuthProvider,
  isLoggedIn: false, hasCompletedOnboarding: false, token: null,
};

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: { ...BLANK_USER },
      loading: false,
      error: null,
      actions: {
        // Call once from App.tsx — subscribes to Supabase auth changes
        initAuth: async () => {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const { data: profile } = await supabase
              .from('profiles').select('full_name, phone_number, avatar_url')
              .eq('id', session.user.id).single();
            set(s => ({
              user: {
                ...s.user,
                id: session.user.id,
                fullName: profile?.full_name ?? session.user.user_metadata?.full_name ?? null,
                email: session.user.email ?? null,
                phoneNumber: profile?.phone_number ?? null,
                photoURL: profile?.avatar_url ?? null,
                isLoggedIn: true,
                token: session.access_token,
              }
            }));
          }
          supabase.auth.onAuthStateChange(async (event, newSession) => {
            if (newSession?.user) {
              const { data: profile } = await supabase
                .from('profiles').select('full_name, phone_number, avatar_url')
                .eq('id', newSession.user.id).single();
              set(s => ({
                user: {
                  ...s.user,
                  id: newSession.user.id,
                  fullName: profile?.full_name ?? newSession.user.user_metadata?.full_name ?? null,
                  email: newSession.user.email ?? null,
                  phoneNumber: profile?.phone_number ?? null,
                  photoURL: profile?.avatar_url ?? null,
                  isLoggedIn: true,
                  token: newSession.access_token,
                }
              }));
            } else {
              set(s => ({ user: { ...BLANK_USER, hasCompletedOnboarding: s.user.hasCompletedOnboarding } }));
            }
          });
        },

        login: async (email, password) => {
          set({ loading: true, error: null });
          try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw new Error(error.message);
            const { data: profile } = await supabase
              .from('profiles').select('full_name, phone_number, avatar_url')
              .eq('id', data.user!.id).single();
            set(s => ({
              loading: false,
              user: {
                ...s.user,
                id: data.user!.id,
                fullName: profile?.full_name ?? data.user!.user_metadata?.full_name ?? null,
                email: data.user!.email ?? null,
                phoneNumber: profile?.phone_number ?? null,
                photoURL: profile?.avatar_url ?? null,
                authProvider: 'manual',
                isLoggedIn: true,
                token: data.session!.access_token,
              },
            }));
          } catch (err) {
            set({ loading: false, error: err instanceof Error ? err.message : 'Erreur de connexion' });
            throw err;
          }
        },

        register: async (userData) => {
          set({ loading: true, error: null });
          try {
            const { data, error } = await supabase.auth.signUp({
              email: userData.email,
              password: userData.password,
              options: { data: { full_name: userData.fullName } },
            });
            if (error) throw new Error(error.message);
            if (userData.phoneNumber && data.user) {
              await supabase.from('profiles').update({ phone_number: userData.phoneNumber }).eq('id', data.user.id);
            }
            set(s => ({
              loading: false,
              user: {
                ...s.user,
                id: data.user?.id ?? null,
                fullName: userData.fullName,
                email: userData.email,
                authProvider: 'manual',
                isLoggedIn: !!data.session,
                hasCompletedOnboarding: false,
                token: data.session?.access_token ?? null,
              },
            }));
          } catch (err) {
            set({ loading: false, error: err instanceof Error ? err.message : "Erreur d'inscription" });
            throw err;
          }
        },

        logout: async () => {
          // Clear state immediately — never blocks the UI
          set({ user: { ...BLANK_USER }, loading: false, error: null });
          supabase.auth.signOut().catch(() => {});
        },

        updateUserData: async (data) => {
          const userId = get().user.id;
          if (!userId) return;
          set({ loading: true, error: null });
          try {
            const updates: Record<string, unknown> = {};
            if (data.fullName) updates.full_name = data.fullName;
            if (data.phoneNumber) updates.phone_number = data.phoneNumber;
            if (data.avatar) updates.avatar_url = data.avatar;
            await supabase.from('profiles').update(updates).eq('id', userId);
            set(s => ({
              loading: false,
              user: { ...s.user, fullName: data.fullName ?? s.user.fullName, photoURL: data.avatar ?? s.user.photoURL },
            }));
          } catch (err) {
            set({ loading: false, error: err instanceof Error ? err.message : 'Erreur de mise à jour' });
            throw err;
          }
        },

        setOnboardingCompleted: async (completed) => {
          set(s => ({ user: { ...s.user, hasCompletedOnboarding: completed } }));
        },

        fetchCurrentUser: async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;
          const { data: profile } = await supabase
            .from('profiles').select('full_name, phone_number, avatar_url')
            .eq('id', user.id).single();
          set(s => ({
            user: {
              ...s.user,
              id: user.id,
              fullName: profile?.full_name ?? s.user.fullName,
              email: user.email ?? s.user.email,
              phoneNumber: profile?.phone_number ?? s.user.phoneNumber,
              photoURL: profile?.avatar_url ?? s.user.photoURL,
            }
          }));
        },

        uploadAvatar: async (_formData) => {
          // Upload handled via storage.ts — update profile after
          set(s => ({ user: { ...s.user } }));
        },

        changePassword: async (_currentPassword, newPassword) => {
          set({ loading: true, error: null });
          try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw new Error(error.message);
            set({ loading: false });
          } catch (err) {
            set({ loading: false, error: err instanceof Error ? err.message : 'Erreur' });
            throw err;
          }
        },

        clearError: () => set({ error: null }),
      },
    }),
    {
      name: 'user-storage-v2',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: {
          id: state.user.id,
          fullName: state.user.fullName,
          email: state.user.email,
          phoneNumber: state.user.phoneNumber,
          photoURL: state.user.photoURL,
          authProvider: state.user.authProvider,
          isLoggedIn: state.user.isLoggedIn,
          hasCompletedOnboarding: state.user.hasCompletedOnboarding,
          token: null,
        },
      }),
    }
  )
);

export const useUser = () => useUserStore((state) => state.user);
export const useUserLoading = () => useUserStore((state) => state.loading);
export const useUserError = () => useUserStore((state) => state.error);
export const useUserActions = () => useUserStore((state) => state.actions);
