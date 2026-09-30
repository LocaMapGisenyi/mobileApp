# Recette de staging LocaMap

Ces outils préparent le déploiement et exécutent une recette GoTrue/PostgREST avec trois comptes dédiés. Ils ne déploient rien automatiquement. Le plan et la recette sans `--run` ne font aucun appel réseau. Une recette locale réussie, y compris avec l’API simulée des tests, ne prouve pas le fonctionnement du projet hébergé.

La cible de staging doit être confirmée dans le tableau de bord Supabase avant toute commande distante. Le projet choisi par l’opérateur peut être celui de `.env` : cela exige la confirmation supplémentaire ci-dessous. Une référence inscrite dans la liste de production est toujours refusée. Les marqueurs sont une confirmation de l’opérateur, pas une preuve automatique de propriété du projet.

## 1. Préparer la cible explicite

Utiliser Node 20 ou plus récent, Git et la CLI Supabase. Depuis la racine du dépôt :

```powershell
Copy-Item -LiteralPath scripts/staging/staging.env.example -Destination scripts/staging/.env.staging.local
```

Remplir ce fichier local, déjà exclu de Git par `.env*.local` :

```dotenv
LOCAMAP_STAGING_PROJECT_REF=REFERENCE_STAGING
LOCAMAP_STAGING_URL=https://REFERENCE_STAGING.supabase.co
LOCAMAP_STAGING_VERIFICATION=verified-staging:REFERENCE_STAGING
LOCAMAP_STAGING_ALLOW_APP_TARGET=verified-staging:REFERENCE_STAGING
LOCAMAP_PRODUCTION_PROJECT_REFS=
```

Remplacer toutes les occurrences de `REFERENCE_STAGING` par la même référence réelle de 20 lettres. `ALLOW_APP_TARGET` est nécessaire seulement si le domaine est aussi celui de `EXPO_PUBLIC_SUPABASE_URL` dans `.env`. Ajouter les références de production connues, séparées par des virgules. Aucun fichier de production n’est modifié par ces outils.

Les scripts n’utilisent pas implicitement les variables du processus. Ils lisent uniquement le fichier local explicitement choisi et l’URL publique de `.env` pour le contrôle de cible. Le fichier doit être dans le dépôt, ignoré et non suivi par Git. `--config chemin/.env.nom.local` permet d’en choisir un autre. Les valeurs ne subissent aucune expansion shell ; utiliser des guillemets JSON pour les mots de passe contenant des caractères spéciaux et échapper les antislashs selon JSON.

Si le projet est en pause, le reprendre depuis son tableau de bord, attendre son état opérationnel puis confirmer à nouveau sa référence. Ne pas déduire qu’une session CLI existante peut administrer ce projet ; elle doit être connectée au compte et à l’organisation correspondants.

## 2. Examiner puis appliquer le backend

```powershell
node scripts/staging/cli.mjs plan --project-ref REFERENCE_STAGING
```

Cette commande affiche la liste des migrations du dépôt et les commandes exactes. Elle n’exécute même pas le `db push --dry-run` distant. Examiner [BACKEND-DEPLOYMENT.md](BACKEND-DEPLOYMENT.md), sauvegarder la base, contrôler une restauration et vérifier l’historique avant d’exécuter les commandes imprimées :

1. Confirmer le compte avec `supabase projects list`, puis lier explicitement la référence avec `supabase link --project-ref REFERENCE_STAGING`.
2. Examiner `supabase migration list --linked` et `supabase db push --linked --dry-run`. Une base existante créée manuellement nécessite une comparaison de schéma et un rapprochement d’historique. Ne jamais réappliquer `001_init.sql` sur des tables existantes ou déclarer une migration appliquée sans preuve.
3. Appliquer uniquement le plan examiné avec `supabase db push --linked`. Si la liaison a changé depuis la revue, recommencer à l’étape 1.
4. Copier `scripts/staging/r2.env.example` vers `scripts/staging/.env.r2.local` et saisir les secrets R2 de staging. La commande imprimée `supabase secrets set --project-ref ... --env-file ...` les transmet explicitement au projet choisi. Ne pas coller de secrets dans la commande, les journaux ou le chat. Supabase fournit ses propres variables serveur réservées.
5. Déployer les cinq fonctions imprimées avec leur `--project-ref` explicite. Garder la vérification JWT de la passerelle et la validation interne des bearers. Ne pas ajouter `--no-verify-jwt`. Si Docker n’est pas disponible et que la CLI installée propose `--use-api` dans `supabase functions deploy --help`, utiliser ce mode natif pour l’empaquetage ; il ne dispense pas de vérifier le JWT.

