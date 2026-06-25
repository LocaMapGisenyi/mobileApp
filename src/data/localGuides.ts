import { Guide, GuideCategory } from '../types';
export type { Guide, GuideCategory };

// Catégories de guides
export const guideCategories: GuideCategory[] = [
  {
    id: 'neighborhoods',
    title: 'Quartiers recommandés',
    icon: 'home',
    description: 'Découvrez les meilleurs quartiers pour vivre à Gisenyi'
  },
  {
    id: 'transportation',
    title: 'Se déplacer à Gisenyi',
    icon: 'car',
    description: 'Comment se déplacer facilement dans la ville'
  },
  {
    id: 'cost_of_living',
    title: 'Coût de la vie',
    icon: 'cash',
    description: 'Budget et dépenses locales pour mieux planifier'
  },
  {
    id: 'safety',
    title: 'Sécurité',
    icon: 'shield',
    description: 'Conseils de sécurité et zones à connaître'
  },
  {
    id: 'expat_tips',
    title: 'Conseils expatriés',
    icon: 'globe',
    description: 'Informations essentielles pour les étrangers'
  },
  {
    id: 'student_life',
    title: 'Vie étudiante',
    icon: 'school',
    description: 'Tout savoir pour les étudiants internationaux'
  }
];

// Guides locaux
export const localGuides: Guide[] = [
  // Quartiers recommandés
  {
    id: 'riverain_district',
    categoryId: 'neighborhoods',
    title: 'Quartier Riverain - La vie au bord du lac',
    summary: 'Le quartier idéal pour les touristes et expatriés recherchant beauté naturelle et tranquillité',
    image: 'https://images.unsplash.com/photo-1593696954577-ab3d39317b97',
    content: `# Quartier Riverain - La vie au bord du lac

Le quartier riverain de Gisenyi est vivement recommandé pour son panorama imprenable sur le lac Kivu et son ambiance généralement détendue et paisible. Cette zone est particulièrement prisée des touristes et des expatriés en quête de beauté naturelle et de tranquillité.

## Points forts
- Vues spectaculaires sur le lac Kivu
- Accès direct aux plages
- Atmosphère calme et reposante
- Plusieurs hôtels et restaurants haut de gamme

## Accès aux services
- Proximité avec plusieurs banques et guichets automatiques
- Hôtels avec services complets (Lake Kivu Serena Hotel)
- Restaurants et cafés de qualité avec vue sur le lac

## Type d'hébergements
On trouve principalement des résidences haut de gamme, des villas luxueuses et quelques appartements de standing. Plusieurs hôtels comme le Lake Kivu Serena Hotel proposent également des séjours de longue durée.

## Prix moyens
- Appartements: 400-600$ par mois
- Villas: 700-1500$ par mois
- Séjours hôteliers: à partir de 180$ par nuit en basse saison, 200-250$ en haute saison

## Idéal pour
Les expatriés, les professionnels en mission longue durée et les familles à la recherche d'un cadre de vie paisible et naturel.

## À noter
Les prix sont généralement plus élevés que dans le reste de la ville, mais la qualité de vie, la sécurité et la beauté du cadre justifient cet investissement.`,
    isNew: true,
    createdAt: new Date('2023-11-15')
  },
  {
    id: 'downtown_gisenyi',
    categoryId: 'neighborhoods',
    title: 'Centre-ville de Gisenyi - Le cœur animé',
    summary: 'Un environnement dynamique avec accès facile aux commerces, marchés et restaurants locaux',
    image: 'https://images.unsplash.com/photo-1599930113854-d6d7fd522504',
    content: `# Centre-ville de Gisenyi - Le cœur animé

Le centre-ville de Gisenyi offre un environnement plus animé et dynamique, avec un accès aisé aux marchés, aux restaurants et aux commodités locales. Il pourrait être préféré par ceux qui privilégient la commodité urbaine et l'immersion culturelle.

## Points forts
- Accès facile aux commerces et services
- Marché central à proximité
- Vie locale authentique
- Plus abordable que le quartier riverain

## Commodités
- Supermarché Habibu (le plus grand de la région)
- Marché public de Gisenyi (produits frais, artisanat, tissus)
- Plusieurs banques et services financiers
- Station-service Engen

## Type d'hébergements
Mélange d'appartements urbains, maisons traditionnelles et quelques options plus modernes. Les logements sont généralement plus petits mais plus accessibles financièrement.

## Prix moyens
- Appartements: 150-350$ par mois
- Chambres chez l'habitant: 10-25$ par nuit
- Auberges: 5-8$ par nuit (lit en dortoir)

## Idéal pour
Les voyageurs à budget limité, les étudiants, et ceux qui souhaitent vivre une expérience culturelle immersive, proche de la vie locale rwandaise.

## Bon à savoir
La COLIBRI VILLA City Center est notée pour son excellent emplacement, à distance de marche du lac, offrant une option pratique pour ceux qui souhaitent à la fois la plage et l'accès à la ville.`,
    isNew: false,
    createdAt: new Date('2023-09-25')
  },
  {
    id: 'nyayumba_district',
    categoryId: 'neighborhoods',
    title: 'Nyayumba - Hauteurs tranquilles',
    summary: 'Zone résidentielle paisible sur les hauteurs avec vue panoramique',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945',
    content: `# Nyayumba - Hauteurs tranquilles

Nyayumba, situé légèrement en dehors du centre-ville immédiat, est connu pour abriter des hébergements de qualité tels que le Nirvana Heights Hotel et l'INZU Lodge, suggérant une atmosphère résidentielle plus calme et plus haut de gamme.

## Caractéristiques
- Situé sur les hauteurs de Gisenyi
- Vues panoramiques sur le lac et la ville
- Quartier résidentiel paisible
- Air plus frais grâce à l'altitude

## Hébergements notables
- Nirvana Heights Hotel
- INZU Lodge
- Résidences privées de standing

## Ambiance
L'atmosphère y est sereine et moins urbaine que dans le centre-ville. Nyayumba offre un équilibre entre proximité de la nature et accès aux services urbains.

## Avantages
- Protection contre les risques d'éruptions volcaniques grâce à son altitude
- Moins de bruit et de pollution
- Sécurité généralement meilleure
- Jardins plus spacieux

## Inconvénients
- Nécessite souvent un véhicule pour les déplacements
- Services et commerces moins nombreux à proximité immédiate
- Montées raides pour y accéder à pied

## Budget
Les prix sont modérés à élevés, reflétant la qualité de l'environnement et des logements disponibles. Comptez entre 300$ et 800$ pour une location mensuelle selon la taille et les prestations.`,
    isNew: false,
    createdAt: new Date('2023-07-10')
  },
  {
    id: 'rubona_area',
    categoryId: 'neighborhoods',
    title: 'Rubona - Budget et commodités',
    summary: 'Zone économique avec de nombreux hôtels abordables',
    image: 'https://images.unsplash.com/photo-1540965659724-7348aa3a1253',
    content: `# Rubona - Budget et commodités

Rubona, un peu plus éloigné du centre, est réputé pour ses hôtels abordables et pour être l'emplacement du Paradis Malahide, indiquant un mélange d'options économiques et potentiellement des possibilités de résidence à plus long terme.

## Avantages
- Zone économique avec nombreux hôtels bon marché
- Ambiance plus locale, moins touristique
- Options d'hébergement pour tous budgets
- Paradis Malahide comme point de repère notable

## Type d'hébergements
- Hôtels budget à partir de 23$ par nuit
- Pensions de famille
- Quelques appartements à louer sur le long terme
- Hébergements traditionnels

## À proximité
- Petits marchés locaux
- Restaurants servant des spécialités rwandaises
- Accès au lac mais plages moins aménagées

## Transport
Bien desservi par les taxis-motos (environ 1 000 RWF pour les trajets courts) et taxis collectifs.

## Idéal pour
Les voyageurs soucieux de leur budget, les routards, et ceux qui cherchent une expérience plus authentique loin des zones touristiques principales.

## Note importante
Bien que plus abordable, ce quartier peut nécessiter des connaissances de base en kinyarwanda ou français pour communiquer facilement avec les locaux.`,
    isNew: false,
    createdAt: new Date('2023-08-20')
  },
  
  // Transport
  {
    id: 'transport_overview',
    categoryId: 'transportation',
    title: 'Guide complet des transports à Gisenyi',
    summary: 'Tous les moyens de transport disponibles à Gisenyi et comment les utiliser',
    image: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e',
    content: `# Guide complet des transports à Gisenyi

Gisenyi offre divers moyens de transport pour se déplacer en ville et vers d'autres destinations. Voici un guide complet pour vous aider à naviguer facilement.

## Taxis-motos (motos)

Les taxis-motos sont le moyen de transport le plus populaire et pratique à Gisenyi.

**Tarifs:** Environ 1 000 RWF (1$) pour les trajets courts dans la ville
**Comment les utiliser:** 
- Négociez toujours le prix avant de monter
- Le port du casque n'est pas toujours proposé, mais demandez-en un si possible
- Les chauffeurs connaissent bien tous les recoins de la ville
- Idéal pour les trajets courts, évitez pour les longues distances

## Taxis traditionnels

**Où les trouver:** 
- Près du marché central
- À côté de la station-service Engen
- Aux principaux hôtels
- Sur demande par téléphone

**Tarifs:** Plus chers que les motos (environ 5 000 - 10 000 RWF pour les trajets dans la ville)
**Avantages:** Plus confortables et sécurisés que les motos, idéals en cas de pluie ou avec des bagages

## Services de bus

**Bus interurbains:**
- Connexions régulières entre Gisenyi et Kigali (2,5-3 heures)
- Départs fréquents de la gare routière principale près de la Petite Barrière
- Prix: environ 5 000 - 7 000 RWF pour Kigali
- Compagnies recommandées: Virunga Express, Volcano Bus

**Minibus locaux:**
- Relient Gisenyi et Musanze (2 heures)
- Partent une fois qu'ils sont pleins
- Économiques mais moins confortables
- Tarifs: 2 000 - 3 000 RWF selon la destination

## Transport vers le Parc National des Volcans

- Option taxi partagé: environ 10 000 RWF par personne
- Taxi privé: environ 50 000 - 70 000 RWF (aller simple)
- Durée du trajet: environ 1h30
- Réservez de préférence la veille

## Traversée de la frontière avec Goma (RDC)

**Points de passage:**
- La "Petite Barrière" (principalement piétons)
- La "Grande Barrière" (véhicules et transport diplomatique)

**Important:** Vérifiez toujours l'état actuel de la frontière et les conditions de passage avant de planifier votre traversée. La situation peut changer rapidement.

## Conseils pratiques

- Les taxis-motos sont parfaits pour les trajets courts dans Gisenyi
- Pour Kigali, privilégiez les bus confortables des grandes compagnies
- Négociez toujours le prix avant de monter dans un taxi
- Pour les excursions vers les sites touristiques, envisagez de louer une voiture avec chauffeur pour la journée`,
    isNew: true,
    createdAt: new Date('2023-11-05')
  },
  {
    id: 'local_transport',
    categoryId: 'transportation',
    title: 'Transport local à Gisenyi',
    summary: 'Comment se déplacer efficacement à l\'intérieur de Gisenyi',
    image: 'https://images.unsplash.com/photo-1610401897508-91cf20e9219c',
    content: `# Transport local à Gisenyi

Pour vous déplacer efficacement à l'intérieur de Gisenyi, plusieurs options s'offrent à vous, adaptées à différents budgets et préférences.

## 🏍️ Taxis-motos

**Le moyen le plus populaire pour les trajets courts**

- **Tarif standard:** 1 000 RWF pour les trajets courts (ex: de Rubavu à Gisenyi)
- **Disponibilité:** partout dans la ville, à toute heure de la journée
- **Avantages:** rapides, omniprésents, peuvent éviter les embouteillages
- **Inconvénients:** moins confortables, exposition aux intempéries

## 🚗 Taxis conventionnels

- **Où les trouver:** 
  * Près du marché central
  * À côté de la station-service Engen
  * Aux principales intersections

- **Tarifs:** 5 000 - 10 000 RWF selon la distance
- **Pour réserver:** demandez à votre hôtel ou contactez une compagnie locale

## 🚶‍♂️ À pied

Le centre-ville de Gisenyi est assez compact et se prête bien à la marche, surtout le long des secteurs du lac.

- **Zones piétonnes agréables:**
  * La promenade du bord du lac
  * Le centre-ville
  * Les zones commerçantes

- **Précautions:** évitez de marcher seul après la tombée de la nuit dans les zones peu fréquentées

## 🚌 Minibus locaux

Des minibus collectifs desservent les quartiers périphériques et les villages environnants.

- **Fréquence:** variable, plus nombreux aux heures de pointe
- **Tarifs:** à partir de 300 RWF pour les trajets courts
- **Fonctionnement:** ils suivent des itinéraires fixes avec des arrêts précis

## Location de véhicules

- **Vélos:** disponibles dans certains hôtels et auberges
- **Motos:** possible de louer pour la journée (15 000 - 25 000 RWF)
- **Voitures:** principalement via les hôtels ou agences de Kigali

## Conseils pratiques

- Les distances dans Gisenyi sont généralement courtes
- Les taxis-motos sont le meilleur compromis rapidité/prix
- Négociez toujours le prix avant de monter
- La plupart des chauffeurs parlent kinyarwanda et français, certains parlent anglais
- Pour les destinations touristiques fréquentes comme les plages, les prix sont souvent standardisés`,
    isNew: false,
    createdAt: new Date('2023-09-20')
  },
  {
    id: 'gisenyi_kigali',
    categoryId: 'transportation',
    title: 'De Gisenyi à Kigali: options de transport',
    summary: 'Guide complet pour voyager entre Gisenyi et la capitale rwandaise',
    image: 'https://images.unsplash.com/photo-1560053608-13721e0d69e8',
    content: `# De Gisenyi à Kigali: options de transport

La route entre Gisenyi et Kigali est l'un des trajets les plus fréquents au Rwanda. Voici toutes les options disponibles pour vous déplacer entre ces deux villes importantes.

## 🚌 Bus réguliers

La solution la plus économique et pratique.

- **Durée du trajet:** 2,5 à 3 heures (selon les conditions de circulation)
- **Prix:** 5 000 - 7 000 RWF par personne
- **Fréquence:** Départs toutes les 30-60 minutes de 5h à 18h
- **Principales compagnies:**
  * Virunga Express
  * Volcano Bus
  * Rwanda Transport Company (RTC)

- **Confort:** La plupart des bus sont modernes avec climatisation

## 🚐 Minibus partagés

- **Durée:** 3 à 3,5 heures (font plus d'arrêts)
- **Prix:** 4 000 - 5 000 RWF
- **Départ:** Généralement de la gare routière principale
- **Fonctionnement:** Départ une fois le véhicule rempli

## 🚗 Taxi privé / Voiture privée

- **Durée:** 2,5 heures (sans arrêts)
- **Prix:** 80 000 - 120 000 RWF pour le véhicule entier
- **Avantages:** Flexibilité, confort, possibilité de s'arrêter en route
- **Réservation:** Via votre hôtel ou une agence de voyage

## 📋 Conseils pratiques

- **Meilleur moment pour voyager:** Tôt le matin pour éviter les embouteillages
- **Derniers départs:** Évitez de prendre le dernier bus de la journée car vous pourriez arriver tard à Kigali
- **Réservation:** Pour les grands bus, il est préférable de réserver à l'avance, surtout le week-end
- **Route:** La route est en bon état, goudronnée sur tout le parcours
- **Vues:** Le trajet offre de magnifiques panoramas sur les paysages rwandais

## 🚨 Sécurité

- Les bus des grandes compagnies sont sûrs et fiables
- Gardez vos objets de valeur avec vous plutôt que dans la soute
- Les contrôles routiers sont fréquents, gardez votre passeport ou carte d'identité à portée de main

## 🎒 Bagages

- Les grands bus ont des soutes à bagages (généralement inclus dans le prix)
- Les minibus peuvent facturer un supplément pour les gros bagages
- Évitez les bagages volumineux dans les taxis partagés`,
    isNew: false,
    createdAt: new Date('2023-08-14')
  },
  
  // Coût de la vie
  {
    id: 'cost_of_living_overview',
    categoryId: 'cost_of_living',
    title: 'Budget mensuel à Gisenyi',
    summary: 'Estimation détaillée des dépenses pour différents styles de vie',
    image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f',
    content: `# Budget mensuel à Gisenyi

Voici un aperçu des coûts mensuels moyens pour vivre à Gisenyi, adapté à différents styles de vie.

## Budget étudiant/économique (600-800$)
- Logement : studio simple ou colocation (150-250$)
- Nourriture : marché local et cuisine maison (150-200$)
- Transport : moto-taxis et minibus (50-80$)
- Internet : forfait mobile de base (20-30$)
- Loisirs et extras : (100-150$)

## Budget moyen (1000-1500$)
- Logement : appartement 1-2 chambres de qualité (300-500$)
- Nourriture : mix de cuisine maison et restaurants (250-350$)
- Transport : moto-taxis fréquents, parfois taxis (100-150$)
- Internet : WiFi haut débit à domicile (40-60$)
- Loisirs et extras : (300-400$)

## Budget confort (2000$+)
- Logement : grande maison avec jardin/vue sur le lac (700-1200$)
- Nourriture : restaurants réguliers, produits importés (400-600$)
- Transport : voiture personnelle ou taxis réguliers (200-300$)
- Internet : meilleure connexion disponible (70-100$)
- Personnel de maison : (100-200$)
- Loisirs et extras : (500+$)

## Coûts indicatifs
- Repas au restaurant local : 5-10$
- Repas dans un restaurant international : 15-25$
- Bouteille d'eau (1.5L) : 0.5-1$
- Café dans un café moderne : 2-3$
- Bière locale : 1-2$`,
    isNew: false,
    createdAt: new Date('2023-09-05')
  },
  {
    id: 'accommodation_prices',
    categoryId: 'cost_of_living',
    title: 'Prix des logements à Gisenyi',
    summary: 'Aperçu complet des tarifs d\'hébergement selon les saisons et types de logement',
    image: 'https://images.unsplash.com/photo-1591825729269-caeb344f6df2',
    content: `# Prix des logements à Gisenyi

Les tarifs des logements à Gisenyi varient considérablement selon le type d'hébergement, la localisation et la saison. Ce guide vous aide à planifier votre budget logement.

## Variations saisonnières

La haute saison touristique à Gisenyi s'étend généralement :
- D'avril à juillet (selon certaines sources)
- De juin à août (selon d'autres sources)

La basse saison se situe généralement :
- De septembre à novembre
- Février est également mentionné comme mois de basse saison

**Mois le moins cher** : Novembre (tarifs moyens d'environ 33$ par nuit en hôtel)
**Mois le plus cher** : Décembre (tarifs moyens pouvant atteindre 234$ par nuit)

## Prix moyens par type d'hébergement

| Type d'hébergement | Prix en basse saison (USD) | Prix en haute saison (USD) |
|--------------------|-----------------------------|----------------------------|
| **Appartements** | 30$ - 150$ | 40$ - 170$ |
| **Hôtels (Budget)** | 25$ - 40$ | 35$ - 50$ |
| **Hôtels (Milieu de gamme)** | 70$ - 100$ | 90$ - 120$ |
| **Hôtels (Luxe)** | 180$ - 220$ | 200$ - 250$ |
| **Chambres chez l'habitant** | 10$ - 20$ | 15$ - 25$ |
| **Auberges (Lit en dortoir)** | 5$ - 7$ | 6$ - 8$ |

## Options spécifiques

### Hôtels de luxe
- **Lake Kivu Serena Hotel**: À partir de 180$ en basse saison, jusqu'à 250$ en haute saison
- **Gorillas Lake Kivu Hotel**: Option milieu/haut de gamme

### Options économiques
- **Locations de vacances**: Prix moyen d'environ 74$ par nuit, options à partir de 29$
- **Appartements**: À partir de 27$ par nuit pour les options économiques
- **Chambres chez l'habitant**: À partir de 10$ par nuit
- **Auberges de jeunesse**: À partir de 5-6$ par nuit pour un lit en dortoir

## Locations à long terme

Pour les séjours mensuels ou plus longs, des réductions substantielles sont souvent disponibles :
- **Appartements meublés 1 chambre**: 250-400$ par mois
- **Appartements meublés 2 chambres**: 350-600$ par mois
- **Maisons/Villas**: 400-1000$ par mois

## Conseils pour économiser

- **Négociez** les tarifs pour les séjours de plus d'une semaine
- **Réservez en avance** pendant la haute saison
- **Séjournez en novembre** pour les meilleurs tarifs
- **Considérez les quartiers éloignés du lac** pour des prix plus abordables
- **Les options chez l'habitant** offrent souvent le meilleur rapport qualité-prix et une expérience culturelle enrichissante`,
    isNew: true,
    createdAt: new Date('2023-11-10')
  },
  {
    id: 'shopping_guide',
    categoryId: 'cost_of_living',
    title: 'Où faire ses courses',
    summary: 'Les meilleurs endroits pour acheter produits locaux et importés',
    image: 'https://images.unsplash.com/photo-1534723452862-4c874018d66d',
    content: `# Où faire ses courses à Gisenyi

Guide pratique des différents lieux d'approvisionnement, du marché local aux supermarchés.

## Marché central de Gisenyi
**Lieu :** Centre-ville, près de la gare routière
**Horaires :** 7h-18h, plus animé le matin
**Idéal pour :** Fruits, légumes, viande fraîche, épices
**Prix :** Les plus bas de la ville
**Conseil :** Négociez les prix, allez-y tôt pour les meilleurs produits

## Supermarchés

### Simba Supermarket
**Lieu :** Avenue principale
**Horaires :** 8h-21h
**Points forts :** Produits internationaux, rayon frais de qualité
**Prix :** Moyen à élevé

### Habibu Supermarket
**Lieu :** En face du marché central
**Points forts :** Le plus grand supermarché de la région de Rubavu, réputé pour son pain frais
**Gamme :** Produits alimentaires et articles ménagers

## Épiceries locales
Plusieurs petites épiceries sont dispersées dans tous les quartiers avec des produits de base à prix raisonnable.

## Marchés spécialisés

### Marché aux poissons
**Lieu :** Port de Gisenyi
**Horaires :** 6h-10h
**Spécialité :** Poissons frais du lac Kivu
**Conseil :** Y aller tôt, les meilleurs produits partent vite !

### Marché artisanal
**Lieu :** Près des hôtels principaux
**Horaires :** 9h-18h
**Spécialité :** Artisanat local, souvenirs, tissus

## Achats en ligne
La livraison de courses commence à se développer à Gisenyi. Quelques applications locales comme "Vuba Deliver" proposent ce service.`,
    isNew: false,
    createdAt: new Date('2023-08-12')
  },
  {
    id: 'daily_expenses',
    categoryId: 'cost_of_living',
    title: 'Budget quotidien à Gisenyi',
    summary: 'Estimation des dépenses quotidiennes pour différents styles de vie',
    image: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e',
    content: `# Budget quotidien à Gisenyi

Combien prévoir pour votre vie quotidienne à Gisenyi ? Voici un aperçu des coûts selon votre style de vie et votre budget.

## Budget économique (20-30$ par jour)

### Logement
- Auberge de jeunesse : 5-8$ (lit en dortoir)
- Chambre chez l'habitant basique : 10-15$

### Repas
- Petit-déjeuner local : 1-3$
- Déjeuner dans un restaurant local : 3-5$
- Dîner simple : 3-5$

### Transport
- Trajet en taxi-moto : 1$ par course courte
- Transport en commun : moins de 1$ par trajet

### Activités
- Plages publiques : gratuit
- Promenade au bord du lac : gratuit

## Budget moyen (50-80$ par jour)

### Logement
- Hôtel milieu de gamme : 35-70$
- Appartement de vacances : 40-60$

### Repas
- Petit-déjeuner à l'hôtel : inclus ou 5-7$
- Déjeuner dans un bon restaurant local : 7-12$
- Dîner dans un restaurant apprécié : 10-20$

### Transport
- Taxi pour la journée : 15-25$
- Plusieurs trajets en taxi-moto : 5-10$

### Activités
- Excursion en bateau sur le lac : 15-30$
- Sports nautiques : 20-40$

## Budget confortable (100-200$ par jour)

### Logement
- Hôtel haut de gamme (Lake Kivu Serena) : 180-250$
- Villa privée : 100-150$

### Repas
- Repas complets dans les meilleurs restaurants : 25-50$ par personne
- Expériences gastronomiques : 30-60$

### Transport
- Chauffeur privé pour la journée : 50-80$
- Location de véhicule : 40-80$ par jour

### Activités
- Excursions privées sur le lac : 50-100$
- Visites guidées personnalisées : 30-70$

## Dépenses courantes

### Alimentation
- Pain local : 0.5-1$
- Fruits (1kg) : 1-2$
- Bouteille d'eau (1.5L) : 0.5-1$
- Repas au restaurant (par personne) : 5-25$

### Transports
- Taxi-moto (course courte) : 1$
- Bus Gisenyi-Kigali : 5-7$
- Essence (1L) : environ 1.2$

### Autres
- Carte SIM avec données : 5-10$
- Internet mobile (1GB) : 2-5$
- Lessive (service) : 3-8$

## Conseils pour économiser
- Mangez où mangent les locaux
- Négociez pour les taxis et achats au marché
- Achetez une carte SIM locale pour réduire les frais de communication
- Optez pour des activités gratuites comme la plage et la randonnée`,
    isNew: false,
    createdAt: new Date('2023-10-05')
  },
  
  // Sécurité
  {
    id: 'gisenyi_safety_overview',
    categoryId: 'safety',
    title: 'Aperçu de la sécurité à Gisenyi',
    summary: 'Informations essentielles sur la sécurité dans la ville et ses environs',
    image: 'https://images.unsplash.com/photo-1578494475853-414a3461ab7f',
    content: `# Aperçu de la sécurité à Gisenyi

Gisenyi est généralement considérée comme une ville sûre, particulièrement en comparaison avec sa voisine Goma en République Démocratique du Congo. Voici un guide pour vous aider à profiter de votre séjour en toute sécurité.

## Sécurité générale

- Gisenyi est considérée comme **calme et sûre** du côté rwandais de la frontière
- Les zones situées sur les collines entourant le centre sont considérées comme sûres contre d'éventuelles éruptions volcaniques
- La présence policière contribue au sentiment général de sécurité

## Quartiers sûrs

- **Zone riveraine** : Généralement sûre pendant la journée, bien fréquentée par les touristes
- **Centre-ville** : Animé et généralement sûr
- **Quartiers résidentiels sur les hauteurs** : Considérés comme très sûrs

## Précautions recommandées

- **Évitez de marcher seul** après la tombée de la nuit
- **Organisez votre transport à l'avance** pour les déplacements nocturnes
- **Gardez les portières verrouillées** en voiture et les objets de valeur hors de vue
- **Restez vigilant** quant à votre environnement
- **Évitez d'afficher des signes de richesse** ou de porter des bijoux coûteux
- **Ne transportez pas** de grosses sommes d'argent
- **Attention aux boissons** dans les bars et clubs (risques de drogues)
- **Évitez les zones isolées** ou peu fréquentées, surtout la nuit

## Situations à éviter

- **Photos interdites** : Ne photographiez pas les bâtiments gouvernementaux ou installations militaires
- **Frontière avec la RDC** : En raison de la proximité avec les provinces du Nord et du Sud-Kivu, faites preuve d'une vigilance accrue
- **Examiner ou photographier** le personnel militaire

## Recommandations spécifiques

Certaines recommandations de voyage pourraient conseiller d'éviter le district de Rubavu, y compris Gisenyi, sauf pour les voyages essentiels. Il est crucial de vérifier les derniers conseils de voyage du gouvernement de votre pays avant de planifier votre séjour.

## En cas d'urgence

- **Police** : 112
- **Ambulance** : 912
- **Hôpital de District de Gisenyi** : Principal établissement médical de la région

## Conseils des résidents

De nombreux expatriés et visiteurs témoignent que Gisenyi est l'une des villes les plus sûres qu'ils aient visitées en Afrique, avec une population accueillante et serviable. La prudence normale de voyage reste néanmoins recommandée.`,
    isNew: false,
    createdAt: new Date('2023-07-25')
  },
  {
    id: 'health_safety',
    categoryId: 'safety',
    title: 'Santé et services médicaux',
    summary: 'Informations sur les services de santé et précautions médicales à Gisenyi',
    image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118',
    content: `# Santé et services médicaux à Gisenyi

Un aperçu complet des services de santé disponibles à Gisenyi et des précautions sanitaires à prendre.

## Établissements médicaux

### Hôpital de District de Gisenyi
- **Capacité :** environ 300 lits
- **Services :** soins curatifs et préventifs
- **Personnel :** personnel anglophone disponible
- **Niveau :** établissement de soins secondaires
- **Programmes :** sensibilisation pour desservir les populations rurales

### Centres de santé
Plusieurs centres de santé sont situés dans la région de Gisenyi, notamment :
- Busigari
- Kabari
- Bugeshi
- Busasamana
- Byahi
- Gacuba II
- Centre de Santé de Gisenyi
- Karambo
- Kiguifi
- Mudende
- Murara
- Nyakiliba
- Nyundo

Ces centres fournissent des services de soins de santé primaires aux communautés locales.

## Préparation médicale

### Vaccinations recommandées
- Fièvre jaune (obligatoire pour entrer au Rwanda)
- Hépatite A et B
- Typhoïde
- Tétanos
- Méningite
- Rage (pour séjours prolongés)

### Médicaments à apporter
- Antipaludéens (consultez votre médecin pour le traitement adapté)
- Antibiotiques à large spectre
- Antidiarrhéiques
- Analgésiques/antipyrétiques
- Antihistaminiques
- Répulsif anti-moustiques (avec DEET)
- Crème solaire (indice élevé - l'indice UV peut atteindre des niveaux extrêmes)

## Risques sanitaires spécifiques

### Paludisme
- Risque présent toute l'année
- Préventif recommandé
- Utilisez des moustiquaires et répulsifs

### Bilharziose (schistosomiase)
- Opinions divergentes concernant le lac Kivu
- Généralement considéré comme sûr pour la baignade
- Par précaution, évitez de nager dans les eaux stagnantes

### Eau potable
- Buvez uniquement de l'eau en bouteille scellée
- Évitez les glaçons dans les boissons sauf dans les établissements de confiance

## Assurance médicale

Une assurance médicale internationale avec couverture d'évacuation est fortement recommandée, car les soins spécialisés peuvent nécessiter un transfert vers Kigali ou à l'étranger.

## Pharmacies
Plusieurs pharmacies sont disponibles dans le centre-ville, généralement ouvertes de 8h à 20h.

## Numéros d'urgence
- **Ambulance :** 912
- **Police :** 112
- **Urgences générales :** 111`,
    isNew: false,
    createdAt: new Date('2023-09-15')
  },
  
  // Expat tips
  {
    id: 'administrative_procedures',
    categoryId: 'expat_tips',
    title: 'Démarches administratives',
    summary: 'Guide des formalités pour vivre légalement à Gisenyi',
    image: 'https://images.unsplash.com/photo-1554224155-1696413565d3',
    content: `# Démarches administratives pour expatriés

Ce guide vous aidera à comprendre les procédures administratives essentielles pour vous installer à Gisenyi.

## Visa et permis de séjour

### Visa touristique
- Disponible à l'arrivée pour de nombreuses nationalités (30 jours)
- Coût : 30$ (vérifiez les changements récents)
- Extension possible pour 30 jours supplémentaires

### Permis de travail
- Doit être demandé par votre employeur
- Documents nécessaires : contrat de travail, passeport, photos, diplômes
- Délai : environ 1-2 mois
- Coût : varie selon la durée (500-1000$)

### Permis de séjour longue durée
- Nécessite un sponsor local (emploi, études, investissement)
- Validité : 1-2 ans, renouvelable
- Documents à fournir : justificatif de revenus, certificat médical, casier judiciaire

## Enregistrement obligatoire
Tout étranger séjournant plus de 30 jours doit s'enregistrer auprès du bureau local de l'immigration.
- Lieu : Direction Générale de l'Immigration, antenne de Gisenyi
- Délai : dans les 15 jours suivant l'arrivée
- Documents : passeport, justificatif de logement, formulaire d'enregistrement

## Compte bancaire
- Banques recommandées : Bank of Kigali, Equity Bank
- Documents nécessaires : passeport, permis de séjour, justificatif de domicile
- Conseils : optez pour un compte en dollars américains et en francs rwandais

## Assurance santé
Une assurance santé internationale est fortement recommandée, car les coûts médicaux peuvent être élevés pour les non-résidents.

## Fiscalité
Les résidents (plus de 183 jours par an) sont imposables sur leurs revenus mondiaux. Consultez un conseiller fiscal pour comprendre vos obligations.`,
    isNew: true,
    createdAt: new Date('2023-10-10')
  },
  
  // Student life
  {
    id: 'student_guide',
    categoryId: 'student_life',
    title: 'Guide étudiant complet',
    summary: "Tout ce qu'un étudiant international doit savoir pour réussir à Gisenyi",
    image: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f',
    content: `# Guide étudiant complet pour Gisenyi

Ce guide est conçu pour aider les étudiants internationaux à s'installer et réussir à Gisenyi.

## Établissements d'enseignement

### Université de Gisenyi
- Campus principal : quartier Mbugangari
- Spécialités : Business, Tourisme, Sciences environnementales
- Frais pour étudiants internationaux : 1500-2500$ par semestre

### Institut Technique de Rubavu
- Spécialités : Ingénierie, Agriculture, Informatique
- Programmes en français et en anglais
- Frais : 1000-2000$ par semestre

## Logement étudiant
- Résidences universitaires : 150-250$ par mois (services inclus)
- Colocations hors campus : 100-200$ par mois et par personne
- Quartiers recommandés : Bugoyi, Mbugangari (proches des campus)

## Bourses disponibles
- Programme d'excellence Rwanda-EAC : couvre les frais et allocation mensuelle
- Bourses Mastercard Foundation : pour étudiants africains
- Bourse de la Francophonie : pour étudiants des pays francophones

## Vie étudiante
- Associations étudiantes actives : AERG (Association des Étudiants Rwandais de Gisenyi)
- Sports populaires : football, volleyball, basketball
- Événements annuels : Festival universitaire (mai), compétitions inter-universités

## Coûts mensuels estimés
- Logement : 150-250$
- Nourriture : 150-200$
- Transport : 30-50$
- Matériel d'étude : 30-70$
- Internet et communication : 20-40$
- Loisirs : 50-100$

## Conseils pratiques
- Wifi gratuit : bibliothèque municipale, certains cafés près du campus
- Impression pas chère : Copy Center près de l'université (3-5 RWF/page)
- Librairies d'occasion : marché aux livres mensuel (dernier samedi)

## Jobs étudiants
Plusieurs opportunités existent dans :
- Hôtellerie et restauration (15-20h/semaine)
- Tutorat en langues
- Centres d'appels (si vous parlez français/anglais couramment)`,
    isNew: false,
    createdAt: new Date('2023-05-20')
  },
  {
    id: 'student_activities',
    categoryId: 'student_life',
    title: 'Activités et loisirs pour étudiants',
    summary: 'Les meilleures façons de profiter de Gisenyi en tant qu\'étudiant',
    image: 'https://images.unsplash.com/photo-1516450360452-9312f5463805',
    content: `# Activités et loisirs pour étudiants à Gisenyi

Découvrez comment profiter pleinement de votre vie étudiante à Gisenyi avec ce guide des activités et loisirs adaptés aux budgets étudiants.

## Activités gratuites ou économiques

### Plages et lac
- **Plage publique de Gisenyi**: Accès gratuit, très populaire le week-end
- **Plage de Tam Tam**: Ambiance décontractée, idéale pour rencontrer d'autres étudiants
- **Baignade**: Le lac Kivu est généralement considéré comme sûr (exempt de bilharziose, crocodiles et hippopotames)

### Sports et activités de plein air
- **Football**: Matchs improvisés sur la plage et terrains publics
- **Randonnée**: Mont Rubavu offre des vues imprenables (randonnée gratuite)
- **Course à pied**: Le long de la promenade du lac, particulièrement agréable au lever du soleil

### Activités culturelles
- **Marchés locaux**: Immersion culturelle et découverte des produits locaux
- **Événements communautaires**: Souvent organisés par les associations locales
- **Umuganda**: Journée mensuelle de service communautaire (dernier samedi du mois)

## Vie nocturne adaptée aux étudiants

### Bars économiques
- **Bar Gacuba**: Ambiance charmante, bon endroit pour découvrir la culture locale
- **Bars locaux**: Proposent des "brochettes et frites" à prix abordables (1-3$)

### Restaurants abordables
- **Calafia Café**: Café exquis et sandwichs à prix raisonnables
- **Migano Coffee shop and fast food**: Option économique pour les étudiants
- **Stands de street food**: Près du marché, options à partir de 1-2$

### Événements et festivals
- **Karisimbi Summer Festival**: Événement musical populaire (juillet)
- **Kivu Sunset Music Fest**: Musique au bord du lac (juin)
- **Soirées étudiantes**: Organisées régulièrement par les associations universitaires

## Excursions pour groupes d'étudiants

### Sorties d'une journée
- **Sources chaudes de Rubavu**: Propriétés thérapeutiques, à seulement 2 km de la brasserie Bralirwa
- **Trek du Congo Nil**: Sections proches de Gisenyi accessibles pour randonnées d'une journée
- **Plage de Paradise Malahide**: Idéale pour les groupes, souvent des tarifs réduits pour étudiants

### Week-ends économiques
- **Musanze/Parc des Volcans**: Transport en bus abordable (2h), possibilité de visites guidées à tarif étudiant
- **Escapade sur les îles du lac Kivu**: Organisez des excursions en groupe pour réduire les coûts
- **Goma (RDC)**: Passage frontalier (vérifiez les conditions actuelles), expérience transfrontalière intéressante

## Ressources pour étudiants

### Bibliothèques et espaces d'étude
- **Bibliothèque municipale**: Espaces d'étude gratuits
- **Wifi gratuit**: Dans certains cafés avec consommation minimale

### Communautés en ligne
- **Groupes Facebook**: "Étudiants à Gisenyi", "Expats Rwanda"
- **Plateformes d'échange linguistique**: Pour pratiquer le français, l'anglais ou le kinyarwanda

### Opportunités de bénévolat
- **Écoles locales**: Enseignement de langues
- **Organisations environnementales**: Conservation du lac Kivu
- **Tourisme communautaire**: Guide touristique étudiant

## Conseils pour économiser

- **Carte étudiant**: Utilisez-la pour des réductions dans certains commerces et activités
- **Groupe d'achat**: Organisez des achats collectifs d'alimentation au marché
- **Transport partagé**: Partagez les frais de taxi pour les sorties en groupe
- **Happy hours**: Profitez des promotions en début de soirée dans les bars

La vie étudiante à Gisenyi offre un mélange unique d'expériences culturelles, d'activités de plein air et d'options de divertissement abordables pour tous les goûts.`,
    isNew: true,
    createdAt: new Date('2023-10-25')
  },
  {
    id: 'student_community',
    categoryId: 'student_life',
    title: 'Intégration dans la communauté locale',
    summary: 'Comment les étudiants internationaux peuvent s\'intégrer à Gisenyi',
    image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac',
    content: `# Intégration dans la communauté locale pour étudiants internationaux

L'intégration dans la communauté locale est essentielle pour vivre pleinement votre expérience d'étudiant international à Gisenyi. Voici des conseils pratiques pour vous aider à vous connecter avec la population locale et à vous sentir chez vous.

## Apprendre la langue

### Bases de Kinyarwanda
- Quelques phrases essentielles:
  * "Muraho" - Bonjour
  * "Murakoze" - Merci
  * "Amakuru?" - Comment ça va?
  * "Ndagukunda" - Je t'apprécie
- Même des efforts minimaux sont très appréciés par les Rwandais

### Où apprendre:
- **Cours de langue** dans les universités locales
- **Applications** comme Duolingo (kinyarwanda en version bêta)
- **Échanges linguistiques** avec des étudiants rwandais
- **Tuteurs privés** (5-10$ par heure)

## Participer à la vie communautaire

### Umuganda
- Journée mensuelle de travail communautaire (dernier samedi du mois)
- Participation très appréciée des étrangers
- Excellente occasion de rencontrer des voisins

### Engagement associatif
- Rejoignez des associations locales sur des thèmes qui vous intéressent
- Opportunités de bénévolat:
  * Associations de protection du lac Kivu
  * Programmes d'alphabétisation
  * Initiatives sportives pour les jeunes

### Événements culturels
- **Festival du film de Gisenyi** (dates variables)
- **Célébrations nationales** comme le Jour de la Libération (4 juillet)
- **Événements sportifs** comme les tournois de football intercommunautaires

## Créer des liens significatifs

### Familles d'accueil
- Certaines universités peuvent vous mettre en contact avec des familles locales
- Participation aux repas de famille et célébrations
- Immersion culturelle profonde

### Mentors étudiants
- Programme de jumelage entre étudiants internationaux et rwandais
- Guide dans les premiers mois d'adaptation
- Partage des connaissances locales précieuses

### Espaces de rencontre
- **Cafés populaires** auprès des jeunes Rwandais
- **Églises et lieux de culte** pour les étudiants religieux
- **Clubs sportifs** universitaires et communautaires

## Comprendre et respecter la culture

### Sensibilité historique
- Informez-vous sur l'histoire récente du Rwanda
- Évitez les questions directes sur l'ethnicité ou le génocide
- Respectez la résilience et les efforts de réconciliation du pays

### Codes vestimentaires
- Tenue modeste, particulièrement lors des événements officiels ou visites dans les communautés rurales
- Standards professionnels pour les stages et emplois (smart casual minimum)

### Étiquette relationnelle
- Respect des aînés et figures d'autorité
- Patience dans les interactions (le temps est perçu différemment)
- Communication moins directe que dans certaines cultures occidentales

## Ressources pour l'intégration

### Centres culturels
- **Centre Culturel de Rubavu**: Activités et cours
- **Alliance Française**: Échanges culturels et événements

### Groupes en ligne
- Groupes WhatsApp d'étudiants internationaux
- Pages Facebook de la communauté expatriée au Rwanda
- Forums spécifiques pour étudiants à Gisenyi

### Services universitaires
- Bureau des affaires internationales
- Conseillers pour étudiants étrangers
- Associations d'étudiants

S'intégrer prend du temps - soyez patient, ouvert et curieux. Les Rwandais sont généralement très accueillants envers les étudiants internationaux qui montrent un intérêt sincère pour leur culture et leur pays.`,
    isNew: false,
    createdAt: new Date('2023-07-05')
  },
  {
    id: 'cultural_etiquette',
    categoryId: 'expat_tips',
    title: 'Étiquette et coutumes rwandaises',
    summary: 'Guide des normes culturelles et comportements attendus à Gisenyi',
    image: 'https://images.unsplash.com/photo-1489367874814-f5d040621dd8',
    content: `# Étiquette et coutumes rwandaises

Pour une intégration réussie et des interactions respectueuses avec la population locale, voici les principales règles d'étiquette à connaître à Gisenyi et au Rwanda.

## Salutations essentielles

Les salutations sont très importantes dans la culture rwandaise :
- Commencez toujours par "**Muraho**" (Bonjour) ou "**Bwakeye**" (Bon matin)
- Une poignée de main et un sourire sont appréciés
- Montrez du respect aux aînés et aux personnes en position d'autorité
- Utilisez des titres formels comme "**Mzee**" pour les hommes plus âgés et "**Mama**" pour les femmes adultes

## Tenue vestimentaire

- **Adoptez une tenue modeste**, particulièrement dans les zones rurales ou lieux de culte
- Les femmes devraient s'assurer que leurs épaules et genoux sont couverts
- Les hommes devraient opter pour des pantalons longs pour les événements formels
- Bien que Kigali soit plus tolérante envers des styles variés, une tenue modeste est généralement appréciée à Gisenyi

## Visites et repas

- Si vous êtes invité chez quelqu'un, acceptez avec gratitude
- Apportez un petit cadeau comme des fruits ou une bouteille de vin
- Enlevez vos chaussures avant d'entrer dans une maison, surtout dans les zones rurales
- Attendez que l'hôte commence à manger avant de commencer votre repas
- Finir ce qui est servi montre votre appréciation

## Communication

- Parlez doucement et respectueusement
- Les Rwandais apprécient la paix et le calme
- Faire l'effort d'apprendre des phrases de base en kinyarwanda sera très apprécié
- "**Murakoze**" (merci) est une expression importante à connaître
- Montrez du respect pour la gouvernance du Rwanda et le président Kagame

## Gestes à éviter

- Ne pointez pas avec vos pieds et n'affichez pas la plante de vos chaussures
- Évitez de manger dans les lieux publics (rues, transports)
- Les adultes s'abstiennent traditionnellement de manger en présence de leurs beaux-parents
- Évitez les discussions négatives sur la politique rwandaise
- Ne photographiez pas les bâtiments gouvernementaux ou installations militaires

## Environnement et propreté

- Jeter des déchets n'est pas toléré et peut entraîner des amendes
- Les sacs en plastique non biodégradables sont interdits dans tout le Rwanda
- Le Rwanda est connu pour sa propreté, respectez cet aspect important de la culture locale

## Comportement public

- Les démonstrations publiques d'affection sont généralement mal vues
- Demandez toujours la permission avant de prendre des photos dans des lieux religieux ou culturels
- Évitez de refuser la nourriture offerte par un hôte (sauf restrictions alimentaires spécifiques)
- L'homosexualité n'est pas illégale mais reste peu acceptée socialement

## Interaction avec les locaux

Les Rwandais sont largement reconnus pour leur gentillesse et leur accueil envers les visiteurs :
- Engagez-vous poliment et montrez un intérêt sincère pour leur culture
- Soyez prêt à une curiosité amicale, surtout dans les petites villes
- Visiter les marchés locaux offre d'excellentes occasions d'interagir

La patience, le respect et la curiosité bienveillante seront toujours appréciés et vous aideront à vivre une expérience enrichissante à Gisenyi.`,
    isNew: true,
    createdAt: new Date('2023-11-01')
  },
  {
    id: 'communication_guide',
    categoryId: 'expat_tips',
    title: 'Communication et internet à Gisenyi',
    summary: 'Tout sur les télécommunications, l\'accès internet et les langues parlées',
    image: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f',
    content: `# Communication et internet à Gisenyi

## Langues parlées

- **Kinyarwanda**: Langue locale principale
- **Français**: Largement parlé, seconde langue officielle
- **Anglais**: De plus en plus répandu, particulièrement dans les zones touristiques
- **Swahili**: Parlé à un degré moindre, surtout dans les zones commerciales

**Conseil**: Apprendre quelques phrases de base en kinyarwanda est très apprécié par les locaux et peut faciliter vos interactions quotidiennes.

## Téléphonie mobile

### Opérateurs principaux
- **MTN Rwanda**: Couverture la plus étendue, recommandé
- **Airtel Rwanda**: Bon service
- **Mango 4G**: Option alternative

### Obtenir une carte SIM
- Il est recommandé d'acquérir une carte SIM locale (de préférence MTN) à l'arrivée
- **Documents nécessaires**: Passeport ou carte d'identité
- **Coût**: Environ 1 000 RWF (1$) pour la carte SIM
- **Où acheter**: Boutiques officielles des opérateurs, aéroport, ou revendeurs agréés

### Forfaits et tarifs
- **Forfaits données**: à partir de 2 000 RWF (2$) pour 1 GB
- **Appels locaux**: environ 60 RWF (0,06$) par minute
- **SMS**: environ 30 RWF (0,03$) par message
- **Recharges**: Disponibles partout, à partir de 500 RWF

## Internet et connectivité

### Wifi
- Disponible dans la plupart des hôtels et restaurants de standing
- Qualité variable selon les établissements
- **Hôtels recommandés pour bon wifi**: Lake Kivu Serena, Gorillas Lake Kivu Hotel

### Internet mobile
- La couverture 4G est disponible dans la majeure partie de Gisenyi
- **MTN** offre la meilleure couverture 4G
- **Conseil**: Prévoyez l'utilisation du partage de connexion de votre téléphone comme solution de secours

### Espaces de coworking
- Options limitées à Gisenyi par rapport à Kigali
- Certains hôtels proposent des espaces de travail et salles de réunion
- L'hôtel Gisenyi dispose d'une salle de réunion qui peut servir d'espace de travail temporaire

## Médias locaux

- **Radio**: Radio Rwanda, Radio10, Flash FM
- **Journaux**: The New Times (en anglais), Imvaho Nshya (en kinyarwanda)
- **Télévision**: Rwanda TV (chaîne nationale)

## Conseils pratiques

- **Applications utiles**: WhatsApp (très populaire au Rwanda), Maps.me (pour navigation hors ligne)
- **Coupures d'électricité**: Occasionnelles, prévoyez une batterie externe pour vos appareils
- **Adaptateurs**: Prises de type C/J (européennes), voltage 220-240V
- **VPN**: Recommandé si vous avez besoin d'accéder à certains contenus restreints

## Services postaux et livraison

- **Bureau de poste**: Situé au centre-ville
- **Services de livraison**: DHL et EMS sont présents à Gisenyi
- **Livraison de repas**: Applications comme VubaVuba commencent à s'implanter`,
    isNew: false,
    createdAt: new Date('2023-10-12')
  },
  {
    id: 'banking_money',
    categoryId: 'expat_tips',
    title: 'Banques et gestion financière',
    summary: 'Conseils pratiques sur les services bancaires et les moyens de paiement à Gisenyi',
    image: 'https://images.unsplash.com/photo-1616077167599-cad3b67ae27f',
    content: `# Banques et gestion financière à Gisenyi

## Services bancaires

### Emplacement des banques et GAB
- Une concentration de banques et guichets automatiques bancaires se trouve dans une rue principale du centre de Gisenyi, souvent appelée "Banking Street"
- Un GAB de la Banque de Kigali est situé près de l'hôtel Gorillas, à quelques pas de la plage publique
- La gare routière près du poste frontière de la Petite Barrière propose également des services bancaires et des GAB

### Principales banques à Gisenyi
- Banque de Kigali (BK)
- Bank of Africa
- Equity Bank
- I&M Bank
- Access Bank

### Horaires typiques
- Lundi au vendredi: 8h00-17h00
- Samedi: 8h00-13h00 (services limités)
- Dimanche et jours fériés: fermé

## Moyens de paiement

### Espèces
- Le Rwanda est principalement une économie basée sur les espèces
- Le franc rwandais (RWF) est la monnaie locale
- **Important**: La plupart des magasins n'acceptent ni n'échangent les billets de dollars américains imprimés avant l'an 2006

### Cartes bancaires
- Les cartes de crédit sont généralement acceptées dans la plupart des hôtels et grandes entreprises
- Leur acceptation est moins répandue dans les petits établissements de Gisenyi
- Visa et Mastercard sont les plus couramment acceptées
- Prévoir des frais de transaction internationaux (généralement 2-3%)

### Mobile Money
- Système de paiement largement utilisé au Rwanda
- MTN Mobile Money est le service le plus répandu
- Permet de payer dans de nombreux commerces, restaurants et pour services
- Pratique pour les transferts d'argent locaux

## Services de change

- Fx Roaster est une option disponible à Gisenyi pour échanger des devises
- Taux généralement plus avantageux que dans les hôtels
- Conservez les reçus de change, parfois demandés lors du départ du pays

## Conseils financiers pour expatriés

### Banques internationales
- Certaines banques internationales ont des accords avec des banques rwandaises pour retrait sans frais

### Budget et coût de la vie
- Prévoyez toujours une réserve d'espèces pour les petites dépenses quotidiennes
- Les prix peuvent être négociés dans les marchés et avec les chauffeurs de taxi
- Les pourboires ne sont pas obligatoires mais appréciés (10% dans les restaurants haut de gamme)

### Transferts internationaux
- Western Union et MoneyGram sont disponibles à Gisenyi
- Les transferts bancaires internationaux peuvent prendre 3-5 jours ouvrables
- Services comme Wise (anciennement TransferWise) peuvent offrir de meilleurs taux

### Sécurité
- Évitez de transporter de grandes sommes d'argent
- Utilisez les coffres-forts des hôtels pour les objets de valeur et documents importants
- Vérifiez régulièrement vos relevés bancaires

## Fiscalité
- Les expatriés résidant plus de 183 jours par an au Rwanda sont considérés comme résidents fiscaux
- Consultez un conseiller fiscal pour comprendre vos obligations selon votre situation personnelle`,
    isNew: false,
    createdAt: new Date('2023-08-30')
  }
];

export default localGuides; 