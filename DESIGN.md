# Design System — LocaMap

## Direction

Un locataire consulte LocaMap sur son téléphone, parfois dehors à Gisenyi, et doit comparer rapidement les logements. L’interface reste claire, lisible et calme : photos en premier, prix explicites, actions faciles à toucher. La même structure s’adapte au navigateur de bureau.

Palette demandée par l’exploitant : **#F58F20, #467434, #363636**.

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

- Accueil : marque et lieu, titre de recherche, champ avec bouton d’envoi, filtres, catégories horizontales, logements. Une liste virtualisée, 1/2/3 colonnes suivant la largeur, contenu plafonné à 1120 px. Le bouton Carte reste dans la barre des résultats, sans recouvrir les annonces.
- Logements : photo, quartier et note, titre, caractéristiques, prix. Favori indépendant de la zone qui ouvre la fiche.
- Navigation : quatre destinations, icône active sur fond orange clair, texte vert. Barre dans le flux de navigation, largeur maximale 720 px, respect de la zone sûre.
- Fiche : photo proportionnelle, contenu plafonné à 960 px, prix et conditions lisibles, demande de réservation orange dans un pied fixe, contacts secondaires.
- Profil : identité, accès hôte, groupes d’actions et préférences, déconnexion discrète en bas. Largeur maximale 760 px.
- Connexion et inscription : formulaires centrés de 460–520 px au maximum, sans animation décorative répétée. Les champs restent accessibles au clavier.
- Préférences initiales : options lisibles en lignes de 60 px, largeur réactive, contenu défilable sur les petits écrans et navigation respectant les zones sûres.
- Création et réservation : les étapes restent inchangées ; leurs actions principales partagent la palette orange/gris.

## États et mouvement

Le contenu apparaît directement. Les séquences d’entrée décoratives de l’accueil, de la connexion, du profil et de la fiche sont retirées. Le premier chargement de la liste utilise un squelette statique ; le rafraîchissement conserve son indicateur natif. Une action occupée ne peut pas être envoyée deux fois. Les erreurs restent lisibles et les sélections ne reposent pas uniquement sur la couleur.

## Cartographie

Apple Maps sur iPhone, Google Maps sur Android, TomTom sur le web. La refonte ne modifie pas les fournisseurs. Les marqueurs web utilisent le vert de la marque et les mentions obligatoires restent visibles.

## Vérification du 30 septembre 2026

Contrôle dans le navigateur à 320, 390 et 1280 px : connexion, préférences, accueil, recherche vide et réinitialisation, filtres, fiche logement, formulaire de réservation, profil et éditeur, inscription. Utilisation du compte et du logement synthétiques de staging ; aucune réservation ni modification du profil envoyée.

TypeScript : aucune erreur. Suite complète exécutée pendant la refonte : 145 tests réussis ; après les derniers ajustements, les 13 tests de recherche, traductions immobilières et onboarding passent. ESLint ciblé : aucune erreur, un avertissement de type `any` préexistant dans les filtres. Les exports JavaScript web, iOS et Android réussissent ; le script web se parse et le worker cartographique est présent.

Captures de recette conservées dans `.expo/design-*.png`, exports dans `.expo/design-export`. Le contrôle visuel natif de cette refonte reste à effectuer sur l’iPhone dans Expo Go ; les exports ne constituent pas des applications signées.
