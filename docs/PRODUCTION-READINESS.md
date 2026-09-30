# LocaMap — audit des 20 protections de production

État vérifié le **30 septembre 2026**. Expo / React Native / web, Supabase Auth + PostgreSQL + Edge Functions, R2 privé/public, cartes Apple/Google/TomTom. Premier lancement **sans encaissement**. La migration 005 et les sept fonctions Edge sont déployées sur le staging autorisé `uwoesteqkprwitnhfmes`.

**L’ouverture en production reste conditionnée aux budgets fournisseurs, aux alertes réellement reçues et à une restauration distante éprouvée.** Les listes secondaires, les permissions natives et la capacité sous charge soutenue demandent aussi des validations. Un export JavaScript ne constitue pas un binaire mobile signé.

## Audit final, par gravité

✅ protection présente dans le périmètre décrit ; ⚠️ partiel ou configuration distante non vérifiée ; ➖ non applicable. Chaque réserve fait partie du résultat.

| # | Protection | État | Preuve et réserve restante |
|---|---|---|---|
| 10 | Double paiement | ➖ | Aucun encaissement ni webhook de paiement : décision de lancement. Déduplication des réservations ajoutée séparément. |
| 3 | Plafonds financiers | ⚠️ | Les quotas techniques réduisent certains usages ; aucun plafond monétaire Supabase/R2/Maps n’a été attesté. Réglages opérateur ci-dessous. |
| 2 | Quotas API | ⚠️ | Compteurs atomiques par compte et globaux dans `005_production_guards.sql`, dont volume R2 cumulé. Régler les quotas cartographiques chez les fournisseurs : les SDK sont appelés directement. |
| 1 | Débit | ⚠️ | Messages, réservations, annonces, dossiers hôte, support, uploads et fonctions authentifiées limités côté serveur avec réponse 429. Limiter aussi Auth, lectures publiques et trafic par IP chez les fournisseurs. Les tentatives refusées ne comptent pas toujours comme écritures. |
| 11 | Données exposées | ⚠️ | Projections publiques d’annonces/réservations réduites ; RLS et profils privés vérifiés entre trois comptes. Certains services privés utilisent encore `select('*')`, sous contrôle RLS. |
| 20 | Sauvegardes restaurables | ⚠️ | Snapshot PGlite restauré dans une instance distincte, effectifs et RLS conservés. Dump Supabase distant impossible faute de moteur Docker disponible. Aucune restauration hébergée PostgreSQL/Auth/R2 attestée. |
| 15 | Taille/type des fichiers | ✅ | Contrôles client/serveur : 10 Mio, types, signature binaire, taille réelle, clé propriétaire, KYC privé ; plafond cumulé ajouté. Une signature de fichier n’est pas un antivirus. |
| 9 | Double soumission | ✅ | Gardes synchrones sur connexion, inscription, demande/gestion de réservation, dossier hôte et profil. `create_booking` retourne la même réservation pour une demande identique encore en attente. Test concurrent hébergé réussi. |
| 18 | Suivi des erreurs | ⚠️ | `diagnostics.ts`, `report-client-error`, table RLS privée, quotas, rétention. Rendu, démarrage, erreurs globales et échecs réseau définitifs couverts. Sessions anonymes et certains rejets métier interceptés localement non collectés ; pas d’alerte automatique sur ces événements. |
| 17 | Alerte de disponibilité | ⚠️ | Fonction `health` déployée, sonde HTTP 200 vérifiée. Script/workflow fournis ; planification non activée et notification externe non configurée. La sonde teste la base, pas R2 ni les cartes. |
| 4 | Écran de reprise | ✅ | `AppErrorBoundary.tsx` entoure l’application : texte humain traduit et bouton Réessayer. Les erreurs asynchrones restent traitées par les écrans et le collecteur global. |
| 8 | Délais d’attente | ⚠️ | API : 15 s par lecture, 30 s par écriture, corps inclus ; PUT : 60 s ; appels Edge/R2 : 20 s. Les SDK cartographiques et Realtime conservent leur gestion propre. |
| 7 | Réessais réseau | ✅ | `network.ts` : GET/HEAD seulement, trois tentatives maximum, backoff + jitter, annulation respectée. Aucune répétition automatique des mutations. Retry-After long retourné à l’appelant. |
| 12 | Index | ⚠️ | Huit index ajoutés pour messages, réservations, notifications, annonces, uploads et diagnostics. Mesurer leur efficacité avec EXPLAIN sur un volume représentatif. |
| 13 | Pagination | ⚠️ | Réservations par 30 avec « Charger plus » ; annonces/messages déjà paginés. Conversations, certaines listes hôte/favoris et statistiques restent à paginer ou agréger en SQL pour de gros volumes. |
| 16 | Cache | ✅ | Quartiers : TTL 5 min, taille bornée, invalidation au changement de compte et à la modification d’annonce. Cache immutable existant des images R2 conservé. |
| 14 | Compression | ⚠️ | JPEG centralisé avant upload, proportions conservées, sans agrandissement. Test navigateur : PNG 3000 × 2000 devenu JPEG 1920 × 1280. KYC : 2560 px, qualité supérieure. Gzip/Brotli de l’hébergement final non vérifié. |
| 5 | Chargements | ✅ | Indicateurs sur les parcours principaux, boutons désactivés pendant envoi, chargement initial/pagination séparés. Envoi réel du profil vérifié avec un seul indicateur dans le bouton. |
| 6 | États vides/erreurs | ⚠️ | États vides/erreurs conservés, `ResilientImage` ajouté aux cartes d’annonce, carrousel et avatars des paramètres. Images restantes et très longs contenus à tester exhaustivement ; pas de navigation hors ligne complète. |
| 19 | Charge | ⚠️ | 60 lectures, 20 par palier de 2/5/10 connexions, toutes HTTP 200. Aucun seuil de rupture ni capacité de production déduit de ce test court. |

