import axios from 'axios';
// Import lazy pour éviter le cycle circulaire :
// api/config → store/user → services/api → api/config
let _useUserStore: typeof import('../../store/user').useUserStore | null = null;
const getUserStore = () => {
  if (!_useUserStore) _useUserStore = require('../../store/user').useUserStore;
  return _useUserStore!;
};

// URL de base de l'API - à remplacer par l'URL réelle du backend
export const API_BASE_URL = 'https://api.locamap.com/v1';

// Créer une instance Axios avec la configuration de base
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // 15 secondes
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Intercepteur pour ajouter automatiquement le token d'authentification aux requêtes
api.interceptors.request.use(
  (config: any) => {
    const token = getUserStore().getState().user.token;
    
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    return config;
  },
  (error: any) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les réponses et les erreurs
api.interceptors.response.use(
  (response: any) => {
    // Retourner directement les données pour simplifier l'utilisation
    return response.data;
  },
  (error: any) => {
    // Gérer les erreurs communes
    if (error.response) {
      // Le serveur a répondu avec un code d'erreur
      const { status } = error.response;
      
      if (status === 401) {
        // Token expiré ou invalide, déconnecter l'utilisateur
        getUserStore().getState().actions.logout();
      }
      
      // Retourner les détails de l'erreur du serveur
      return Promise.reject({
        status,
        data: error.response.data,
        message: error.response.data?.message || 'Une erreur est survenue',
      });
    } else if (error.request) {
      // La requête a été faite mais pas de réponse reçue (problème réseau)
      return Promise.reject({
        status: 0,
        message: 'Impossible de se connecter au serveur. Vérifiez votre connexion internet.',
      });
    } else {
      // Erreur de requête
      return Promise.reject({
        message: error.message || 'Une erreur est survenue lors de la requête',
      });
    }
  }
);

export default api; 