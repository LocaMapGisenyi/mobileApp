# Mise en service de LocaMap

**Objectif :** exécuter la préparation, le déploiement de staging et les recettes demandées, puis préparer l'essai gratuit sur l'iPhone de l'exploitant.

**Décisions confirmées :** Rwanda ; support `peter23xp@gmail.com` et WhatsApp `+250 782 028 955` ; réservations sans encaissement intégré ; projet Supabase `uwoesteqkprwitnhfmes` repris comme staging ; compte R2 existant ; cartes gratuites OpenStreetMap sans compte Google ; essai iPhone avec Expo Go. Aucun domaine n'est encore choisi. Le nom légal et l'adresse précise n'ont pas été fournis.

## Lots

- [x] Identifier et connecter les sessions Expo, Supabase et Cloudflare autorisées.
- [x] Préparer les commandes de déploiement/recette et leurs contrôles de cible et de secret.
- [x] Configurer EAS staging/production, lier `peter23xp/LocaMap`, créer les variables preview et le keystore Android staging. Un build Android SDK 54 a terminé ; aucun essai physique Android n'est revendiqué.
- [x] Intégrer les contacts support et six guides pratiques sur le Rwanda ; retirer les promesses de paiement, coordonnées financières et délais de support fictifs.
- [x] Préparer les procédures d'exploitation et les projets de textes légaux, sans publication comme textes définitifs.
- [x] Sauvegarder et comparer la base existante ; rapprocher `001`, appliquer `002` à `004` et déployer les cinq fonctions Edge avec JWT actif.
- [x] Configurer les buckets R2 public/privé, le CORS, le cycle de vie `pending/`, les secrets et le job de nettoyage toutes les dix minutes. Premier tick automatique réussi à 11:30 UTC.
- [x] Exécuter la recette hébergée à trois comptes : 25 contrôles réussis, fichiers publics/privés, Realtime isolé et contrôle séparé d'export/suppression sur compte jetable.
- [x] Consigner les preuves dans `docs/RECETTE-2026-09-30.md` et `docs/STAGING-DEPLOYMENT-2026-09-30.md`.
- [x] Mettre à niveau Expo SDK 57, vérifier les trois exports et préparer le serveur/QR ainsi que les liens Auth de développement sur 8097.
- [x] Recueillir le résultat de l'essai physique iPhone : ouverture confirmée, erreur de racine des gestes corrigée, affichage de la carte confirmé après relance. GPS/photos et parcours complets restent à tester ; aucun binaire iOS signé validé.

## Conditions d'ouverture encore nécessaires

- Nom légal et adresse précise, domaine public, textes définitifs et décisions de conservation.
- Responsables nominatifs de modération/KYC/support et accès administratifs organisés.
- Exercice complet de restauration, sauvegardes des objets et surveillance avec alertes attribuées.
- Production distincte, distribution/signature iOS si publication retenue et recette des autorisations natives sur les plateformes distribuées.

Paiement, OAuth social et diffusion push/email/SMS ne sont pas configurés. Le premier lancement n'encaisse pas dans l'application ; le choix futur du prestataire et du compte marchand reste à faire. Les fonctions de diffusion indisponibles sont indiquées dans l'interface.
