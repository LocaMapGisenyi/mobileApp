# Rapport des corrections backend

Périmètre : constat du 29 septembre 2026, migrations additives 002–004, fonctions Edge, services support/co-hôtes/parrainage/consentement et adaptations ciblées de leurs écrans. `001_init.sql` est conservé. Aucun déploiement, compte réel, email, paiement ou suppression distante n’a été exécuté.

## Causes et corrections

- Les politiques par ligne initiales n’isolaient pas les colonnes sensibles. La lecture du profil devient privée ; une vue projette explicitement les seuls champs publics. Les droits de colonnes protègent KYC, rôle hôte, vérification de versement et montant des crédits.
- L’insertion libre de participants créait une escalade vers les conversations d’autrui. Les participants sont désormais créés atomiquement par une RPC authentifiée et ne peuvent plus être modifiés directement. Les messages déclenchent serveur les résumés, compteurs et notifications ; les lectures utilisent une RPC avec verrou commun.
- Les réservations initiales faisaient confiance à hôte/prix/statut envoyés par le client. Le devis et la création déduisent ces valeurs côté serveur, valident durée/occupation, incluent les tarifs journaliers et préviennent l’acceptation de deux demandes qui se chevauchent via verrou du logement. Le calendrier réservé est protégé.
- Les décisions de modération et avis vérifiés étaient déclarables par leur bénéficiaire. Les annonces passent désormais en révision avant publication administrateur ; une modification de contenu/photos relance la révision. La vérification d’avis dépend d’une réservation terminée, cohérente et non déjà évaluée.
- Favoris, applications hôtes privées, préférences de paiement non sensibles et registre d’envoi sont de vraies tables avec RLS. Les KYC ne peuvent être soumis qu’après finalisation privée vérifiée.
- La signature R2 manuelle est remplacée par le SDK AWS SigV4. Les fonctions valident authentification, méthode, origine, taille/MIME/extension et configuration. Les URL PUT de 5 minutes écrivent uniquement en zone temporaire. La copie finale est contrôlée par ETag et verrou de finalisation.
- L’export et la suppression sont implémentés sur le serveur. Une suppression bloquée par des réservations actives retourne 409 ; une suppression autorisée supprime l’identité Auth en transaction et utilise une file durable pour les fichiers R2 résiduels.
- Les consentements exigent la version serveur et sont immuables. Le support possède des messages identifiés, des compteurs actualisés par trigger et une notation réservée au propriétaire du ticket. Les co-hôtes doivent consentir aux permissions prises en charge ; une modification force un nouvel accord. Le parrainage possède émission/rattachement et crédit administratif idempotent, sans promesse fictive de gains automatiques.
- Les services propagent les erreurs ; les écrans co-hôtes et parrainage présentent les limites réelles, les invitations reçues, la sélection de logements et l’enregistrement de code. L’annuaire fictif et les permissions non opérationnelles sont désactivés. Les promesses de commission, de bonus et de détection automatique de fraude non implémentées sont retirées.

## Preuves locales

Le test baseline a échoué comme attendu : un utilisateur tiers lisait une ligne privée contenant l’email d’un autre compte, au lieu de zéro. Une seconde régression a révélé que les privilèges par défaut pouvaient rendre la vue publique modifiable : un test a reproduit l’élévation KYC par cette vue avant révocation explicite de tous ses droits d’écriture. Le runner contient désormais 51 contrôles PostgreSQL PGlite, couvrant isolation, escalades, devis sans mutation, prix changé, invariants de réservation, avis, suppression, délégation et consentement.

Le contrôle TypeScript Deno des cinq fonctions Edge a été exécuté avec succès. Les sept tests Edge passent : validation d’images, méthode/authentification/origine, corps invalide, erreurs privées et signature SigV4 locale, sans joindre R2. Le test de signature a identifié un appel Node `osRelease` inutile ; un fournisseur d’agent utilisateur fixe supprime cette dépendance aux permissions système. Un contrôle TypeScript complet de l’application a également réussi ; la validation finale d’intégration relève du parent car les autres écrans évoluent en parallèle.

Le runner utilise `SELECT * FROM rpc(...)` afin de ne pas évaluer plusieurs fois une fonction composite au moyen de `(rpc(...)).*`. Les adaptateurs doivent accepter la forme de réponse composite produite par la version PostgREST utilisée et vérifier ce transport sur staging.

## Limites externes explicites

Pas de PostgreSQL Docker/psql sur cet environnement : les transactions multi-connexion et les extensions Supabase hébergées n’ont pas été exercées. Aucun appel R2 réel, déploiement Edge, validation GoTrue/PostgREST ni notification appareil n’a été effectué. La signature binaire des images ne remplace pas un antivirus. Le traitement administratif KYC/modération/support nécessite un opérateur autorisé ; aucune console d’administration graphique n’est créée.

Les migrations préservent les données historiques ; leur qualité, leurs anciens statuts de confiance et leurs conflits éventuels doivent être examinés avant validation des contraintes. Les fichiers historiques absents du registre demandent une reprise dédiée. Il faut configurer les secrets, CORS, bucket privé, cycle de vie des fichiers temporaires et ordonnanceur de purge décrits dans `BACKEND-DEPLOYMENT.md`.

Les encaissements, confirmations prestataires, remboursements, push appareil, emails/SMS automatiques, rapprochement financier et utilisation monétaire des crédits restent des intégrations externes non attestées. Le code ne prétend pas les avoir réalisées.
