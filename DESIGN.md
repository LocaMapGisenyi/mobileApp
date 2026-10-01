# Design System — LocaMap

## Direction

Un locataire consulte LocaMap sur son téléphone, parfois dehors à Gisenyi, et doit comparer rapidement les logements. L’interface reste claire, lisible et calme : photos en premier, prix explicites, actions faciles à toucher. La même structure s’adapte au navigateur de bureau.

Palette demandée par l’exploitant : **#F58F20, #467434, #363636**.

Logo : utiliser le fichier d’origine `assets/icon.png`, également configuré comme icône de l’application, via `AppLogo`. Garder ses proportions et ses couleurs. Ne pas le remplacer par une icône de maison ni recréer un logotype avec du texte coloré.

## Couleurs et rôles

- `colors.accent` — `#F58F20` : action principale (rechercher, ouvrir la carte, se connecter, demander une réservation, publier).
- `colors.onAccent` — `#363636` : texte et icônes sur l’orange. Contraste mesuré : 5,08:1. Le texte blanc sur cet orange n’est pas utilisé.
- `colors.primary` — `#467434` : sélection, liens, navigation, repères cartographiques et confirmations. Blanc sur vert : 5,51:1.
- `colors.ink` — `#363636` : titres et contenu principal. Contraste sur blanc : 12,08:1.
- `colors.inkSubtle` — `#62685F` : informations secondaires et placeholders (5,38:1 sur le fond principal).
- Surfaces : blanc `#FFFFFF`, fond neutre `#F7F8F6`, fond secondaire `#F1F4EF`. Bordures `#DFE5DB` et `#ADB5A7`.
- Vert clair `#EDF3E9` et orange clair `#FFF0DD` : sélection douce, groupes utiles. Erreur `#B43C2E`, indépendante des couleurs de marque.

Le token historique `primary` reste vert pour préserver le contraste des contrôles Paper et des anciens boutons. Les actions principales utilisent explicitement `accent` avec `onAccent`.

## Typographie et espaces

Police système native. Corps 16 px, informations secondaires 14 px, petits labels 12 px, sections 20 px, titres 24–30 px. Interlignage exprimé en pixels dans les styles React Native. Les textes traduits peuvent revenir à la ligne.

Marge mobile habituelle : 20–24 px. Espaces dans les groupes : 8–12 px ; entre sections : 24–32 px. Champs et boutons principaux : au moins 48 px ; boutons icônes : au moins 44 px.

Rayons : champs 10 px, boutons 12 px, cartes 16 px. Les catégories et boutons cartographiques peuvent être ovales. Une bordure ou une ombre courte suffit pour séparer une surface.

## Disposition

- Accueil : logo d’origine et lieu, titre de recherche, champ avec bouton d’envoi orange, filtres, catégories en onglets avec icône et soulignement de sélection. Une liste virtualisée, 1/2/3 colonnes suivant la largeur, contenu plafonné à 1120 px. Le bouton Carte reste secondaire dans la barre des résultats.
- Logements et favoris : même composant `ListingCard`, photo au ratio 1,4 et coins de 12 px, contenu sans cadre extérieur, type et quartier discrets, titre sur deux lignes, prix sombre. Favori indépendant de la zone qui ouvre la fiche.
- Navigation voyageur : quatre destinations, icône active sur fond vert clair, texte vert. Barre blanche bordée en haut, sans panneau flottant, largeur maximale 720 px, respect de la zone sûre.
- Fiche : photo complète contenue dans son cadre, contenu plafonné à 960 px, sections alignées, prix et demande de réservation dans une barre compacte. Messagerie accessible dans l’en-tête ; coordonnées dans la section hôte.
- Profil : titre, identité, deux raccourcis pour les séjours et favoris, invitation hôte discrète, puis actions et préférences en lignes séparées. Largeur maximale 760 px.
- Confirmation de déconnexion : logo d’origine, dialogue blanc de 400 px au maximum, rayon de 20 px, action orange et bouton Annuler distinct. Une erreur reste dans le dialogue et l’envoi ne peut pas être répété.
- Connexion, inscription et récupération : composant commun `AuthLayout`. Sur ordinateur, photo de Gisenyi à gauche et formulaire de 416 px à droite. Sur téléphone, logo et lieu en tête, photo courte uniquement à la connexion, formulaire défilable. Champs de 54 px, rayons de 10 px, actions principales orange. Aucun carrousel ou animation décorative.
- Messagerie : en-tête aligné sur le profil, conversations en lignes ; initiales en remplacement d’une photo absente ou défectueuse.
- Parcours hôte : photo locale à l’accueil, titres alignés à gauche, progression compacte indiquant le libellé et le numéro de l’étape, formulaire tenant compte du clavier.
- Préférences initiales : options lisibles en lignes de 60 px, largeur réactive, contenu défilable sur les petits écrans et navigation respectant les zones sûres.
- Création et réservation : les actions principales partagent la palette orange/gris. Le parcours de création hôte suit les conventions ci-dessous.

## Espace hôte — octobre 2026

