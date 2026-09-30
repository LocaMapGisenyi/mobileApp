# Authentification, messages et comptes — corrections du 29 septembre 2026

## Modifications

- La session Supabase utilise SecureStore sur Android/iOS et AsyncStorage sur le web. L'identité et les jetons ne sont plus persistés dans le store Zustand. Les anciens caches `user-storage-v2` et `messages-storage` sont supprimés à l'initialisation. La préférence d'accueil est un booléen propre à l'identifiant authentifié.
- Le rappel `onAuthStateChange` est synchrone. Les lectures de profil démarrent dans une tâche ultérieure ; les réponses devenues obsolètes après un changement de session sont ignorées. Une déconnexion échouée renvoie une erreur, elle ne produit plus un succès local fictif.
- `accountScope.ts` permet de vider les stores privés au changement de compte. Messages et formulaire hôte y sont inscrits ; les stores de logements/favoris sont isolés par leurs propres abonnements au store utilisateur.
- Les demandes de réinitialisation incluent une URL de retour. `authLinks.ts` valide le protocole, l'hôte et le chemin de retour, échange le code ou les jetons, puis ouvre `NewPasswordScreen`. Les erreurs de lien et de sauvegarde sont affichées. Google/Facebook sont explicitement indiqués comme indisponibles.
- Les conversations invité et hôte utilisent les mêmes tables et services. Aucune réponse automatique fictive n'est créée. Les profils des interlocuteurs proviennent de `public_profiles`. Création, lecture et archivage passent par les RPC sécurisées. Les aperçus et compteurs sont maintenus par le serveur.
- Les messages sont paginés par `(created_at, id)` pour conserver les messages de même date. Les abonnements temps réel se réabonnent et actualisent après reconnexion. Les erreurs sont visibles. Un brouillon d'envoi échoué est conservé. Un accusé serveur n'est pas affiché comme une réception ou lecture par l'interlocuteur.
- Les comptes disposent d'un éditeur de profil commun et de l'envoi réel d'avatar. Les préférences de notifications sont stockées sur le serveur. Les moyens de paiement invités sont des préférences et libellés masqués, sans numéro complet de carte et sans encaissement.
- L'export appelle `account-export` et fournit le JSON : téléchargement web, feuille de partage native. La suppression appelle `account-delete` avec confirmation, vérifie `deleted`, puis déconnecte. Un refus de suppression conserve le compte et affiche une erreur.
- L'envoi d'image lit et valide le fichier avant la signature, réalise le PUT puis appelle `finalize-upload`. Seuls la clé et l'URL immuables renvoyées par cette vérification sont retenues. Les justificatifs hôtes ne reçoivent aucune URL publique.
- Le formulaire hôte envoie ses trois justificatifs privés puis appelle `submit_host_application`. L'état « envoyé » suit uniquement la réponse serveur. La page explique la vérification préalable à la publication ; elle ne donne pas elle-même le rôle hôte.

## Revue complémentaire confiée pendant le lot

- Les ressources et guides ne convertissent plus une erreur réseau en catalogue vide réussi. Les favoris d'articles utilisent `user_bookmarks` et le compte authentifié, au lieu d'un cache partagé. La progression d'une formation n'est confirmée qu'après écriture réussie. Les articles disposent d'une lecture de leur contenu réel.
- Les tickets de support, réponses et évaluations affichent les erreurs. Les numéros et emails fictifs ont été remplacés par `EXPO_PUBLIC_SUPPORT_WHATSAPP`, `EXPO_PUBLIC_SUPPORT_PHONE` et `EXPO_PUBLIC_SUPPORT_EMAIL`. Sans configuration, l'interface indique l'indisponibilité et propose un ticket.
- Le lecteur des guides embarqués ne simule plus son délai de chargement. Les préférences de guide sont locales et propres au compte. Le parseur conserve maintenant chaque ligne de paragraphe et reconnaît les encadrés `[INFO]`, `[TIP]` et `[AVOID]`. Aucune URL de partage fictive n'est fournie.
- `NotificationsScreen` utilise le hook réel de notifications, le compteur total serveur, les 50 notifications les plus récentes, la lecture et l'actualisation. Le hook ignore les réponses d'un ancien compte. L'interface précise que les notifications fonctionnent dans l'application ; les canaux push/email/SMS et distributions non implémentées ne sont plus proposés comme activables.

## Intégration dans App et navigation

