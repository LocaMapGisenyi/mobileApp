# Recette du site d’administration — 30 septembre 2026

## Livraison vérifiée

Site React/Vite dans `admin/`, utilisable sur ordinateur, tablette et téléphone. Environnement courant : **staging Supabase `uwoesteqkprwitnhfmes`**, site local **http://localhost:8098**, application Expo conservée sur 8097. Aucun domaine ni hébergement public du site admin n’a été créé.

Migration additive `006_admin.sql` appliquée après vérification de l’historique distant et un dry-run. Historique local/distant : **001 à 006** concordants. Fonction `admin-api` déployée, active, `verify_jwt=true`. Origines admin autorisées : `http://localhost:8098` et `http://10.25.113.233:8098`. Les origines génériques de l’application restent distinctes.

Le compte demandé **peter23xp@gmail.com** a reçu une invitation, confirmé son email et obtenu le rôle `owner` par une opération administrative journalisée. Un facteur TOTP vérifié a été constaté à la fin de la recette. Aucun mot de passe du titulaire n’a été défini ou lu par l’agent. L’accès `owner` synthétique de recette a été révoqué ; son jeton AAL2 antérieur reçoit désormais **403**. Le propriétaire réel reste actif.

## Vérifications automatisées

- `npm --prefix admin run check` : TypeScript et **8 tests** réussis (validation, brouillon incomplet, erreurs sûres, double clic et reprise idempotente).
- `npm --prefix admin run build` : compilation réussie ; JavaScript **484,16 kB**, **140,43 kB gzip**, CSS **21,15 kB**. Absence de source maps et de la clé `service_role` locale dans le bundle vérifiée.
- `npm run typecheck` : réussi après déclaration du nouveau RPC mobile `report_conversation` dans les types Supabase.
- `npm test` : **167 tests / 30 fichiers** réussis.
- `node supabase/tests/admin-security.mjs` : **39 contrôles** PostgreSQL/PGlite réussis.
- `npm run test:security` : **55 contrôles existants** réussis, plus restauration isolée d’un snapshot de fixtures et conservation de la RLS. Ce résultat ne constitue pas une restauration hébergée Supabase/R2.
- `npx deno test --config supabase/functions/deno.json --allow-env supabase/functions/_shared/` : **26 tests** réussis, dont 11 dédiés à l’administration.
- Vérification Deno de `admin-api` réussie.
- `npm run lint` : **0 erreur, 184 avertissements** sur le dépôt existant. Le contrôle ciblé du nouveau frontend ne produit pas d’erreur ni d’avertissement.

Les tests SQL couvrent rôles limités, accès direct interdit aux RPC privilégiés, suspension avec ancien JWT, prérequis de publication, version périmée, replay, atomicité du journal, dernier propriétaire, brouillons privés, publication typée, historique légal compatible mobile, documents exacts et accès au contexte signalé. Une conversation ordinaire n’est pas exposée ; après résolution, les messages ultérieurs ne rejoignent pas le contexte consultable, même si leur transaction porte un horodatage antérieur.

## Recette distante et navigateur

**22 contrôles via l’API hébergée** : session MFA réelle, lecture des 18 ressources, origine non autorisée refusée, données refusées à AAL1 et compte ordinaire refusé. Aucun secret ni contenu de dossier n’est inclus dans les preuves JSON.

Deux scénarios de concurrence ont utilisé **deux connexions PostgreSQL réelles**, avec observation du verrou bloquant :

1. Une modification de photo attend la publication concurrente, puis remet l’annonce en `PENDING_REVIEW`. Une seule publication est journalisée.
2. Deux décisions sur la même version produisent un succès et un refus `PT409`, une seule trace de publication et une seule entrée d’idempotence. Le replay ne répète pas l’effet.

Les annonces et images créées uniquement par ces scénarios ont été nettoyées ; aucun logement existant n’a été modifié.

