# Déploiement du backend LocaMap

Ce dépôt fournit les migrations et fonctions du backend. Le staging `uwoesteqkprwitnhfmes` a été mis à jour le 30 septembre 2026 : voir la [preuve de déploiement](STAGING-DEPLOYMENT-2026-09-30.md) et la [recette hébergée](RECETTE-2026-09-30.md). Une nouvelle cible doit suivre les étapes ci-dessous ; la disponibilité locale des tests ne suffit pas à la valider.

## Avant le déploiement

1. Sauvegarder PostgreSQL et vérifier une restauration sur un projet de staging. Comparer les tables, colonnes, politiques et privilèges déjà déployés avec `001_init.sql`.
2. Sur une base neuve, appliquer `001_init.sql`, puis `002_security_and_server_flows.sql`, `003_account_operations.sql`, `004_support_consent_referral_cohosts.sql` et `005_production_guards.sql` dans cet ordre. Sur une base existante utilisant déjà 001, appliquer seulement les suivantes. Ne jamais réappliquer 001 sur les tables existantes.
3. Utiliser le propriétaire des migrations Supabase, capable de créer des fonctions `SECURITY DEFINER` et d’accéder à `auth.users`. Les fonctions ont un `search_path` fixe et les opérations administratives sont réservées à `service_role`.
4. Déployer simultanément les nouveaux clients : les anciennes écritures directes de participants, réservations, consentements et crédits sont volontairement refusées.

Installer ou utiliser la CLI Supabase, puis authentifier l’opérateur et lier explicitement le projet de staging : `supabase login`, `supabase link --project-ref IDENTIFIANT_STAGING`. Examiner `supabase db push --dry-run` avant `supabase db push`. Si le schéma a été créé manuellement, rapprocher d’abord l’historique des migrations avec la CLI ; ne pas déclarer 001 appliquée sans comparer son schéma. Les exemples suivants supposent cette liaison explicite. Refaire la même revue, sauvegarde et liaison avec l’identifiant de production seulement après validation du staging.

Les migrations ne suppriment ni ne corrigent arbitrairement les données antérieures. Les contraintes `NOT VALID` protègent les nouvelles écritures sans bloquer automatiquement des données historiques invalides. Examiner puis corriger les lignes existantes avant de lancer `VALIDATE CONSTRAINT` pour `valid_property_values`, `booking_valid_values`, `valid_calendar_prices`, `message_content_length`, `support_content_length` et `support_ticket_content` sur leurs tables respectives.

Rechercher aussi les réservations approuvées qui se chevauchent, les avis déjà marqués vérifiés, les statuts KYC/hôte historiques, les participations inhabituelles aux conversations et les doublons de photos. Ne pas considérer les anciens statuts de confiance comme réévalués par ces migrations.

## Secrets et fonctions Edge

