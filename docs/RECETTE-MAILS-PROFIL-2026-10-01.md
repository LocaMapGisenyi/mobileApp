# Recette — emails, chargements et profil locataire

## Emails

Voir [EMAILS-RESEND.md](EMAILS-RESEND.md) pour la configuration SMTP réellement appliquée. Inscription et récupération de mot de passe ont chacune produit un email **Delivered** dans Resend, à son destinataire de test officiel. Le compte synthétique créé pour ces essais a été supprimé après vérification. Aucun email de recette n’a été envoyé à un utilisateur réel.

## Chargements

`ContentSkeleton` fournit les variantes liste, cartes, fiche, formulaire, calendrier, tableau de bord, conversation, profil, article et carte géographique. Une région possède une seule animation, suspendue en arrière-plan et désactivée si la réduction des animations est activée. VoiceOver dispose d’un libellé de chargement ; les formes décoratives sont masquées aux lecteurs d’écran.

Les chargements initiaux utilisent ces squelettes. Les opérations telles qu’enregistrer/envoyer conservent un indicateur compact et un bouton désactivé. La pagination des réservations hôte est distinguée de l’actualisation afin de ne pas afficher les deux indicateurs simultanément.

Recette visuelle dans le moteur Expo web : variantes à 390 px, calendrier à 320 px, cartes à 768 et 1280 px. Aucun débordement horizontal relevé, une région de chargement par aperçu. Le banc d’aperçu temporaire a été retiré. Sur une vraie fiche de staging, le squelette a été observé puis remplacé par la fiche sans erreur console.

## Profil locataire

- « Modifier le profil » ouvre directement l’éditeur. « Compte et sécurité » conserve son accès explicite aux paramètres.
- Informations personnelles, photo, présentation et langues ouvrent les champs correspondants. Les mises à jour partielles préservent les autres rubriques.
- Photo : aperçu, téléversement vérifié dans R2, retrait, messages précis pour taille/format refusés.
- Formulaire : sauvegarde protégée contre les doubles pressions, lecture réessayable, erreurs locales, défilement du champ actif lorsque le clavier apparaît, protection contre les réponses d’une ancienne session.
- Langue/devise : dialogue utilisable sur web et mobile. La seule devise proposée reste RWF.
- Fonctions de double authentification et de gestion des appareils encore indisponibles : indication visible sans action trompeuse. Les notifications métier demeurent dans l’application ; le SMTP Resend concerne l’authentification.

Avec le locataire synthétique du staging : enregistrement du nom, de la présentation et des langues, contrôle direct en base, reconnexion et relecture ; modification de la présentation seule avec conservation du nom, des langues et de la photo ; envoi puis retrait d’une photo avec contrôle du champ `avatar_url` ; passage du français à l’anglais puis retour au français. Les données initiales du profil ont été restaurées et contrôlées. La photo temporaire devenue non référencée relève du nettoyage de stockage existant.

## Contrôles techniques

- TypeScript : réussi.
- Vitest : 220 tests réussis, 36 fichiers, dont 5 tests des mises à jour partielles du profil.
- ESLint : aucune erreur sur les fichiers modifiés ; les avertissements historiques restent visibles.
- Exports Expo web, Android et iOS : réussis. Ce sont des bundles JavaScript/Hermes, pas des binaires signés.
- Revue indépendante : problèmes d’accessibilité du squelette et de messages de validation photo corrigés, aucun autre point bloquant relevé.

Le clavier iOS, VoiceOver sur appareil et l’ouverture du lien reçu dans une boîte personnelle restent à confirmer sur l’iPhone. Les captures et scripts de recette sont conservés localement dans `.expo/` et ne contiennent pas de clé Resend.
