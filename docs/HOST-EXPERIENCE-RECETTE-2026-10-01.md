# Espace hôte — recette du 1er octobre 2026

## Parcours livrés

- Cinq onglets : Aujourd’hui, Calendrier, Annonces, Messages et Menu. Les formulaires, conversations et décisions de réservation s’ouvrent sur une page dédiée.
- Demandes et réservations filtrées pour l’hôte connecté ; confirmation avant décision et protection contre les doubles actions.
- Annonces recherchables et filtrables, fiche de gestion par sections, création en quatre étapes puis récapitulatif. Brouillons incomplets autorisés, sortie protégée et retour au logement après sauvegarde.
- Calendrier avec réglages dans le défilement, jours réservés protégés et accès tarifaires selon les permissions du co-hôte.
- Conversation dédiée, brouillon conservé et envoi protégé lors d’une fermeture/réouverture. Menu, compte, aide, ressources et documents harmonisés.
- Logo d’origine et palette orange `#F58F20`, vert `#467434`, texte `#363636`. Nouveaux libellés disponibles en français, anglais, kinyarwanda et swahili.

## Recette effectuée

Environnement : Supabase staging `uwoesteqkprwitnhfmes`, comptes et logements synthétiques de recette. Aucun dossier d’identité, compte propriétaire réel ou demande client réelle utilisé pour ces essais.

Parcours navigateur vérifiés : accès hôte après reconnexion ; navigation ; demande de réservation, confirmation puis liste des séjours à venir ; création d’un brouillon sans loyer ; reprise et conservation d’un équipement ; modification d’une section et retour à la fiche ; refus de publication d’un formulaire incomplet ; archivage du brouillon ; sélection de dates et protection des dates réservées ; messagerie.

La migration `007_archive_incomplete_drafts.sql` permet d’archiver un brouillon à loyer nul. Elle conserve l’interdiction du loyer nul pour les annonces actives/en validation. Appliquée sur le staging ; 58 vérifications SQL et restauration isolée PGlite réussies. Cette restauration isolée ne constitue pas une restauration de Supabase hébergé ou des fichiers R2.

Contrôle final : après annulation de la réservation synthétique depuis la fiche, le retour au calendrier conserve janvier 2027 et affiche les dates libérées. Le sélecteur exclut les deux annonces archivées de recette. Le brouillon de message survit au retour à la liste et à la réouverture ; il a ensuite été effacé sans être envoyé. Les entrées légales voyageur et hôte ouvrent respectivement GuestAccount et HostAccount. Assistance et création de ticket disposent d’un seul en-tête et de retours distincts. La réservation de test est annulée et le brouillon de logement est archivé.

Échantillons visuels contrôlés à 320 et 390 px sur les parcours mobiles, 768 px sur les annonces et 1280 px sur le calendrier. Les jours du calendrier mesurent environ 44 px à la largeur minimale. Aucun message d’erreur console n’est présent lors du dernier contrôle. Captures conservées dans `.expo/host-today-390.png`, `.expo/host-listings-768.png`, `.expo/host-calendar-390.png`, `.expo/host-calendar-1280.png`, `.expo/host-conversation-390.png` et `.expo/host-cancel-320.png`.

Vérifications finales :

- `npm run typecheck` : réussi.
- `npm test -- --testTimeout=30000` : 215 tests réussis, 35 fichiers. Le délai de 30 secondes couvre le démarrage des sous-processus du test de configuration native sur ce PC.
- `npm run lint` : aucune erreur, 172 avertissements non bloquants (notamment anciens imports et types `any`, ainsi que des doublures de tests).
- `git diff --check` : réussi.
- `npx expo export --platform all --output-dir .expo/host-final-export` : exports web, iOS et Android réussis.
- Revue indépendante du code : quatre défauts d’intégration corrigés et relecture finale validée.

## Limites à conserver dans la recette de lancement

L’application ne collecte aucun paiement. Les montants du tableau hôte sont des valeurs de réservation.

La sauvegarde des informations et photos reste séquentielle : une erreur après la mise en pause ou l’enregistrement partiel peut laisser un brouillon partiel. Le formulaire conserve les modifications et les éléments nécessaires à la reprise, affiche l’erreur et n’annonce pas une réussite. Une annonce modifiée est soumise à nouveau à la validation administrative.

Les exports Expo sont des bundles JavaScript/Hermes, pas des binaires signés. Le clavier, les gestes de retour, les zones sûres et les permissions natives restent à vérifier sur l’iPhone dans Expo Go. Les vérifications navigateur ne les certifient pas.

Les nouveaux dictionnaires hôte ont les quatre langues ; la recette visuelle a été conduite en français. Le sélecteur de langue existant du profil utilise des dialogues natifs et ne s’ouvre pas sur le web : la recette visuelle complète des autres langues reste à faire. Les anciens contenus éditoriaux, documents légaux et ressources serveur ne sont pas rédigés par cette refonte.

Serveur de développement : port 8097, accessible à l’iPhone sur le même réseau à `exp://10.25.117.203:8097` (adresse susceptible de changer avec le réseau). Les modifications sont conservées dans le checkout local, avec les changements mobiles antérieurs ; cette intervention n’effectue pas de push.
