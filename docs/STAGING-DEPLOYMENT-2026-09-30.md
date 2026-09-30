# Preuve de déploiement du staging — 30 septembre 2026

Cible explicitement autorisée : projet Supabase `uwoesteqkprwitnhfmes`, origine `https://uwoesteqkprwitnhfmes.supabase.co`. Les opérations ci-dessous concernent uniquement ce staging. Aucun `reset`, effacement global ou déploiement vers un autre projet n’a été effectué.

## État vérifié

Les migrations `001` à `004` sont présentes dans l’historique distant. `001` a été rapprochée après comparaison ; son SQL n’a pas été réexécuté. `002`, `003` et `004` ont été appliquées avec la CLI Supabase 2.75.0 après examen du dry-run. Les cinq fonctions Edge ont été déployées et leur configuration distante indique `ACTIVE` et `verify_jwt=true`.

Le contrôle du catalogue après migration correspond aux migrations du dépôt. Le nettoyage planifié est actif ; un appel utilisant la commande exacte du job a reçu HTTP 200. La recette complète avec comptes, fichiers R2 et clients reste une vérification distincte. Ce document ne constitue pas une autorisation de publication en production.

## État initial et comparaison de `001`

L’historique Supabase était vide alors que le schéma applicatif existait. La comparaison s’est faite sur les catalogues PostgreSQL, sans afficher de données de compte :

- 31 tables et leurs indicateurs RLS ; 267 colonnes ; 58 index.
- 124 politiques ; 99 contraintes ; 7 triggers, dont celui de création du profil Auth ; 2 fonctions applicatives initiales.
- Correspondance exacte des objets comparés après une normalisation documentée : 26 valeurs par défaut sont qualifiées `extensions.uuid_generate_v4()` sur Supabase, contre `uuid_generate_v4()` dans le moteur local de comparaison. Aucun autre écart n’a été constaté.

Le moteur de comparaison PGlite a exécuté les migrations réelles ; seuls les helpers Auth et extensions indisponibles localement ont été remplacés, comme dans le runner de sécurité du dépôt. Cette comparaison n’équivaut pas à restaurer intégralement une sauvegarde Supabase.

Les comptages exacts initiaux montraient un compte Auth, un profil, une ligne de préférences de notifications et un code de parrainage. Les 28 autres tables applicatives étaient vides. Les estimations de lignes issues de `inspect db table-stats` n’ont pas été utilisées comme preuve de vacuité.

## Sauvegarde avant modification

Une archive complète au format custom PostgreSQL a été produite avec `pg_dump` 18.1 depuis la base PostgreSQL 17.6.1.127, avant le rapprochement de l’historique et l’application des migrations. `pg_restore --list` a lu son catalogue : 490 010 octets, 910 entrées.

SHA-256 de l’archive en clair avant chiffrement :

`0e084978d1811c0339b215a66a8d6569182ae1896d73a2bf5d53ad9ae7c16f38`

La copie conservée est chiffrée avec Windows DPAPI pour l’utilisateur Windows courant, hors du dépôt :

`C:\Users\Peter Akilimali\AppData\Local\LocaMap\staging-tools\uwoesteqkprwitnhfmes-predeploy-20260930.dump.dpapi`

L’entropie de récupération est `locamap:uwoesteqkprwitnhfmes:20260930`. Un déchiffrement en mémoire a reproduit le même SHA-256 avant suppression de la copie temporaire en clair. La clé de protection DPAPI dépend du compte/profil Windows ; le fichier seul ne constitue pas une sauvegarde portable. Les données Auth et applicatives contenues dans l’archive ne doivent pas être publiées.

La lisibilité du catalogue et l’intégrité du chiffrement ont été vérifiées. **Un exercice de restauration complète vers une autre base n’a pas été réalisé pendant cette opération.** Les fichiers R2 ne sont pas inclus dans une archive PostgreSQL.

Les outils PostgreSQL natifs ont été extraits d’une archive EDB dont le SHA-256 correspondait au manifeste Scoop : `b2a7302ecb78088209edd96a936ec360fc12c58ec27dc8cc4e8ce5aefb9f8d3b`. Aucun service PostgreSQL local n’a été installé ou démarré. Les paramètres de connexion temporaires fournis par la CLI ont été utilisés en mémoire, sans les afficher.

## Migrations exécutées et vérifications

Séquence exécutée, après contrôle de la référence liée :

```text
supabase migration repair 001 --status applied --linked --yes
supabase db push --linked --dry-run
supabase db push --linked --yes
supabase migration list --linked
```

Le dry-run n’annonçait que `002_security_and_server_flows.sql`, `003_account_operations.sql` et `004_support_consent_referral_cohosts.sql`. La dernière lecture de l’historique confirme les quatre versions locales/distantes `001`, `002`, `003`, `004`.