Le parent a raccordé dans `App.tsx` : `installAuthLinkListener` et son nettoyage, `initAuth`/`disposeAuth`, le renouvellement Supabase selon `AppState`, le rendu de `NewPasswordScreen` lorsque `passwordRecovery` est actif, l'affichage des erreurs d'authentification et un seul abonnement global à `useMessagesStore.connect(userId)`.

La route `Notifications` vers `src/screens/NotificationsScreen.tsx` et son accès depuis le profil sont raccordés. Aucun nouvel appel natif de linking, de push ou de stockage supplémentaire n'est nécessaire. La garde après `initializeLanguage` vérifie que l'effet App est toujours monté avant d'appeler `initAuth`, afin de ne pas recréer un abonnement après le nettoyage de l'effet ; la correction a été relue dans App.

Le modèle Database doit décrire `public_profiles`, `user_payment_preferences`, `host_applications`, `notification_preferences.alert_matches` et les RPC du lot backend. `get_or_create_conversation` accepte la représentation transport en objet ou tableau d'une ligne du résultat composite PostgREST.

## Contrats backend nécessaires

- `get_or_create_conversation(p_other_user_id, p_property_id)` ; `mark_conversation_read(p_conversation_id)` ; `set_conversation_status(p_conversation_id, p_status)`.
- `submit_host_application(p_legal_name, p_document_keys, p_payout_details)` ; stockage privé des documents et approbation serveur du rôle hôte.
- `get-upload-url({mimeType, entity, extension, sizeBytes})` puis `finalize-upload({key})`, qui confirme `verified` et renvoie les références finales.
- `account-export({})` renvoie `{exportedAt, user, data}` ; `account-delete({confirmation:'DELETE'})` confirme `{deleted:true}`. Le serveur peut refuser des réservations actives et planifier le nettoyage résiduel des médias après expiration des URL signées.
- Publication temps réel des tables de messages, participants et notifications, avec les autorisations fournies par la migration de sécurité.

## Vérifications

Les régressions initiales ont été observées avant correction : callback d'authentification renvoyant une Promise, ancienne identité conservée sans session, erreur de déconnexion ignorée, export vide, suppression réduite à la déconnexion, message commis suivi d'une erreur de compteur, insertion d'un message blanc, favori confirmé après refus, faux reçu destinataire, envoi continuant après changement de compte, résultat RPC composite mal lu, erreurs de ressources masquées, favoris partagés et perte de lignes dans les guides.

Les tests unitaires correspondants sont dans `tests/auth-*.test.ts`, `tests/messages-*.test.ts`, `tests/resources-behavior.test.ts` et `tests/guides-content.test.ts`. Ils utilisent des doubles à la frontière Supabase/fetch, sans compte réel ni écriture distante. Vérification finale du lot à 17:21 le 29 septembre : 24 tests réussis dans 9 fichiers ; `tsc --noEmit --pretty false` réussit, code 0 ; ESLint ciblé sur les fichiers de ce lot réussit, 0 erreur et 38 avertissements (imports inutilisés et `any`, principalement préexistants). La régression finale couvre également l'annulation d'un dossier hôte en cours d'envoi après remise à zéro du compte.

## Conditions extérieures et limites vérifiables

Déployer les migrations et fonctions, configurer les secrets du stockage, puis autoriser `locamap://auth/recovery` et l'URL web réelle dans Supabase Auth. `EXPO_PUBLIC_AUTH_REDIRECT_URL` permet une URL personnalisée ; l'hébergement web doit servir l'application à ce chemin. Le schéma natif `locamap` doit être présent dans la configuration Expo.

Les pièces du formulaire en cours restent en mémoire jusqu'à l'envoi ; elles ne sont pas copiées dans un stockage local non chiffré. Les fichiers validés mais non rattachés après un échec partiel nécessitent la politique de nettoyage serveur. Le partage natif d'export fournit actuellement du texte JSON, et doit être essayé avec le volume réel attendu.

Une approbation KYC/modération, une équipe de support et le contenu des ressources restent des opérations serveur. La distribution push/email/SMS, les alertes de recherche programmées, OAuth, 2FA et l'inventaire des appareils ne sont pas activés par ce lot. Le signalement de conversation enregistre son statut serveur ; aucun système administratif de traitement des signalements n'est créé ici.

Aucune connexion réelle, suppression de compte réel, remise à zéro distante, migration distante, publication, transaction ni téléversement réel n'a été exécuté. Les retours de récupération sur Android/iOS, le partage natif et les échanges entre deux comptes doivent être testés sur un environnement de recette configuré.