## Valeurs choisies et réglage

Les limites SQL sont dans **`public.runtime_limits`**, administrable uniquement côté serveur. Base prudente pour un petit lancement, à ajuster après observation. Fenêtres fixes calculées depuis le temps UTC, non glissantes. Les quotas d’écritures validées ne remplacent pas une protection des tentatives abusives en amont.

- Messages : **30/minute/compte** ; réservations : **12/heure/compte** ; nouvelles annonces : **10/heure/compte** ; dossiers hôte : **3/jour/compte** ; tickets et messages support : **10/heure/compte**, budget partagé.
- Uploads : **40/heure/compte**, **500/jour global**, **200 Mio/jour/compte**, **1 Gio/jour global**. Les autorisations émises consomment le budget même si l’envoi est abandonné : ressources engagées bornées avant écriture R2.
- Fonctions authentifiées : **60/minute/compte**, **600/minute global**. Diagnostics : **20/heure/compte**, **5 000/jour global**, regroupement local d’un même événement pendant **60 secondes**.
- Diagnostics conservés **30 jours**, compteurs expirés supprimés après **2 jours**, via `storage-cleanup`. La rétention dépend de la bonne exécution du cron existant.
- Délais et retry : `NETWORK` dans `src/lib/network.ts`. Trois lectures à 15 s peuvent durer environ **46 s** avec les attentes. Une écriture interrompue n’est pas réémise : vérifier son résultat avant de recommencer.
- Images : `IMAGE_POLICY` dans `src/lib/prepareImage.ts`, bord maximal **1920 px / qualité 0,82** pour photos/avatars ; **2560 px / 0,92** pour KYC afin de préserver la lisibilité. Limite de **10 Mio** avant et après traitement. Valider les détails d’un document réel uniquement dans le parcours privé autorisé.

Exemple de réglage par un administrateur dans le SQL Editor du **projet vérifié**, après revue de l’usage :

```sql
SELECT name, max_units, window_seconds FROM public.runtime_limits ORDER BY name;
-- Exemple seulement : porter le budget messages à 40/minute, si justifié.
UPDATE public.runtime_limits SET max_units = 40 WHERE name = 'messages_user_minute';
```

Ne pas exécuter ce réglage dans le client. Ces quotas ne plafonnent pas toutes les lectures R2 publiques, le calcul, le stockage historique ou les tuiles. Une alerte budgétaire ne constitue pas un arrêt de facturation.

## Preuves obtenues

