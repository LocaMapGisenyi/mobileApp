# Espace d’administration LocaMap

Date : 30 septembre 2026. Statut : validé par l’exploitant (« okey vas y »), réalisation en cours.

## Objectif

Créer un site privé pour exploiter LocaMap au quotidien : examiner les dossiers hôtes, modérer les annonces, retrouver un utilisateur, répondre au support, suivre les réservations et gérer les contenus. Le site utilise les données du backend LocaMap et distingue explicitement staging et production.

Le périmètre de lancement reste celui décidé par l’exploitant : réservations sans encaissement dans l’application. Un montant de réservation n’est jamais présenté comme un paiement reçu ou un revenu encaissé.

Hypothèse proposée pour les accès : un administrateur principal au lancement, avec des rôles limités prévus pour une équipe ultérieure. Le compte principal devra être identifié par son UUID Supabase vérifié ; une adresse saisie dans le navigateur ne donne aucun droit. Le contact support connu est peter23xp@gmail.com, mais cette connaissance ne vaut pas attribution d’un accès.

## Choix d’architecture

Trois approches ont été considérées :

1. **Site web React/TypeScript dédié, dans `admin/`, connecté à Supabase — recommandé.** Navigation et tableaux adaptés au bureau, déploiement indépendant et même logique métier que l’application. Le code reste dans le dépôt existant. Les dépendances et commandes de compilation sont isolées de Metro.
2. **Écrans administratifs dans l’application Expo.** Réutilise davantage de composants mais mêle l’exploitation aux parcours locataire/hôte et contraint les écrans denses. Moins adapté à la demande d’un site de gestion.
3. **Outil d’administration générique externe.** Démarrage plus rapide pour consulter des tables, mais les pièces KYC privées, les règles de réservation, les décisions motivées et le design LocaMap demanderaient toujours une intégration spécifique.

La solution recommandée emploie Vite, React et TypeScript pour le site, Supabase Auth pour la connexion et des fonctions Edge dédiées pour les opérations privilégiées. Elle ne nécessite pas un nouveau serveur applicatif permanent. L’hébergement statique pourra utiliser Cloudflare Pages ; aucun domaine n’est inventé. Le premier environnement d’essai est le staging autorisé `uwoesteqkprwitnhfmes`.

Le site utilise uniquement l’URL Supabase et une clé publique côté navigateur. `service_role`, les secrets R2 et les clés de signature restent dans les fonctions serveur. La sélection de l’environnement vient de la configuration de déploiement, jamais d’un champ libre permettant de cibler une autre base.

## Organisation des écrans

### Accueil : À traiter

L’accueil commence par les dossiers nécessitant une action : identités en attente, annonces à relire, conversations signalées, tickets ouverts. Chaque compteur ouvre une liste réellement filtrée. Les dossiers les plus anciens et les demandes urgentes restent visibles avec leur date ; aucun délai de réponse public n’est inventé.

Un résumé secondaire indique les utilisateurs, annonces et réservations par état. Les erreurs de chargement restent distinctes d’un compteur à zéro. Les statistiques proviennent de requêtes agrégées bornées, pas du téléchargement de toutes les lignes.

### Utilisateurs

Recherche paginée par nom, email ou identifiant ; filtres locataire/hôte, vérification et état du compte. Une fiche présente identité, coordonnées utiles au support, annonces, réservations et dossiers associés, avec historique des actions administratives.

Suspension et réactivation sont réservées à l’administrateur principal et demandent un motif. Une suspension doit prendre effet dans les fonctions serveur et la base même avec un jeton d’accès encore valide : masquer un bouton ou bannir seulement la prochaine connexion ne suffit pas. Les réservations en cours restent conservées et signalées à l’opérateur ; aucune annulation implicite n’est effectuée.

Le site ne permet pas de lire un mot de passe, de prendre la session d’un utilisateur ou de supprimer sans contrôle tout son historique. Les demandes d’effacement suivent la procédure existante et ses blocages liés aux réservations.

### Validations hôtes

Liste des demandes `PENDING`, approuvées et refusées ; ouverture d’un dossier avec nom déclaré, coordonnées utiles et justificatifs.

Les documents sont chargés à la demande par une URL R2 privée signée pour 60 secondes. Le serveur vérifie que la clé appartient au dossier exact, a été finalisée et correspond à un objet KYC. La réponse et la page sont sans cache ; les URL signées et le contenu des documents ne vont pas dans les journaux.

L’opérateur choisit « Valider l’hôte » ou « Refuser le dossier » avec une note factuelle. Le refus exige un motif compréhensible. Le serveur s’appuie sur `review_host_application` et vérifie la version soumise : un ancien onglet ne doit pas valider des documents remplacés entre-temps. Décision, auteur et date sont enregistrés dans la même transaction.

### Annonces

Liste avec photo, titre, hôte, lieu, loyer mensuel en RWF, date de soumission et statut. Fiche de revue avec photos, description, position, capacité, équipements et règles.

