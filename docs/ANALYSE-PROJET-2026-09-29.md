# Analyse de LocaMap — 29 septembre 2026

> État initial avant corrections. Voir [le bilan des corrections](CORRECTIONS-2026-09-29.md) pour la situation actuelle.

LocaMap est un prototype fonctionnel partiel, avec une interface étendue et une intégration Supabase commencée. Il ne constitue pas encore une version prête à accueillir de vrais locataires et hôtes : rechercher, publier et contacter ne forment pas encore un parcours connecté de bout en bout.

L'analyse porte sur le dépôt local, au commit `7be752e`, avec les fichiers présents au moment de l'examen. Aucun changement du code de l'application, aucune migration distante et aucune création de compte ou transaction réelle n'ont été effectués. La configuration Supabase déployée, les règles réellement appliquées en production et l'exécution sur téléphone restent à vérifier. Les constats de sécurité SQL concernent la migration fournie, sans exploitation d'un service distant.

## 1. Ce que le produit cherche à faire

Le document PRODUCT.md décrit une plateforme de location à Gisenyi, au Rwanda, destinée aux habitants et voyageurs ainsi qu'aux propriétaires et gestionnaires. L'objectif annoncé est de permettre à un locataire de trouver et contacter un logement en moins de trois minutes.

Le parcours locataire prévu est : inscription ou connexion → choix de langue et devise → exploration et filtres → carte ou fiche du logement → favoris, contact, avis. Le parcours hôte est : présentation de l'identité et justificatifs → moyens de versement → création d'annonce → gestion des annonces, calendrier, messages et demandes. Support, guides locaux, ressources, parrainage et co-hôtes élargissent le périmètre.

Le prix de référence est en RWF. Quatre catalogues de traduction existent : français, anglais, kinyarwanda et swahili. Les devises proposées incluent RWF, USD et EUR.

## 2. Organisation et fonctionnement technique

- **Application mobile :** Expo 54, React Native 0.81.5, React 19.1 et TypeScript. React Navigation organise les écrans et onglets ; Paper, Reanimated et Lottie assurent les composants et animations.
- **Démarrage :** App.tsx initialise la langue et l'authentification. Le navigateur impose une connexion avant l'accès au parcours principal, puis les préférences initiales.
- **État :** Zustand contient les informations de l'utilisateur et plusieurs stores métier. Une partie est persistée avec AsyncStorage, une autre existe seulement en mémoire.
- **Backend prévu et partiellement utilisé :** Supabase Auth et PostgreSQL. La migration contient 31 tables, des index, la création automatique du profil à l'inscription et des politiques de sécurité par ligne, dites RLS.
- **Services :** les fonctions de src/services appellent Supabase ; src/services/api conserve une façade adaptée aux anciens modèles de l'interface. Le fichier config.ts de cette ancienne API est un stub renvoyant null. Il ne faut donc pas interpréter api-endpoints.md comme la preuve qu'un serveur REST séparé serait la prochaine dépendance obligatoire.
- **Photos :** un utilitaire d'envoi et une Edge Function de signature d'URL Cloudflare R2 sont présents. Aucun écran n'importe actuellement uploadPhoto ou uploadPhotos.
- **Volume :** 38 fichiers d'écran existent. Ce nombre mesure l'étendue de l'interface, pas le nombre de fonctions terminées.

Sources : [App.tsx](D:/PETER/locamap/App.tsx), [navigation](D:/PETER/locamap/src/navigation/index.tsx), [client Supabase](D:/PETER/locamap/src/lib/supabase.ts), [migration](D:/PETER/locamap/supabase/migrations/001_init.sql), [stockage](D:/PETER/locamap/src/lib/storage.ts).

## 3. Ce qui existe déjà

Le projet possède une structure modulaire, un thème commun, de nombreux formulaires, des validations de saisie, une navigation locataire/hôte et plusieurs états de chargement ou d'erreur. L'authentification email et mot de passe appelle réellement Supabase dans le code.

