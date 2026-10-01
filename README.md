# LocaMap

Application Expo/React Native de location au Rwanda. Authentification, annonces, favoris, réservations et messages utilisent Supabase. Le loyer de référence est mensuel, en RWF. La réservation demande l'accord de l'hôte ; aucun paiement n'est encaissé par l'application.

## Installation

Node.js 24 et npm sont utilisés par la CI.

1. Installer avec `npm ci` (le script `postinstall` prépare les fichiers MapLibre nécessaires au web).
2. Copier `.env.example` en `.env`, puis renseigner uniquement les clés publiques du projet Supabase.
3. Appliquer le [guide backend](docs/BACKEND-DEPLOYMENT.md) sur un projet de staging avant de lancer les parcours métier. Il couvre les migrations 001–005, sept fonctions Edge, R2 public/privé et le nettoyage périodique. L’[audit des 20 protections](docs/PRODUCTION-READINESS.md) détaille les protections appliquées et les validations encore nécessaires avant production.
4. Lancer `npm start` ou `npm run web`. Les commandes npm `start`, `android`, `ios` et `web` utilisent le port **8097**, car Apache utilise 8081 sur ce poste. Pour Expo Go : `npm start -- --go --lan --max-workers 2`. Le web est accessible sur `http://localhost:8097`. Le [guide iPhone Expo Go](docs/NATIVE-RELEASE.md) décrit la variante staging et le retour Auth.

Il n'existe plus de connexion simulée ni de compte de démonstration universel. Créer des comptes de test dans le projet de staging. L'hôte et ses annonces doivent être modérés côté serveur avant publication.

Les emails d’authentification du staging utilisent désormais Resend via le SMTP personnalisé de Supabase. Voir [la configuration et la recette Resend](docs/EMAILS-RESEND.md) pour l’expéditeur temporaire, les quotas et le changement de domaine. La clé d’envoi reste uniquement dans Supabase.

## Contrôles

- `npm run typecheck` : application TypeScript.
- `npm test` : régressions métier et compatibilité de la chaîne de compilation.
- `npm run test:security` : politiques et fonctions PostgreSQL dans PGlite, sans toucher une base distante.
- `npm run lint` : ESLint ; les avertissements de migration restent visibles.
- `npx deno task --config supabase/functions/deno.json check` et `test` : fonctions Edge.
- `npx expo export --platform all --max-workers 2`, puis `node scripts/verify-web-export.cjs` : exports web, Android et iOS et syntaxe des scripts navigateur.
- `npm audit` : dépendances connues vulnérables.

La CI exécute ces contrôles. PGlite ne remplace pas les essais de concurrence sur PostgreSQL/Supabase. Un export JavaScript n'est pas un APK/IPA signé ni un test sur téléphone.

## Architecture

`src/screens` et `src/components` présentent les parcours. Les hooks/stores appellent `src/services` ; `src/services/api` est une façade de modèles, pas un second serveur REST. Les opérations sensibles utilisent des RPC SQL ou fonctions Edge authentifiées. Les tables privées sont protégées par RLS. `public_profiles` expose uniquement le profil public.

Les cartes utilisent `react-native-maps` : Apple Maps sur iPhone et Google Maps sur Android. Le web utilise MapLibre avec TomTom (clé requise, quota gratuit). Voir [la configuration cartographique](docs/GOOGLE-MAPS.md). Les favoris et messages changent de périmètre avec le compte. L'historique de consultation reste local à l'appareil et séparé par utilisateur.

Les prix restent dans la devise enregistrée. Les nouvelles annonces utilisent RWF ; les conversions approximatives ont été retirées. Le devis serveur additionne les tarifs du calendrier ou le loyer mensuel divisé par 30 ; la caution est indiquée séparément.

## Compilation et distribution

Le projet EAS `peter23xp/LocaMap` est lié. `eas.json` fournit staging, preview (alias) et production. Le staging utilise `com.locamap.app.staging` et son keystore Android dédié. Construire avec `eas env:exec preview "eas build --profile staging --platform android"` pour charger les variables avant la validation de configuration. Voir le [guide natif](docs/NATIVE-RELEASE.md) et la [recette](docs/RECETTE-2026-09-30.md).

Le staging autorise `locamap-staging://auth/recovery`, les retours web localhost/127.0.0.1 sur 8081 et 8097, ainsi que le retour Expo Go exact de la session décrit dans le guide natif. La production utilisera sa cible et `locamap://auth/recovery`. Pour le web, servir `/auth/recovery` avec un fallback vers index.html. Le domaine public reste à choisir. Les contacts de support réels sont configurés dans l'exemple et EAS. Aucune clé service ou secret R2 ne doit entrer dans le bundle Expo.

## Compatibilité des dépendances

Le projet utilise Expo SDK 57 pour l'Expo Go actuel sur iPhone. Le correctif Metro/image-size devenu inutile a été retiré ; le test toolchain vérifie l'extraction d'un véritable PNG par Metro. Babel transforme import.meta pour les dépendances ESM servies en scripts classiques et le preset Expo configure les worklets. Le carrousel a été adapté à Reanimated 4 ; la dépendance bottom-sheet inutilisée a été retirée.

## Avant mise en service

Déployer puis vérifier avec deux comptes et un compte tiers : publication/photo, recherche, messages, réservation/calendrier, avis, déconnexion, export et suppression. Tester les coupures réseau et les liens de récupération sur téléphones. Configurer sauvegardes/restauration, logs/alertes Edge et nettoyage R2. Fournir CGU, confidentialité, FAQ et contenus locaux vérifiés ; les documents de démonstration ne remplacent pas des textes validés.

Paiement intégré, remboursements, notifications push/email/SMS, OAuth social et back-office graphique demandent des services/comptes et une configuration supplémentaires. Les fonctions non opérationnelles sont signalées et ne produisent pas de faux succès. Les quatre catalogues ont les mêmes clés ; une revue linguistique humaine reste nécessaire.

Rapports : [audit initial](docs/ANALYSE-PROJET-2026-09-29.md), [corrections](docs/CORRECTIONS-2026-09-29.md), [backend](docs/backend-fix-report.md).
