# Administration LocaMap

Site React/TypeScript séparé de l’application Expo, connecté au même Supabase. La première installation utilise le staging `uwoesteqkprwitnhfmes`. Le site local écoute sur **8098** ; Expo conserve **8097**. Aucune clé serveur ne doit être ajoutée aux variables `VITE_*`.

## Démarrer depuis la racine du dépôt

```powershell
npm --prefix admin ci
Copy-Item admin/.env.example admin/.env.local
# Renseigner uniquement l’URL Supabase et sa clé publique dans admin/.env.local.
npm --prefix admin run dev
```

Ouvrir <http://localhost:8098>. Le port est strict : un conflit arrête le lancement au lieu de déplacer silencieusement le site. `admin/.env.local`, les dépendances et `admin/dist` sont ignorés par Git. Ne pas recopier le fichier d’exemple sur une configuration locale déjà renseignée.

```powershell
npm --prefix admin run check
npm --prefix admin run build
```

Le résultat statique est `admin/dist/`. Les images proviennent du vrai logo `assets/icon.png` et de la photographie de Gisenyi déjà présente dans le projet. La palette est `#F58F20`, `#467434`, `#363636`.

## Connexion et accès

Le compte **peter23xp@gmail.com** a été invité, confirmé et rattaché au rôle d’administrateur principal sur ce staging, à la demande de l’exploitant. Son mot de passe est choisi par son titulaire. À la première connexion, il doit configurer une application d’authentification TOTP, scanner le QR code puis saisir le code à six chiffres. Ne jamais partager ce QR code ou le secret associé.

L’écran de connexion ne crée pas d’administrateur. L’accès doit être attribué explicitement à un compte existant ; tous les appels de données exigent une session MFA de niveau AAL2. La session du site est conservée dans `sessionStorage`, distincte de celle de l’application publique. Une révocation est vérifiée dès l’appel suivant.

- **Administrateur principal** : toutes les rubriques, suspensions de comptes, réglages et attribution des accès.
- **Modérateur** : validation des hôtes, annonces et signalements ; consultation limitée des utilisateurs et réservations.
- **Assistance** : tickets et signalements ; consultation des utilisateurs, annonces et réservations utiles au support.
- **Éditeur** : FAQ, guides, catégories, articles, formations, étapes et documents légaux.

Pour attribuer un accès : retrouver le compte dans **Utilisateurs**, copier sa référence, ouvrir **Accès administrateurs → Attribuer un accès**, choisir le rôle et saisir le motif. Le dernier administrateur principal actif ne peut pas être retiré, rétrogradé ou suspendu.

Sur une installation initiale sans administrateur, l’outil opérateur vérifie l’email confirmé et la concordance Auth/profil :

```powershell
node scripts/admin/bootstrap.mjs --email adresse-du-compte-confirme
# Après lecture du plan affiché :
node scripts/admin/bootstrap.mjs --email adresse-du-compte-confirme --run
```

Cet outil est volontairement limité au staging autorisé et utilise `scripts/staging/.env.service.local`, jamais le navigateur. Il refuse de créer un autre propriétaire initial lorsqu’un propriétaire actif existe déjà. Les prochains membres se gèrent dans le site.

La récupération de mot de passe est désactivée par défaut (`VITE_PASSWORD_RECOVERY_ENABLED=false`). Pour l’activer, autoriser d’abord l’URL de retour exacte dans Supabase Auth, vérifier un envoi de récupération sur un compte de recette et passer la variable à `true`. L’invitation initiale vers `http://localhost:8098/` a été confirmée ; cela ne constitue pas une recette de tous les flux email ni du futur domaine.

## Utilisation quotidienne

**À traiter** ouvre les files réellement filtrées. Les listes sont recherchables, filtrées et paginées par 25. Une fiche conserve le filtre lors du retour à la liste.

Les décisions hôte, annonce, suspension et signalement demandent un motif. Les justificatifs hôtes sont ouverts à la demande et leur accès privé expire après 60 secondes. Les consultations KYC et du contexte signalé sont journalisées. Une suspension conserve les réservations existantes. Les réservations sont consultables ; leurs montants ne représentent aucun paiement encaissé.

