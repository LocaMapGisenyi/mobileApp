import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService, userService } from '../services/api';
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

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: {
        id: null,
        fullName: null,
        email: null,
        phoneNumber: null,
        photoURL: null,
        authProvider: null,
        isLoggedIn: false,
        hasCompletedOnboarding: false,
        token: null,
      },
      loading: false,
      error: null,
      actions: {
        login: async (email, password) => {
          try {
            set({ loading: true, error: null });
            const response = await authService.login(email, password);
            set((state) => ({
              user: {
                ...state.user,
                id: response.user.id,
                fullName: response.user.fullName,
                email: response.user.email,
                photoURL: response.user.avatar || null,
                authProvider: 'manual',
                isLoggedIn: true,
                token: response.token,
              },
              loading: false,
            }));
          } catch (error) {
            set({ 
              error: error instanceof Error ? error.message : 'Une erreur est survenue lors de la connexion',
              loading: false 
            });
            throw error;
          }
        },
        register: async (userData) => {
          try {
            set({ loading: true, error: null });
            const response = await authService.register(userData);
            set((state) => ({
              user: {
                ...state.user,
                id: response.user.id,
                fullName: response.user.fullName,
                email: response.user.email,
                photoURL: response.user.avatar || null,
                authProvider: 'manual',
                isLoggedIn: true,
                token: response.token,
              },
              loading: false,
            }));
          } catch (error) {
            set({ 
              error: error instanceof Error ? error.message : 'Une erreur est survenue lors de l\'inscription', 
              loading: false 
            });
            throw error;
          }
        },
        logout: async () => {
          try {
            set({ loading: true, error: null });
            // Appel API pour la déconnexion côté serveur
            await authService.logout();
          } catch (error) {
            console.error('Error during logout:', error);
            // Même en cas d'erreur, on déconnecte localement
          } finally {
            set((state) => ({
              user: {
                ...state.user,
                id: null,
                fullName: null,
                email: null,
                photoURL: null,
                authProvider: null,
                isLoggedIn: false,
                token: null,
              },
              loading: false,
            }));
          }
        },
        updateUserData: async (data) => {
          try {
            set({ loading: true, error: null });
            const updatedUser = await userService.updateProfile(data);
            set((state) => ({
              user: {
                ...state.user,
                fullName: updatedUser.fullName,
                email: updatedUser.email,
                photoURL: updatedUser.avatar || state.user.photoURL,
              },
              loading: false,
            }));
          } catch (error) {
            set({ 
              error: error instanceof Error ? error.message : 'Une erreur est survenue lors de la mise à jour du profil', 
              loading: false 
            });
            throw error;
          }
        },
        setOnboardingCompleted: async (completed) => {
          set((state) => ({
            user: {
              ...state.user,
              hasCompletedOnboarding: completed,
            },
          }));
        },
        fetchCurrentUser: async () => {
          try {
            // Uniquement si l'utilisateur est connecté
            if (!get().user.isLoggedIn || !get().user.token) {
              return;
            }
            set({ loading: true, error: null });
            const userData = await userService.getCurrentUser();
            set((state) => ({
              user: {
                ...state.user,
                id: userData.id,
                fullName: userData.fullName,
                email: userData.email,
                photoURL: userData.avatar || state.user.photoURL,
              },
              loading: false,
            }));
          } catch (error) {
            // Si l'erreur est 401, déconnectons l'utilisateur
            if (error && typeof error === 'object' && 'status' in error && error.status === 401) {
              get().actions.logout();
            }
            set({ 
              error: error instanceof Error ? error.message : 'Une erreur est survenue lors de la récupération du profil', 
              loading: false 
            });
          }
        },
        uploadAvatar: async (formData) => {
          try {
            set({ loading: true, error: null });
            const response = await userService.uploadAvatar(formData);
            set((state) => ({
              user: {
                ...state.user,
                photoURL: response.avatarUrl,
              },
              loading: false,
            }));
          } catch (error) {
            set({ 
              error: error instanceof Error ? error.message : 'Une erreur est survenue lors du téléversement de l\'avatar', 
              loading: false 
            });
            throw error;
          }
        },
        changePassword: async (currentPassword, newPassword) => {
          try {
            set({ loading: true, error: null });
            await userService.changePassword(currentPassword, newPassword);
            set({ loading: false });
          } catch (error) {
            set({ 
              error: error instanceof Error ? error.message : 'Une erreur est survenue lors du changement de mot de passe', 
              loading: false 
            });
            throw error;
          }
        },
        clearError: () => {
          set({ error: null });
        },
      },
    }),
    {
      name: 'user-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Hooks pour faciliter l'accès aux données et actions
export const useUser = () => useUserStore((state) => state.user);
export const useUserLoading = () => useUserStore((state) => state.loading);
export const useUserError = () => useUserStore((state) => state.error);
export const useUserActions = () => useUserStore((state) => state.actions); 