Des services de lecture et d'écriture existent pour les logements, profils, réservations, messages, avis et notifications. Le tableau de bord hôte, les annonces hôtes, le calendrier et plusieurs écrans secondaires appellent ces services. Leur présence constitue une base réutilisable ; elle ne prouve pas que le schéma distant, les autorisations et les données nécessaires sont opérationnels.

La carte mobile utilise react-native-maps et les marqueurs de prix. Les traductions et préférences de devise sont structurées. Des hooks de temps réel pour les messages et notifications existent également, mais les écrans examinés ne les utilisent pas.

## 4. Blocages prioritaires dans les parcours

### P0 — L'exploration ne récupère pas les logements

ExplorerScreen utilise useSearchStore. Sa fonction fetchListings remplace les listes par des tableaux vides, sans appeler Supabase. fetchListingById et useListingById cherchent seulement dans la mémoire locale. Même avec une base Supabase correctement remplie, ce chemin ne charge pas ses annonces.

**Preuve exécutée :** chargement des vrais stores TypeScript dans un processus Node, ajout d'une annonce en mémoire : 1 annonce hôte et 1 annonce dans la recherche. Après fetchListings : 1 annonce hôte mais 0 dans la recherche. Aucun réseau ni enregistrement distant lors de cet essai.

À terminer : brancher la recherche et les fiches sur les services, traiter chargement/erreur/absence réelle de résultat, puis ajouter pagination et recherche géographique utile.

Sources : [store de recherche](D:/PETER/locamap/src/store/search.ts:159), [fiche par identifiant](D:/PETER/locamap/src/hooks/useListingById.ts), [service disponible](D:/PETER/locamap/src/services/property.service.ts).

### P0 — Publier une annonce ne l'enregistre pas sur le serveur

CreateListingScreen appelle addListing du store local. L'annonce reçoit un identifiant local et un propriétaire fixe, owner1. Le store ne persiste pas les annonces. Les modes brouillon et publication aboutissent au même traitement ; le paramètre mode n'est pas utilisé. Les photos restent des références locales, sans envoi R2.

L'écran de gestion des annonces hôtes interroge, lui, Supabase : il ne retrouve donc pas l'annonce que vient de créer le formulaire local.

À terminer : enregistrer l'annonce avec l'identité authentifiée, téléverser et associer les photos, distinguer brouillon/publication/modération, permettre la reprise d'un brouillon et gérer les échecs partiels.

Sources : [enregistrement du formulaire](D:/PETER/locamap/src/screens/CreateListingScreen.tsx:412), [store hôte](D:/PETER/locamap/src/store/hostListings.ts:43).

### P0 — Le contact locataire/hôte est encore simulé

NewMessageScreen, ConversationScreen et MessageListScreen utilisent le store local de messages. Celui-ci simule les délais de livraison et fabrique la réponse « Je vous répondrai bientôt. ». Il conserve les conversations sur l'appareil, sans les transmettre à l'hôte. L'écran de messagerie hôte utilise une autre couche, adossée à Supabase.

À terminer : unifier les conversations, enregistrer les participants et messages, brancher les abonnements temps réel, gérer accusés de lecture, erreurs et reconnexion. Les données locales devront aussi être isolées et nettoyées lors d'un changement de compte.

Source : [messages locaux](D:/PETER/locamap/src/store/messages.ts:37).

### P0 — Les modèles de données ne correspondent pas encore

La façade property.service convertit latitude et longitude vers location.latitude/location.longitude, alors que la carte lit location.coordinates. Elle ne renseigne pas owner, alors que le bouton Contacter exige listing.owner. Pour une fiche récupérée par identifiant, les images deviennent des objets alors que l'interface attend principalement des URL.

Le schéma stocke price_per_month, mais certaines vues affichent un prix par nuit ; la fiche calcule encore un prix mensuel en multipliant un prix supposé nocturne par 25. Plusieurs taux de conversion fictifs différents coexistent.