- Cinq vrais onglets React Navigation : Aujourd’hui, Calendrier, Annonces, Messages, Menu. Barre dans la mise en page, jamais en superposition. Conversation et formulaires sont des routes de la pile principale sans barre d’onglets. Libellés de 13 px, adaptés à 12 px sous 360 px, pouvant revenir à la ligne avec les réglages d’accessibilité.
- Composants communs `src/components/host/HostUI.tsx` : cadre et zones sûres, en-tête, boutons, lignes d’action, statut, erreur et état vide. Fond blanc, contenu plafonné à 1000 px, marges mobiles de 20 px, corps 16 px et métadonnées 14 px.
- Aujourd’hui : demandes à traiter, arrivées/départs ouvrant les réservations hôte, puis valeur des séjours explicitement séparée de tout encaissement. Les décisions ont une fiche dédiée avec confirmation, état occupé unique et erreur visible.
- Annonces : liste virtualisée, recherche, filtres par statut, photo et loyer mensuel. Une action de gestion, un raccourci calendrier. Photos, informations, emplacement, prix et règles s’ouvrent directement depuis la fiche.
- Création : logement, emplacement, photos/description, prix/règles, puis récapitulatif. Brouillon incomplet possible, sortie protégée, champs et actions défilants au-dessus du clavier. Une modification enregistrée quitte la publication et nécessite une nouvelle validation, conformément aux transitions du serveur.
- Calendrier : réglages visibles après sélection, jours réservés protégés, contrôles tarifaires limités aux rôles autorisés. Dates des vues quotidiennes en Afrique/Kigali ; disponibilité de l’action « terminé » alignée sur le jour UTC du serveur.
- Menu : pages secondaires dans la pile, sans modales contenant des pages entières. Profil vérifié reconnu après reconnexion. Identité, support et ressources existants conservés ; aucun badge d’excellence ni montant encaissé inventé.
- Traductions hôte ajoutées dans `hostFlow.ts`, `hostListings.ts`, `hostWorkspace.ts` et fusionnées pour FR/EN/RW/SW. La recette native sur iPhone complète les vérifications web ; un export JavaScript ne valide pas les autorisations ou le clavier natifs.
- Recette de la refonte hôte : voir `docs/HOST-EXPERIENCE-RECETTE-2026-10-01.md` pour les parcours réellement essayés, les corrections d’intégration, les 215 tests réussis et les limites natives.

## États et mouvement

Le contenu apparaît directement. Les séquences d’entrée décoratives de l’accueil, de la connexion, du profil et de la fiche sont retirées. Le premier chargement de la liste utilise un squelette statique ; le rafraîchissement conserve son indicateur natif. Une action occupée ne peut pas être envoyée deux fois. Les erreurs restent lisibles et les sélections ne reposent pas uniquement sur la couleur.

Les erreurs des formulaires apparaissent dans le formulaire, sans second bandeau global. La connexion traduit les refus d’identifiants, les limites de tentatives et les problèmes réseau. Les avis d’authentification en arrière-plan respectent les zones sûres. Le formulaire d’identité hôte adapte sa hauteur au clavier et fait défiler le champ actif ; sur iPhone, « Terminé » permet aussi de fermer le clavier numérique.

## Cartographie

Apple Maps sur iPhone, Google Maps sur Android, TomTom sur le web. La refonte ne modifie pas les fournisseurs. Les marqueurs web utilisent le vert de la marque et les mentions obligatoires restent visibles.

## Vérification du 30 septembre 2026

Contrôle dans le navigateur à 320, 390 et 1280 px : connexion, préférences, accueil, recherche vide et réinitialisation, filtres, fiche logement, formulaire de réservation, profil et éditeur, inscription. Utilisation du compte et du logement synthétiques de staging ; aucune réservation ni modification du profil envoyée.

TypeScript : aucune erreur. Suite complète exécutée pendant la refonte : 145 tests réussis ; après les derniers ajustements, les 13 tests de recherche, traductions immobilières et onboarding passent. ESLint ciblé : aucune erreur, un avertissement de type `any` préexistant dans les filtres. Les exports JavaScript web, iOS et Android réussissent ; le script web se parse et le worker cartographique est présent.

Captures de recette conservées dans `.expo/design-*.png`, exports dans `.expo/design-export`. Le contrôle visuel natif de cette refonte reste à effectuer sur l’iPhone dans Expo Go ; les exports ne constituent pas des applications signées.

Corrections complémentaires : logo d’origine, dialogue de déconnexion et erreur de connexion contrôlés à 390 × 844 ; formulaire hôte contrôlé avec une zone réduite à 390 × 430. Annulation, déconnexion réelle et refus d’identifiants vérifiés sur le compte de recette. TypeScript et les 167 tests passent, ainsi que les exports web/iOS/Android (`.expo/ui-fixes-export`). Le comportement du clavier natif reste à confirmer sur l’iPhone. Captures : `.expo/logout-redesign-mobile.png`, `.expo/login-error-mobile.png` et `.expo/onboarding-short-viewport.png`.

Refonte de la composition : accueil, fiche, profil, favoris, messagerie, parcours hôte et trois écrans d’authentification. Vérification visuelle à 390 × 844, inscription à 320 × 568 et connexion à 1280 × 900 ; le dernier champ hôte reste dans la zone visible à 390 × 430. Favori de recette ajouté puis retiré, bouton de réservation vérifié sans envoi de demande. Les 167 tests passent ; ESLint ne signale aucune erreur (avertissements existants). Captures `.expo/pro-*.png`, exports web/iOS/Android dans `.expo/pro-design-export`. Photos réutilisées depuis les fichiers existants ; aucune image d’annonce ni identité réelle remplacée pour la recette.
