# Cartographie LocaMap : Apple Maps, Google Maps et TomTom

## Choix actuel

- iPhone et iPad : `react-native-maps` avec Apple Maps, y compris dans Expo Go. Aucune clé Google n’est nécessaire. L’utilisateur a confirmé le 30 septembre 2026 que les rues s’affichent et que la carte se déplace.
- Android : `react-native-maps` avec Google Maps. Expo Go fournit sa configuration ; un APK/AAB LocaMap doit posséder sa clé Android restreinte.
- Web : MapLibre GL avec les tuiles TomTom Orbis v2. Leaflet et l’ancien composant OpenStreetMap ont été retirés. La carte des logements, la fiche et le choix de position utilisent le même contrat `PropertyMap`.

Les bibliothèques sont gratuites ; les services cartographiques ont leurs propres conditions et quotas. Le choix retenu n’active aucun abonnement payant.

## Clé TomTom pour le web

Créer un compte sur [my.tomtom.com](https://my.tomtom.com/), sélectionner l’offre gratuite et obtenir une clé autorisée à utiliser Map Display / TomTom Orbis. Le tarif consulté le 30 septembre 2026 indique **200 000 requêtes de tuiles par mois** dans l’offre gratuite, sans carte bancaire nécessaire. Une requête de tuile n’est pas un utilisateur : un affichage charge plusieurs tuiles. Suivre le quota dans le compte et vérifier les conditions applicables avant publication.

Renseigner `EXPO_PUBLIC_TOMTOM_MAPS_API_KEY` dans `.env.local`, ignoré par Git, puis recharger le serveur/app après modification. Pour la publication web, fournir la variable à la compilation. Restreindre la clé aux domaines autorisés dans TomTom ; le domaine final n’a pas encore été choisi. Une clé web est visible dans le navigateur, ses restrictions restent nécessaires.

La source appelle uniquement `https://api.tomtom.com/maps/orbis/display/raster/tile/{z}/{x}/{y}` avec `apiVersion=2`, `style=street-light` et `tileSize=256`. Aucun fournisseur de tuiles de secours n’est ajouté. Si la clé manque ou si le service refuse l’accès, l’application affiche une erreur avec une action Réessayer et conserve l’accès à la liste.

`npm ci` exécute `scripts/prepare-map-assets.cjs` : le worker MapLibre, son module partagé et sa licence sont copiés depuis la version installée vers `public/maplibre/`. Expo les sert en développement et les inclut dans l’export web. Si l’installation a été faite avec `--ignore-scripts`, exécuter ce script manuellement avant le serveur ou l’export. Le composant définit explicitement l’URL du worker : la résolution automatique fondée sur `import.meta.url` ne fonctionne pas dans le bundle Metro. Publier l’ensemble de l’export, y compris ce répertoire, avec les fichiers `.mjs` servis en JavaScript.

TomTom Orbis inclut des données TomTom et OpenStreetMap : ses mentions de copyright sont conservées. Cela ne réintroduit ni la bibliothèque Leaflet ni les appels à `tile.openstreetmap.org`. Ne pas supprimer ces attributions.

## Clé Android pour les versions signées

Configurer `GOOGLE_MAPS_ANDROID_API_KEY` dans l’environnement EAS concerné et activer Maps SDK for Android dans son projet Google. Restreindre la clé au package et au SHA-1 du certificat qui signe effectivement le binaire. Staging par défaut : `com.locamap.app.staging`, production : `com.locamap.app`. Le certificat Google Play peut différer du certificat de l’APK EAS.

Le plugin `react-native-maps` reçoit uniquement `androidGoogleMapsApiKey`. Aucun SDK Google iOS ni clé Google iOS n’est configuré. Le vérificateur natif rapporte le fournisseur et la présence des paramètres sans afficher les clés. La compilation iOS n’exige aucune clé Google.

L’accès à la console Google Cloud reste en attente de l’activation de la validation en deux étapes par l’exploitant. Les restrictions de la future clé Android ne sont pas validées. Un test Expo Go ne les valide pas et ne constitue pas un build signé.

## Recette et état observé

- iPhone : Apple Maps fonctionne selon le retour utilisateur ; navigation sur la carte confirmée.
- Google Maps web a été testé avec la clé fournie : Google renvoie `BillingNotEnabledMapError`. Aucune facturation n’a été activée. Cette intégration a été retirée au profit de TomTom, à la demande de l’utilisateur ; la clé Google web n’est plus stockée dans `.env.local`.
- TomTom : clé ajoutée par l’utilisateur dans `.env.local`, puis chargée après redémarrage d’Expo. Une requête réelle Orbis v2 renvoie HTTP 200 et une image PNG. Le composant web réel a été testé dans une page de recette temporaire avec un logement fictif : rues de Gisenyi et prix visibles, sélection du logement et déplacement du repère confirmés, recentrage exécuté, carte de fiche fixe au clavier. Les attributions restent visibles. La page temporaire a ensuite été supprimée.
- Vérification automatique : suite complète de 145 tests réussie avant le réglage du worker, puis TypeScript, 10 tests cartographiques et ESLint ciblé réussis après ce réglage ; audit npm sans vulnérabilité signalée. Cette recette du composant ne remplace pas une recette complète du parcours connecté sur le domaine publié, ni les essais natifs signés.
- Export web de staging réussi (1 582 modules) dans `.expo/tomtom-web-export`, avec les deux modules MapLibre et la licence inclus dans `maplibre/`. Aucun site distant n’a été publié.
- Au déploiement, contrôler les restrictions TomTom avec le domaine définitif et le quota du compte. Vérifier aussi le refus de géolocalisation, le réseau coupé et le retour du réseau dans les parcours complets.

Références : [react-native-maps dans Expo](https://docs.expo.dev/versions/latest/sdk/map-view/), [tarifs TomTom](https://docs.tomtom.com/pricing), [tuiles Orbis v2](https://docs.tomtom.com/map-display-api/documentation/tomtom-orbis-maps/v2/raster/raster-tile), [copyrights Orbis](https://docs.tomtom.com/map-display-api/documentation/tomtom-orbis-maps/v1/copyrights/copyrights).