À terminer : définir un modèle unique de logement, d'hôte et de prix, puis vérifier ses transformations. Connecter les stores sans corriger ces incompatibilités laisserait des parcours inutilisables ou des tarifs trompeurs.

Sources : [adaptateur de logement](D:/PETER/locamap/src/services/api/property.service.ts:5), [contact et prix](D:/PETER/locamap/src/screens/LogementDetailScreen.tsx:115), [devises](D:/PETER/locamap/src/utils/currency.ts).

## 5. Sécurité à corriger avant des données réelles

La présence de RLS est une bonne fondation, mais plusieurs règles de la migration ne garantissent pas les restrictions métier attendues. Ces constats supposent que cette migration soit déployée avec les droits d'accès habituels de Supabase ; les privilèges effectifs distants n'ont pas été inspectés.

1. **Confidentialité des conversations :** l'insertion dans conversation_participants exige seulement un utilisateur connecté. Un utilisateur connaissant l'identifiant d'une conversation pourrait s'y ajouter et bénéficier ensuite du droit de lire ses messages. Il faut contrôler la création et l'ajout de participants côté serveur.
2. **Profils et vérification d'identité :** la lecture des profils est autorisée par USING(true), alors que la table contient email et téléphone. La mise à jour de son propre profil ne protège pas les colonnes sensibles comme kyc_status. Séparer profil public, informations privées et décisions de vérification.
3. **Crédits de parrainage :** les règles autorisent l'insertion et la modification de sa propre ligne de crédits, sans protéger les montants. Les crédits financiers doivent être attribués exclusivement par une logique serveur contrôlée.
4. **Réservations :** la création contrôle guest_id mais ne garantit pas que host_id corresponde au propriétaire, que le prix soit calculé par le serveur ou que les dates soient disponibles. La modification par l'hôte porte sur la ligne, sans restriction explicite des colonnes métier.
5. **Modération et avis :** la modification des annonces par leur propriétaire ne protège pas le statut de modération ; les champs d'avis vérifiés ne sont pas réservés au serveur. Les indicateurs de confiance ne doivent pas être librement déclarables par leur bénéficiaire.

Ajouter des tests d'autorisation avec deux locataires, deux hôtes et un utilisateur anonyme. Vérifier que ni messages, ni données privées, ni crédits, ni statuts de confiance ne peuvent être lus ou modifiés hors du rôle prévu.

Sources : [profils](D:/PETER/locamap/supabase/migrations/001_init.sql:663), [réservations](D:/PETER/locamap/supabase/migrations/001_init.sql:827), [participants](D:/PETER/locamap/supabase/migrations/001_init.sql:880), [crédits](D:/PETER/locamap/supabase/migrations/001_init.sql:1187).

## 6. Fonctions présentes à l'écran mais incomplètes