Variables serveur à configurer avec le mécanisme de secrets Supabase, jamais avec le préfixe public Expo :

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` : fournis par l’environnement Supabase. La clé service reste exclusivement côté serveur.
- `R2_ACCOUNT_ID` : identifiant Cloudflare de 32 caractères hexadécimaux.
- `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` : jeton limité aux deux buckets nécessaires, avec lecture/écriture/copie/suppression d’objets.
- `R2_BUCKET_NAME` : photos publiques.
- `R2_PRIVATE_BUCKET_NAME` : justificatifs KYC ; doit être différent du bucket public. Désactiver l’accès public et les domaines publics pour ce bucket.
- `R2_PUBLIC_URL` : domaine HTTPS de diffusion du bucket public. Aucun repli vers l’API S3 privée n’est effectué.
- `ALLOWED_ORIGINS` : origines web complètes séparées par des virgules, par exemple l’origine du staging et celle de la production. Les clients mobiles sans en-tête Origin sont acceptés ; une origine web absente de cette liste est refusée.
- `STORAGE_CLEANUP_SECRET` : jeton aléatoire serveur d’au moins 32 caractères, distinct des clés Supabase/R2. Le conserver dans les secrets Edge et dans le coffre du scheduler.

Déployer les cinq fonctions :

```text
supabase functions deploy get-upload-url
supabase functions deploy finalize-upload
supabase functions deploy account-export
supabase functions deploy account-delete
supabase functions deploy storage-cleanup
supabase functions deploy health
supabase functions deploy report-client-error
```

Conserver la vérification JWT de la passerelle Supabase. Les quatre opérations utilisateur vérifient également le bearer avec `auth.getUser()` ; aucune identité passée dans le corps n’est utilisée. `storage-cleanup` exige le jeton dédié dans `X-Cleanup-Token`, comparé à temps constant. Le scheduler envoie la clé publique `anon` comme bearer pour la passerelle, puis le jeton dédié pour autoriser le nettoyage. La clé service utilisée par la fonction reste dans son environnement serveur et ne passe pas dans la file du scheduler.

Configurer la CORS R2 pour les origines web réelles, méthodes PUT/GET/HEAD et `Content-Type`, en laissant le navigateur produire `Content-Length` à partir du Blob. Vérifier sur Android/iOS que le corps est envoyé avec la taille signée. Le serveur signe MIME et longueur, et impose 10 Mio maximum, 40 demandes par compte et par heure, avec sérialisation SQL du quota.

Le flux est : `get-upload-url` → PUT avec les en-têtes retournés → `finalize-upload` → conserver la clé/URL finale retournée. La signature autorise seulement `pending/<clé>`. La finalisation contrôle taille, MIME et signature binaire JPEG/PNG/WebP, copie sous la clé finale avec contrôle ETag, puis marque le registre vérifié. Les sessions de finalisation concurrentes sont verrouillées dans le registre. Ce contrôle de signature binaire n’est pas un antivirus ou un décodage intégral de l’image.

Les KYC ne renvoient jamais d’URL publique. La soumission refuse les clés non vérifiées, appartenant à un autre compte ou provenant d’un autre type de fichier. Pour examiner un justificatif, un administrateur autorisé utilise le bucket privé avec une URL de lecture temporaire ; ne pas placer cette URL dans `public_profiles`, les annonces ou les journaux.

Créer une règle de cycle de vie dans chaque bucket supprimant le préfixe `pending/` après un jour. Configurer un ordonnanceur serveur pour appeler `storage-cleanup` toutes les 10 minutes avec le bearer public et `X-Cleanup-Token`, lus depuis Vault. Vérifier les droits réels du scheduler et de sa file : les limites constatées de `pg_net` sont consignées dans la preuve de déploiement. Le worker traite 100 suppressions de comptes et 100 envois abandonnés par exécution. Augmenter la fréquence si la file croît ; alerter sur ses erreurs HTTP et sur l’âge de la plus ancienne ligne sans `deleted_at`.

## Administration et règles métier

`profiles` est privé au compte. Lire `public_profiles` pour les noms, avatars, bio et statut public de vérification ; cette vue n’expose ni email ni téléphone. Les jointures historiques vers `profiles` d’un autre compte sont filtrées.

Les justificatifs sont soumis avec `submit_host_application`. L’administrateur habilité examine les documents d'identité nécessaires, puis appelle depuis le serveur :

```sql
SELECT public.review_host_application('UUID_DU_COMPTE', true, 'Identité examinée');
```

Le paramètre `false` rejette une demande. Le parcours de lancement ne collecte pas de coordonnées de versement ; ne pas cocher `is_verified` sans vérification réelle par l’équipe.

Une annonce est enregistrée DRAFT, ses images sont associées, puis l’hôte approuvé la soumet PENDING_REVIEW. La soumission exige titre, description, adresse, coordonnées et photo. Après modération réelle, l’administrateur peut exécuter :

```sql
UPDATE public.properties SET status='ACTIVE'
WHERE id='UUID_ANNONCE' AND status='PENDING_REVIEW';
```

La mise à jour du contenu ou des photos d’une annonce active la remet en révision. Les clients ne peuvent pas se donner ACTIVE ni supprimer une suspension. Un brouillon peut avoir un prix nul ; une annonce soumise/publiée doit avoir un prix positif en RWF.

La référence est un loyer mensuel. La durée minimale est `min_duration_months × 30` jours. La date de départ est exclue. `quote_booking` calcule la somme journalière de `price_override` ou `price_per_month/30`, arrondie au RWF, et expose séparément le dépôt. `create_booking` recalcule sous verrou, déduit hôte/devise/total et refuse un `p_expected_total` différent. Le dépôt n’est pas ajouté au loyer et aucun montant n’est encaissé.

L’acceptation verrouille le logement, revérifie les dates et marque le calendrier atomiquement. L’annulation libère uniquement les jours de cette réservation. L’hôte ne peut terminer un séjour avant sa date de fin. Un avis vérifié exige un séjour terminé du même auteur dans ce logement. Le serveur empêche plusieurs avis du même séjour.

Les invitations co-hôtes concernent des comptes déjà inscrits et des logements du propriétaire. Le destinataire accepte ou refuse ; une modification de permissions suspend l’accès jusqu’à son nouvel accord. Seuls calendrier et réponses aux avis sont proposés ; calendrier ne donne pas le droit de changer les prix. Messagerie, réservations, tarifs, revenus et contacts invités sont refusés comme permissions déléguées. La rémunération enregistrée exprime des conditions proposées entre les parties, sans versement automatique. L’annuaire de disponibilité n’est pas proposé faute d’un service de disponibilité volontaire.

Les consentements passent par `record_consent` avec la version actuelle du document et deviennent immuables au client. L’utilisateur peut noter uniquement une réponse réellement envoyée par le support sur son propre ticket. Les agents de support répondent via un outil serveur avec `is_support=true` ; aucun back-office graphique n’est fourni ici.

Les codes de parrainage sont aléatoires et émis par le serveur. Un compte peut enregistrer un code autre que le sien avant son premier séjour terminé. Aucun crédit n’est automatique. Après vérification des conditions, le service administratif peut appeler `award_referral_credit(entry_id, montant, motif)` ; il exige un séjour terminé postérieur à l’enregistrement, est idempotent et limite l’attribution à 20 filleuls par an et 100 000 RWF par crédit. Définir une politique commerciale réelle avant d’attribuer des montants. Il n’existe pas de débit de ces crédits vers un paiement.

## Export, suppression et conservation

`account-export` produit les données privées du compte authentifié, les conversations auxquelles il participe, ses opérations et préférences. Aucun autre profil privé n’est joint. La sortie contient des données personnelles : pas de journaux du corps ni de mise en cache publique.

`account-delete` requiert `{ "confirmation": "DELETE" }`. L’opération refuse les réservations en attente/approuvées. Une fonction service supprime en transaction les données liées, le profil et la ligne Auth ; une file durable conserve uniquement les clés nécessaires pour purger R2. La première purge est immédiate ; le worker répète la purge après expiration des URL PUT encore valides. `cleanupPending=true` signale cette purge résiduelle. Une erreur R2 n’annule pas une suppression Auth déjà réussie.

Vérifier en staging les cascades de la version Supabase Auth réellement utilisée et l’invalidation des sessions après suppression. Définir aussi la durée de conservation des sauvegardes et la procédure pour les anciennes photos jamais inscrites dans `upload_objects`. Ces fichiers historiques nécessitent une reprise du registre ou une purge administrative ; ils ne sont pas identifiables automatiquement à partir d’une URL externe arbitraire.

## Vérifications

```text
node supabase/tests/run-security.mjs --baseline
node supabase/tests/run-security.mjs
npx deno task --config supabase/functions/deno.json check
npx deno task --config supabase/functions/deno.json test
```

La commande baseline doit échouer sur la lecture de l’email d’un autre compte. Le runner normal crée une base PostgreSQL PGlite éphémère avec deux hôtes, deux locataires et un rôle anonyme. Il exécute les migrations réelles ; seules les extensions indisponibles sont retirées, `uuid_generate_v4` est remplacé par `gen_random_uuid`, et les helpers Auth sont simulés. Il vérifie réellement les privilèges, RLS, transactions, triggers et RPC. Il n’exerce pas GoTrue, PostgREST, la diffusion Realtime hébergée ou les connexions PostgreSQL simultanées.

En staging, tester deux connexions simultanées acceptant des demandes qui se chevauchent : une seule doit réussir, l’autre doit recevoir une erreur de disponibilité. Tester également un blocage calendrier concurrent, envoi/lecture concurrents, une reprise de finalisation R2 interrompue et la suppression avec R2 momentanément indisponible. Préparer les données de test dans un projet jetable.

La publication `supabase_realtime` reçoit messages, conversations, participants et notifications si elle existe. Vérifier sa présence effective et le filtrage entre comptes avec la configuration distante. Les notifications ici sont enregistrées en base et diffusées en temps réel dans l’application. Les push appareil, emails/SMS automatiques et traitements périodiques des recherches enregistrées nécessitent encore des prestataires et jobs explicites ; ils ne sont pas attestés par les tests locaux.