Actions : publier une annonce en attente, la retourner en brouillon avec demande de correction, suspendre une annonce et réexaminer une suspension. Une demande de correction utilise l’état existant `DRAFT` et conserve son motif, sans inventer un statut que l’application ne comprend pas.

Une publication vérifie de nouveau les prérequis et l’état de l’hôte. Chaque mutation contrôle la version courante et laisse une trace. La suspension avertit l’administrateur des réservations actives sans les annuler. Une restauration après suspension passe par la revue, jamais par un simple bouton client.

### Réservations

Recherche par référence, logement, hôte, voyageur, dates et état. Détail avec durée, montant calculé, devise, dépôt affiché séparément, historique et ticket associé.

La première version fournit le suivi et la prise en charge des litiges par le support. Les approbations restent à l’hôte et les annulations aux participants selon les règles existantes. Elle ne modifie pas directement les prix, les participants ou le calendrier pour forcer une réservation.

### Assistance et signalements

Tickets : files par priorité et état, attribution à un opérateur, historique des échanges, réponse du support, résolution et réouverture. Le libellé technique `WAITING_HOST` est affiché « En attente du demandeur ». Un brouillon de réponse reste distinct de son envoi ; un double clic ne crée pas deux messages.

Les réponses utilisent `support_ticket_messages` avec l’identité de l’opérateur vérifiée côté serveur. Les notifications dans l’application sont conservées. Le site ne promet pas de diffusion email, SMS ou push, absente de la configuration actuelle.

Signalements : examiner les conversations actuellement `REPORTED`, consulter le contexte nécessaire, geler ou clore le signalement avec motif. Les conversations ordinaires ne deviennent pas un annuaire librement consultable. Les accès au contenu signalé sont journalisés.

Limite du modèle existant : la catégorie de signalement choisie dans l’application n’est pas enregistrée par `set_conversation_status`. Une évolution ciblée enregistrera l’auteur, la catégorie, la date et la résolution pour les nouveaux signalements. Les anciens seront clairement présentés comme dépourvus de motif enregistré.

### Contenus

Gestion des FAQ, guides locaux et catégories, articles, formations et étapes. Formulaires propres à chaque type, aperçu du contenu, sauvegarde d’un brouillon et publication explicite. Réutiliser les champs actuels ; ajouter des brouillons administratifs séparés lorsque la table publique n’en possède pas afin qu’une sauvegarde ne publie pas accidentellement.

Les articles conservent leurs langues FR/EN/RW/SW. Les autres contenus ne sont pas présentés comme traduits lorsque leur schéma ou leur contenu ne le permet pas. Aucun contenu réel n’est remplacé par une donnée de démonstration.

Les documents juridiques disposent d’une version et d’un historique préservé. Les projets de textes déjà rédigés restent des brouillons : leur publication exige les informations légales définitives et une action explicite de l’exploitant. Le nom légal et l’adresse précise de l’exploitant restent à fournir avant cette publication.

### Exploitation et journal

Afficher les erreurs applicatives enregistrées, les quotas configurés, l’état des demandes de suppression R2 et les données de santé réellement disponibles, avec leur date. Un contrôle non disponible est indiqué comme tel. Une page verte ne constitue pas une preuve de sauvegarde ou de restauration.

Les plafonds existants peuvent être modifiés par l’administrateur principal dans des bornes validées, avec motif et journalisation. Les secrets se gèrent dans les services d’hébergement ; aucun formulaire ne les révèle dans le site.

Journal consultable par date, opérateur, objet et action. Conserver les changements utiles et les identifiants, sans justificatifs, mots de passe, conversations complètes ou URL signées. Les actions de suppression définitive, de restauration de base et les opérations financières ne sont pas des boutons du premier site.

## Accès et sécurité

- Table serveur `admin_members` distincte des profils publics. Rôles envisagés : `owner`, `moderator`, `support`, `editor` ; seul `owner` administre les accès et les réglages sensibles. Aucun rôle ne provient de métadonnées modifiables par le client.
- Connexion sans inscription administrative publique, avec validation en deux étapes TOTP pour accéder aux fonctions privilégiées. Réutiliser le parcours de récupération Supabase configuré ; ne pas inventer un envoi email déjà opérationnel.
- Vérifier l’identité, le niveau MFA, l’appartenance active et l’autorisation de l’action à chaque requête. Une révocation de membre doit être effective dès la requête suivante. L’interface masquée n’est pas le contrôle d’autorisation.
- API par actions et ressources explicitement autorisées. Aucun endpoint « table + requête SQL » ni CRUD générique avec `service_role`.
- RLS et privilèges explicites pour les nouvelles tables. Les fonctions SQL privilégiées ne sont exécutables que par le rôle serveur et valident l’acteur transmis après authentification.
- Mutations métier et journal atomiques ; contrôle de concurrence par version/date ; clés d’idempotence pour les envois et actions pouvant être rejoués. Une réponse perdue se résout par une relecture d’état avant de recommencer.
- Validation et limites serveur : identifiants UUID, champs autorisés, tailles, transitions et pagination. Quotas dédiés aux opérations administratives ; erreurs publiques lisibles sans fuite de requêtes ou de secrets.
- Origines autorisées explicitement, HTTPS en hébergement, politique de contenu restrictive, rendu textuel sûr des contributions utilisateurs, aucune insertion HTML brute depuis les annonces ou messages.
- Journaliser aussi les consultations sensibles KYC et signalements. Autoriser la lecture du journal, pas son édition depuis le site. La conservation effective doit respecter la politique de données que l’exploitant fixera.