- **Favoris, avis et alertes locataires :** stores locaux, sans persistance serveur sur les parcours actifs. Le chargement des avis ne récupère rien. Le nombre de logements correspondant à une alerte est aléatoire. Une autre implémentation des favoris détourne la table alerts ; il faut choisir un seul modèle.
- **Inscription hôte et KYC :** les justificatifs et moyens de versement sont collectés dans un store non persistant. Le statut soumis est local ; il manque l'envoi privé des justificatifs, leur revue et la transition fiable vers le rôle hôte.
- **Authentification :** les boutons Google/Facebook ont une fonction vide. ResetPasswordScreen utilise lottieRef sans le déclarer après l'envoi du mail. Il manque un parcours mobile démontré pour ouvrir le lien reçu et définir le nouveau mot de passe. Le retour de session, les erreurs de profil et le renouvellement doivent être testés.
- **Web :** la carte est remplacée volontairement par un composant de simulation. Le client utilise SecureStore sans adaptateur web, alors que son implémentation web expose un objet vide. L'authentification web persistante doit être traitée séparément.
- **Compte locataire :** moyens de paiement et préférences de notification restent dans l'état React de l'écran. L'export de données est un stub. « Supprimer mon compte » appelle seulement la déconnexion.
- **Compte hôte :** profils et comptes de versement ont des services, mais l'export de données ne fait rien et la suppression de compte appelle seulement signOut.
- **Réservations :** aucun parcours locataire complet n'est raccordé à la fiche. La façade create transmet host_id vide et total_price à zéro. L'acceptation met à jour le statut, sans transaction de disponibilité ; aucune contrainte empêchant deux réservations approuvées qui se chevauchent n'est fournie dans la migration.
- **Paiements :** les choix de prestataires et comptes de versement ne réalisent aucun encaissement. Aucun traitement de paiement, webhook de confirmation, remboursement ou rapprochement financier n'a été trouvé.
- **Notifications :** tables et hooks existent ; l'application n'intègre pas de chaîne complète de notifications push, de jetons d'appareil et de déclenchement serveur.
- **Statistiques et fonctions secondaires :** occupation renvoyée à zéro, courbes de revenus/occupation vides dans certains services ; support, contenus, co-hôtes et parrainage nécessitent des règles et une exploitation serveur complètes. Aucun back-office administratif n'est fourni dans ce dépôt.

Sources : [connexion sociale](D:/PETER/locamap/src/screens/LoginScreen.tsx:70), [réinitialisation](D:/PETER/locamap/src/screens/ResetPasswordScreen.tsx:61), [compte locataire](D:/PETER/locamap/src/screens/GuestAccountScreen.tsx:175), [compte hôte](D:/PETER/locamap/src/services/api/user.service.ts:238), [réservations](D:/PETER/locamap/src/services/api/booking.service.ts:52), [statistiques](D:/PETER/locamap/src/services/host.service.ts:42).

## 7. Vérifications réalisées

- **TypeScript :** tsc --noEmit --pretty false échoue avec 293 diagnostics, dont 11 dans l'Edge Function Deno et 282 dans src. Une grande partie provient du modèle Database incomplet au regard du SDK Supabase installé : les descriptions de tables ne contiennent notamment pas Relationships et le schéma ne décrit pas Views/Functions. Le type se réduit alors à never dans de nombreux appels. Il existe aussi des erreurs distinctes, comme lottieRef. Le contrôle mobile et celui des fonctions Deno doivent être séparés.
- **ESLint :** eslint . échoue avant l'analyse : ESLint 9 attend eslint.config.js/mjs/cjs, tandis que le dépôt contient .eslintrc.js.
- **Dépendances Expo :** expo install --check en mode hors ligne ne signale pas d'écart, mais avertit explicitement que cette validation hors ligne est peu fiable. Ce résultat n'atteste ni la compatibilité complète ni le fonctionnement sur appareil.
- **Dépendances npm :** npm audit --omit=dev signale 41 paquets affectés : 2 critiques, 14 élevés, 20 modérés, 5 faibles. Ce sont des signalements sur l'arbre de dépendances, incluant de l'outillage classé dans dependencies ; ils ne correspondent pas à 41 failles exploitables dans l'application mobile. Les critiques concernent notamment tar et shell-quote. Une mise à jour raisonnée et une qualification de l'exposition sont nécessaires.
- **Comportement des stores :** reproduction locale de l'ajout puis de la disparition d'une annonce de la recherche après actualisation.
- **Traductions :** français 1 126 clés ; anglais 1 047, avec 80 clés françaises absentes ; kinyarwanda et swahili 929 chacun, avec 218 clés françaises absentes chacun. Les ensembles contiennent aussi quelques clés propres à chaque langue, d'où une différence de totaux qui ne vaut pas exactement le nombre de clés manquantes. Il s'agit d'une comparaison de structure, pas d'une évaluation linguistique.
- **Tests et intégration continue :** aucun fichier de test applicatif trouvé et aucun script test/typecheck/lint dans package.json ; aucun workflow CI trouvé dans le dépôt.

