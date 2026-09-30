> Document historique : cette migration REST a été remplacée par Supabase. Voir le README à la racine et docs/BACKEND-DEPLOYMENT.md.

# Guide de migration vers l'API REST

Ce document explique comment migrer les fonctionnalités de LocaMap des données mockées vers l'API REST.

## Structure des services API

Les services API sont organisés par domaine fonctionnel :

- `config.ts` : Configuration centralisée d'Axios avec intercepteurs pour l'authentification et la gestion des erreurs
- `auth.service.ts` : Service pour l'authentification (login, register, etc.)
- `property.service.ts` : Service pour les propriétés (recherche, création, etc.)
- `user.service.ts` : Service pour les utilisateurs (profil, préférences, etc.)
- `message.service.ts` : Service pour les messages et conversations
- `review.service.ts` : Service pour les avis et commentaires
- `index.ts` : Point d'entrée qui exporte tous les services

## Comment migrer un écran

Voici la procédure pour migrer un écran du mock data vers l'API réelle :

1. **Importer les services API nécessaires** :
   ```typescript
   import { propertyService, userService, /* etc. */ } from '../services/api';
   ```

2. **Remplacer les données mockées par des appels API** :
   - Utiliser les hooks React `useState` et `useEffect`
   - Gérer les états de chargement (`loading`) et d'erreur (`error`)
   - Mettre en place des indicateurs de chargement
   - Gérer les erreurs de manière appropriée

3. **Exemple de modèle pour les appels API** :
   ```typescript
   const [data, setData] = useState([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState(null);

   useEffect(() => {
     const fetchData = async () => {
       try {
         setLoading(true);
         const result = await someService.someMethod();
         setData(result);
         setError(null);
       } catch (err) {
         console.error('Error:', err);
         setError('Message d\'erreur');
       } finally {
         setLoading(false);
       }
     };

     fetchData();
   }, [dependancies]);
   ```

4. **Ajouter la gestion des états de l'interface** :
   - État vide (pas de données)
   - État de chargement
   - État d'erreur
   - État avec données

## Exemple de migration : HostListingsScreen

L'écran `HostListingsScreen` a été migré comme exemple. Les modifications incluent :

- Remplacement des données mockées par un appel API
- Ajout d'un état de chargement avec `ActivityIndicator`
- Ajout d'un état "vide" lorsqu'aucune annonce n'existe
- Gestion des erreurs avec un composant `Snackbar`
- Transformation des données API au format attendu par les composants

## Configuration de l'API

Si vous devez modifier l'URL de base de l'API ou d'autres paramètres de configuration, modifiez le fichier `config.ts`.

## Prochaines étapes de migration

Voici un ordre suggéré pour la migration des écrans :

1. Écrans d'authentification (login, register)
2. Écrans de recherche et de liste de propriétés
3. Écrans de détail de propriété
4. Écrans de profil utilisateur
5. Écrans de messagerie
6. Écrans de création et gestion d'annonces

## Conseils pour le débogage

- Utilisez `console.log` ou `console.error` pour déboguer les appels API
- Inspectez les réponses du serveur pour comprendre le format des données
- En cas d'erreur, vérifiez les intercepteurs dans `config.ts` pour voir comment elle est traitée

## Notes importantes

- Les tokens d'authentification sont gérés automatiquement par les intercepteurs Axios
- Les erreurs 401 (non autorisé) déclenchent une déconnexion automatique
- Tous les appels API sont enveloppés dans des blocs try/catch pour éviter les crash de l'application
