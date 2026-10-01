# Emails d’authentification via Resend

Configuration appliquée et vérifiée le 1 octobre 2026 sur le projet LocaMap `uwoesteqkprwitnhfmes`, utilisé pour la recette.

## Configuration active

- Fournisseur : SMTP personnalisé de Supabase Auth, hébergé par Resend.
- Serveur : `smtp.resend.com`, port TLS `465`, utilisateur `resend`.
- Expéditeur : `LocaMap <notifications@peterakilimali.site>`.
- Domaine personnel vérifié : `peterakilimali.site`, utilisé provisoirement avec l’accord du propriétaire.
- Clé `LocaMap Supabase Auth`, permission **Sending access** limitée à ce domaine. Elle est stockée dans la configuration SMTP chiffrée de Supabase. Elle n’est présente ni dans le dépôt ni dans les variables Expo publiques.
- Intervalle entre emails au même utilisateur : 60 secondes.
- Limite Supabase observée après activation : 30 emails par heure.
- Formule Resend Free observée : 100 emails par jour et 3 000 par mois. Ces quotas sont partagés avec les autres applications de ce compte Resend.

Les appels existants à `supabase.auth.signUp` et `resetPasswordForEmail` utilisent automatiquement Resend. Aucun SDK Resend n’est nécessaire dans l’application mobile. Supabase continue de générer et vérifier les liens d’authentification.

## Vérification effectuée

Inscription d’un compte synthétique avec l’adresse de test officielle `delivered+locamap-auth-…@resend.dev`, puis demande de réinitialisation : les deux appels Supabase ont réussi et Resend a affiché **Delivered** pour « Confirm your email address » et « Reset your password ». Il s’agit du destinataire de test Resend, pas d’une boîte Gmail réelle. Le compte synthétique est nettoyé après la recette.

Le retour web `http://localhost:8097/auth/recovery` est autorisé. Le retour Expo Go exact `exp://10.25.117.203:8097/--/auth/recovery` a été ajouté pour le réseau actuel. Si l’adresse LAN du PC change, mettre à jour cette URL dans Supabase. Le retour de l’application staging signée reste `locamap-staging://auth/recovery`.

Les modèles Supabase existants restent en anglais. Le routage SMTP ne configure pas les notifications métier, les campagnes ni les SMS. Vérifier aussi la réception et l’ouverture du lien sur l’iPhone avec une adresse personnelle avant le lancement public.

## Changer de domaine plus tard

1. Ajouter et vérifier le domaine définitif dans Resend, avec les enregistrements DNS proposés.
2. Créer une clé d’envoi limitée à ce domaine.
3. Remplacer l’expéditeur et le mot de passe SMTP dans Supabase, puis refaire les deux essais.
4. Révoquer l’ancienne clé dédiée après validation. Mettre à jour les URLs Auth lorsque le site public est disponible.

Surveiller les erreurs et la délivrabilité dans Resend → Emails/Logs, et les limites dans Supabase → Authentication → Rate Limits. Conserver un plafond cohérent avec le forfait ; augmenter le plafond Supabase ne relève pas celui de Resend.

Référence : [guide officiel Resend pour Supabase SMTP](https://resend.com/docs/send-with-supabase-smtp).
