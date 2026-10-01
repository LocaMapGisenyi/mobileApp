# API privée d’administration LocaMap

Implémentation : migration additive `006_admin.sql`, Edge Function `admin-api`, helpers `_shared/admin.ts`. Aucun compte réel n’est promu par la migration. Les réservations restent sans encaissement : aucun endpoint financier ou de modification administrative de réservation n’est exposé.

## Authentification et transport

`POST /functions/v1/admin-api`, JSON, `Authorization: Bearer <access token Supabase>` et clé publique `apikey` habituelle. L’API vérifie le bearer auprès de GoTrue (`getUser`) puis lit le niveau AAL dans **ce même bearer vérifié**, en liant son `sub` à l’utilisateur et en vérifiant son expiration. Aucune permission ne provient de `user_metadata`.

`ADMIN_ALLOWED_ORIGINS` contient les origines exactes autorisées, séparées par des virgules, y compris le port du site local. Une origine navigateur absente de cette liste reçoit 403, y compris en préflight. Les clients serveur sans en-tête Origin restent soumis au bearer et à la MFA. Cette variable est propre à l’admin ; `ALLOWED_ORIGINS` continue de concerner les autres fonctions.

La réponse est toujours `Cache-Control: no-store`, avec `Referrer-Policy: no-referrer`. Ne pas conserver les URL KYC signées dans le stockage du navigateur ni les journaux. La requête est limitée à 16 384 octets ; contenu éditorial total à 14 000 octets et texte individuel à 12 000 caractères.

Secrets serveur requis : variables Supabase déjà utilisées (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) et variables R2 existantes. Le compartiment privé doit être distinct de `R2_BUCKET_NAME`. Aucune de ces clés serveur n’est transmise au site.

## Requêtes et réponses

```ts
type Request = {
  action: 'session'|'overview'|'list'|'detail'|'document'|'mutate';
  resource?: Resource;
  id?: string;                 // UUID ; voir identifiants ci-dessous
  search?: string;             // 120 caractères maximum, recherche littérale
  status?: string;             // état du type de ressource
  page?: number;               // entier 1..10000, 1 par défaut
  payload?: Record<string, unknown>;
  expectedVersion?: string;    // jeton opaque renvoyé dans record.version
  requestId?: string;          // UUID stable pour la même tentative
};
```

- `session` retourne `{user:{id,email},role,mfaRequired}`. C’est la seule action autorisée en AAL1 et elle nécessite déjà un membre actif. Le navigateur doit terminer TOTP puis utiliser le nouveau bearer AAL2.
- `overview` retourne `{counts,recent}`. Les compteurs absents sont hors permission, pas des zéros. `recent` contient au maximum 10 dossiers à traiter : `{resource,id,title,status,created_at}` ; les plus anciens passent en premier.
- `list` retourne `{rows,total,page,pageSize:25}`. Aucune liste ne renvoie plus de 25 lignes. Les gros textes et les clés KYC sont exclus des listes. Les UUID des lignes servent aux détails.
- `detail` retourne `{record,related}`. `record.version` est un jeton opaque calculé sur l’état courant, y compris les brouillons ou les photos lorsqu’ils changent la décision. **Ne pas le générer à partir d’une date côté client.**
- `document` reçoit `id` = UUID de l’hôte et `payload:{key}`. Retourne `{url,expiresIn:60}`. Le SQL vérifie dossier exact, appartenance de la clé et objet KYC finalisé, puis écrit le journal avant la signature. L’URL pointe vers l’objet final du compartiment privé, expire après 60 secondes et demande `no-store`.
- `mutate` retourne `{ok:true,id,version}`. Recharger le détail après le succès. Une mutation existante requiert `expectedVersion`; la création sans `id` n’en a pas besoin. `requestId` est obligatoire.

Les clés racine inconnues sont refusées. Les états sont vérifiés côté SQL. Les erreurs renvoient seulement `{error:string}` : 400 données/prérequis invalides, 401 bearer absent/invalide/expiré, 403 MFA/permission/membre/compte suspendu, 404 dossier absent, 409 état/concurrence/idempotence/conservation du dernier propriétaire, 413 taille, 429 quota, 503 service indisponible. Les erreurs SQL, secrets et URL privées ne sont jamais copiés dans la réponse.

## Rôles

- `owner` : toutes les ressources ; seul rôle autorisé à suspendre les utilisateurs, attribuer les accès, changer les limites et consulter l’exploitation/journal.
- `moderator` : hôtes, annonces et signalements ; utilisateurs et réservations en lecture.
- `support` : tickets et signalements ; utilisateurs, réservations et annonces en lecture.
- `editor` : les sept ressources éditoriales ci-dessous.