Les réponses d’assistance apparaissent dans le ticket et dans les notifications de l’application. Le site ne configure pas d’envoi push, email ou SMS. L’attribution, la priorité et l’état du ticket se modifient séparément avec un motif.

Les contenus peuvent être enregistrés en **brouillon privé**, y compris lorsqu’ils sont incomplets. **Publier** exige les champs obligatoires et une confirmation motivée. Les versions publiées restent consultables. Pour les textes légaux, l’identité et l’adresse définitives de l’exploitant ainsi que l’approbation du texte sont obligatoires ; aucun projet juridique n’est publié automatiquement.

Après un délai dépassé, relire ou actualiser le dossier avant de reprendre. Le serveur refuse une décision fondée sur une version périmée. Le site garde le même identifiant pour la reprise d’un envoi dont la réponse a été perdue, afin d’éviter un double effet.

## Hébergement statique

Le backend admin est déployé sur le staging. **Le site n’a pas encore d’hébergement public ni de domaine choisi.** Pour Cloudflare Pages, conserver la racine du dépôt comme répertoire de travail : le frontend importe les assets de l’application par chemins relatifs.

1. Commande de compilation : `npm --prefix admin ci && npm --prefix admin run build`. Répertoire de sortie : `admin/dist`. Runtime Node 22 ou 24.
2. Renseigner les variables publiques de `admin/.env.example` dans l’environnement de compilation. `VITE_APP_ENV=production` ne change pas le projet Supabase : URL et clé doivent correspondre explicitement à l’environnement voulu.
3. Configurer dans Supabase le secret **`ADMIN_ALLOWED_ORIGINS`** avec les origines exactes autorisées, séparées par des virgules. Conserver les origines locales seulement si elles sont encore nécessaires. Le secret général `ALLOWED_ORIGINS` de l’application est distinct.
4. Ajouter dans Supabase Auth les URLs de retour exactes du site HTTPS pour invitations et récupération, puis tester ces parcours.
5. Vérifier les en-têtes servis depuis `admin/public/_headers` : CSP, interdiction d’intégration en iframe, absence de cache et de référent. Si le projet Supabase change, adapter aussi `connect-src` dans ce fichier. Les autres hébergeurs doivent reproduire ces en-têtes.
6. Tester connexion, TOTP, rôles limités, refus des comptes ordinaires, justificatif privé et révocation sur cette origine avant de déclarer le site disponible.

Le site emploie des routes après `#` ; il ne nécessite pas de réécriture serveur pour ses fiches. Les fonctions serveur restent déployées séparément par Supabase CLI. Ne jamais importer les scripts opérateur dans le bundle.

## Recette et limites

Voir [la recette du 30 septembre](../docs/ADMIN-RECETTE-2026-09-30.md) et [le contrat API](../docs/ADMIN-API.md).

Les scripts `scripts/admin/qa.mjs` utilisent uniquement des comptes synthétiques et une configuration locale ignorée : `setup --run`, `seed --run`, `check`, puis `finish --run` retire les droits temporaires après vérification du propriétaire réel. `activate-owner --run` est une commande ciblée utilisée une seule fois pour l’invitation initiale autorisée, pas un outil général d’attribution. Les scripts SQL `staging-db.cjs` et `concurrency.cjs` nécessitent l’adaptateur opérateur Windows `%LOCALAPPDATA%/LocaMap/staging-tools/database.cjs` ; ils ne sont pas portables sans sa configuration.

Les historiques imbriqués sont bornés : 100 messages, 25 dossiers/versions associés, 50 images et 100 opérateurs proposés. Les écrans d’erreurs et de nettoyage lisent les événements enregistrés ; ils ne certifient ni une sauvegarde récente ni une restauration. La durée de conservation, le plan de restauration hébergé et la charge à grande échelle restent des sujets d’exploitation. Les paiements et les suppressions irréversibles de clients ne font pas partie de ce site.