- TypeScript : réussi. Vitest : **28 fichiers, 158 tests réussis**. PostgreSQL : **55 contrôles réussis**, puis restauration du snapshot local avec contrôle des effectifs et de l’isolement des profils.
- Edge : contrôle Deno des **7 fonctions** et **14 tests** réussis. Déploiement via l’API Supabase, vérification JWT conservée.
- ESLint : **0 erreur, 195 avertissements**, principalement typage `any` et variables inutilisées. Fichiers MapLibre copiés depuis `node_modules` exclus ; règles applicatives conservées.
- Exports Expo **web, iOS, Android** réussis dans `.expo/readiness-export`. Bundles, sans validation physique ni signature APK/IPA.
- Recette hébergée : **25 contrôles réussis**, deux comptes dédiés et un tiers, profils privés, messagerie, concurrence d’approbation, annulation et libération du calendrier. Nouveau logement synthétique créé pour préserver les anciens messages, archivé après les contrôles.
- Compléments hébergés : demandes identiques simultanées → un seul UUID ; diagnostic accepté, contexte URL refusé, lecture interdite au client, champs stockés limités à la liste autorisée. Réservation de test annulée. Résumé : `.expo/readiness-hosted.json`.
- Sonde : HTTP **200**, `ok`, **2 316 ms**, le 30 septembre à **15:24 UTC**.
- Charge : p95 **814 ms à 2**, **643 ms à 5**, **788 ms à 10** connexions ; **60/60 HTTP 200**, charge courte sans écritures. Résultat : `.expo/readiness-load.json`.
- Navigateur : connexion, choix/enregistrement de deux images synthétiques, JPEG final accessible. Image 3000 × 2000 servie en **1920 × 1280**. Photo désormais affichée dans les paramètres. Capture : `.expo/readiness-profile-mobile.png`.

## Refaire les vérifications

```powershell
npm run check
npx deno task --config supabase/functions/deno.json check
npx deno task --config supabase/functions/deno.json test
node scripts/staging/cli.mjs smoke --project-ref uwoesteqkprwitnhfmes
node scripts/operations/load-staging.mjs --project-ref uwoesteqkprwitnhfmes
```

Les deux dernières commandes sont des précontrôles locaux ; ajouter `--run` pour exécuter. Suivre [STAGING-RECIPE.md](STAGING-RECIPE.md) : nouveau logement marqué, trois comptes dédiés, configuration ignorée par Git. Ne pas réutiliser `.env.readiness.local` telle quelle : son logement est archivé et sa conversation contient les preuves. Ne pas effacer l’historique pour faire passer une recette.

Vérifications manuelles ciblées :

1. **Débit/quotas (1–3, 15)** : le test SQL local abaisse le budget messages et vérifie PT429 au deuxième envoi, puis un volume au-dessus du quota. Tester les limites fournisseur séparément sur staging, sans changer celles des utilisateurs réels.
2. **Reprise/affichage (4–6)** : ouvrir Explorer vide, une annonce sans photo puis une image invalide. Une exception de rendu volontaire en développement doit montrer Réessayer ; retirer l’exception avant export.
3. **Réseau (7–8)** : passer hors ligne sur téléphone, lancer lecture puis envoi. Le délai doit se terminer ; aucun envoi ne doit repartir automatiquement. Refaire une lecture après reconnexion.
4. **Doublons (9–10)** : double toucher Réserver/Enregistrer ; une seule opération en cours. Deux demandes de réservation identiques doivent retourner le même UUID tant qu’elles restent en attente.
5. **Données (11–13, 16)** : isolement entre trois comptes ; plus de 30 réservations synthétiques dans un environnement dédié, page suivante, changement de rôle ; expiration/invalidation du cache. Mesurer EXPLAIN sur un jeu représentatif.
6. **Images (14–15)** : grande photo <10 Mio, proportions/dimensions ; refuser un fichier trop lourd ou non image. Vérifier la lisibilité KYC sur iPhone/Android réels, sans URL publique.
7. **Observabilité (17–19)** : succès puis échec de sonde, réception effective de l’alerte après activation. Diagnostics consultés administrativement ; vérifier la rétention sans effacer des preuves d’incident actives.
8. **Restauration (20)** : suivre la procédure distante ci-dessous ; `test:security` seul ne valide pas les sauvegardes de production.

## Réglages opérateur encore nécessaires

### Quotas et facturation

