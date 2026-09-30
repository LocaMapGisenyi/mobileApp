# Recette des corrections d’interface — 30 septembre 2026

## Corrections

- Profil : `profiles.languages` peut être NULL après inscription. Les réponses du service sont normalisées et l’éditeur protège aussi le nom absent. Un profil introuvable affiche une erreur au lieu d’attendre indéfiniment.
- Sauvegarde : retrait de `updated_at` du PATCH du profil. La migration 002 n’autorise que les colonnes éditables ; le trigger SQL conserve la responsabilité de l’horodatage. Aucun élargissement des permissions.
- Éditeur : formulaire défilant, actions séparées, prise en compte des zones sûres et du clavier.
- Fiche logement : suppression du second en-tête, en-tête en dehors de la photo, image entière avec largeur mesurée, contrôles de galerie en dehors de l’image. Réservation et contact ne sont plus comprimés sur la même ligne ni superposés au contenu.
- Navigation : la barre inférieure réserve sa hauteur et la zone sûre. Suppression des compensations et espaces vides redondants du profil ; l’action « Devenir hôte » reste dans le contenu défilant.
- Carte native : en-tête dans le flux ; commandes éloignées de l’aperçu du logement ; cibles tactiles de 44 points et place conservée pour l’attribution.
- Filtres : zones sûres, clavier, formulaire défilant, action principale distincte, suppression du deuxième bouton de réinitialisation et du symbole monétaire trompeur.
- Favoris : suppression des animations de liste superposées et d’un hook appelé dans une fonction de rendu imbriquée ; compteur affiché une seule fois, contrastes et retours de suppression corrigés.
- Listes : actualisation volontaire distincte du premier chargement (exploration, favoris, messages, éléments enregistrés, notifications, réservations). Les listes existantes restent visibles pendant l’actualisation ; aucun indicateur central simultané avec celui du geste de rafraîchissement.
- Indicateurs : les dix écrans important directement l’indicateur Paper utilisent maintenant celui de React Native. L’indicateur Paper compose deux calques animés ; la fiche n’en instancie pourtant qu’un. Cette substitution vise l’apparence de deux animations superposées signalée sur iPhone, sans modifier la bibliothèque.
- Déconnexion web : boîte de confirmation dans l’application, commune au navigateur et au téléphone (la boîte native `Alert.alert` ne s’affichait pas sur le web).
- Présentation : types de logement traduits ; superficie absente masquée ; boutons et champs principaux mieux nommés pour les lecteurs d’écran.

## Vérifications effectuées

- TypeScript : `npm run typecheck`, code de sortie 0, après les dernières modifications JSX.
- Tests : `npm test`, 129 tests dans 23 fichiers, tous réussis. Huit tests du service profil couvrent NULL, conservation des valeurs, profil absent, refus de lecture/modification et colonnes autorisées. Les régressions NULL et `updated_at` ont d’abord été reproduites par des tests en échec.
- ESLint : code de sortie 0, aucune erreur ; 206 avertissements restent dans le dépôt (principalement types `any` et code inutilisé).
- Navigateur avec compte synthétique du staging existant : connexion, formulaire de profil avec langues vides, sauvegarde réelle réussie et fermeture du formulaire ; favoris vide/rempli, ajout et retrait du seul favori de recette ; filtres et fiche logement ; déconnexion confirmée puis retour effectif à la connexion.
- Rendu examiné à 390 × 844 et 320 × 568. Sur la fiche à 320 pixels : largeur du document 320, photo 320 × 280 située sous l’en-tête, retour 44 × 44, réservation 288 × 48 ; aucun débordement horizontal observé.
- Expo : recompilation iOS servie au téléphone avec le serveur existant, port 8097. Aucun nouveau binaire signé créé.
- Retour utilisateur sur iPhone : profil et affichage de la fiche fonctionnent ; seul le double rendu du chargement persistait avant le remplacement final de l’indicateur.

## Dernier contrôle physique en attente

Réouvrir une fiche logement dans Expo Go après rechargement et confirmer une seule animation. Ce contrôle a été demandé à l’utilisateur ; une validation web ne remplace pas cette observation sur iPhone.

Les tests de mise en page ne constituent pas une validation exhaustive de tous les téléphones, tailles de texte ou annonces. Le compte de recette est synthétique ; ses favoris ont été rétablis à leur état vide. Aucun compte réel ni donnée d’annonce réelle n’a été modifié pour ces essais.

## Envoi des documents hôte et traduction du bouton

- Cause du 403 reproduite : Expo SDK 57 remplace le `Content-Type` explicite par le type du `Blob`. Pour un fichier local dont le type est vide ou générique, cet en-tête ne correspond plus à celui signé par R2. Le stockage renvoie `SignatureDoesNotMatch`.
- Correction : lecture et envoi d’un `ArrayBuffer` pour conserver les octets et le type signés. Le contrôle de taille, l’authentification, la vérification serveur et le caractère privé des documents restent actifs.
- Régression : trois variantes de type local (vide, générique et `image/jpg`) échouaient avec un 403 avant correction et passent ensuite. Les fichiers vides ou dépassant 10 Mo sont refusés avant autorisation.
- Recette R2 avec une image synthétique du dépôt : type incorrect → 403 ; mêmes octets avec le type signé → 200 ; finalisation → 200, `verified: true`, aucune URL publique. Les deux objets de recette ont été placés dans la file de nettoyage programmé et leurs métadonnées d’envoi retirées après vérification de l’absence de référence dans un dossier.
- Le bouton de réservation utilise maintenant `property.requestBooking`, défini en français, anglais, kinyarwanda et swahili.
- Vérification : TypeScript et ESLint ciblé sans erreur ; 134 tests réussis dans 23 fichiers avec `npx vitest run --maxWorkers 1`. Le premier lancement parallèle avait dépassé le délai de 10 secondes du test de configuration Expo ; la suite entière passe avec un seul worker.
- Retour final de l’utilisateur : l’envoi du dossier hôte est passé sur son iPhone. La nouvelle erreur signalée après rechargement ne bloque plus cet envoi.
