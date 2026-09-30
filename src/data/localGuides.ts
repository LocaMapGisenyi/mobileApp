import type { Guide, GuideCategory } from '../types';
export type { Guide, GuideCategory };

// Adaptation éditoriale de docs/CONTENU-LOCAL.md, revue le 30 septembre 2026.
// Conseils pratiques : aucune recommandation commerciale ni donnée de terrain non vérifiée.
// Couverture unie locale, sans photographie susceptible de représenter un autre logement.
const GUIDE_COVER = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGPgzcsDAAF1AOq4ZWGPAAAAAElFTkSuQmCC';

export const guideCategories: GuideCategory[] = [
  {
    id: 'rental_planning',
    title: 'Préparer sa location',
    icon: 'home',
    description: 'Comparer les logements et clarifier les conditions avant de réserver.',
  },
  {
    id: 'arrival_and_travel',
    title: 'Arrivée et déplacements',
    icon: 'map-marker',
    description: 'Confirmer les accès, organiser le trajet et vérifier le logement.',
  },
  {
    id: 'stay_and_departure',
    title: 'Séjour et départ',
    icon: 'calendar-check',
    description: 'Conserver des échanges utiles et vérifier la fin de sa réservation.',
  },
];

export const localGuides: Guide[] = [
  {
    id: 'rental_preparation',
    categoryId: 'rental_planning',
    title: 'Préparer une location à Gisenyi/Rubavu',
    summary: 'Les points à vérifier avant de choisir un logement et de confirmer votre arrivée.',
    image: GUIDE_COVER,
    content: `# Préparer une location à Gisenyi/Rubavu

Commencez par vos besoins : durée du séjour, nombre de personnes, lieu de travail ou d’étude, accessibilité et équipements indispensables. Comparez les annonces sur ces critères et sur des informations récentes.

## Vérifier l’emplacement

Demandez à l’hôte de confirmer le point d’accès et les repères utiles. Regardez la carte, puis vérifiez le trajet réellement praticable et les modalités d’arrivée. Un point sur la carte ne confirme ni l’état d’une route ni la possibilité d’accéder au bâtiment avec vos bagages.

## Clarifier ce qui est proposé

- Quels espaces sont privatifs ou partagés ? Quelle est la capacité du logement ?
- Quels équipements sont effectivement présents et fonctionnels ?
- Comment fonctionnent l’eau, l’électricité et internet ? Quelles solutions existent en cas d’interruption ?
- Quelles charges sont comprises et quelles consommations sont facturées séparément ?
- Un dépôt est-il demandé et quelles conditions lui sont associées ?
- Quelles règles concernent les visiteurs, le bruit, le tabac et les animaux ?
- Qui remettra les clés et comment joindre cette personne le jour convenu ?

[INFO] Les conditions varient d’un logement à l’autre. Confirmez les informations propres à l’adresse avec l’hôte ; ce guide ne classe pas les quartiers et ne garantit pas leur sécurité.`,
    isNew: true,
    createdAt: new Date('2026-09-30T00:00:00.000Z'),
  },
  {
    id: 'rental_price_dates',
    categoryId: 'rental_planning',
    title: 'Comprendre le prix et les dates',
    summary: 'Relire le devis et distinguer une demande, une réservation approuvée et un paiement.',
    image: GUIDE_COVER,
    content: `# Comprendre le prix et les dates

Le montant dépend du logement, des dates et des tarifs affichés. Comparez des propositions récentes pour le séjour envisagé, puis relisez le devis avant d’envoyer votre demande.

## Lire le calcul LocaMap

Le prix mensuel de l’annonce sert de base au calcul. Pour les jours sans tarif spécifique au calendrier, le prix journalier correspond au prix mensuel divisé par 30. La durée minimale indiquée en mois correspond à des périodes de 30 jours dans ce calcul. La date de départ est exclue du séjour facturé.

Un dépôt éventuel est affiché séparément. Il ne s’ajoute pas automatiquement au montant du loyer calculé par l’application.

## Vérifier avant l’envoi

- Relisez la date d’arrivée, la date de départ et le nombre de personnes.
- Vérifiez le montant et la devise affichés sur le devis.
- Demandez quelles charges sont comprises et quelles dépenses restent à prévoir.
- Faites préciser par écrit les conditions d’un éventuel dépôt.
- Si un tarif a changé, actualisez le devis avant de poursuivre.

## Comprendre le statut

Une demande reste en attente jusqu’à la décision de l’hôte. Au lancement, LocaMap ne prélève aucun montant et n’effectue aucun versement. Une réservation approuvée ne signifie pas qu’elle a été payée.

[AVOID] Ne transmettez jamais un code secret bancaire ou de portefeuille mobile dans la messagerie. Conservez les conditions utiles de votre accord avec l’hôte.`,
    isNew: true,
    createdAt: new Date('2026-09-30T00:00:00.000Z'),
  },
  {
    id: 'host_questions',
    categoryId: 'rental_planning',
    title: 'Poser les bonnes questions à l’hôte',
    summary: 'Un message clair pour confirmer les informations qui comptent pour votre séjour.',
    image: GUIDE_COVER,
    content: `# Poser les bonnes questions à l’hôte

Indiquez vos dates, le nombre de personnes et votre besoin principal. Une question précise aide l’hôte à vérifier ce qu’il peut réellement proposer.

## Message à adapter

Bonjour, je souhaite louer ce logement du [date d’arrivée] au [date de départ] pour [nombre de personnes]. Pouvez-vous confirmer sa disponibilité, les espaces privatifs, les charges comprises, les équipements indiqués et les modalités de remise des clés ? J’ai également besoin de vérifier [besoin précis d’accessibilité ou d’équipement]. Merci de préciser toute condition particulière avant ma demande.

## Clarifier les écarts

- Demandez une explication si une photo, un prix ou une description se contredit.
- Faites confirmer les équipements indispensables à votre séjour.
- Si vous ne comprenez pas une formulation, demandez une reformulation dans une langue que vous maîtrisez.
- Relisez la réponse et les conditions enregistrées avant de réserver.

## Garder une trace utile

Conservez les échanges importants dans la conversation liée au logement. Une discussion de dates ne modifie pas automatiquement une demande existante : vérifiez toujours l’état enregistré de la réservation.

[INFO] Évitez d’envoyer plusieurs fois vos données personnelles. Les justificatifs du dossier hôte doivent passer par le parcours privé prévu, et non par un message ordinaire.`,
    isNew: true,
    createdAt: new Date('2026-09-30T00:00:00.000Z'),
  },
  {
    id: 'arrival_checks',
    categoryId: 'arrival_and_travel',
    title: 'Vérifier le logement à l’arrivée',
    summary: 'Commencer le séjour avec des attentes claires et des constats factuels.',
    image: GUIDE_COVER,
    content: `# Vérifier le logement à l’arrivée

Confirmez avec l’hôte la personne qui vous accueille, le point de rendez-vous et les modalités convenues pour les clés. Signalez un changement de trajet ou d’arrivée dès que vous le connaissez.

## Faire les vérifications utiles

- Vérifiez les accès au logement et la fermeture des portes.
- Contrôlez avec l’hôte les équipements annoncés et signalez les défauts déjà présents.
- Faites préciser les compteurs utiles et les consommations qui vous concernent.
- Demandez les consignes pour l’eau, l’électricité et les déchets.
- Clarifiez l’usage des espaces partagés et le contact prévu en cas de problème.

## Documenter un écart

Si nécessaire, prenez uniquement les photos utiles du logement ou de l’équipement concerné. Évitez les pièces d’identité, les objets personnels et les visages d’autres personnes. Décrivez précisément l’écart à l’hôte et conservez les réponses utiles.

[INFO] En cas de danger immédiat, recherchez l’aide des services locaux compétents. Le support LocaMap n’est pas un service de secours et ne garantit pas d’intervention sur place.`,
    isNew: true,
    createdAt: new Date('2026-09-30T00:00:00.000Z'),
  },
  {
    id: 'travel_planning',
    categoryId: 'arrival_and_travel',
    title: 'Utiliser la carte et organiser ses déplacements',
    summary: 'Se repérer à Gisenyi/Rubavu et confirmer les conditions du trajet avant de partir.',
    image: GUIDE_COVER,
    content: `# Utiliser la carte et organiser ses déplacements

Vérifiez la position du logement sur la carte LocaMap, puis demandez à l’hôte un repère compréhensible et le point d’accès à utiliser. Une carte peut être incomplète ou décalée : confirmez les indications sur le terrain.

## Préparer le trajet

- Confirmez le point de départ et la destination avec le transporteur choisi.
- Faites préciser le prix proposé et ce qu’il comprend avant de partir.
- Vérifiez les conditions concernant les bagages et vos besoins d’accessibilité.
- Confirmez la disponibilité pour votre heure d’arrivée et prévoyez une autre solution si nécessaire.
- Gardez accessibles les indications utiles et le contact convenu avec l’hôte.

## Adapter le déplacement

Choisissez un moyen de transport adapté aux personnes qui voyagent, aux bagages, à la météo et aux conditions constatées. Confirmez les équipements de sécurité nécessaires avant d’accepter un trajet.

Ce guide ne publie pas d’horaires, de tarifs ni de recommandations d’opérateurs. Demandez des informations actuelles au transporteur pour un trajet local ou vers une autre ville du Rwanda.

## Envisager un passage de frontière

Vérifiez les formalités, l’ouverture des points de passage et les informations de sécurité auprès de sources officielles actuelles avant de planifier un déplacement transfrontalier.

[INFO] Une réservation de logement ne garantit ni l’entrée sur un territoire, ni l’ouverture d’un passage, ni la disponibilité d’un transport.`,
    isNew: true,
    createdAt: new Date('2026-09-30T00:00:00.000Z'),
  },
  {
    id: 'departure_cancellation',
    categoryId: 'stay_and_departure',
    title: 'Préparer son départ ou demander une annulation',
    summary: 'Clarifier la fin du séjour et vérifier l’état de sa réservation dans l’application.',
    image: GUIDE_COVER,
    content: `# Préparer son départ ou demander une annulation

Avant le départ, convenez avec l’hôte du moment de la remise des clés et des vérifications utiles. Relisez les conditions que vous avez acceptées pour le logement et pour un éventuel dépôt.

## Préparer la remise du logement

- Confirmez la personne qui recevra les clés.
- Vérifiez les consignes concernant les équipements, les espaces partagés et les effets personnels.
- Signalez les difficultés avec des faits précis et les seuls éléments nécessaires.
- Conservez une trace des accords utiles sans publier les coordonnées privées d’une autre personne.

## Annuler dans l’application

Si vous devez annuler une demande en attente ou une réservation approuvée, utilisez l’action d’annulation et vérifiez la confirmation dans l’application. Un message seul ne modifie pas le statut. Une réservation terminée ne suit pas le même parcours d’annulation.

L’annulation libère les dates de la réservation concernée. Elle n’effectue aucun remboursement intégré. Les conditions d’un dépôt ou d’un accord extérieur doivent être clarifiées entre les parties.

## Demander de l’aide

Pour une difficulté liée à l’application, utilisez le parcours de support disponible et indiquez la référence utile. Décrivez le problème, l’action effectuée et le résultat observé.

[AVOID] N’envoyez jamais votre mot de passe, un code de connexion ou un code secret de paiement dans une demande d’aide.`,
    isNew: true,
    createdAt: new Date('2026-09-30T00:00:00.000Z'),
  },
];

export default localGuides;
