# Corrections de l'audit LocaMap

> Exécution autorisée par la demande « corriger tout ce qui a trouvé ». Les lots indépendants sont répartis selon le guide dispatching-parallel-agents, avec intégration et vérification dans cette tâche.

**Objectif :** corriger les défauts du rapport du 29 septembre et rendre vérifiables les parcours persistants, les droits serveur et la génération de l'application.

**Architecture :** conserver Expo/React Native et Supabase. Les stores appellent les services, les opérations sensibles passent par des fonctions SQL ou Edge authentifiées. Les services externes indisponibles renvoient une indisponibilité explicite, jamais un faux succès. Le paiement réel dépend du prestataire choisi par l'utilisateur.

**Référence :** docs/ANALYSE-PROJET-2026-09-29.md.

## Contraintes

- Conserver les fichiers locaux de l'utilisateur, notamment src/assets/lottie/sessions.
- Ne pas exposer de secrets et ne pas effectuer de paiement réel.
- Ne pas déployer une migration non testée sur une base distante.
- Ajouter des tests comportementaux pour les défauts de données et des tests de droits SQL ; vérifier TypeScript, lint et exports.
- Définir explicitement les conditions externes de déploiement restantes.

## Lots et propriété des fichiers

- [x] Socle : package.json/lock, tsconfig, ESLint, tests et CI, types/database.ts, visualisation. Responsable principal.
- [x] Données logement : services property/review, stores search/hostListings/favorites/saved/reviews/alerts, fiches et formulaire annonce. Relier lecture/écriture, photos, prix mensuels et filtres. Lot indépendant.
- [x] Authentification et messages : client Supabase, store user/messages/hostOnboarding, services auth/message/profile/user, écrans auth/compte/messagerie/onboarding. Unifier sessions, comptes, participants et messages persistants. Lot indépendant.
- [x] Sécurité serveur : migrations supplémentaires, fonctions SQL métier, Edge Functions de compte et stockage, tests SQL, procédure de déploiement. Lot indépendant.
- [x] Intégration : réservations, notifications, statistiques, carte web, traductions et fonctionnalités secondaires. Responsable principal, après stabilisation des interfaces.
- [x] Validation : tests de régression, tsc, lint, audit npm, export web/Android/iOS et revue du diff ; actualiser le rapport avec preuves et conditions de déploiement.

## Interfaces serveur à partager

Les signatures exactes seront consignées par le lot serveur avant consommation : création/recherche de conversation, lecture des messages, réservation avec prix calculé et verrouillage de disponibilité, enregistrement hôte et gestion du compte. Les tables nouvelles comprennent favorites (user_id, property_id), host_applications (dossier privé), et les éventuels moyens de paiement selon la décision du prestataire. Les types applicatifs sont centralisés par le responsable principal.

## Recettes de non-régression

1. Une annonce chargée reste présente lors d'une actualisation réussie ; une erreur réseau conserve les données et indique l'échec.
2. Une publication utilise le compte authentifié et enregistre les URL des photos, avec statut distinct du brouillon.
3. Un message provient du serveur, arrive chez l'autre participant et n'entraîne aucune réponse automatique fictive.
4. Un tiers ne peut rejoindre une conversation, attribuer des crédits ou modifier un statut de vérification.
5. Deux demandes concurrentes ne peuvent approuver des dates qui se chevauchent ; le prix est calculé côté serveur.
6. Le changement de compte ne révèle aucune conversation ni favori du compte précédent.
7. L'export des données produit un document et la suppression effectue une vraie opération serveur ou explique précisément le refus.
8. La visualisation reste une source locale autonome, sans dépendance réseau ni RPC.

## Résultat

Lots locaux intégrés et vérifiés. La recette des services déployés et des appareils reste à effectuer ; les dépendances externes et fonctions explicitement indisponibles sont détaillées dans docs/CORRECTIONS-2026-09-29.md. Ces cases ne signifient pas que le produit est déployé ou entièrement prêt au lancement.