Comparaison du catalogue applicatif après déploiement, vérifiée à 11:18 UTC : 36 tables, 300 colonnes, 66 index, 133 politiques, 126 contraintes, 19 triggers et 38 fonctions correspondent aux migrations locales, avec la seule normalisation UUID déjà décrite.

Contrôles distants supplémentaires :

- La politique privée de `profiles` utilise `id = auth.uid()`.
- `authenticated` ne dispose pas d’INSERT direct sur `bookings`.
- `authenticated` ne peut pas exécuter `erase_account_data(uuid)` ; `service_role` le peut.
- La publication `supabase_realtime` contient `conversation_participants`, `conversations`, `messages` et `notifications`. Cela confirme l’inscription à la publication, pas encore la réception correcte sur des clients connectés.
- Le runner local `node supabase/tests/run-security.mjs` a réussi ses 51 contrôles avant application. Il ne remplace pas les tests GoTrue, PostgREST, Edge, R2 ou Realtime hébergés.

Empreintes SHA-256 des migrations appliquées :

- `001_init.sql` : `d639a726900ee3d1f3ecaa2965a893b59514a4a677592edd4a3d519387bf5bd3`
- `002_security_and_server_flows.sql` : `d7293c2c01b4009748b156f9cd9c3627d0f93188795bde502dbe7defe5fc18d4`
- `003_account_operations.sql` : `fb6d36f39c90cbb5a73470ca86517b7a57f5500011b4568cd9ef146f7004c574`
- `004_support_consent_referral_cohosts.sql` : `49b83d65a94f486b42e9c9ee1e95d34f167014b3a84b6df96c2f2e766ebfeadf`

## Fonctions Edge et incident du premier appel de nettoyage

Déploiement effectué sans Docker :

```text
supabase functions deploy --project-ref uwoesteqkprwitnhfmes --use-api
supabase functions list --project-ref uwoesteqkprwitnhfmes --output json
```

La première vérification distante montre `account-delete`, `account-export`, `finalize-upload`, `get-upload-url` et `storage-cleanup` en version 1, toutes `ACTIVE`, avec `verify_jwt=true`. Aucun `--no-verify-jwt` n’a été utilisé.

Le premier appel à `storage-cleanup` avec la clé service récupérée par la CLI a reçu HTTP 401, message interne `Service authorization required`. La même clé est acceptée par PostgREST sur une lecture sans ligne (`profiles?select=id&limit=0`, HTTP 200). Le refus venait donc de l’égalité textuelle du bearer avec la variable injectée dans le handler, et non d’un rejet JWT par la passerelle.

Le correctif coordonné utilise un secret aléatoire dédié `STORAGE_CLEANUP_SECRET`, transmis dans `X-Cleanup-Token`, en conservant `verify_jwt=true`. Le bearer de la requête planifiée est la clé publique `anon`. La fonction conserve ses accès serveur en interne ; aucune clé service n’a besoin de passer dans la file `pg_net`.

Après les redéploiements coordonnés, la dernière lecture de la configuration distante confirme `account-delete`, `account-export`, `finalize-upload` et `get-upload-url` en version 3, et `storage-cleanup` en version 4 ; toutes restent `ACTIVE` avec `verify_jwt=true`. Deux appels indépendants du worker corrigé avec bearer `anon` ont confirmé HTTP 401 quand le jeton dédié est absent ou incorrect. L’appel autorisé via la commande du job a confirmé HTTP 200.

## Préparation du nettoyage planifié

Les extensions `pg_cron` et `pg_net` ont été installées sur ce staging ; `supabase_vault` était déjà présent. La configuration suit le modèle [Scheduling Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions), adapté au jeton dédié du worker.

Le job `locamap-storage-cleanup-staging`, identifiant `1`, porte l’expression `*/10 * * * *`. Il a d’abord été préparé avec `active=false`, puis activé après validation du worker corrigé. Sa commande utilise `net.http_post`, un délai technique maximal de 120 secondes et les valeurs lues à l’exécution dans Vault :

- `locamap_staging_project_url` pour l’origine du projet.
- `locamap_staging_anon_key` pour le bearer public de la passerelle.
- `locamap_staging_cleanup_token` pour `X-Cleanup-Token`.

Aucune valeur de clé ou JWT littéral n’apparaît dans la commande du job. Une entrée Vault provisoire pour la clé service a été supprimée avant toute exécution du job. Les insertions dans Vault ont utilisé des paramètres PostgreSQL, avec désactivation de la journalisation des valeurs de paramètres dans la session concernée. Les connexions SQL paramétrées vérifient le certificat serveur avec le CA PostgreSQL officiel Supabase.