Les quatre rôles disposent de `session` et d’un accueil filtré. Une révocation ou suspension est revérifiée par chaque RPC serveur, y compris avant le retour d’un résultat d’idempotence.

Compteurs de l’accueil : `hosts_pending` et `properties_pending` (owner/moderator), `tickets_open` (owner/support), `reports_open` (owner/moderator/support), `users`, `properties_active`, `bookings_active` (owner), `content_drafts` (editor).

## Ressources opérationnelles

### Utilisateurs (`users`)

Identifiant = profil UUID. Champs : `id,full_name,email,phone_number,avatar_url,is_host,kyc_status,created_at,updated_at,status,restriction_note,restriction_updated_at,version`. État du compte `ACTIVE|SUSPENDED`.

Filtres : ces deux états, les états KYC `NOT_VERIFIED|PENDING|VERIFIED|REJECTED`, ou `HOST|TENANT`.

`related.properties`, `related.bookings` (25 dernières lignes), `related.active_bookings` (compteur exact), `related.tickets` pour owner/support. Les coordonnées privées restent dans les rôles qui en ont besoin.

Mutations : `{operation:'suspend'|'reactivate',note}`. La suspension bloque les écritures des anciens JWT, les lectures privées sous RLS et les RPC mobiles SECURITY DEFINER. Les fonctions Edge existantes sont bloquées via leur contrôle `consume_limit` portant l’UUID vérifié. Les réservations existantes sont conservées. La suspension du dernier propriétaire actif est refusée.

### Hôtes (`hosts`)

**Identifiant = `host_applications.user_id`**, pas un identifiant de dossier distinct. Champs du dossier : `legal_name,document_keys,status,submitted_at,reviewed_at,review_note` + coordonnées utiles ; `payout_details` n’est pas exposé.

`related.profile` présente l’identité de profil, `related.documents` les clés du dossier. `document_keys` est aussi conservé dans `record` pour l’interface. États `PENDING|APPROVED|REJECTED`.

Mutations : `{operation:'approve'|'reject',note}` sur un dossier `PENDING` seulement. Le remplacement d’un document ou la nouvelle soumission invalide le jeton de l’ancien onglet. L’approbation appelle `review_host_application` après verrouillage et vérification des objets.

### Annonces (`properties`)

Champs de `properties`, avec `owner_name,image_url,moderation_note,version`. `image_revision` fait participer les changements d’images au contrôle de version. `related.images` renvoie jusqu’à 50 photos ; `related.owner` le profil utile à la revue ; `related.active_bookings` est exact.

Mutations, toutes avec note : `publish` de `PENDING_REVIEW` vers `ACTIVE`, `return` de `PENDING_REVIEW` vers `DRAFT`, `suspend` depuis `ACTIVE|PAUSED|PENDING_REVIEW`, `review` de `SUSPENDED` vers `PENDING_REVIEW`. La publication revérifie l’hôte actif/validé, prix positif, titre, description, adresse, coordonnées et photo. Une annonce suspendue repasse obligatoirement par la revue. Les clients mobiles ne peuvent pas forger `moderation_note`.

### Réservations (`bookings`)

Lecture seule. Champs de réservation + `property_title,guest_name,host_name,deposit,payment_collected:false,version`. `deposit` provient du logement ; il n’atteste aucun dépôt encaissé. `related.tickets` donne au maximum 25 tickets associés. La recherche accepte la référence UUID, les UUID des participants/logement, leurs noms et les dates sous forme ISO. États mobiles inchangés : `pending|approved|rejected|cancelled|completed`.

### Support (`tickets`)

Champs du ticket + `assigned_to,user_name,user_email,version`. `related.messages` fournit les 100 derniers messages en ordre chronologique. `related.assignees` donne jusqu’à 100 opérateurs actifs non suspendus, rôles owner/support, sous forme `{id,full_name,role}`. Cette liste ne donne pas accès à la ressource globale `members`.

