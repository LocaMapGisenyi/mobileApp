import { supabase } from '../../lib/supabase';
import { authRedirectUrl } from '../../lib/authLinks';

export const authService = {
  login: async (email: string, password: string): Promise<{ user: { id: string; fullName: string; email: string; avatar?: string }; token: string }> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    const user = data.user!;
    const { data: profile, error: profileError } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).single();
    if (profileError) throw profileError;
    return {
      user: { id: user.id, fullName: profile?.full_name ?? '', email: user.email ?? '', avatar: profile?.avatar_url ?? undefined },
      token: data.session!.access_token,
    };
  },

  register: async (userData: { fullName: string; email: string; password: string; phoneNumber?: string }): Promise<{ user: { id: string; fullName: string; email: string }; token: string }> => {
    const { data, error } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: { data: { full_name: userData.fullName, phone_number: userData.phoneNumber ?? null } },
    });
    if (error) throw new Error(error.message);
    const user = data.user!;
    if (userData.phoneNumber && data.session) {
      await supabase.from('profiles').update({ phone_number: userData.phoneNumber }).eq('id', user.id);
    }
    return {
      user: { id: user.id, fullName: userData.fullName, email: userData.email },
      token: data.session?.access_token ?? '',
    };
  },

  logout: async (): Promise<void> => {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) throw error;
  },

  verifyToken: async (): Promise<{ valid: boolean; user?: { id: string; email: string } }> => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return { valid: false };
    return { valid: true, user: { id: user.id, email: user.email ?? '' } };
  },

  forgotPassword: async (email: string): Promise<{ message: string }> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: authRedirectUrl() });
    if (error) throw new Error(error.message);
    return { message: 'Email envoyé' };
  },

  resetPassword: async (_token: string, newPassword: string): Promise<{ message: string }> => {
    if (newPassword.length < 8) throw new Error('Utilisez au moins 8 caractères.');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Ce lien a expiré. Demandez un nouveau lien.');
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
    return { message: 'Mot de passe mis à jour' };
  },
};
