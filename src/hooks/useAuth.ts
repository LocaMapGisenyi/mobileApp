import { useState, useEffect } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Tables } from '../types/database';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Tables<'profiles'> | null;
  loading: boolean;
  error: string | null;
}

async function fetchProfile(userId: string): Promise<Tables<'profiles'> | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) return null;
  return data;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState((prev) => ({
        ...prev,
        session,
        user: session?.user ?? null,
        loading: false,
      }));

      if (session?.user) {
        fetchProfile(session.user.id).then((profile) => {
          setState((prev) => ({ ...prev, profile }));
        });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState((prev) => ({
        ...prev,
        session,
        user: session?.user ?? null,
        profile: session ? prev.profile : null,
      }));

      if (session?.user) {
        fetchProfile(session.user.id).then((profile) => {
          setState((prev) => ({ ...prev, profile }));
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const isAuthenticated = state.session !== null;

  async function signIn(email: string, password: string): Promise<void> {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign in failed';
      setState((prev) => ({ ...prev, error: message }));
      throw err;
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }

  async function signUp(email: string, password: string, fullName: string): Promise<void> {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) throw new Error(error.message);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign up failed';
      setState((prev) => ({ ...prev, error: message }));
      throw err;
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }

  async function signOut(): Promise<void> {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw new Error(error.message);
      setState((prev) => ({ ...prev, session: null, user: null, profile: null }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign out failed';
      setState((prev) => ({ ...prev, error: message }));
      throw err;
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }

  async function updateProfile(
    updates: Partial<Tables<'profiles'>>
  ): Promise<Tables<'profiles'>> {
    if (!state.user) throw new Error('Not authenticated');

    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', state.user.id)
        .select('*')
        .single();

      if (error) throw new Error(error.message);
      setState((prev) => ({ ...prev, profile: data }));
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Profile update failed';
      setState((prev) => ({ ...prev, error: message }));
      throw err;
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }

  async function resetPassword(email: string): Promise<void> {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw new Error(error.message);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Password reset failed';
      setState((prev) => ({ ...prev, error: message }));
      throw err;
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }

  return {
    ...state,
    isAuthenticated,
    signIn,
    signUp,
    signOut,
    updateProfile,
    resetPassword,
  };
}