Le premier accès se configure par une commande serveur ciblée après vérification de l’UUID du compte. Il n’est jamais automatiquement attribué à « la première personne inscrite » ou à une simple adresse connue. La recette utilise des comptes synthétiques, pas une promotion implicite d’un compte réel.

## Direction visuelle

Un opérateur traite plusieurs dossiers sur un ordinateur en journée et peut consulter une urgence depuis son téléphone. L’interface claire privilégie les textes, les statuts et les actions comparables.

- Logo original `assets/icon.png`, proportions et couleurs conservées.
- Palette existante : orange `#F58F20` avec texte `#363636` pour l’action principale ; vert `#467434` pour sélection et confirmation ; gris `#363636` pour le contenu.
- Barre latérale sobre sur ordinateur : À traiter, Utilisateurs, Hôtes, Annonces, Réservations, Assistance, Contenus, Exploitation. Accès au journal et au compte au même endroit sur chaque page.
- En-tête avec fil d’Ariane, titre et environnement visible. Recherche et filtres au-dessus des données, sans grand bloc décoratif ni rangée de faux indicateurs.
- Tables lisibles sur ordinateur ; sur petit écran, lignes résumées ouvrant une fiche pleine largeur. La navigation se replie. Le panneau de détail permet de revenir à la liste en conservant filtres, pagination et position.
- Typographie système, corps 14–16 px, titres 24–28 px, espacements réguliers ; rayons de 8–12 px. Les statuts ont un libellé en plus de leur couleur.
- Un seul état de chargement par zone. Une mutation conserve les données affichées et rend uniquement son action occupée. Les erreurs sont proches du champ ou de l’action ; focus clavier, annonces accessibles et mouvements réduits sont prévus.
- Interface d’administration initialement en français, sans changer les langues disponibles dans l’application publique.

## Découpage de réalisation

1. Fondations : site, connexion/MFA, rôles, API, journal, composants et recette des refus d’accès.
2. Gestion quotidienne : utilisateurs, dossiers hôtes, annonces, réservations, support et signalements.
3. Gestion éditoriale et exploitation : brouillons, publications, erreurs, quotas, suivi des purges et documentation d’utilisation.

Ces étapes constituent la réalisation du périmètre proposé. Un module présenté dans le menu doit fonctionner avec les données réelles ou afficher une indisponibilité précise ; aucune fausse fonctionnalité ne sert de remplissage.

## Recette attendue

- Tests SQL des droits : anonyme, utilisateur normal, administrateur, rôles limités, membre révoqué et compte suspendu avec ancien jeton. Non-régression des réservations, du calendrier, des profils et du support.
- Tests des fonctions Edge : JWT/MFA, permissions, origine refusée, pièce d’un autre dossier, clé R2 arbitraire, expiration, limites et erreurs réseau.
- Tests des mutations : deux opérateurs sur le même dossier, nouvelle soumission après ouverture, double clic, replay, échec du journal, conservation des historiques et des réservations en cours.
- Recette visuelle et clavier à 390, 768 et 1440 px : connexion, file de validation, fiche hôte, annonce, utilisateur et ticket. Contraste, focus, absence de débordement et états vides/erreur/chargement vérifiés.
- Parcours de staging sur comptes dédiés : soumettre un dossier, l’examiner, refuser puis soumettre à nouveau et valider, publier une annonce synthétique, répondre à un ticket de recette, retirer l’accès administrateur et vérifier les refus.
- Compilation du site, contrôle TypeScript, tests pertinents du mobile et tests de sécurité existants. Vérifier qu’aucune clé serveur n’est présente dans le bundle ou les journaux.
- Avant toute déclaration « en ligne » : vérifier l’hébergement réellement actif, ses origines Auth/API et la connexion au bon projet. Les résultats locaux et la validation distante sont rapportés séparément.

## Sources examinées

`PRODUCT.md`, `DESIGN.md`, `docs/EXPLOITATION.md`, `docs/BACKEND-DEPLOYMENT.md`, migrations `001` à `005`, `supabase/functions/_shared/http.ts`, `supabase/functions/_shared/r2.ts`, `supabase/tests/run-security.mjs` et `src/services/api/message.service.ts`.

Les modifications mobiles déjà présentes dans le répertoire de travail sont conservées. Ce document ne valide ni leur publication ni une modification de comptes réels.
