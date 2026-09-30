> Document historique : cette migration REST a été remplacée par Supabase. Voir le README à la racine et docs/BACKEND-DEPLOYMENT.md.

# 🔁 Migration de LocaMap vers l'API REST

Ce document décrit la migration de l'application LocaMap des données mockées vers l'utilisation d'une API REST.

## 🏗️ Structure de l'API

### 📂 Organisation des fichiers

La structure des services API est organisée comme suit:

```
src/services/api/
├── config.ts                # Configuration d'axios avec interceptors
├── auth.service.ts          # Auth: login, register, etc.
├── property.service.ts      # Propriétés: recherche, gestion, etc.
├── user.service.ts          # Utilisateurs: profil, préférences, etc.
├── message.service.ts       # Messages et conversations
├── review.service.ts        # Avis et commentaires
├── guides.service.ts        # Guides locaux
├── alert.service.ts         # Alertes et notifications
├── booking.service.ts       # Réservations
├── host.service.ts          # Statistiques hôte
└── index.ts                 # Export centralisé des services
```

### 🧩 Composants d'aide

Des hooks et composants ont été créés pour faciliter l'utilisation de l'API:

- `useApi.ts`: Hook générique pour les appels API (GET)
- `useApiAction.ts`: Hook générique pour les actions API (POST, PUT, DELETE)
- `usePropertyHooks.ts`, `useAuthHooks.ts`: Hooks spécifiques aux ressources
- `ToastManager.tsx`: Gestion centralisée des messages d'erreur/succès

## 📝 Exemples d'utilisation

### Récupérer des données (GET)

```typescript
// Utilisation avec le hook générique
const { data: properties, loading, error, refetch } = useApi(
  propertyService.getAll,
  []
);

// OU utilisation avec un hook spécifique
const { data: property, loading, error } = useProperty(propertyId);
```

### Envoyer des données (POST, PUT, DELETE)

```typescript
// Avec hook générique
const { execute: login, loading, error } = useApiAction(authService.login);

// Plus tard dans un event handler
try {
  await login(email, password);
  // Succès
} catch (error) {
  // Erreur déjà gérée par le hook
}

// OU utilisation avec un hook spécifique
const { execute: createProperty, loading } = useCreateProperty();
```

### Gestion des erreurs globales

```typescript
import { useToast } from '../components/ToastManager';

const { showToast } = useToast();

// Afficher un message d'erreur
showToast('Une erreur est survenue', 'error');

// Afficher un message de succès
showToast('Opération réussie', 'success');
```

## 🔄 État de la migration

Les stores Zustand suivants ont été migrés pour utiliser l'API:

- ✅ `user.ts`: Store utilisateur
- ✅ `search.ts`: Store de recherche
- ✅ `saved.ts`: Store des favoris

Les écrans suivants utilisent désormais l'API:

- ✅ `HostListingsScreen.tsx`

## 🔧 À faire

- Migrer les stores restants (reviews, messages, etc.)
- Mettre à jour tous les écrans pour utiliser les services API
- Ajouter des tests pour les services API

## 📚 Ressources

- [Documentation de l'API](./api-endpoints.md)
- [React Query](https://react-query.tanstack.com/) (alternative à considérer pour la gestion d'état API)
- [Axios Interceptors](https://axios-http.com/docs/interceptors)