- Réponse : `{operation:'reply',content}`. 1..10 000 caractères, ticket non fermé. `sender_id`, `sender_name` et `is_support:true` sont fixés par le serveur. Aucun `note` supplémentaire n’est requis. Le trigger existant conserve l’état `WAITING_HOST`, le compteur et la notification dans l’application. Le replay identique ne crée pas de deuxième réponse.
- Mise à jour : `{operation:'update',note,status?,priority?,assigned_to?}`. `assigned_to:null` désattribue ; sinon UUID d’un opérateur éligible. États `OPEN|IN_PROGRESS|WAITING_HOST|RESOLVED|CLOSED`, priorités `LOW|NORMAL|HIGH|URGENT`. Réouverture en `OPEN|IN_PROGRESS` efface `resolved_at`. Le filtre de liste `UNRESOLVED` regroupe tous les états sauf `RESOLVED|CLOSED` et correspond au compteur d’accueil.

### Signalements (`reports`)

**Identifiant = conversation UUID.** Seules les conversations signalées/gelées ou disposant d’un historique de signalement sont accessibles. Une conversation ordinaire ne peut pas être consultée via cette ressource.

Champs : `id,property_id,booking_id,status,category,reporter_id,reported_at,resolved_at,resolution_note,created_at,updated_at,version`. États administratifs `REPORTED|FROZEN|RESOLVED` ; une résolution remet la conversation mobile en `ACTIVE` mais conserve `RESOLVED` dans la projection administrative. Une catégorie nulle indique un ancien signalement sans catégorie enregistrée.

`related.messages` contient au maximum 100 messages, `related.reports` les 25 derniers signalements avec auteur/catégorie/description/résolution. À la résolution, leurs UUID sont capturés sous le verrou de la conversation : les consultations ultérieures n’exposent que ce contexte historique, jamais les messages ordinaires suivants, même si leur transaction avait commencé plus tôt. Un nouveau signalement autorise à nouveau le contexte ouvert. Les dates d’activité ultérieures de la conversation ne sont pas exposées dans un rapport résolu. Chaque consultation ajoute `view_context` au journal sans recopier les messages. Le filtre `UNRESOLVED` regroupe `REPORTED|FROZEN` et correspond au compteur d’accueil.

Mutations `{operation:'freeze'|'resolve',note}` sur les signalements ouverts. Un verrou partagé par l’envoi de messages et le gel empêche un message de contourner un gel concurrent. Les anciens appels `set_conversation_status(...,'REPORTED')` restent acceptés ; la méthode mobile ciblée emploie désormais `report_conversation(id,category,description)` pour persister le motif.

## Contenus

Ressources : `faq_items,guides,guide_categories,articles,courses,course_steps,legal_documents`.

Chaque fiche expose `publication_status:'DRAFT'|'CHANGES_PENDING'|'PUBLISHED'`, `version`, `related.draft` (`{fields,updated_at,actor_id}` ou null), `related.history` (25 versions publiées précédentes). Le brouillon ne touche pas la table publique. Pour un nouveau brouillon, le serveur génère l’UUID et le renvoie ; utiliser ensuite cet UUID et la version de détail.

Mutations : `{operation:'save_draft',fields}` ou `{operation:'publish',note,fields}`. Une publication explicite valide les types SQL, références, champs obligatoires et contraintes ; un brouillon peut rester incomplet. Les valeurs fournies sont fusionnées avec le brouillon et les champs publics éditables existants, puis limitées à la liste suivante :

- `faq_items` : `question,answer,category`.
- `guides` : `category_id,title,summary,image,content,is_new`.
- `guide_categories` : `title,icon,description`.
- `articles` : `slug,title,summary,content,category,level,lang,read_minutes,has_video,video_url,thumbnail_url`. Langues `fr|en|rw|sw` ; le serveur fixe `published_at` lors de la publication.
- `courses` : `title,description,level,cover_url,certificate_badge`.
- `course_steps` : `course_id,title,type,duration_minutes,position`. Types `article|video|quiz`.
- `legal_documents` : `slug,title,legal_version,summary,content,required,category`. Le serveur mappe `legal_version` vers la colonne publique `version` ; `record.version` reste le jeton opaque de concurrence. `related.draft.fields.legal_version` suit la même convention. Catégories `cgu|privacy|cancellation|discrimination|rules`.

Niveaux de formation/article : `beginner|intermediate|advanced`. URL d’image/vidéo/couverture : HTTPS. Les UUID optionnels vides doivent être `null` ou omis. Les nombres sont des entiers JSON 0..10 000, les booléens de vrais booléens JSON. `null` convient aux champs optionnels SQL, mais pas aux champs requis pour une publication.

Une publication juridique exige aussi, au niveau de `payload`, `legal_identity_confirmed:true`, `legal_operator_name` non vide et `legal_operator_address` définitive. Les projets restent des brouillons jusqu’à cette confirmation. Publier une révision impose une nouvelle `legal_version`, conserve `previous_versions` et ajoute l’ancien texte à `admin_content_history`. Les entrées historiques ajoutées conservent les champs précédents et exposent aussi `updatedAt`, conformément au lecteur juridique mobile.

