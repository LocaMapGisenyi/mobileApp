import { useApiAction } from './useApi';
import { authService, userService } from '../services/api';
import { User } from '../types';

/**
 * Hook pour la connexion utilisateur
 */
export function useLogin() {
  return useApiAction<{ user: User; token: string }, [string, string]>(
    (email, password) => authService.login(email, password)
  );
}

/**
 * Hook pour l'inscription d'un nouvel utilisateur
 */
export function useRegister() {
  return useApiAction<
    { user: User; token: string },
    [{ fullName: string; email: string; password: string; phoneNumber?: string }]
  >(userData => authService.register(userData));
}

/**
 * Hook pour la réinitialisation du mot de passe (demande)
 */
export function useForgotPassword() {
  return useApiAction<{ message: string }, [string]>(
    email => authService.forgotPassword(email)
  );
}

/**
 * Hook pour la réinitialisation du mot de passe (définition du nouveau mot de passe)
 */
export function useResetPassword() {
  return useApiAction<{ message: string }, [string, string]>(
    (token, newPassword) => authService.resetPassword(token, newPassword)
  );
}

/**
 * Hook pour la vérification du token
 */
export function useVerifyToken() {
  return useApiAction<{ valid: boolean; user?: { id: string; email: string } }, []>(
    () => authService.verifyToken()
  );
}

/**
 * Hook pour la déconnexion
 */
export function useLogout() {
  return useApiAction<void, []>(
    () => authService.logout()
  );
}

/**
 * Hook pour la mise à jour du profil
 */
export function useUpdateProfile() {
  return useApiAction<User, [Partial<User>]>(
    userData => userService.updateProfile(userData)
  );
}

/**
 * Hook pour changer le mot de passe
 */
export function useChangePassword() {
  return useApiAction<{ message: string }, [string, string]>(
    (currentPassword, newPassword) => userService.changePassword(currentPassword, newPassword)
  );
}

/**
 * Hook pour téléverser un avatar
 */
export function useUploadAvatar() {
  return useApiAction<{ avatarUrl: string }, [FormData]>(
    formData => userService.uploadAvatar(formData)
  );
}
