import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session, User as AuthUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { setAccountIdentity } from '../lib/accountScope';
import type { User } from '../types';

export type AuthProvider = 'manual' | 'google' | 'facebook' | null;
const blankUser = {
  id: null as string | null, fullName: null as string | null, email: null as string | null,
  phoneNumber: null as string | null, photoURL: null as string | null,
  authProvider: null as AuthProvider, isLoggedIn: false, hasCompletedOnboarding: false, token: null as string | null,
};
interface UserState {
  user: typeof blankUser;
  session: Session | null;
  authUser: AuthUser | null;
  passwordRecovery: boolean;
  loading: boolean;
  error: string | null;
  actions: {
    initAuth(): Promise<void>;
    disposeAuth(): void;
    login(email: string, password: string): Promise<void>;
    register(data: { fullName: string; email: string; password: string; phoneNumber?: string }): Promise<void>;
    logout(): Promise<void>;
    updateUserData(data: Partial<User>): Promise<void>;
    setOnboardingCompleted(completed: boolean): Promise<void>;
    fetchCurrentUser(): Promise<void>;
    uploadAvatar(formData: FormData): Promise<void>;
    changePassword(currentPassword: string, newPassword: string): Promise<void>;
    clearError(): void;
  };
}
let subscription: { unsubscribe(): void } | undefined;
let generation = 0;
const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Impossible de terminer cette opération.';

export const useUserStore = create<UserState>((set, get) => {
  const applySession = (session: Session | null) => {
    const id = session?.user.id ?? null;
    const changed = get().user.id !== id;
    ++generation;
    setAccountIdentity(id);
    set({
      session, authUser: session?.user ?? null,
      user: session ? {
        ...(changed ? blankUser : get().user), id,
        email: session.user.email ?? null,
        fullName: changed ? session.user.user_metadata?.full_name ?? null : get().user.fullName,
        authProvider: session.user.app_metadata?.provider === 'google' ? 'google' : session.user.app_metadata?.provider === 'facebook' ? 'facebook' : 'manual',
        isLoggedIn: true, token: null,
      } : { ...blankUser },
      ...(!session ? { passwordRecovery: false } : {}),
    });
  };
  const loadProfile = async () => {
    const id = get().user.id;
    const request = generation;
    if (!id) return;
    try {
      const [{ data: profile, error }, onboarding] = await Promise.all([
        supabase.from('profiles').select('full_name, phone_number, avatar_url').eq('id', id).single(),
        AsyncStorage.getItem(`onboarding:${id}`),
      ]);
      if (request !== generation || get().user.id !== id) return;
      if (error) throw error;
      set({ user: { ...get().user, fullName: profile.full_name, phoneNumber: profile.phone_number,
        photoURL: profile.avatar_url, hasCompletedOnboarding: onboarding === 'true' } });
    } catch (error) {
      if (request === generation) set({ error: errorMessage(error) });
    }
  };
  const run = async (operation: () => Promise<void>) => {
    set({ loading: true, error: null });
    try { await operation(); } catch (error) { set({ error: errorMessage(error) }); throw error; }
    finally { set({ loading: false }); }
  };
  return {
    user: { ...blankUser }, session: null, authUser: null, passwordRecovery: false, loading: false, error: null,
    actions: {
      initAuth: async () => {
        subscription?.unsubscribe();
        subscription = supabase.auth.onAuthStateChange((event, session) => {
          applySession(session);
          if (event === 'PASSWORD_RECOVERY') set({ passwordRecovery: true });
          // Authenticated I/O must begin after Supabase releases its callback lock.
          setTimeout(() => { void loadProfile(); }, 0);
        }).data.subscription;
        const request = generation;
        const { data, error } = await supabase.auth.getSession();
        if (error) { applySession(null); set({ error: errorMessage(error) }); throw error; }
        if (request === generation) applySession(data.session);
        await AsyncStorage.multiRemove(['user-storage-v2', 'messages-storage']);
        await loadProfile();
      },
      disposeAuth: () => { subscription?.unsubscribe(); subscription = undefined; ++generation; },
      login: (email, password) => run(async () => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        applySession(data.session);
        await loadProfile();
      }),
      register: (data) => run(async () => {
        const { data: result, error } = await supabase.auth.signUp({ email: data.email, password: data.password,
          options: { data: { full_name: data.fullName, phone_number: data.phoneNumber ?? null } } });
        if (error) throw error;
        applySession(result.session);
        if (result.session) await loadProfile();
      }),
      logout: () => run(async () => {
        const { error } = await supabase.auth.signOut({ scope: 'local' });
        if (error) throw error;
        applySession(null);
      }),
      updateUserData: (data) => run(async () => {
        const id = get().user.id;
        if (!id) throw new Error('Connectez-vous pour modifier le profil.');
        const updates = {
          ...(data.fullName !== undefined ? { full_name: data.fullName } : {}),
          ...(data.phoneNumber !== undefined ? { phone_number: data.phoneNumber } : {}),
          ...(data.avatar !== undefined ? { avatar_url: data.avatar } : {}),
        };
        const { error } = await supabase.from('profiles').update(updates).eq('id', id);
        if (error) throw error;
        if (get().user.id === id) await loadProfile();
      }),
      setOnboardingCompleted: async (completed) => {
        const id = get().user.id;
        if (!id) throw new Error('Connectez-vous pour enregistrer vos préférences.');
        await AsyncStorage.setItem(`onboarding:${id}`, String(completed));
        if (get().user.id === id) set({ user: { ...get().user, hasCompletedOnboarding: completed } });
      },
      fetchCurrentUser: loadProfile,
      uploadAvatar: async (formData) => {
        const { userService } = await import('../services/api/user.service');
        await userService.uploadAvatar(formData);
        await loadProfile();
      },
      changePassword: (currentPassword, newPassword) => run(async () => {
        if (!get().user.email) throw new Error('Connectez-vous pour modifier votre mot de passe.');
        const { error: verificationError } = await supabase.auth.signInWithPassword({ email: get().user.email!, password: currentPassword });
        if (verificationError) throw verificationError;
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
      }),
      clearError: () => set({ error: null }),
    },
  };
});
export const useUser = () => useUserStore(state => state.user);
export const useUserLoading = () => useUserStore(state => state.loading);
export const useUserError = () => useUserStore(state => state.error);
export const useUserActions = () => useUserStore(state => state.actions);