- **Export Expo toutes plateformes :** expo export --platform all échoue lors du bundle web : le paquet @lottiefiles/dotlottie-react, importé par lottie-react-native, est introuvable. La génération Android et iOS avait commencé, mais cette commande ne permet pas de conclure à leur réussite. Aucun paquet n'a été installé pour contourner l'échec durant l'audit.
- **Export Android isolé :** expo export --platform android --max-workers 2 réussit, code de sortie 0, 1 761 modules et un bundle Hermes de 7,85 Mo. Cela confirme la génération JavaScript Android ; ce n'est ni un APK signé, ni un test de fonctionnement sur téléphone. iOS n'a pas été validé séparément.

Une génération de bundles réussie ne remplacerait pas une validation sur téléphone ni des tests avec deux comptes réels.

## 8. Ordre conseillé pour achever une première version

**Étape 1 — Remettre la base technique en état.** Fixer les modèles de données et les types générés Supabase, distinguer les configurations TypeScript mobile/Deno, remettre ESLint en service, traiter les dépendances et l'authentification. Vérifier le schéma réellement déployé. Le résultat attendu est une génération reproductible et des contrôles automatiques utilisables.

**Étape 2 — Sécuriser le backend.** Corriger les RLS et protéger les champs sensibles ; définir les transitions autorisées pour hôtes, annonces et réservations. Le résultat attendu est une batterie de tests empêchant les accès entre comptes non autorisés.

**Étape 3 — Fermer le parcours principal.** Un hôte crée une annonce et téléverse ses photos ; elle est validée puis apparaît dans la recherche d'un autre compte ; le locataire ouvre la fiche et la carte puis échange un vrai message avec l'hôte. Vérifier que les données persistent après fermeture de l'application et sur un autre appareil.

**Étape 4 — Fiabiliser les fonctions utiles au lancement.** Favoris, langues, tarifs, reprise après coupure réseau, erreurs compréhensibles, gestion du compte, signalement et administration minimale des annonces et identités. Il faut des annonces réelles, des coordonnées à jour et un processus de support opérationnel.

**Étape 5 — Préparer la distribution.** Configurer identifiants Android/iOS, cartes et permissions, secrets serveur et stockage, liens de retour d'authentification, builds de test et de production. Ajouter surveillance des erreurs, sauvegardes/restauration, données de démonstration et documentation d'installation à jour. Aucun eas.json n'est fourni ; EAS ou une autre chaîne de build devra être choisie et documentée.

Pour un premier lancement centré sur la **mise en relation**, paiements intégrés, parrainage, formations, statistiques avancées et co-hôtes peuvent être reportés ou retirés des parcours visibles. Pour une **plateforme de réservation transactionnelle**, réservation, calcul serveur des montants, prévention des doubles réservations, paiements, annulations, remboursements et rapprochement deviennent des exigences du lancement.

## 9. Comment reconnaître une version terminée

La version minimale est achevée quand un hôte A peut publier une annonce persistante avec des photos accessibles, qu'un locataire B la retrouve avec un prix correct, puisse la situer et communiquer réellement avec A, et qu'un compte C ne puisse pas accéder à leurs données privées. Ces scénarios doivent survivre à une déconnexion, un redémarrage et une coupure réseau. Les boutons proposés doivent produire l'action annoncée.

Le README et les guides de migration décrivent encore des états plus anciens que le code : ils devront être réécrits autour de l'architecture Supabase retenue. Un pourcentage global d'achèvement serait trompeur tant que le périmètre entre simple mise en relation et réservation avec paiement n'est pas arrêté. Le diagnostic fiable est : **interface étendue, backend partiel, intégration des parcours centraux à terminer et sécurité à renforcer avant lancement**.