Le plan ne propose pas de suppression, de remise à zéro, de réparation automatique d’historique ou de contournement de la passerelle. Une incompatibilité de clés JWT sur le projet doit être comprise et testée avec les cinq fonctions avant publication.

## 3. Créer les trois comptes et une annonce de test

Dans le projet de staging confirmé, créer trois comptes Auth distincts avec email confirmé et mot de passe, réservés à cette recette. Utiliser un domaine maîtrisé et des adresses comme `locamap-smoke+host@votre-domaine.test`, `locamap-smoke+guest@votre-domaine.test` et `locamap-smoke+stranger@votre-domaine.test`. Aucune inscription ou invitation par email n’est envoyée par le runner. Relever leurs UUID ; ne jamais utiliser des comptes clients existants.

Choisir un identifiant de recette unique, par exemple `locamap-smoke-20260930-001`, et préparer administrativement **une nouvelle annonce de test** avec les valeurs suivantes : propriétaire = UUID du compte hôte ; titre = `[locamap-smoke-20260930-001] Staging only` ; statut = `ACTIVE` ; devise = `RWF` ; prix mensuel = `300000` ; dépôt = `0` ; durée minimale = `1` mois ; capacité = `2`. Fournir les autres champs obligatoires du schéma. Aucun voyageur, échange ou blocage calendrier ne doit déjà concerner cette annonce. Conserver les UUID de cette fixture dans le fichier local.

Cette préparation administrative permet de tester les RPC métier ; elle n’atteste pas le parcours de vérification KYC ou de modération. Tester séparément ce parcours avec des documents de test non sensibles, les vrais envois R2 et la revue administrative décrite dans le guide backend. Ne jamais attribuer un statut de confiance artificiel à un compte réel.

Compléter dans `.env.staging.local` :

- `LOCAMAP_STAGING_ANON_KEY` : clé publique `anon` JWT ou `sb_publishable_...` du projet ; jamais `service_role` ou `sb_secret_...`.
- `LOCAMAP_SMOKE_IDENTITIES=dedicated-test-accounts:REFERENCE_STAGING` après vérification des trois comptes dédiés.
- `LOCAMAP_SMOKE_RUN_ID` et `LOCAMAP_SMOKE_PROPERTY_ID` : identifiant de recette et UUID de l’annonce préparée.
- `LOCAMAP_SMOKE_START_DATE` et `LOCAMAP_SMOKE_END_DATE` : dates ISO futures, avec départ demain au plus tôt et au moins `min_duration_months × 30` jours. La date de fin est exclue. Choisir 30 jours libres pour la fixture proposée.
- Pour chacun des rôles `HOST`, `GUEST`, `STRANGER`, les champs `LOCAMAP_SMOKE_<ROLE>_ID`, `_EMAIL`, `_PASSWORD` du modèle.

Le runner n’a besoin d’aucune clé service. Il refuse des UUID ou emails identiques, vérifie après authentification l’UUID et l’email de chaque compte, puis contrôle l’annonce avant les écritures métier. Les noms de comptes dédiés et les marqueurs ne remplacent pas la vérification humaine de leur usage exclusif.

## 4. Exécuter et conserver la preuve hébergée

```powershell
# Vérification locale seulement : aucune authentification ni requête distante.
node scripts/staging/cli.mjs smoke --project-ref REFERENCE_STAGING

# Recette réelle ; écrit uniquement sur la fixture explicitement marquée.
node scripts/staging/cli.mjs smoke --project-ref REFERENCE_STAGING --run
```

La recette réelle vérifie l’authentification des trois comptes, leurs profils privés et la projection publique sans coordonnées ; crée une conversation hôte/voyageur idempotente ; envoie un message marqué ; vérifie le compteur et l’accusé de lecture ; refuse au tiers la lecture, l’adhésion et le marquage de cette conversation. Elle calcule ensuite un devis, crée deux demandes marquées aux mêmes dates, vérifie que le serveur déduit hôte et montant, refuse les approbations du tiers et du voyageur, puis envoie deux approbations simultanées de l’hôte. Une seule doit réussir et l’autre doit renvoyer le SQLSTATE de conflit de disponibilité `23P01`. L’état final est relu en base via l’API.

