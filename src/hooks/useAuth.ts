import { useEffect, useState } from 'react';
import { useUserStore } from '../store/user';
import { getProfile, updateProfile as saveProfile } from '../services/profile.service';
import { authService } from '../services/api/auth.service';
import type { Tables } from '../types/database';

/** All auth consumers share the single App-owned subscription. */
export function useAuth() {
  const state = useUserStore();
  const [profile, setProfile] = useState<Tables<'profiles'> | null>(null);
  useEffect(() => {
    let active = true;
    setProfile(null);
    if (state.user.id) void getProfile(state.user.id).then(row => { if (active) setProfile(row); })
      .catch(error => { if (active) useUserStore.setState({ error: String(error) }); });
    return () => { active = false; };
  }, [state.user.id]);
  return {
    session: state.session, user: state.authUser, profile, loading: state.loading, error: state.error,
    isAuthenticated: state.user.isLoggedIn,
    signIn: state.actions.login, signOut: state.actions.logout,
    signUp: (email: string, password: string, fullName: string) => state.actions.register({ email, password, fullName }),
    resetPassword: async (email: string) => { await authService.forgotPassword(email); },
    updateProfile: async (updates: Parameters<typeof saveProfile>[1]) => {
      const id = state.user.id;
      if (!id) throw new Error('Connectez-vous pour modifier le profil.');
      const saved = await saveProfile(id, updates);
      if (useUserStore.getState().user.id === id) setProfile(saved);
      return saved;
    },
  };
}
