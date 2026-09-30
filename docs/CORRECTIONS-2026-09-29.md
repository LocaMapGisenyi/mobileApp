# Corrections de LocaMap — 29 septembre 2026

Les corrections ci-dessous sont présentes dans le dépôt local. Aucune migration, création de compte, publication d’annonce, suppression de compte ou transaction réelle n’a été exécutée sur un service distant. Le produit exige encore une mise en service et une recette sur appareils.

## Parcours corrigés

- Recherche et fiches alimentées par Supabase, pagination, filtres, coordonnées et identité publique du propriétaire cohérentes.
- Annonces enregistrées avec le vrai compte, photos R2 vérifiées, reprise des brouillons, distinction brouillon/soumission/modération et erreurs partielles explicites.
- Favoris partagés entre écrans et persistés ; avis liés à un séjour terminé ; alertes enregistrées côté serveur.
- Session unifiée, isolation des caches entre comptes, récupération du mot de passe par lien, édition du profil, export et suppression réels via fonctions Edge.
- Messages persistés avec participants autorisés, lecture et abonnements temps réel ; réponses automatiques fictives supprimées.
- Devis de réservation calculé côté serveur, contrôle du montant confirmé, dates/capacité/disponibilité et prévention des chevauchements lors de l’acceptation. Demandes et suivi accessibles depuis le profil.
- Carte web Leaflet/OpenStreetMap, carte native conservée, historique local séparé par compte et navigation vers assistance/documents/notifications.
- Calendrier protégé contre les réponses de l’ancienne annonce, du mois ou du compte précédent. Une panne bloque la grille au lieu d’afficher une disponibilité fictive ; une sauvegarde est relue depuis le serveur.
- Statistiques issues des réservations, occupation calculée sur les journées réellement occupées et revenus conservés pour les annonces archivées. Les mélanges de devises sans conversion configurée sont explicitement refusés.
- Loyer mensuel RWF cohérent, conversions approximatives supprimées. Les annonces historiques dans d’autres devises ne sont pas réétiquetées automatiquement.
- Co-hôtes avec consentement et droits bornés, consentements légaux immuables, notes du support contrôlées et parrainage sans crédits auto-attribués ni récompenses promises fictivement.
- Ressources/bookmarks/progression reliés au serveur, erreurs réseau visibles ; faux liens et contacts inventés retirés des écrans corrigés.
- Quatre catalogues de 1 187 clés, avec les mêmes variables d’interpolation. Cette égalité ne remplace pas une validation linguistique humaine ni l’examen des messages encore directement écrits dans le code.

## Protection des données

Migrations additives 002 à 004, vue publique de profils limitée à la lecture et sans email/téléphone, opérations sensibles par fonctions SQL, droits d’édition restreints. Le dossier KYC utilise un bucket privé distinct. Les téléversements sont liés à un propriétaire, un type et une taille, puis vérifiés avant association. L’export du compte et sa suppression ont des fonctions serveur ; la purge R2 résiduelle est suivie par une file durable et un worker.

Les migrations n’assainissent pas arbitrairement les données historiques : les anciens statuts KYC, participants et réservations qui se chevauchent demandent une revue administrative. Voir le [guide de déploiement](BACKEND-DEPLOYMENT.md).

## Vérifications

- Tests applicatifs : 57 réussis dans 19 fichiers, dont les courses du calendrier, le changement de compte, les erreurs d’écriture et la compatibilité Metro/image-size.
- SQL : 51 contrôles réussis dans PGlite ; les mêmes premières règles échouaient sur le schéma initial. Cela ne simule pas la concurrence de plusieurs connexions PostgreSQL ni GoTrue/Realtime hébergés.
- Edge : cinq fonctions vérifiées par Deno et sept tests réussis sur HTTP, signature et validation de fichiers.
- TypeScript : aucune erreur. ESLint : aucune erreur ; des avertissements de migration, essentiellement variables inutilisées et types `any`, restent visibles.
- Audit npm : aucune vulnérabilité connue signalée lors du contrôle.
- Exports web, Android et iOS réussis. Les deux scripts web sont valides comme scripts navigateur. Les écrans Connexion et Mot de passe oublié s’ouvrent sans erreur console dans le navigateur ; aucun identifiant n’a été envoyé.

La CI reproduit les contrôles de types, tests, SQL, Deno, lint, audit, export et syntaxe web. Le correctif d’installation Metro pour image-size 2 échoue si sa cible amont change ; il devra être réévalué à la prochaine mise à niveau Expo.

La vérification navigateur a détecté une erreur `import.meta` malgré un premier export réussi. Le réglage Babel Expo correspondant et la reconstruction sans cache ont corrigé le démarrage. Le contrôle de syntaxe web ajouté à la CI prévient cette régression. `expo install --check` confirme également la compatibilité des versions déclarées avec le SDK.

## Visualisation intégrée

`etat-locamap.html` a été reconstruit en un fragment statique de 1 062 octets, sans JavaScript, appel réseau, bibliothèque ou RPC. Son aperçu autonome a été rendu et vérifié visuellement dans le navigateur. Il reste lisible sans interaction.

L’ancien fichier ne contenait déjà aucun appel MCP. Le message `TimeoutError: MCP sandbox RPC timed out` concerne donc le moteur d’intégration ; sa disparition dans l’hôte Codex ne peut pas être certifiée par le test autonome. Le nouveau fragment réduit le contenu à afficher et le bilan présent reste accessible indépendamment de ce moteur.

## Ce qui reste avant un lancement réel

1. Appliquer les migrations et fonctions sur un projet de staging, configurer R2 public/privé, CORS, nettoyage programmé et URLs de retour Auth, puis effectuer la recette à deux comptes et un tiers non autorisé.
2. Configurer les identifiants/certificats EAS, la clé Maps Android restreinte et tester sur téléphones. Les exports JavaScript ne sont pas des binaires signés et ne valident pas les autorisations natives.
3. Fournir les textes légaux, contenus locaux et contacts support réels, organiser modération des annonces/KYC, assistance, sauvegardes/restauration et surveillance des erreurs.
4. Choisir le périmètre transactionnel et le prestataire de paiement. Encaissement, remboursement et rapprochement ne sont pas intégrés sans ce choix ni compte marchand.
5. OAuth social et diffusion push/email/SMS ne sont pas configurés. L’interface corrigée signale ces indisponibilités ; les notifications opérationnelles sont celles de l’application. Les commandes administratives sont documentées, mais aucun back-office graphique complet n’est livré.

Rapports détaillés : [annonces et traductions](property-fix-report.md), [authentification et messages](auth-messages-fix-report.md), [backend](backend-fix-report.md).