Le runner compte une protection RLS comme réussie uniquement sur une véritable interdiction authentifiée (`403` / `42501`), ou une lecture autorisée renvoyant zéro ligne quand attendu. Une route manquante, un serveur indisponible, une session expirée ou un JSON invalide font échouer le test. Les requêtes expirent au bout de 30 secondes, sans retry automatique des écritures, et les redirections sont refusées.

À la fin, même après un échec, il tente d’annuler uniquement les réservations dont **ce processus a reçu l’UUID à la création**. Avant chaque annulation il relit et compare propriétaire, voyageur, annonce et marqueur. Il vérifie ensuite la libération du calendrier. Il ne supprime pas de comptes, d’annonces, de conversations, de messages ou de lignes arbitraires. Les messages, notifications, conversations et réservations annulées restent identifiables pour la revue. Une nouvelle exécution nécessite une nouvelle annonce et un nouveau marqueur, afin de ne pas modifier un ancien échange.

Une interruption du processus ou une réponse de création perdue peut laisser une réservation de test en attente ou approuvée. Examiner le marqueur et les UUID imprimés, vérifier leur propriété, puis annuler manuellement ces seules réservations. Ne pas lancer de suppression globale ou par simple préfixe. Les sessions Auth sont gardées seulement en mémoire ; elles ne sont pas enregistrées sur disque ni révoquées globalement. Les comptes dédiés peuvent être révoqués/retirés administrativement après conservation des résultats nécessaires.

Un code de sortie `0` avec `PASS hosted smoke` est la preuve de cette recette à cet instant. Sans `--run`, `PREFLIGHT` et zéro vérification distante réussie indiquent seulement des entrées locales valides. Un code de sortie `1` exige une revue ; les réponses contenant des données personnelles et les erreurs brutes de transport ne sont jamais imprimées. Conserver la date, le commit, la référence, le marqueur et les lignes PASS/FAIL pour la revue de lancement.

## 5. Contrôles distincts avant publication

Cette recette n’atteste pas Realtime, les fonctions Edge, R2, le build mobile ou les politiques d’un projet différent. Sur ce staging, réaliser également :

- Envoi réel d’un JPEG/PNG/WebP via `get-upload-url` → PUT → `finalize-upload`, sur web puis Android/iOS ; refus d’une origine non autorisée, d’une taille ou signature invalide, et d’une clé appartenant à un autre compte. Vérifier que le justificatif KYC ne possède aucune URL publique.
- Realtime avec les trois comptes : abonnements hôte et voyageur recevant uniquement leurs données et tiers ne recevant pas leurs messages. Vérifier la publication distante et les réglages de réplication.
- Export du compte dédié sans données privées étrangères. Suppression d’un autre compte **dédié à cette vérification**, après annulation des demandes, puis invalidation des sessions. Ne pas supprimer les trois comptes de recette avant la revue des résultats.
- Buckets public et privé distincts ; aucun domaine public pour KYC ; CORS conforme aux origines réelles ; règle `pending/` après un jour dans chaque bucket ; appel serveur de `storage-cleanup` toutes les dix minutes et surveillance des erreurs/de l’âge de la file. Tester une panne R2 et la reprise de finalisation/purge.
- Concurrence d’un blocage calendrier et d’une approbation, et concurrence envoi/lecture de messages. Le runner couvre uniquement la double approbation concurrente.
- Parcours de réservation sans paiement : prix et dépôt affichés séparément, aucune promesse d’encaissement, statut cohérent après approbation et annulation. Aucun fournisseur de paiement n’est requis ni testé par cette recette.

## Vérification locale de l’outillage

```powershell
npx vitest run tests/staging-tooling.test.ts
npx eslint scripts/staging tests/staging-tooling.test.ts
node scripts/staging/cli.mjs --help
```

Les tests couvrent les refus de cible, les entrées et identités dédiées, l’absence de réseau par défaut, la protection des secrets et un transport HTTP simulé. Ils ne réalisent aucun appel au projet Supabase hébergé.