- **Supabase** : projet → Authentication → Rate Limits : connexion, inscription, OTP/récupération, SMTP réellement utilisé. Organisation → Billing/Usage : plan, spend cap lorsqu’il est proposé, alertes disponibles. Consigner les ressources exclues du plafond et le responsable des alertes.
- **Cloudflare R2** : Overview/Metrics et Billing : stockage/opérations ; configurer les alertes disponibles et une copie indépendante des objets avec rétention. Ne pas supprimer globalement les objets KYC ou les fichiers finaux actifs par une règle de cycle de vie. Le worker gère les envois abandonnés/suppressions de comptes ; les quotas SQL ne couvrent pas toutes les lectures publiques.
- **Google Cloud** : terminer la validation en deux étapes reportée par l’utilisateur ; sélectionner le bon projet. Restreindre chaque clé au SDK/application, régler APIs & Services → Quotas et Billing → Budgets & alerts. Le budget est une alerte, pas un plafond garanti. L’iPhone utilise actuellement Apple Maps.
- **TomTom** : Developer Portal du compte de la clé web : vérifier offre/quota effectifs, consommation, restrictions de domaines disponibles. Prévoir alerte ou revue de l’usage ; MapLibre ne plafonne pas les appels.

Les montants restent à choisir par l’exploitant ; aucun abonnement, hausse de budget ou message externe n’a été effectué.

### Activer une vraie alerte de disponibilité

`.github/workflows/availability.yml` est fourni. Sa présence dans le dépôt ne suffit pas à activer la surveillance : il doit être sur la branche par défaut et configuré. Après choix de GitHub Actions :

1. Settings → Secrets and variables → Actions : variable `LOCAMAP_HEALTH_URL` = URL HTTPS exacte `/functions/v1/health` du projet surveillé.
2. Secret `LOCAMAP_HEALTH_ANON_KEY` = clé **anon JWT** du projet, jamais `service_role` ; la passerelle vérifie le bearer JWT.
3. Variable `LOCAMAP_MONITORING_ENABLED=true`, workflow sur branche par défaut, puis Run workflow.
4. Configurer la réception des échecs Actions par le responsable, ou une sonde externe avec en-têtes `apikey` et `Authorization`. Tester un échec sur cible de test et vérifier la réception effective. Aucun message de test n’a été envoyé ici.

GitHub peut retarder les tâches planifiées : aucun délai garanti de dix minutes. La sonde de base ne remplace pas les contrôles R2/cartes/parcours utilisateur.

Consultation administrative minimale, sans messages, stacks ou documents :

```sql
SELECT created_at, kind, code, route, version, platform
FROM public.app_error_events ORDER BY created_at DESC LIMIT 100;
SELECT name, window_start, sum(units) AS used
FROM public.request_counters GROUP BY name, window_start
ORDER BY window_start DESC LIMIT 100;
```

### Sauvegarde et restauration hébergées

1. Vérifier Database → Backups et l’offre Supabase : fréquence, rétention, dernière réussite, éventuelle restauration à un instant donné. Aucun upgrade payant supposé autorisé.
2. Pour un dump CLI, disposer de Docker fonctionnel ou d’un `pg_dump` compatible, connexion issue de Connect, identifiants dans un gestionnaire de secrets. La tentative `supabase db dump --linked` a échoué avant création de sauvegarde.
3. Inventorier ce qui est inclus : schéma, données, privilèges, éléments Auth nécessaires. R2 et secrets de fonctions ne sont pas dans un dump PostgreSQL. Copies chiffrées hors dépôt.
4. Restaurer sur **un autre projet explicitement identifié**, buckets de test distincts. Désactiver cron, emails/notifications et accès aux buckets réels avant restauration pour empêcher une purge ou une communication depuis la copie.
5. Vérifier effectifs, clés étrangères, connexion des comptes de test, RLS, réservations/calendrier, KYC privé, intégrité des objets ; recette à trois comptes. Mesurer durée/perte de données et consigner le résultat/responsables.
6. Programmer sauvegarde, alerte d’échec et exercice périodique ; fréquence/rétention à choisir avec l’exploitant. Réconcilier les suppressions de comptes intervenues après capture avant remise en service.

Voir aussi [EXPLOITATION.md](EXPLOITATION.md) pour textes légaux, modération, support et essais natifs encore nécessaires.