**Limite vérifiée sur les droits `pg_net` :** `vault.decrypted_secrets` est inaccessible à `anon` et `authenticated`. En revanche, ces rôles disposent d’USAGE sur le schéma `net` et de SELECT sur ses tables de requêtes/réponses via des grants PUBLIC du propriétaire `supabase_admin`. Les tentatives de REVOKE comme `postgres` n’ont pas retiré ces droits ; il ne faut pas les déclarer révoqués.

L’accès PostgREST au schéma `net` a été testé avec la clé `anon` et `Accept-Profile: net` : HTTP 406 / `PGRST106`, schéma non exposé. Ne pas ajouter `net` aux schémas exposés ni introduire de RPC permettant des requêtes SQL arbitraires. Le jeton dédié peut transiter brièvement dans la file interne de `pg_net` ; les comptes disposant d’un accès SQL à cette file doivent donc rester des comptes administratifs de confiance. Une isolation SQL supplémentaire nécessite une configuration du propriétaire/fournisseur, pas une affirmation que les REVOKE ont réussi.

Vérification à `2026-09-30T11:20:17.311Z` : job `1` actif ; exécution manuelle de sa commande stockée, requête `pg_net` `1` ; HTTP 200 ; `timed_out=false` ; aucune erreur de transport ; résultat `{ "deleted": 0, "failed": 0 }`. Cette preuve valide le chemin Vault → file `pg_net` → passerelle JWT → worker et son accès à la base. Elle ne constitue pas l’observation d’un premier déclenchement automatique par l’horloge de `pg_cron`.

Une réponse de nettoyage vide ne prouve pas à elle seule la suppression effective d’un objet R2 ; le test avec des objets dédiés fait partie de la recette séparée. Surveiller les prochains déclenchements dans `cron.job_run_details` et vérifier aussi les réponses HTTP correspondantes : la réussite d’une insertion en file ne garantit pas, à elle seule, la réussite du worker.

### Premier déclenchement automatique observé

Lecture unique après l’échéance, à `2026-09-30T11:31:17.857Z` : le job `1` est toujours actif avec sa fréquence inchangée. `cron.job_run_details` contient le run `1`, statut `succeeded`, commencé à `11:30:00.143Z` et terminé à `11:30:00.168Z`. La réponse `pg_net` `2`, créée à `11:30:00.168Z`, est HTTP 200, sans timeout ni erreur de transport, avec `{ "deleted": 0, "failed": 0 }`. Aucun autre job actif n’a été relevé ; l’heure de création de la réponse correspond à la fin de ce déclenchement.

L’entrée de suppression du quatrième compte synthétique est datée de `11:20:55.915Z`. Lors du passage de `11:30:00`, elle n’avait pas encore les dix minutes exigées par le worker : une ligne restait en attente et aucune n’était marquée supprimée. Aucun horaire de mise en file ni aucune fréquence n’a été modifié pour accélérer ce test.

### Prise en charge automatique de la file après le délai

Une seconde lecture, à `2026-09-30T11:40:50.052Z`, confirme le run automatique `2`, statut `succeeded`, commencé à `11:40:00.053Z` et terminé à `11:40:00.073Z`. La réponse `pg_net` `3`, créée à `11:40:00.073Z`, est HTTP 200, sans timeout ni erreur de transport, avec `{ "deleted": 1, "failed": 0 }`. Le job `1` reste actif avec `*/10 * * * *` ; aucun autre job actif n’a été relevé.

Pour la seule fixture du quatrième compte synthétique, la file contient désormais une ligne terminée et aucune ligne en attente ; son `deleted_at` vaut `2026-09-30T11:40:01.653Z`. Son `queued_at` reste `2026-09-30T11:20:55.915Z`. Cette observation prouve le traitement automatique différé et l’achèvement de la file durable, sans modification des dates ni déclenchement forcé. L’avatar public renvoyait déjà HTTP 404 après la suppression immédiate du compte, vérifiée dans la recette séparée : ce passage confirme le nettoyage de suivi après expiration du délai de sécurité, et ne date pas la première disparition de l’objet.

## Suite de la recette

La configuration des buckets R2, de leur CORS, de leur cycle de vie et des secrets Edge est coordonnée séparément. La création des trois comptes dédiés, de l’annonce marquée et les vérifications R2 sont également menées séparément. Se référer à [STAGING-RECIPE.md](STAGING-RECIPE.md) pour les exigences de la recette et à [EXPLOITATION.md](EXPLOITATION.md) pour les procédures proposées.

Le résultat de la recette complète avec les trois comptes et R2 doit être consigné séparément ou ajouté à ce compte rendu. Les contacts, textes juridiques, conservation, domaine public et contrôles de lancement restent soumis aux décisions et vérifications décrites dans les autres documents ; ce déploiement technique ne les valide pas implicitement.