Parcours exécutés dans le site avec des comptes et documents synthétiques :

- Connexion avec mot de passe et code TOTP du compte de recette.
- Soumission d’un dossier hôte dont le justificatif est une copie du **logo de l’application**, jamais une pièce d’identité réelle. Chargement effectif de l’image depuis R2 privé, refus motivé, nouvelle soumission, puis validation motivée.
- Réponse à un ticket fictif, création de la notification dans l’application et passage en attente du demandeur ; attribution/état disponibles, résolution avec motif vérifiée.
- Enregistrement d’un article incomplet en brouillon privé ; absence confirmée de toute ligne correspondante dans `articles`. Brouillon synthétique retiré après le test, sans publication.
- Suspension du compte fictif depuis le site : avec son jeton obtenu avant suspension, aucune ligne privée du ticket n’est visible, le RPC d’écriture est refusé et l’upload renvoie **403**. Après réactivation dans le site, le même jeton retrouve la lecture autorisée du ticket.
- Révocation finale du compte administrateur synthétique : l’appel suivant avec son ancien jeton est refusé **403**. Aucun accès de recette privilégié n’est conservé.

La suspension a révélé une erreur de présentation dans les routes Edge existantes : le refus PostgreSQL `42501` était transformé en 503. Un test a reproduit ce défaut avant correction de `_shared/http.ts`. Les routes `get-upload-url`, `finalize-upload`, `account-export`, `account-delete` et `report-client-error` ont été redéployées ; le test hébergé d’upload confirme maintenant le 403. Les quotas conservent le 429 et une panne serveur le 503.

Vues **1440 × 900**, **768 × 1024** et **390 × 844** examinées : navigation, tableau de bord, liste, fiche hôte, justificatif, ticket, formulaire et aperçu éditorial. Menu mobile replié inaccessible au clavier, focus de modale, champs longs, actions et absence de débordement horizontal vérifiés. Il s’agit d’un navigateur redimensionné, pas d’une nouvelle recette native iPhone.

## Preuves locales et données de recette

Les preuves détaillées sont ignorées par Git dans `.expo/` : `admin-hosted-checks.json`, `admin-concurrency.json`, `admin-suspension.json`, `admin-revocation.json`, ainsi que `admin-dashboard-desktop.png`, `admin-host-mobile.png` et `admin-editor-tablet.png`. Les preuves ne contiennent pas de clés d’accès.

Les identités synthétiques restent repérables par `locamap-admin-…@example.invalid` et `[Recette admin]`. Le compte hôte de recette réactivé, son dossier approuvé et son ticket résolu sont conservés pour contrôle ; les traces de décision ne sont pas effacées. L’article privé et les annonces temporaires de concurrence ont été retirés. Les secrets de recette sont uniquement dans les fichiers locaux ignorés `scripts/staging/.env.admin*.local` ; le jeton temporaire de test de suspension a été supprimé.

## Limites explicites

Cette livraison permet la gestion des utilisateurs, KYC, annonces, réservations en lecture, assistance, signalements, contenus, accès, quotas et journal. Les paiements restent exclus. Les notifications opérationnelles testées sont celles de l’application ; la diffusion email/SMS/push n’est pas ajoutée.

L’hébergement public, le domaine et la recette Auth sur ce domaine restent à configurer. La récupération par email reste désactivée par défaut jusqu’à sa recette dédiée. Le nom légal complet et l’adresse précise de l’exploitant restent nécessaires avant publication de textes juridiques. Aucun document légal n’a été publié par cette recette.

La politique de conservation des journaux, la restauration hébergée, la supervision externe et les performances à volume de production ne sont pas certifiées par ces tests. Les listes sont paginées ; les historiques imbriqués sont bornés conformément au [contrat API](ADMIN-API.md). La lecture d’un indicateur dans le site ne remplace pas une procédure d’exploitation.

Guide de lancement, rôles et configuration : [admin/README.md](../admin/README.md).
