# Distribution native LocaMap

## État constaté le 30 septembre 2026

Le projet EAS [peter23xp/LocaMap](https://expo.dev/accounts/peter23xp/projects/LocaMap) a été créé et lié au dépôt : UUID `a27258d7-949a-4c65-90ab-7e64f6dcc637`, propriétaire `peter23xp`. La liaison est enregistrée dans `app.json`. Le keystore Android staging a été créé dans EAS et le build SDK 54 `ddcdee26-055c-4b19-95f3-16a61ddd2ca6` a terminé. Ce build historique précède la mise à niveau SDK 57 ; il n'a pas été installé sur un téléphone. Aucun build iOS signé n'est revendiqué. Le projet Supabase `uwoesteqkprwitnhfmes` est maintenant actif et sa recette est décrite dans [RECETTE-2026-09-30.md](RECETTE-2026-09-30.md).

Les cartes mobiles utilisent `react-native-maps` : Apple Maps sur iOS, Google Maps sur Android. Apple Maps fonctionne dans Expo Go et ne nécessite aucune clé Google. Le web utilise MapLibre avec TomTom. Voir [GOOGLE-MAPS.md](GOOGLE-MAPS.md) pour la configuration et les limites de validation. Aucun export JavaScript ne constitue un build signé.

Les cinq variables de staging ont été créées dans EAS `preview` : référence Supabase, URL publique, clé publique, email de support et WhatsApp de support.

Le second build Android SDK 54, `fcb779fd-25df-43ba-a762-0e94304e34e9`, a également atteint `FINISHED`. Les deux builds précèdent les derniers changements SDK 57 et le correctif des gestes ; ils ne constituent pas une distribution à jour du code actuel.

## Essai gratuit sur iPhone avec Expo Go

L'exploitant a confirmé ne disposer que d'un iPhone et a choisi Expo Go. Le projet a été mis à niveau vers Expo SDK 57 (`expo` 57.0.26), React Native 0.86.3 et React 19.2.3, car l'Expo Go proposé sur l'App Store ne charge plus directement le SDK 54. La page officielle [Expo Go pour iPhone](https://expo.dev/go?sdkVersion=57&platform=ios&device=true) fournit le lien d'installation.

Le serveur local utilise le port **8097** : un service Apache existant occupe le port IPv4 8081. Ne pas arrêter ce service pour lancer Expo. Le 30 septembre, l'adresse Ethernet du PC est `10.25.112.211`. Pour relancer depuis PowerShell :

```powershell
$env:REACT_NATIVE_PACKAGER_HOSTNAME='10.25.112.211'
$env:APP_VARIANT='staging'
$env:SUPABASE_STAGING_PROJECT_REF='uwoesteqkprwitnhfmes'
npx expo start --go --lan --port 8097 --max-workers 2
```

Connecter l'iPhone au même réseau, scanner le QR avec l'appareil photo et ouvrir dans Expo Go. L'adresse de cette session est `exp://10.25.112.211:8097`. Le PC doit rester allumé et le processus Expo actif. Si le réseau/adresse du PC change, adapter `REACT_NATIVE_PACKAGER_HOSTNAME`, générer le nouveau QR et remplacer le retour Auth de développement correspondant. Aucune exposition publique par tunnel n'a été configurée.

La liste Supabase Auth autorise précisément `exp://10.25.112.211:8097/--/auth/recovery`, ainsi que les retours web localhost/127.0.0.1 sur 8097 et les anciennes entrées 8081. Le Site URL est `http://localhost:8097`. L'application construit le retour Expo Go avec `expo-linking.createURL` ; ne pas fixer `EXPO_PUBLIC_AUTH_REDIRECT_URL` à un schéma de binaire pendant cet essai. Les schémas staging/production restent utilisés par les applications compilées.

Le manifeste a répondu HTTP 200 avec `exposdk:57.0.0`, le nom LocaMap Staging et l'adresse attendue. Le paquet de développement iOS a été compilé et servi HTTP 200. Les six tests des liens Auth passent et Expo Doctor valide 21 contrôles. L'exploitant a confirmé l'ouverture sur son iPhone, puis a signalé un écran d'erreur. Les journaux ont identifié l'absence de `GestureHandlerRootView` à la racine ; ce composant a été ajouté autour de l'application. Après fermeture/réouverture, l'exploitant a confirmé : **« Oui, la carte s'affiche »**. Les exports iOS/Android/web ont été régénérés après ce correctif.

Ce constat valide le démarrage et l'affichage cartographique rapportés sur l'iPhone. GPS, choix/téléversement de photos, récupération email et parcours métier complets restent à tester sur l'appareil. Expo Go utilise son propre binaire : il ne valide pas les certificats, l'icône/splash finale ou les autorisations du futur binaire iOS signé.

## Identités et profils

- `staging` utilise l'environnement EAS `preview`, distribue un APK Android et un IPA iOS interne, affiche **LocaMap Staging**, utilise `com.locamap.app.staging` sur les deux plateformes et `locamap-staging://auth/recovery`.
- `preview` hérite intégralement de `staging` pour les commandes existantes.
- `production` utilise l'environnement EAS `production`, affiche **LocaMap**, conserve `com.locamap.app` et `locamap://auth/recovery`, produit un Android App Bundle et un IPA destiné au store. Aucun envoi aux stores n'est automatique.
- Sans `APP_VARIANT`, le développement local conserve l'identité existante et ne demande pas les paramètres de release. Utiliser explicitement un profil pour toute distribution sur appareil.

`ANDROID_PACKAGE` et `IOS_BUNDLE_IDENTIFIER` permettent de remplacer les identifiants **de base** avant de créer les fiches stores. Le suffixe `.staging` est ajouté automatiquement ; ne pas le fournir dans ces variables. Garder les mêmes valeurs de base dans les deux environnements. Après publication, changer un identifiant correspond à une autre application et rompt la continuité des mises à jour.

## Lier le vrai projet EAS

1. Vérifier la session avec `eas whoami`. Identifier le propriétaire réel : le compte connecté ne prouve pas que l'application doit lui appartenir.
2. Dans Expo, sélectionner le projet existant autorisé ou créer le projet dans le compte/l'organisation retenu. Relever son UUID et son slug réels. `eas init --id UUID_REEL` peut lier un projet existant ; si la CLI ne peut modifier la configuration dynamique, enregistrer manuellement les valeurs comme ci-dessous. Ne pas utiliser `--force` pour remplacer une liaison existante.
3. Fournir `EAS_PROJECT_ID` et `EAS_OWNER` au processus local avant les commandes EAS, ou conserver les valeurs publiques confirmées dans `app.json` : `expo.owner` et `expo.extra.eas.projectId`. Cette seconde méthode est maintenant utilisée pour `peter23xp/LocaMap` ; `app.config.ts` conserve ces valeurs. Aligner `expo.slug` sur le slug réel du projet. Ne remplacer la liaison actuelle que sur instruction explicite de l'exploitant.
4. Vérifier `eas project:info` et comparer propriétaire, slug et UUID au projet retenu. Conserver cette preuve sans exporter de secrets.

Les UUID, références de projet, propriétaires et noms de packages ne sont pas des secrets. Les clés publiques Supabase sont extractibles du binaire ; la protection des données repose sur les autorisations serveur.

## Variables dans les environnements EAS

Dans le tableau de bord du projet EAS, renseigner séparément `preview` puis `production`. Utiliser la visibilité **Plain text** pour les identifiants et **Sensitive** pour les clés publiques si l'on souhaite les masquer dans l'interface. Les variables utilisées par la configuration dynamique doivent être disponibles à l'évaluation locale ; la visibilité **Secret** n'est pas adaptée à ces paramètres.

- `EAS_PROJECT_ID`, `EAS_OWNER` : liaison EAS réelle, sauf si déjà enregistrée dans `app.json`. La liaison doit aussi être disponible localement pour accéder aux variables distantes.
- `SUPABASE_STAGING_PROJECT_REF` : référence autorisée du staging, soit `uwoesteqkprwitnhfmes` pour la cible actuelle.
- `SUPABASE_PRODUCTION_PROJECT_REF` : référence de la production lorsqu'elle sera créée. Elle est obligatoire pour le profil production, facultative pour préparer le staging. Dès que les deux références existent, les renseigner dans les deux environnements : elles doivent être distinctes.
- `EXPO_PUBLIC_SUPABASE_URL` : exactement `https://REFERENCE_SELECTIONNEE.supabase.co`, avec éventuellement un slash final. Les domaines personnalisés, chemins, paramètres et URLs d'une autre cible sont refusés par cette configuration volontairement stricte.
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` : clé publishable ou ancienne clé JWT `anon` du projet sélectionné. Les JWT d'un autre projet et les clés serveur sont refusés. Pour les nouvelles clés publishable, l'appartenance au projet doit être vérifiée dans Supabase et lors de la recette ; elle n'est pas décodable localement.
- `EXPO_PUBLIC_AUTH_REDIRECT_URL` : `locamap-staging://auth/recovery` dans `preview`, `locamap://auth/recovery` dans `production`. Si omise, l'application utilise le schéma de sa variante. Inscrire l'URL exacte dans la liste des redirections Supabase Auth du projet correspondant.
- `GOOGLE_MAPS_ANDROID_API_KEY` : clé restreinte au SDK Android, au package et au certificat de signature du binaire. iOS utilise Apple Maps sans clé Google.
- `ANDROID_PACKAGE`, `IOS_BUNDLE_IDENTIFIER` : facultatifs ; mêmes bases réelles dans les deux environnements.

`APP_VARIANT` est déjà fixé dans `eas.json` ; ne pas ajouter de valeur contradictoire dans les environnements EAS. Le profil et la variante doivent correspondre. Ne jamais placer `SUPABASE_SERVICE_ROLE_KEY`, une clé R2, un mot de passe de keystore ou un secret de prestataire dans une variable `EXPO_PUBLIC_*`.

Éviter de remplacer le `.env` local par une configuration de production. Pour la vérification, utiliser les variables EAS dans un processus isolé :

```powershell
eas env:exec preview "node scripts/verify-native-config.cjs --profile staging --platform android"
eas env:exec production "node scripts/verify-native-config.cjs --profile production --platform android"
```

Le vérificateur utilise le résolveur officiel Expo (`getConfig`) dans un processus isolé, puis affiche seulement les identifiants, le schéma et la présence de la liaison EAS. Il n'imprime pas les clés. Les erreurs de cible sont conservées, contrairement au mode CLI `expo config --json` qui peut quitter sans diagnostic. Pour un contrôle iOS, remplacer `--platform android` par `--platform ios`.

## Signature Android et cartes sans clé

1. Après liaison EAS et configuration Supabase, préparer le keystore staging :

   ```powershell
   eas env:exec preview "eas credentials:configure-build --platform android --profile staging"
   ```

   Sélectionner/créer uniquement les credentials de `com.locamap.app.staging` (ou l'identifiant personnalisé confirmé). La création/importation se fait dans la session interactive autorisée.

2. Avec `eas credentials --platform android`, sélectionner le profil staging et relever l'empreinte **SHA-1 du certificat de signature**. Ce SHA-1 est public ; conserver les fichiers de keystore et mots de passe dans le coffre de l'exploitant. Pour un keystore téléchargé localement, `keytool -list -v -keystore CHEMIN_DU_KEYSTORE -alias ALIAS_REEL` demande le mot de passe sans l'inscrire dans la commande.
3. Préparer séparément les credentials de production. Pour un APK distribué directement, relever le certificat qui signe cet APK. Pour Google Play App Signing, relever le certificat **App signing key certificate** dans Play Console → App integrity : il peut différer du certificat de la clé d'upload EAS.
4. Exécuter le vérificateur Android ci-dessus avant de démarrer le build. Pour un APK disponible, `apksigner verify --print-certs CHEMIN_APK` et `aapt dump badging CHEMIN_APK` permettent de relever le certificat et le package avec les Android SDK Build Tools.

Le plugin configure Google Maps uniquement pour Android. iOS utilise Apple Maps. Vérifier sur appareils réels les tuiles, les marqueurs, la sélection et le déplacement du repère, et conserver les attributions affichées par les SDK. Voir [GOOGLE-MAPS.md](GOOGLE-MAPS.md).

## Builds et appareils

Ces commandes créent des builds distants et peuvent consommer le quota ou être facturées. Elles sont à exécuter après validation de la cible, des credentials et du vérificateur, dans le cadre du lancement autorisé.

```powershell
eas env:exec preview "eas build --profile staging --platform android"
eas device:create
eas env:exec preview "eas credentials:configure-build --platform ios --profile staging"
eas env:exec preview "eas build --profile staging --platform ios"
```

Le build iOS interne exige un compte Apple Developer adapté, un App ID staging distinct, un certificat de distribution et un profil ad hoc contenant l'UDID de chaque iPhone de recette. Enregistrer les appareils avant la compilation. Après ajout d'un appareil, renouveler le profil et reconstruire, ou utiliser `eas build:resign --platform ios --target-profile staging` sur le build concerné. Le profil staging cible des appareils physiques, pas le simulateur.

Sur Windows, EAS cloud peut produire l'IPA, mais ce poste ne peut pas exécuter le simulateur iOS ou compiler localement avec Xcode. Une session Apple et un iPhone réel restent nécessaires pour valider installation, WebView et autorisations. Les cartes iOS utilisent Apple Maps et Android utilise Google Maps ; l’essai Expo Go ne valide pas les clés des binaires signés.

Télécharger le binaire depuis le lien EAS de son build et comparer identifiant/version/signature. Pour Android, installer via le lien sur le téléphone, ou installer Android SDK Platform Tools puis vérifier `adb devices -l` et utiliser `adb install -r CHEMIN_APK`. L'appareil doit être déverrouillé, connecté et autorisé pour le débogage USB. Un ancien APK avec le même package mais un autre certificat ne peut pas être mis à jour directement ; décider explicitement avant de désinstaller et de perdre ses données.

Après recette staging concluante et allocation d'une base de production distincte, préparer ses credentials et variables, exécuter le vérificateur `production`, puis :

```powershell
eas env:exec production "eas build --profile production --platform android"
eas env:exec production "eas build --profile production --platform ios"
```

L'AAB se teste via une piste de test Google Play ; il ne s'installe pas avec `adb install`. L'IPA store se teste via TestFlight après envoi approprié. La validation d'un APK staging ne valide pas à elle seule le certificat de signature Play, l'IPA production ou les liens de récupération de production.

## Recette et preuves à conserver

Pour chaque appareil Android/iPhone : noter modèle, version OS, identifiant/URL du build EAS, commit source, version installée, variante, package, certificat/équipe et date. Pour chaque point ci-dessous, consigner le résultat observé et la preuve, sans jetons ni données personnelles réelles.

1. Installer staging à côté de production et reconnaître les deux icônes/noms. Confirmer le projet Supabase attendu avec des comptes de recette dédiés.
2. Inscription/connexion/déconnexion ; récupération du mot de passe avec app fermée puis ouverte. Seule l'app de la bonne variante doit recevoir son lien ; les liens invalides/expirés doivent produire un état compréhensible.
3. Cartes Apple Maps iOS / Google Maps Android : chargement des tuiles et prix, attribution visible, sélection d'une annonce, recentrage et déplacement du marqueur de création. Autoriser, refuser puis réactiver la localisation ; tester GPS indisponible, autorisation approximative et indisponibilité du réseau/de la source de tuiles.
4. Choix de photo, refus d'accès et téléversement réel R2 → finalisation ; reprise après interruption réseau. Vérifier les permissions natives réellement demandées.
5. Avec les comptes de recette du guide backend : annonce, demande et acceptation de réservation, messagerie/temps réel, déconnexion et séparation des données entre comptes. Le lancement retenu ne comporte pas d'encaissement.
6. Passage hors ligne/retour réseau, redémarrage de l'app, reprise de session, export du compte et suppression sur un compte jetable. Les notifications push, emails transactionnels et tâches périodiques ne sont pas considérés validés si leurs prestataires ne sont pas configurés.

Exécuter localement `npm run typecheck`, `npm test -- tests/native-config.test.ts` et le vérificateur adapté. Ces résultats couvrent la configuration et ses garde-fous ; ils ne remplacent aucun point de la recette appareil.