## Exploitation et accès

- `errors` : lecture owner seulement, métadonnées réelles `kind,code,route,platform,app_version,created_at,user_id`. Aucun stacktrace, secret ou contenu utilisateur.
- `limits` : `id,name,max_units,window_seconds,version`. Mutation `{operation:'update',note,max_units,window_seconds}`. Entiers, `max_units` 1..1 000 000 ou 107 374 182 400 pour les budgets en octets ; fenêtre 60..86 400 secondes. Aucun compteur n’est remis à zéro par le site.
- `cleanup` : lecture owner, `id,entity,queued_at,created_at,deleted_at,status,version`. États `PENDING|DONE`. La clé privée R2 est omise. Le schéma actuel ne stocke ni nombre de tentatives ni dernier message d’échec : ne pas fabriquer ces champs.
- `audit` : lecture owner, `id,actor_id,resource,record_id,action,note,request_id,changes,created_at,version`. Historique immuable via l’API. Notes et changements d’état/valeurs utiles sont conservés, jamais copies de messages, KYC, URL signées ou texte complet des contenus.
- `members` : lecture/écriture owner, `id=user_id,email,full_name,role,active,status,created_at,updated_at,version`. Création : pas de `id`, `{operation:'grant',user_id:<UUID existant>,role,note}`. Modification : `id` + version, `{operation:'grant',role,note}` ; révocation : `{operation:'revoke',note}`. Un UUID inexistant est refusé. Une adresse saisie seule n’attribue aucun rôle. Le dernier owner actif ne peut être révoqué, rétrogradé ou suspendu.

## Transactions, limites et recette

Les RPC `admin_query`, `admin_mutate`, `admin_document` et leurs helpers sont uniquement exécutables par `service_role`, pas même directement par le JWT d’un owner. Ils revérifient le membre transmis par Edge. Les nouvelles tables ont RLS et aucun accès anon/authenticated.

Le bootstrap initial emploie exclusivement le RPC serveur `admin_bootstrap_owner(p_user_id uuid)`. Il verrouille le même invariant d’accès, vérifie l’existence du compte Auth, son email confirmé, son profil concordant et l’absence de suspension/bannissement/suppression. Il refuse d’ajouter un autre propriétaire lorsqu’un owner actif existe ; rappeler le même owner actif est idempotent. L’insertion du membre et l’événement `bootstrap_owner` sont atomiques, avec retour `{ok:true,id,existing:boolean}`. Ce RPC n’est pas une action du site et n’attribue jamais automatiquement un rôle au premier inscrit.

Chaque décision verrouille sa cible et vérifie `expectedVersion`. Toute modification d’image verrouille aussi ses logements parents, même s’ils sont encore en attente de revue ; une modification terminant après une publication replace le logement en revue. Un verrou transactionnel commun aux mutations protège les invariants de membership. La modification, le journal et `admin_requests` sont dans la même transaction. Le replay du même acteur/UUID/payload/version retourne le résultat d’origine ; la réutilisation pour une autre intention reçoit 409. Si le journal échoue, les données et la clé d’idempotence sont annulées. Les consultations KYC/contexte sont journalisées séparément avant restitution.

Quotas initiaux supplémentaires : `admin_user_minute=120`, `admin_global_minute=1200`, `admin_documents_user_minute=10`, tous sur 60 secondes ; ils s’ajoutent aux limites Edge existantes. L’API ne relance pas les mutations. Après une réponse réseau perdue, relire le dossier et réutiliser uniquement la même intention/requestId si le client a encore cette tentative.

Commandes locales :

```sh
node supabase/tests/admin-security.mjs
npm run test:security
npx deno test --config supabase/functions/deno.json --allow-env supabase/functions/_shared/
npx deno check --config supabase/functions/deno.json supabase/functions/admin-api/index.ts
```

PGlite exécute le véritable SQL, privilèges, RLS et triggers, mais n’exerce pas plusieurs connexions simultanées, GoTrue, le déploiement Supabase, Realtime ou les transferts R2. Les tests Edge isolent l’authentification/RPC et testent la vraie signature locale R2 ; ils ne prouvent pas l’existence d’un objet distant. Les limites liées à la rétention du journal et des brouillons doivent être décidées par l’exploitant ; cette migration n’effectue pas de purge silencieuse de ces historiques.
