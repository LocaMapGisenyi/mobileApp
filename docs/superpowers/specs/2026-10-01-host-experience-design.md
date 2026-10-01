# Refonte de l’espace hôte LocaMap

Date : 1 octobre 2026. Statut : approuvé par l’utilisateur (« okey vas y »).

## Intention

Un hôte consulte son téléphone entre deux activités pour répondre à une demande, vérifier des dates ou modifier son logement. L’accueil doit lui montrer la prochaine action utile. Les opérations fréquentes restent directement accessibles ; les réglages plus rares sont regroupés.

L’exploitant demande une expérience aussi claire que celle d’Airbnb. Cette nouvelle instruction autorise l’inspiration de ses conventions de navigation malgré l’ancienne anti-référence de `PRODUCT.md`. LocaMap conserve son logo d’origine, son contexte rwandais, ses langues FR/EN/RW/SW et les couleurs `#F58F20`, `#467434`, `#363636`.

## Constats dans le code actuel

- `HostDashboardScreen` cumule l’accueil, les notifications et la navigation par état local. La barre flottante reste au-dessus des écrans enfants, y compris des formulaires et conversations.
- Le profil ouvre l’assistance, les ressources, les co-hôtes, le parrainage et les textes légaux dans des modales contenant des pages complètes. Ces pages ont leurs propres en-têtes et zones sûres.
- Les annonces présentent simultanément plusieurs boutons, dont une corbeille pour une opération qui archive. Les erreurs de changement de statut ou d’archivage ne sont pas annoncées ; l’archivage peut faire disparaître une annonce malgré son échec serveur.
- L’accueil permet d’accepter/refuser directement sans verrou visuel par demande. Son bouton de détails des montants n’a pas de gestionnaire. Une branche de réponse à un message appelle le refus de réservation ; cette branche n’est actuellement pas alimentée par le service de demandes.
- Le calendrier dispose déjà d’une session protégeant les changements de logement et les sauvegardes concurrentes. Cette logique et les permissions des co-hôtes doivent être conservées.
- Le formulaire de logement comporte quatre étapes, mais mélange beaucoup de champs, impose titre/description dès l’entrée et ramène à l’accueil après enregistrement. Les sauvegardes, uploads et reprises ont déjà une logique à préserver.
- `BookingsScreen` gère les rôles voyageur/hôte, mais ouvre par défaut les séjours du voyageur même lorsqu’on arrive depuis un parcours hôte.

## Approches

1. **Refonte des parcours avec composants communs — recommandée.** Navigation stable, pages dédiées, formulaires plus progressifs et actions fiables. Elle traite la complexité observée tout en conservant les services et règles métier existants.
2. **Retouche visuelle seule.** Moins de changements, mais conserve la navigation locale, les fenêtres empilées et les retours incohérents.
3. **Nouvelle application hôte indépendante.** Davantage d’isolation, mais impose une deuxième application à maintenir et à ouvrir. Ce n’est pas nécessaire pour améliorer le parcours demandé.

## Navigation proposée

Cinq destinations permanentes : **Aujourd’hui · Calendrier · Annonces · Messages · Menu**. Une vraie navigation React Navigation remplace les écrans substitués par `activeTab`. Sur téléphone, la barre occupe sa place dans la mise en page et respecte la zone sûre. Elle disparaît sur la conversation et les formulaires de détail. Sur grand écran, le contenu est plafonné et la navigation conserve les mêmes destinations.

Les routes existantes `HostDashboard`, `HostCalendar` et `CreateListing` restent compatibles avec les liens déjà utilisés. Les écrans secondaires emploient une pile avec un seul en-tête et un retour cohérent. Le menu propose le compte, les co-hôtes, les ressources, le parrainage, l’aide, les informations légales, le mode voyageur et la déconnexion. Le compte et les notifications restent faciles à retrouver.

## Écrans et actions

**Aujourd’hui.** Logo, salutation courte, notifications, puis demandes à traiter. Les arrivées et départs servent de raccourcis vers les réservations correspondantes. Une entrée « Toutes les réservations » ouvre directement le rôle hôte. Le bilan mensuel devient secondaire, avec des montants explicitement décrits comme valeurs des réservations. Aucun paiement encaissé ni statut d’excellence fictif n’est présenté.

**Réservations.** Demandes, séjours à venir/en cours et historique clairement distingués. Une fiche résume logement, voyageur, dates, durée, prix et état avant toute décision. Accepter/refuser n’envoie qu’une opération à la fois ; erreur et résultat restent attachés à la demande. Les permissions et transitions existantes du serveur restent l’autorité.

