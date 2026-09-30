# Correctifs annonces, recherche, favoris, avis et alertes

## Parcours connectés

- La recherche interroge Supabase avec les filtres de prix mensuel RWF, type, chambres, équipements, date et limites géographiques. Pagination stable de 40 résultats; les anciennes réponses ne remplacent plus une recherche récente et les erreurs de rafraîchissement conservent les résultats affichés.
- Les fiches chargent leur identifiant depuis le serveur, indépendamment du cache. L'adaptateur expose `owner.id/name/avatar`, `location.coordinates` (y compris une latitude égale à zéro), des URL de photos ordonnées et les conditions locatives réellement enregistrées.
- Le formulaire utilise le compte authentifié, crée un `DRAFT`, téléverse les photos sélectionnées via le stockage vérifié, associe leur ordre/couverture puis soumet `PENDING_REVIEW`. Seule la modération serveur active l'annonce. Les brouillons existants se reprennent par `CreateListing({propertyId})`.
- Une erreur partielle conserve l'identifiant du brouillon. Une nouvelle tentative relit les photos déjà associées; la suppression et le réordonnancement sont enregistrés. Les URL locales ne sont pas publiées. Les images importées sur l'appareil doivent être resélectionnées si le formulaire est fermé avant leur envoi.
- La saisie des loyers est exclusivement en RWF. Les anciens prix d'une autre devise sont refusés à l'édition plutôt que réétiquetés. Les vues ne multiplient plus le loyer par 25 et n'appliquent plus de taux fictif; la commission simulée a été supprimée.
- Les favoris et les éléments enregistrés partagent une seule collection serveur `favorites`. Les écrans chargent la collection, ne valident pas une écriture rejetée et réinitialisent leurs données lors d'un changement de compte. Une réponse commencée avant un aller-retour entre comptes est ignorée.
- Les avis sont lus depuis Supabase avec les auteurs publics. L'envoi exige une réservation terminée; l'identité authentifiée, la vérification et les moyennes sont contrôlées côté serveur. Le client n'essaie plus de mettre à jour l'annonce d'un autre propriétaire après un avis.
- Les critères d'alertes sont enregistrés, leurs activations/suppressions sont disponibles, et les nombres affichés proviennent d'un comptage serveur exact. Les quartiers proposés viennent des annonces accessibles. Le stockage de préférences ne constitue pas à lui seul une chaîne de livraison push; celle-ci dépend du déploiement des services correspondants.
- Les notes, distances, dates et alertes fictives des écrans de recherche ont été retirées. Les équipements utilisent des identifiants stables indépendants de la langue. Le filtre de proximité sans coordonnées de référence a été retiré.
- La fiche propose une demande de réservation pour une annonce active appartenant à un autre compte. Le parcours `BookingRequest` est intégré par le lot principal.

## Contrats et dépendances

Les migrations de sécurité et les nouvelles vues publiques sont requises: `favorites(user_id, property_id, created_at)`, `public_profiles`, garde des statuts des annonces, contrôle des réservations et agrégats d'avis. Les nouveaux champs `size`, `visitors_allowed` et `noise_after22` sont enregistrés. Le téléversement utilise `uploadPhoto(..., 'properties')`, qui signe puis finalise le fichier avant de retourner son URL publique.

La recherche générale liste les annonces `ACTIVE` en RWF. Le service accepte une boîte géographique; il ne prétend pas calculer une distance à des points d'intérêt qui ne sont pas renseignés. La liste des quartiers est limitée aux 1 000 premières lignes de quartiers publics, dédoublonnées côté client.

## Vérifications locales

Tests Vitest des vrais stores/adaptateurs avec la seule frontière Supabase et le téléversement simulés: coordonnées zéro, propriétaire, images, prix mensuel, récupération par identifiant, échec/race de recherche, erreur de favori, séparation A/B et A/B/A, brouillon conservé après erreur d'envoi, refus des conversions implicites, suppression de photo, modification partielle, filtrage/pagination et calendrier de février, absence d'écriture client des agrégats d'avis.

Les cinq suites `tests/property-*.test.ts` passent: 18 tests au dernier passage précédant la clôture du lot. TypeScript a terminé sans diagnostic sur l'ensemble du projet à ce stade. Les wrappers `try/catch` qui relançaient simplement l'erreur ont été retirés; les erreurs backend restent propagées.

Les quatre catalogues contiennent 1 187 clés chacun, sans clé manquante ni variable d'interpolation différente. Les traductions manquantes ont été rédigées dans chaque langue, sans remplissage français. Cela vérifie la couverture technique; la validation linguistique humaine, particulièrement en kinyarwanda et swahili, reste une étape de recette.

Aucune migration distante, écriture de donnée réelle, réservation, création de compte ou téléversement réel n'a été effectué. La recette avec deux comptes et un administrateur, sur téléphone puis après redémarrage/coupure réseau, nécessite un environnement Supabase déployé.