**Annonces.** Recherche et filtres compréhensibles : toutes, en ligne, brouillons, à examiner, en pause. Chaque ligne ou carte présente photo, titre, lieu, prix et état. L’action principale est « Gérer » ou « Continuer le brouillon ». Le calendrier est un raccourci secondaire ; pause et archivage se trouvent dans le détail ou le menu d’actions, avec confirmation claire. Une sauvegarde échouée conserve l’annonce et affiche une erreur.

**Gestion d’un logement.** Sections Photos, Informations, Adresse, Prix et disponibilités, Règles, Statut. L’édition d’une annonce existante ouvre un sommaire de sections pour éviter de refaire tout l’assistant. Pour la création : quatre étapes lisibles — logement, emplacement, photos et description, prix et règles — puis récapitulatif avant « Envoyer pour validation ». « Enregistrer et quitter » garde un brouillon. Un retour n’efface pas silencieusement des changements non enregistrés. Après sauvegarde, retour au logement ou à la liste, avec résultat visible.

**Calendrier.** Choix du logement, mois et légende courte. Les réglages n’apparaissent qu’après sélection de dates. Les jours réservés restent protégés. Le panneau de modification s’adapte au clavier et à la hauteur disponible ; une confirmation présente le nombre de jours concernés. Les co-hôtes ne voient que les actions autorisées, sans accès tarifaire indu. La session de calendrier et ses contrôles de concurrence restent réutilisés.

**Messages.** Liste de conversations sobre et recherchable, non-lus identifiables, logement associé et dernier message. La conversation dispose d’un écran dédié avec retour à la liste et zone de saisie toujours visible. Les réponses enregistrées, l’archivage et le signalement restent secondaires. Pagination, réception des nouveaux messages, brouillon et anti double-envoi sont conservés.

**Menu et pages secondaires.** Lignes regroupées par besoin, sans fenêtres contenant d’autres pages. Compte : identité, sécurité, préférences et données personnelles. Assistance : tickets puis détail et réponse. Co-hôtes : invitations, statuts et permissions lisibles avant confirmation. Ressources, parrainage et textes légaux : titres, lectures, formulaires et retours harmonisés. La déconnexion réutilise le dialogue avec le vrai logo. Les réglages liés à des services non configurés restent honnêtes sur leur disponibilité.

**Devenir hôte.** Harmoniser en-têtes, progression et résultats sans défaire les corrections de clavier/upload déjà validées. Une personne en attente de vérification voit clairement son état et la prochaine action possible.

## Règles visuelles et techniques

Fond clair, titres alignés à gauche, texte courant 16 px, informations secondaires 14 px et actions d’au moins 44–48 px. Orange pour l’action principale avec texte gris foncé, vert pour sélection/confirmation, erreurs séparées de la couleur de marque. Photos utiles et logo existant ; pas de nouvel emblème. Transitions courtes pour les changements d’état, aucune séquence décorative au chargement.

Composants hôtes partagés pour cadre de page, en-tête, bouton, statut, état vide, erreur, confirmation et barre de formulaire. Une seule zone responsable des marges sûres et du clavier. Un seul indicateur de premier chargement ; le rafraîchissement conserve le contenu. Les listes longues sont virtualisées. Les libellés et dates respectent la langue et le fuseau métier existants.

La refonte préserve Supabase/R2, les règles de réservation, la validation administrative, les données existantes et les fournisseurs cartographiques. Les modifications de services se limitent aux données nécessaires aux parcours, aux erreurs et à la cohérence des requêtes ; aucune migration métier ni intégration de paiement n’est prévue.

Les modifications mobiles déjà présentes restent conservées. `src/screens/Host*.tsx`, `CreateListingScreen`, le parcours hôte des réservations, la navigation, les composants communs concernés et les traductions forment le périmètre. Les pages voyageur et le site administrateur ne sont pas redessinés par cette intervention.

## Validation prévue

- Tests de navigation/retour, rôle hôte des réservations, sauvegarde et reprise de brouillon, conservation des données en cas d’erreur, blocage des doubles actions et restrictions de calendrier/co-hôte.
- Tests existants des réservations, uploads, messages, profils et sécurité ; TypeScript et contrôles de compilation web/iOS/Android. Les exports ne seront pas présentés comme des binaires signés.
- Recette navigateur aux largeurs 320, 390, 768 et 1280 px, avec grandes traductions, petites hauteurs, états vides, erreurs, données existantes et formulaires.
- Recette avec comptes/logements synthétiques uniquement. Aucune demande client, pièce d’identité réelle ou annonce réelle n’est utilisée pour simuler une mutation.
- Contrôle final sur l’iPhone dans Expo Go pour le clavier, le défilement et les zones sûres ; une vérification navigateur seule ne certifie pas ces comportements natifs.

## Décision

L’approche 1, les cinq destinations et ce périmètre sont validés. Les choix de détail cohérents avec cette direction sont traités pendant la réalisation, sans demander une validation pour chaque écran.
