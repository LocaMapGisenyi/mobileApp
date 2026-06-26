const fs   = require('fs');
const path = require('path');

// ─── FR ───────────────────────────────────────────────────────────────────────
const FR = {
  hostDashboard: {
    greeting:'Bonjour, {{name}}',actionsRequired:'ACTIONS REQUISES ({{count}})',
    noActions:"Tout est tranquille",noActionsSubtitle:"Aucune action requise pour l'instant",
    requestReservation:"Demande de réservation",messageNoReply:"Message sans réponse",
    accept:"Accepter",decline:"Refuser",reply:"Répondre",slowResponse:"Répond lentement",
    urgent:"Urgent",checkIns:"Arrivées",checkOuts:"Départs",
    occupancyMonth:"Nuits occupées ce mois",revenue:"REVENUS",revenueMonth:"Ce mois",
    revenuePending:"En attente",details:"Détails",error:"Impossible de charger le tableau de bord",
    retry:"Réessayer",notifications:"Notifications",markAllRead:"Tout marquer comme lu",
    noNotifications:"Aucune notification",hoursAgo:"Il y a {{count}}h",yesterday:"Hier",
    daysAgo:"Il y a {{count}} jours"
  },
  hostCalendar: {
    title:"Calendrier",errorListings:"Impossible de charger vos annonces",
    publishFirst:"Publiez une annonce pour gérer votre calendrier.",
    booked:"réservée",blocked:"bloquée",free:"libre",chooseListing:"Choisir une annonce",
    legend:"LÉGENDE",legendFree:"Libre",legendBooked:"Réservé",legendBlocked:"Bloqué",
    legendSelected:"Sélectionné",confirmedBooking:"Réservation confirmée",
    tapHint:"Touchez des dates libres ou bloquées pour les modifier",
    saved:"Modifications enregistrées",saveError:"Erreur lors de l'enregistrement",
    selection:"SÉLECTION",available:"Disponible",block:"Bloquer",
    priceNight:"Prix / nuit",minStay:"Séjour min.",night:"nuit",nights:"nuits",
    personal:"Usage personnel",maintenance:"Travaux",other:"Autre",
    applyTo:"Appliquer à {{count}} date",applyToPlural:"Appliquer à {{count}} dates",minPrice:"Min."
  },
  hostListings: {
    active:"Actif",draft:"Brouillon",pending:"En vérification",paused:"En pause",
    suspended:"Suspendue",archived:"Archivée",addPhoto:"Ajouter des photos",
    completion:"Complétude",ptsNeeded:"pts manquants pour publier",occupation:"occupation",
    perNight:"/nuit",contactSupport:"Contactez le support pour réactiver",
    continueSetup:"Continuer la configuration",edit:"Modifier",calendar:"Calendrier",
    pause:"Pause",activate:"Activer",archiveTitle:"Archiver cette annonce ?",
    archiveBody:"{{name}} sera retirée de la recherche. Cette action est irréversible.",
    cancel:"Annuler",archive:"Archiver",error:"Impossible de charger vos annonces",
    retry:"Réessayer",empty:"Aucune annonce",
    emptySubtitle:"Créez votre première annonce pour commencer à recevoir des locataires.",
    create:"Créer une annonce",title:"Mes annonces",
    count_one:"{{count}} logement",count_other:"{{count}} logements",newListing:"Nouvelle"
  },
  hostMessages: {
    title:"Messages",all:"Toutes",unread:"Non lues",archived:"Archivées",search:"Rechercher...",
    empty:"Aucun message",emptyArchived:"Aucune conversation archivée",
    emptyUnread:"Aucun message non lu",
    emptySubtitle:"Les échanges avec les locataires apparaîtront ici.",
    loadPrevious:"Charger les messages précédents",
    contactWarning:"Coordonnées détectées — elles seront masquées à l'envoi",
    inputPlaceholder:"Écrire un message...",report:"Signaler cette conversation",
    reportLanguage:"Langage inapproprié",reportHarassment:"Harcèlement",
    reportFraud:"Fraude",reportSpam:"Spam",reportAction:"Signaler"
  },
  hostProfile: {
    title:"Profil",superhost:"SuperHôte",actionRequired:"Action requise",
    responseRate:"Taux de réponse",responseTime:"Temps de réponse",avgRating:"Note moyenne",
    superhostProgress:"Progression SuperHôte",completedStays:"Séjours complétés (12 mois)",
    cancellationRate:"Taux d'annulation",target:"Objectif :",createListing:"Créer une annonce",
    manageCoHosts:"Mes co-hôtes",settings:"Paramètres du compte",training:"Centre de formation",
    support:"Aide et support",legal:"Légal & conformité",referral:"Parrainer un hôte",
    switchGuest:"Passer en mode Locataire",logout:"Déconnexion",logoutTitle:"Se déconnecter ?",
    logoutBody:"Vous serez redirigé vers l'écran de connexion. Vos annonces restent actives.",
    criteriaAllMet:"Vous remplissez tous les critères. Le statut sera évalué au prochain trimestre.",
    noData:"Données non disponibles"
  },
  hostOnboarding: {
    step1Title:"Bienvenue chez vous, en tant qu'hôte",
    step1Subtitle:"Publiez votre logement à Gisenyi et commencez à accueillir des locataires dès aujourd'hui.",
    benefit1:"Recevez vos paiements en RWF, MTN ou Airtel",
    benefit2:"Locataires vérifiés par LocaMap",benefit3:"Support disponible 7j/7",
    step2Title:"Votre identité",step2Subtitle:"Ces informations seront visibles par les locataires.",
    fullName:"Nom complet *",fullNamePlaceholder:"Jean Mugisha",phone:"Numéro de téléphone *",
    step3Title:"Vos types de logements",
    step3Subtitle:"Sélectionnez tous les types de biens que vous proposez à la location.",
    step4Title:"Recevez vos paiements",
    step4Subtitle:"Choisissez comment vous souhaitez recevoir vos loyers. Vous pouvez en sélectionner plusieurs.",
    mtnName:"MTN MoMo",mtnSub:"Mobile Money Rwanda",airtelName:"Airtel Money",airtelSub:"Mobile Money Airtel",
    bankName:"Virement bancaire",bankSub:"Banque rwandaise",mtnNumber:"Numéro MTN MoMo",
    airtelNumber:"Numéro Airtel Money",bankNameField:"Nom de la banque",
    bankNamePlaceholder:"Ex: BK, Equity, I&M…",bankAccount:"Numéro de compte",
    bankNote:"Vos informations bancaires sont chiffrées et sécurisées. Elles ne seront jamais partagées avec les locataires.",
    step5Title:"Vous êtes hôte LocaMap !",
    step5Subtitle:"Votre profil d'hôte a été configuré avec succès. Publiez votre première annonce et commencez à recevoir des locataires.",
    goToDashboard:"Accéder au tableau de bord",continue:"Continuer",finish:"Finaliser",
    skip:"Ignorer cette étape",typeVilla:"Villa",typeMaison:"Maison",typeAppartement:"Appartement",
    typeStudio:"Studio",typeChambre:"Chambre"
  },
  hostCoHost: {
    title:"Co-hôtes",subtitle:"Déléguer la gestion de vos annonces",invite:"Inviter",
    tabMine:"Mes co-hôtes",tabDirectory:"Annuaire",empty:"Aucun co-hôte",
    emptySubtitle:"Invitez quelqu'un de confiance à gérer certaines tâches à votre place.",
    inviteBtn:"Inviter un co-hôte",directoryEmpty:"Annuaire vide",
    directoryEmptySubtitle:"Aucun co-hôte disponible dans votre zone pour le moment.",
    inviteTitle:"Inviter un co-hôte",emailLabel:"Email du co-hôte",
    permissionsLabel:"Permissions accordées",revenueLabel:"Rémunération",
    revenuePercentage:"Pourcentage des revenus",revenueFixedBooking:"Montant fixe / réservation",
    revenueFixedMonthly:"Montant fixe mensuel",revenuePercentageLabel:"Pourcentage (%)",
    revenueAmountLabel:"Montant (RWF)",sendInvite:"Envoyer l'invitation",
    editPermissionsTitle:"Permissions — {{name}}",savePermissions:"Enregistrer les permissions",
    terminateTitle:"Résilier ce co-hôtage ?",
    terminateBody:"{{name}} n'aura plus accès à vos annonces. Un préavis de 7 jours s'applique.",
    terminate:"Résilier",simulationTitle:"Simulation mensuelle",
    simulationAverage:"Revenu moyen de l'annonce",simulationShare:"Part estimée du co-hôte",
    simulationNote:"Calcul basé sur 3 réservations/mois",
    permCalendar:"Calendrier",permCalendarSub:"Gérer les disponibilités",
    permReservations:"Réservations",permReservationsSub:"Accepter ou refuser les demandes",
    permMessages:"Messages",permMessagesSub:"Répondre aux locataires",
    permPricing:"Tarifs",permPricingSub:"Modifier les prix",
    permRevenue:"Voir les revenus",permRevenueSub:"Lecture seule, sans retrait",
    permReviews:"Avis",permReviewsSub:"Gérer et répondre aux avis",
    permGuestInfo:"Infos locataires",permGuestInfoSub:"Accès aux coordonnées confirmées",
    statusPending:"En attente",statusActive:"Actif",statusSuspended:"Suspendu",
    statusTerminated:"Résilié",probation:"Probation",available:"Disponible",busy:"Occupé",
    inviteFromDirectory:"Inviter comme co-hôte"
  },
  hostReferral: {
    title:"Parrainage",subtitle:"Invitez des hôtes, gagnez des crédits",
    balanceLabel:"Solde de crédits",expiryNote:"{{amount}} expirent le {{date}}",
    qualified:"Qualifiés",inProgress:"En cours",annualQuota:"Quota annuel",
    codeLabel:"VOTRE CODE PARRAIN",copied:"Copié",copy:"Copier",share:"Partager le lien",
    rewardsTitle:"RÉCOMPENSES",forReferrer:"Pour vous (parrain)",
    perReferee:"{{amount}} par filleul qualifié",
    bonusDetail:"+10 000 RWF si 5 réservations en 90 jours",forReferee:"Pour votre filleul",
    refereeCommission:"0% de commission sur ses 3 premières réservations",
    refereesTitle:"VOS FILLEULS ({{count}})",faqTitle:"COMMENT ÇA MARCHE",
    creditsHistory:"HISTORIQUE DES CRÉDITS",stepClicked:"Lien cliqué",stepRegistered:"Inscrit",
    stepKyc:"KYC validé",stepListing:"Annonce publiée",stepBooking:"1ère réservation",
    statusCredited:"Bonus crédité",statusExpired:"Expiré",statusFraud:"Fraude détectée",
    statusBooked:"Réservation faite"
  },
  hostResources: {
    title:"Ressources",subtitle:"Formation et outils pour progresser",
    tabArticles:"Articles",tabCourses:"Parcours",tabBookmarks:"Sauvegardés",
    searchPlaceholder:"Rechercher un article...",videoLabel:"Vidéo",
    catAll:"Tout",catGettingStarted:"Premiers pas",catListing:"Annonce",catPricing:"Tarification",
    catGuests:"Locataires",catLegal:"Légal & fiscal",catSafety:"Sécurité",catPartners:"Partenaires",
    levelAll:"Tous niveaux",levelBeginner:"Débutant",levelIntermediate:"Intermédiaire",
    levelAdvanced:"Avancé",langAll:"Toutes",langFr:"Français",langEn:"English",langRw:"Kinyarwanda",
    emptyBookmarks:"Aucun article sauvegardé",
    emptyBookmarksSub:"Appuyez sur le signet d'un article pour le retrouver ici.",
    emptySearch:"Aucun résultat",emptySearchSub:"Essayez d'autres mots-clés ou filtres.",
    emptyCourses:"Aucun parcours disponible",emptyCoursesSub:"Les parcours de formation apparaîtront ici.",
    sectionInProgress:"EN COURS",noInProgress:"Commencez un parcours ci-dessous",
    sectionAllCourses:"TOUS LES PARCOURS",certified:"Certifié",
    courseComplete:"Parcours terminé — badge affiché sur votre profil",
    stepsLabel:"ÉTAPES DU PARCOURS",typeArticle:"Article",typeQuiz:"Quiz"
  },
  hostSupport: {
    title:"Support",subtitle:"Nous sommes là pour vous aider",
    tabContact:"Nous contacter",tabFaq:"FAQ",tabTickets:"Mes tickets",
    chatTitle:"Chat en direct",chatAvailable:"Disponible",chatWait:"Attente ~{{min}} min",
    chatUnavailable:"Indisponible actuellement",chatHours:"Disponible 07h – 22h (heure locale)",
    chatStart:"Démarrer le chat",whatsappTitle:"WhatsApp",whatsappSub:"Réponse < 2h en heures ouvrées",
    whatsappBtn:"Écrire sur WhatsApp",emailTitle:"Email",emailSub:"Réponse sous 24h",
    urgentTitle:"Urgences uniquement",urgentSub:"Voyageur bloqué, sécurité · SLA 1h",
    urgentBtn:"Appeler maintenant",complexTitle:"Problème plus complexe ?",
    complexSub:"Créez un ticket pour un suivi structuré et un historique des échanges.",
    createTicket:"Créer un ticket",faqSearch:"Rechercher dans la FAQ...",
    faqEmpty:"Tapez pour rechercher",faqNoResult:"Aucun résultat trouvé",
    faqNoResultSub:"Cet article n'existe pas encore. Créez un ticket et notre équipe vous répondra.",
    catReservation:"Réservation",catPayment:"Paiement",catListing:"Annonce",catAccount:"Compte",
    catOther:"Autre",catAll:"Tout",catFaqReservations:"Réservations",catFaqPayments:"Paiements",
    catFaqListings:"Annonces",catFaqSecurity:"Sécurité",
    priorityUrgent:"Urgence",priorityHigh:"Haute",priorityNormal:"Normale",priorityLow:"Faible",
    priorityUrgentDesc:"Voyageur bloqué, urgence sécurité — réponse en 1h",
    priorityHighDesc:"Paiement manquant, litige actif — réponse en 4h",
    priorityNormalDesc:"Questions générales — réponse en 24h",
    priorityLowDesc:"Suggestions, feedback — réponse en 72h",
    statusOpen:"Ouvert",statusInProgress:"En traitement",statusWaiting:"Votre réponse",
    statusResolved:"Résolu",statusClosed:"Fermé",ticketsEmpty:"Aucun ticket",
    ticketsEmptySub:"Créez un ticket pour tout problème nécessitant un suivi.",
    newTicket:"Nouveau",categoryLabel:"CATÉGORIE",priorityLabel:"PRIORITÉ",subjectLabel:"OBJET",
    subjectPlaceholder:"Résumez votre problème en une ligne",descriptionLabel:"DESCRIPTION",
    descriptionPlaceholder:"Décrivez la situation en détail : quand, quoi, impact...",
    submitTicket:"Envoyer le ticket",subjectRequired:"Objet et description requis",
    createError:"Erreur lors de la création du ticket",
    ratingQuestion:"Cette réponse vous a-t-elle aidé ?",ratingUseful:"Utile",
    ratingUseless:"Pas utile",replyPlaceholder:"Écrire une réponse..."
  },
  hostLegal: {
    title:"Légal & conformité",subtitle:"Documents, consentements et obligations fiscales",
    tabDocuments:"Documents",tabTax:"Fiscal",tabData:"Mes données",
    sectionDocuments:"DOCUMENTS DE LA PLATEFORME",noDocuments:"Aucun document disponible",
    version:"Version",updatedAt:"Mise à jour le",acceptedAt:"Accepté le",
    acceptRequired:"Acceptation requise",consentHistory:"HISTORIQUE DES CONSENTEMENTS",
    taxTitle:"ATTESTATION FISCALE ANNUELLE",taxExercice:"Exercice",taxGeneratedAt:"Générée le",
    taxGross:"Revenus bruts déclarés",taxCommission:"Commissions versées à la plateforme",
    taxNet:"Revenus nets",downloadPdf:"Télécharger le PDF",
    taxNote:"Ce document est compatible avec les formulaires DGRAD/DGI pour votre déclaration fiscale annuelle au Rwanda.",
    dataTitle:"VOS DROITS SUR VOS DONNÉES",rightAccess:"Droit d'accès",
    rightAccessDesc:"Téléchargez une copie complète de toutes vos données personnelles (JSON ou PDF). Traitement sous 72h.",
    requestExport:"Demander l'export",rightRectify:"Droit de rectification",
    rightRectifyDesc:"Modifiez vos informations personnelles directement depuis les Paramètres du compte.",
    goSettings:"Aller aux paramètres",rightForget:"Droit à l'oubli",
    rightForgetDesc:"Demandez la suppression de votre compte et de vos données. Cette action est irréversible et nécessite l'absence de réservations en cours.",
    contactDpo:"Contacter le DPO",dpoTitle:"Délégué à la protection des données",
    dpoDesc:"Pour toute question concernant l'utilisation de vos données, contactez notre DPO :",
    writeDpo:"Écrire au DPO",taxUnavailable:"Attestation non disponible pour cet exercice",
    taxAutoGenerated:"L'attestation est générée automatiquement au 1er janvier de l'année suivante.",
    scrollToAccept:"Lisez jusqu'en bas pour activer le bouton d'acceptation",
    acceptVersion:"Accepter la version",scrollFirst:"Faites défiler pour accepter",
    docUnavailable:"Document non disponible"
  },
  createListing: {
    headerTitle:"Nouvelle annonce",draftBtn:"Brouillon",
    step0Title:"Quel type de logement proposez-vous ?",
    step0Sub:"Choisissez ce qui correspond le mieux à votre bien.",
    accomTypeLabel:"Type de mise à disposition",accomEntire:"Logement entier",
    accomEntireSub:"Voyageurs ont le logement pour eux seuls",accomPrivate:"Chambre privée",
    accomPrivateSub:"Chambre dédiée, espaces communs partagés",accomShared:"Chambre partagée",
    accomSharedSub:"Chambre et espaces communs partagés",titleLabel:"Titre de l'annonce",
    titlePlaceholder:"Ex : Appartement moderne avec vue sur le lac",descriptionLabel:"Description",
    descriptionPlaceholder:"Décrivez votre logement, son ambiance, ce qui le rend unique...",
    step1Title:"Où se situe votre logement ?",
    step1Sub:"Placez le marqueur exactement sur votre bien. L'adresse précise ne sera partagée qu'après réservation.",
    locateBtn:"Utiliser ma position actuelle",locating:"Localisation en cours...",
    locationError:"Impossible d'obtenir la position",permissionDenied:"Permission de localisation refusée",
    mapHint:"Touchez ou glissez le marqueur",quarterLabel:"Quartier",
    quarterPlaceholder:"Ex : Centre-ville, Murara, Bord du lac...",addressLabel:"Adresse",
    addressPlaceholder:"Ex : Avenue du Commerce, N° 45",cityLabel:"Ville",
    step2Title:"Détails et tarification",
    step2Sub:"Location longue durée — le loyer est en francs rwandais par mois.",
    capacityLabel:"Capacité",bedroomsLabel:"Chambres",bathroomsLabel:"Salles de bain",
    rentLabel:"Loyer mensuel",priceLabel:"Prix / mois",pricePlaceholder:"Ex : 150 000",
    grossRent:"Loyer brut",commission:"Commission plateforme (12%)",netRent:"Revenu net / mois",
    depositLabel:"Caution",depositMonths:"Mois de caution",
    depositNote:"Versée à l'entrée, restituée au départ",minDurationLabel:"Durée minimale de location",
    noticeLabel:"Préavis de départ exigé",step3Title:"Équipements, règles et photos",
    step3Sub:"Plus votre annonce est complète, plus elle attire de locataires sérieux.",
    amenitiesLabel:"Équipements disponibles",
    amenitiesHint:"Sélectionnez au moins 5 équipements pour un meilleur référencement",
    rulesLabel:"Règles du logement",photosLabel:"Photos",photoCover:"Couverture",photoAdd:"Ajouter",
    photoHint:"Min. 5 photos recommandées · Première photo = couverture",save:"Enregistrer",
    publish:"Publier l'annonce",continueStep:"Continuer — {{stepName}}",
    submitError:"Une erreur est survenue. Réessayez.",errorTitle:"Minimum 10 caractères",
    errorDesc:"Minimum 50 caractères",errorQuarter:"Quartier requis",errorAddress:"Adresse requise",
    errorPrice:"Loyer minimum 20 000 RWF/mois",errorPhoto:"Au moins 1 photo requise",
    stepType:"Type",stepAddress:"Adresse",stepDetails:"Détails",stepFinish:"Finition"
  }
};

// ─── EN ───────────────────────────────────────────────────────────────────────
const EN = {
  hostDashboard:{greeting:"Hello, {{name}}",actionsRequired:"REQUIRED ACTIONS ({{count}})",noActions:"All quiet",noActionsSubtitle:"No actions required right now",requestReservation:"Booking request",messageNoReply:"Unanswered message",accept:"Accept",decline:"Decline",reply:"Reply",slowResponse:"Slow response",urgent:"Urgent",checkIns:"Check-ins",checkOuts:"Check-outs",occupancyMonth:"Occupied nights this month",revenue:"REVENUE",revenueMonth:"This month",revenuePending:"Pending",details:"Details",error:"Unable to load dashboard",retry:"Retry",notifications:"Notifications",markAllRead:"Mark all as read",noNotifications:"No notifications",hoursAgo:"{{count}}h ago",yesterday:"Yesterday",daysAgo:"{{count}} days ago"},
  hostCalendar:{title:"Calendar",errorListings:"Unable to load your listings",publishFirst:"Publish a listing to manage your calendar.",booked:"booked",blocked:"blocked",free:"free",chooseListing:"Choose a listing",legend:"LEGEND",legendFree:"Free",legendBooked:"Booked",legendBlocked:"Blocked",legendSelected:"Selected",confirmedBooking:"Confirmed booking",tapHint:"Tap free or blocked dates to edit them",saved:"Changes saved",saveError:"Error saving changes",selection:"SELECTION",available:"Available",block:"Block",priceNight:"Price / night",minStay:"Min. stay",night:"night",nights:"nights",personal:"Personal use",maintenance:"Maintenance",other:"Other",applyTo:"Apply to {{count}} date",applyToPlural:"Apply to {{count}} dates",minPrice:"Min."},
  hostListings:{active:"Active",draft:"Draft",pending:"Under review",paused:"Paused",suspended:"Suspended",archived:"Archived",addPhoto:"Add photos",completion:"Completion",ptsNeeded:"pts needed to publish",occupation:"occupancy",perNight:"/night",contactSupport:"Contact support to reactivate",continueSetup:"Continue setup",edit:"Edit",calendar:"Calendar",pause:"Pause",activate:"Activate",archiveTitle:"Archive this listing?",archiveBody:"{{name}} will be removed from search. This is irreversible.",cancel:"Cancel",archive:"Archive",error:"Unable to load your listings",retry:"Retry",empty:"No listings",emptySubtitle:"Create your first listing to start receiving tenants.",create:"Create a listing",title:"My listings",count_one:"{{count}} property",count_other:"{{count}} properties",newListing:"New"},
  hostMessages:{title:"Messages",all:"All",unread:"Unread",archived:"Archived",search:"Search...",empty:"No messages",emptyArchived:"No archived conversations",emptyUnread:"No unread messages",emptySubtitle:"Your conversations with tenants will appear here.",loadPrevious:"Load previous messages",contactWarning:"Contact info detected — it will be masked on send",inputPlaceholder:"Write a message...",report:"Report this conversation",reportLanguage:"Inappropriate language",reportHarassment:"Harassment",reportFraud:"Fraud",reportSpam:"Spam",reportAction:"Report"},
  hostProfile:{title:"Profile",superhost:"SuperHost",actionRequired:"Action required",responseRate:"Response rate",responseTime:"Response time",avgRating:"Average rating",superhostProgress:"SuperHost progress",completedStays:"Completed stays (12 months)",cancellationRate:"Cancellation rate",target:"Target:",createListing:"Create a listing",manageCoHosts:"My co-hosts",settings:"Account settings",training:"Training center",support:"Help & support",legal:"Legal & compliance",referral:"Refer a host",switchGuest:"Switch to guest mode",logout:"Log out",logoutTitle:"Log out?",logoutBody:"You will be redirected to the login screen. Your listings remain active.",criteriaAllMet:"You meet all criteria. Status will be evaluated next quarter.",noData:"Data unavailable"},
  hostOnboarding:{step1Title:"Welcome as a host",step1Subtitle:"List your property in Gisenyi and start welcoming tenants today.",benefit1:"Receive payments in RWF, MTN or Airtel",benefit2:"Tenants verified by LocaMap",benefit3:"Support available 7 days a week",step2Title:"Your identity",step2Subtitle:"This information will be visible to tenants.",fullName:"Full name *",fullNamePlaceholder:"Jean Mugisha",phone:"Phone number *",step3Title:"Your property types",step3Subtitle:"Select all property types you offer for rent.",step4Title:"Receive your payments",step4Subtitle:"Choose how you want to receive your rent. You can select multiple.",mtnName:"MTN MoMo",mtnSub:"MTN Mobile Money",airtelName:"Airtel Money",airtelSub:"Airtel Mobile Money",bankName:"Bank transfer",bankSub:"Rwandan bank",mtnNumber:"MTN MoMo number",airtelNumber:"Airtel Money number",bankNameField:"Bank name",bankNamePlaceholder:"e.g. BK, Equity, I&M…",bankAccount:"Account number",bankNote:"Your banking information is encrypted and secure. It will never be shared with tenants.",step5Title:"You are a LocaMap host!",step5Subtitle:"Your host profile has been set up. Publish your first listing and start receiving tenants.",goToDashboard:"Go to dashboard",continue:"Continue",finish:"Finish",skip:"Skip this step",typeVilla:"Villa",typeMaison:"House",typeAppartement:"Apartment",typeStudio:"Studio",typeChambre:"Room"},
  hostCoHost:{title:"Co-hosts",subtitle:"Delegate the management of your listings",invite:"Invite",tabMine:"My co-hosts",tabDirectory:"Directory",empty:"No co-hosts",emptySubtitle:"Invite someone you trust to handle certain tasks for you.",inviteBtn:"Invite a co-host",directoryEmpty:"Empty directory",directoryEmptySubtitle:"No co-hosts available in your area right now.",inviteTitle:"Invite a co-host",emailLabel:"Co-host email",permissionsLabel:"Granted permissions",revenueLabel:"Compensation",revenuePercentage:"Percentage of revenue",revenueFixedBooking:"Fixed amount per booking",revenueFixedMonthly:"Fixed monthly amount",revenuePercentageLabel:"Percentage (%)",revenueAmountLabel:"Amount (RWF)",sendInvite:"Send invitation",editPermissionsTitle:"Permissions — {{name}}",savePermissions:"Save permissions",terminateTitle:"Terminate co-hosting?",terminateBody:"{{name}} will no longer have access to your listings. 7-day notice applies.",terminate:"Terminate",simulationTitle:"Monthly simulation",simulationAverage:"Average listing revenue",simulationShare:"Estimated co-host share",simulationNote:"Based on 3 bookings/month",permCalendar:"Calendar",permCalendarSub:"Manage availability",permReservations:"Reservations",permReservationsSub:"Accept or decline requests",permMessages:"Messages",permMessagesSub:"Reply to tenants",permPricing:"Pricing",permPricingSub:"Edit prices",permRevenue:"View revenue",permRevenueSub:"Read-only, no withdrawal",permReviews:"Reviews",permReviewsSub:"Manage and reply to reviews",permGuestInfo:"Tenant info",permGuestInfoSub:"Access confirmed contact details",statusPending:"Pending",statusActive:"Active",statusSuspended:"Suspended",statusTerminated:"Terminated",probation:"Probation",available:"Available",busy:"Busy",inviteFromDirectory:"Invite as co-host"},
  hostReferral:{title:"Referral",subtitle:"Invite hosts, earn credits",balanceLabel:"Credit balance",expiryNote:"{{amount}} expire on {{date}}",qualified:"Qualified",inProgress:"In progress",annualQuota:"Annual quota",codeLabel:"YOUR REFERRAL CODE",copied:"Copied",copy:"Copy",share:"Share link",rewardsTitle:"REWARDS",forReferrer:"For you (referrer)",perReferee:"{{amount}} per qualified referral",bonusDetail:"+10,000 RWF if 5 bookings within 90 days",forReferee:"For your referral",refereeCommission:"0% commission on their first 3 bookings",refereesTitle:"YOUR REFERRALS ({{count}})",faqTitle:"HOW IT WORKS",creditsHistory:"CREDITS HISTORY",stepClicked:"Link clicked",stepRegistered:"Registered",stepKyc:"KYC verified",stepListing:"Listing published",stepBooking:"1st booking",statusCredited:"Bonus credited",statusExpired:"Expired",statusFraud:"Fraud detected",statusBooked:"Booking done"},
  hostResources:{title:"Resources",subtitle:"Training and tools to improve",tabArticles:"Articles",tabCourses:"Courses",tabBookmarks:"Saved",searchPlaceholder:"Search an article...",videoLabel:"Video",catAll:"All",catGettingStarted:"Getting started",catListing:"Listing",catPricing:"Pricing",catGuests:"Tenants",catLegal:"Legal & tax",catSafety:"Security",catPartners:"Partners",levelAll:"All levels",levelBeginner:"Beginner",levelIntermediate:"Intermediate",levelAdvanced:"Advanced",langAll:"All",langFr:"French",langEn:"English",langRw:"Kinyarwanda",emptyBookmarks:"No saved articles",emptyBookmarksSub:"Tap the bookmark on an article to save it here.",emptySearch:"No results",emptySearchSub:"Try different keywords or filters.",emptyCourses:"No courses available",emptyCoursesSub:"Training courses will appear here.",sectionInProgress:"IN PROGRESS",noInProgress:"Start a course below",sectionAllCourses:"ALL COURSES",certified:"Certified",courseComplete:"Course complete — badge shown on your profile",stepsLabel:"COURSE STEPS",typeArticle:"Article",typeQuiz:"Quiz"},
  hostSupport:{title:"Support",subtitle:"We are here to help",tabContact:"Contact us",tabFaq:"FAQ",tabTickets:"My tickets",chatTitle:"Live chat",chatAvailable:"Available",chatWait:"Wait ~{{min}} min",chatUnavailable:"Currently unavailable",chatHours:"Available 7am–10pm (local time)",chatStart:"Start chat",whatsappTitle:"WhatsApp",whatsappSub:"Response < 2h during business hours",whatsappBtn:"Write on WhatsApp",emailTitle:"Email",emailSub:"Response within 24h",urgentTitle:"Emergencies only",urgentSub:"Tenant locked out, security · SLA 1h",urgentBtn:"Call now",complexTitle:"More complex issue?",complexSub:"Create a ticket for structured follow-up.",createTicket:"Create a ticket",faqSearch:"Search FAQ...",faqEmpty:"Type to search",faqNoResult:"No results found",faqNoResultSub:"This article does not exist yet. Create a ticket and our team will respond.",catReservation:"Booking",catPayment:"Payment",catListing:"Listing",catAccount:"Account",catOther:"Other",catAll:"All",catFaqReservations:"Bookings",catFaqPayments:"Payments",catFaqListings:"Listings",catFaqSecurity:"Security",priorityUrgent:"Urgent",priorityHigh:"High",priorityNormal:"Normal",priorityLow:"Low",priorityUrgentDesc:"Tenant locked out — response in 1h",priorityHighDesc:"Missing payment — response in 4h",priorityNormalDesc:"General questions — response in 24h",priorityLowDesc:"Suggestions — response in 72h",statusOpen:"Open",statusInProgress:"In progress",statusWaiting:"Your reply needed",statusResolved:"Resolved",statusClosed:"Closed",ticketsEmpty:"No tickets",ticketsEmptySub:"Create a ticket for any issue requiring follow-up.",newTicket:"New",categoryLabel:"CATEGORY",priorityLabel:"PRIORITY",subjectLabel:"SUBJECT",subjectPlaceholder:"Summarise your issue in one line",descriptionLabel:"DESCRIPTION",descriptionPlaceholder:"Describe the situation: when, what, impact...",submitTicket:"Submit ticket",subjectRequired:"Subject and description required",createError:"Error creating ticket",ratingQuestion:"Was this response helpful?",ratingUseful:"Helpful",ratingUseless:"Not helpful",replyPlaceholder:"Write a reply..."},
  hostLegal:{title:"Legal & compliance",subtitle:"Documents, consents and tax obligations",tabDocuments:"Documents",tabTax:"Tax",tabData:"My data",sectionDocuments:"PLATFORM DOCUMENTS",noDocuments:"No documents available",version:"Version",updatedAt:"Updated on",acceptedAt:"Accepted on",acceptRequired:"Acceptance required",consentHistory:"CONSENT HISTORY",taxTitle:"ANNUAL TAX CERTIFICATE",taxExercice:"Tax year",taxGeneratedAt:"Generated on",taxGross:"Declared gross revenue",taxCommission:"Platform commission paid",taxNet:"Net revenue",downloadPdf:"Download PDF",taxNote:"Compatible with DGRAD/DGI forms for your annual tax return in Rwanda.",dataTitle:"YOUR DATA RIGHTS",rightAccess:"Right of access",rightAccessDesc:"Download a complete copy of all your personal data. Processed within 72h.",requestExport:"Request export",rightRectify:"Right to rectification",rightRectifyDesc:"Edit your personal information from Account settings.",goSettings:"Go to settings",rightForget:"Right to erasure",rightForgetDesc:"Request deletion of your account and data. Irreversible.",contactDpo:"Contact DPO",dpoTitle:"Data Protection Officer",dpoDesc:"For questions about how your data is used, contact our DPO:",writeDpo:"Write to DPO",taxUnavailable:"Certificate not available for this year",taxAutoGenerated:"The certificate is automatically generated on January 1st of the following year.",scrollToAccept:"Scroll to the bottom to activate the accept button",acceptVersion:"Accept version",scrollFirst:"Scroll to accept",docUnavailable:"Document not available"},
  createListing:{headerTitle:"New listing",draftBtn:"Draft",step0Title:"What type of property do you offer?",step0Sub:"Choose what best describes your property.",accomTypeLabel:"Type of accommodation",accomEntire:"Entire place",accomEntireSub:"Guests have the entire place to themselves",accomPrivate:"Private room",accomPrivateSub:"Dedicated room, shared common areas",accomShared:"Shared room",accomSharedSub:"Shared room and common areas",titleLabel:"Listing title",titlePlaceholder:"e.g. Modern apartment with lake view",descriptionLabel:"Description",descriptionPlaceholder:"Describe your property, its atmosphere, what makes it unique...",step1Title:"Where is your property?",step1Sub:"Place the marker on your property. Exact address shared only after booking.",locateBtn:"Use my current location",locating:"Locating...",locationError:"Unable to get location",permissionDenied:"Location permission denied",mapHint:"Tap or drag the marker",quarterLabel:"Neighborhood",quarterPlaceholder:"e.g. City center, Murara, Lakeside...",addressLabel:"Address",addressPlaceholder:"e.g. Commerce Avenue, No. 45",cityLabel:"City",step2Title:"Details and pricing",step2Sub:"Long-term rental — rent is in Rwandan francs per month.",capacityLabel:"Capacity",bedroomsLabel:"Bedrooms",bathroomsLabel:"Bathrooms",rentLabel:"Monthly rent",priceLabel:"Price / month",pricePlaceholder:"e.g. 150,000",grossRent:"Gross rent",commission:"Platform commission (12%)",netRent:"Net revenue / month",depositLabel:"Deposit",depositMonths:"Months deposit",depositNote:"Paid on arrival, returned on departure",minDurationLabel:"Minimum rental period",noticeLabel:"Required notice period",step3Title:"Amenities, rules and photos",step3Sub:"The more complete your listing, the more serious tenants you attract.",amenitiesLabel:"Available amenities",amenitiesHint:"Select at least 5 amenities for better visibility",rulesLabel:"House rules",photosLabel:"Photos",photoCover:"Cover",photoAdd:"Add",photoHint:"Min. 5 photos recommended · First photo = cover",save:"Save",publish:"Publish listing",continueStep:"Continue — {{stepName}}",submitError:"An error occurred. Please try again.",errorTitle:"Minimum 10 characters",errorDesc:"Minimum 50 characters",errorQuarter:"Neighborhood required",errorAddress:"Address required",errorPrice:"Minimum rent 20,000 RWF/month",errorPhoto:"At least 1 photo required",stepType:"Type",stepAddress:"Address",stepDetails:"Details",stepFinish:"Finish"}
};

// RW — key overrides on top of EN
const RW = JSON.parse(JSON.stringify(EN));
const rwOverrides = {
  hostDashboard:{greeting:"Muraho, {{name}}",actionsRequired:"IBIKORWA BISABWA ({{count}})",noActions:"Byose ni byiza",noActionsSubtitle:"Nta gikorwa gisabwa ubu",requestReservation:"Gusaba indaho",messageNoReply:"Ubutumwa butaransubizwa",accept:"Kwemera",decline:"Kunanira",reply:"Gusubiza",slowResponse:"Igisubizo gikururira",urgent:"Byihutirwa",checkIns:"Abinjira",checkOuts:"Abasohoka",occupancyMonth:"Amajoro yuzuye uku kwezi",revenue:"INYUNGU",revenueMonth:"Uku kwezi",revenuePending:"Bitegereje",details:"Amakuru",error:"Ntibishoboka gukurura imbaho",retry:"Ongera ugerageze",notifications:"Amatangazo",markAllRead:"Shyira byose ko byasomwe",noNotifications:"Nta matangazo",hoursAgo:"Amasaha {{count}} ashize",yesterday:"Ejo",daysAgo:"Iminsi {{count}} ishize"},
  hostCalendar:{title:"Kalandari",errorListings:"Ntibishoboka gukurura amatangazo yawe",publishFirst:"Tangaza indaho kugira ngo ugenzure kalandari yawe.",booked:"yariwe",blocked:"yafunzwe",free:"ifunguke",chooseListing:"Hitamo itangazo",legend:"INSANGANYAMATSIKO",legendFree:"Ifunguke",legendBooked:"Yariwe",legendBlocked:"Yafunzwe",legendSelected:"Yahiswemo",confirmedBooking:"Indaho yemejwe",tapHint:"Kanda amatariki afunguke cyangwa afunzwe kuyahindura",saved:"Impinduka zachitswe",saveError:"Ikosa mu kubika impinduka",selection:"IHISWEMO",available:"Ifunguke",block:"Gufunga",priceNight:"Igiciro / ijoro",minStay:"Gutura byibura",night:"ijoro",nights:"amajoro",personal:"Gukoresha bwite",maintenance:"Gusana",other:"Ikindi",applyTo:"Shyira kuri {{count}} itariki",applyToPlural:"Shyira kuri {{count}} amatariki",minPrice:"Byibura"},
  hostListings:{active:"Gukora",draft:"Gushongorwa",pending:"Kugenzurwa",paused:"Hagaritswe",suspended:"Hagaritswe na platifome",archived:"Bitswe",addPhoto:"Ongeraho amafoto",completion:"Uzuzwa",ptsNeeded:"amanota asabwa gutangaza",occupation:"ifashwa",perNight:"/ijoro",contactSupport:"Vugana na serivisi yo gufasha",continueSetup:"Komeza gushyiraho",edit:"Hindura",calendar:"Kalandari",pause:"Hagarika",activate:"Fungura",archiveTitle:"Bika iri tangazo?",archiveBody:"{{name}} izakurwa mu gushakisha. Ntibivuguruzwa.",cancel:"Guhagarika",archive:"Bika",error:"Ntibishoboka gukurura amatangazo yawe",retry:"Ongera ugerageze",empty:"Nta matangazo",emptySubtitle:"Kora itangazo rya mbere kugira ngo utangire kwakira abakodeshwa.",create:"Kora itangazo",title:"Amatangazo yanjye",count_one:"{{count}} aho gutura",count_other:"{{count}} ahantu ho gutura",newListing:"Rishya"},
  hostMessages:{title:"Ubutumwa",all:"Byose",unread:"Bitasomwe",archived:"Bitswe",search:"Shakisha...",empty:"Nta butumwa",emptyArchived:"Nta makuru abitswe",emptyUnread:"Nta butumwa butasomwe",emptySubtitle:"Ikiganiro n'abakodeshwa bizagaragara hano.",loadPrevious:"Shyiramwo ubutumwa bwashize",contactWarning:"Amakuru y'ugutumanahana yabonetse — azafatirwa mbere yo kohereza",inputPlaceholder:"Andika ubutumwa...",report:"Tangaza ikiganiro",reportLanguage:"Ururimi rutakunzwe",reportHarassment:"Gukandamiza",reportFraud:"Uburiganya",reportSpam:"Spam",reportAction:"Tangaza"},
  hostProfile:{title:"Umwirondoro",superhost:"Nyir'inzu Nziza",actionRequired:"Igikorwa gisabwa",responseRate:"Igipimo cy'igisubizo",responseTime:"Igihe cy'igisubizo",avgRating:"Amanota yo hagati",superhostProgress:"Iterambere rya Nyir'inzu Nziza",completedStays:"Gutura kwuzuye (amezi 12)",cancellationRate:"Igipimo cy'iguhagarika",target:"Intego:",createListing:"Kora itangazo",manageCoHosts:"Ba nyir'inzu banjye",settings:"Igenamiterere ry'konti",training:"Ikigo cy'amahugurwa",support:"Ubufasha",legal:"Amategeko",referral:"Kohereza nyir'inzu",switchGuest:"Hinduka mu mukodeshwa",logout:"Gusohoka",logoutTitle:"Gusohoka?",logoutBody:"Uzajyanwa ku ipaji yo kwinjira. Amatangazo yawe azakomeza gukora.",criteriaAllMet:"Urangije ibisabwa byose. Ingaruka izasuzumwa igihembwe gitaha.",noData:"Amakuru ntaboneka"},
  hostOnboarding:{step1Title:"Murakaza neza nk'umwombi",step1Subtitle:"Tangaza inzu yawe i Gisenyi utangire kwakira abakodeshwa uyu munsi.",benefit1:"Akira amafaranga mu RWF, MTN cyangwa Airtel",benefit2:"Abakodeshwa bagenzuwe na LocaMap",benefit3:"Ubufasha bugaragara iminsi 7/7",step2Title:"Uwo uri we",step2Subtitle:"Ibi makuru bizaboneka n'abakodeshwa.",fullName:"Amazina yuzuye *",fullNamePlaceholder:"Jean Mugisha",phone:"Numero ya telefone *",step3Title:"Ubwoko bw'aho gutura",step3Subtitle:"Hitamo ubwoko bwose bw'aho gutura utanga gukodesha.",step4Title:"Akira amafaranga yawe",step4Subtitle:"Hitamo uburyo ushaka kwakira ubukode. Ushobora guhitamo byinshi.",mtnName:"MTN MoMo",mtnSub:"MTN Mobile Money Rwanda",airtelName:"Airtel Money",airtelSub:"Airtel Mobile Money",bankName:"Kwimura kwa banki",bankSub:"Banki y'u Rwanda",mtnNumber:"Numero ya MTN MoMo",airtelNumber:"Numero ya Airtel Money",bankNameField:"Izina rya banki",bankNamePlaceholder:"Urugero: BK, Equity, I&M…",bankAccount:"Numero y'konti",bankNote:"Amakuru yawe ya banki arafitiwe umutekano. Ntazigera asangirwa n'abakodeshwa.",step5Title:"Uri nyir'inzu wa LocaMap!",step5Subtitle:"Umwirondoro wawe nk'umwombi washyizweho neza. Tangaza itangazo rya mbere.",goToDashboard:"Jya ku ikibaho",continue:"Komeza",finish:"Rangiza",skip:"Simbuka intambwe iyi",typeVilla:"Villa",typeMaison:"Inzu",typeAppartement:"Apatimant",typeStudio:"Isitiyo",typeChambre:"Icumbi"},
  createListing:{headerTitle:"Itangazo rishya",draftBtn:"Gushongorwa",step0Title:"Ni ubwoko ki bw'aho gutura utanga?",step0Sub:"Hitamo ibihuje neza n'aho gutura kwawe.",accomTypeLabel:"Ubwoko bwo gutura",accomEntire:"Inzu yose",accomEntireSub:"Abashyitsi bafite inzu yose bonyine",accomPrivate:"Icumbi bwite",accomPrivateSub:"Icumbi ryihariye, ahantu rusange basangira",accomShared:"Icumbi basangira",accomSharedSub:"Icumbi n'ahantu rusange basangira",titleLabel:"Insanganyamatsiko y'itangazo",titlePlaceholder:"Urugero: Apatimant inoze n'ikiroryi cy'ikiyaga",descriptionLabel:"Ibisobanuro",descriptionPlaceholder:"Sobanura aho gutura kwawe...",step1Title:"Ni he aho gutura kwawe kuri?",step1Sub:"Shyira ikimenyetso ku mwanya w'aho gutura kwawe.",locateBtn:"Koresha aho ndi",locating:"Kuzana aho ndi...",locationError:"Ntibishoboka kubona aho uri",permissionDenied:"Uburenganzira bwo kubona aho uri bunanijwe",mapHint:"Kanda cyangwa kururura ikimenyetso",quarterLabel:"Akagari",quarterPlaceholder:"Urugero: Umujyi wo hagati, Murara...",addressLabel:"Aderesi",addressPlaceholder:"Urugero: Avenue du Commerce, N° 45",cityLabel:"Umujyi",step2Title:"Amakuru n'igiciro",step2Sub:"Ubukode bw'igihe kirekire — ubukode ni mu RWF ku kwezi.",capacityLabel:"Ubushobozi",bedroomsLabel:"Ibyumba",bathroomsLabel:"Bafu",rentLabel:"Ubukode bwa buri kwezi",priceLabel:"Igiciro / ukwezi",pricePlaceholder:"Urugero: 150 000",grossRent:"Ubukode bwose",commission:"Komisiyoni ya platifome (12%)",netRent:"Inyungu / ukwezi",depositLabel:"Ingwate",depositMonths:"Amezi y'ingwate",depositNote:"Yishyurwa ku winjira, isubizwa ku usohoka",minDurationLabel:"Igihe cy'ubukode gito cyane",noticeLabel:"Itangazo risabwa",step3Title:"Ibikoresho, amategeko n'amafoto",step3Sub:"Uko itangazo ryawe rizuzuye, ni uko ubyakira abakodeshwa bakomeye.",amenitiesLabel:"Ibikoresho biboneka",amenitiesHint:"Hitamo byibura ibikoresho 5",rulesLabel:"Amategeko y'inzu",photosLabel:"Amafoto",photoCover:"Ifoto nkuru",photoAdd:"Ongeraho",photoHint:"Byibura amafoto 5 yarasabwe",save:"Bika",publish:"Tangaza itangazo",continueStep:"Komeza — {{stepName}}",submitError:"Habayeho ikosa. Gerageza nanone.",errorTitle:"Inyuguti 10 byibura",errorDesc:"Inyuguti 50 byibura",errorQuarter:"Akagari gasabwa",errorAddress:"Aderesi isabwa",errorPrice:"Ubukode buto: 20.000 RWF",errorPhoto:"Byibura ifoto 1 isabwa",stepType:"Ubwoko",stepAddress:"Aderesi",stepDetails:"Amakuru",stepFinish:"Kumaro"}
};
for (const [k, v] of Object.entries(rwOverrides)) {
  RW[k] = Object.assign({}, RW[k], v);
}

// SW — key overrides on top of EN
const SW = JSON.parse(JSON.stringify(EN));
const swOverrides = {
  hostDashboard:{greeting:"Habari, {{name}}",actionsRequired:"VITENDO VINAVYOHITAJIKA ({{count}})",noActions:"Kila kitu ni sawa",noActionsSubtitle:"Hakuna vitendo vinavyohitajika sasa hivi",accept:"Kubali",decline:"Kataa",reply:"Jibu",urgent:"Haraka",checkIns:"Wanaoingia",checkOuts:"Wanaotoka",revenue:"MAPATO",retry:"Jaribu tena",notifications:"Arifa",markAllRead:"Weka zote zimesomwa",noNotifications:"Hakuna arifa",yesterday:"Jana",daysAgo:"Siku {{count}} zilizopita"},
  hostListings:{title:"Matangazo yangu",active:"Amilifu",draft:"Rasimu",pending:"Inakaguliwa",paused:"Imesimamishwa",archived:"Imehifadhiwa",edit:"Hariri",calendar:"Kalenda",pause:"Simamisha",activate:"Amilisha",archive:"Hifadhi",cancel:"Ghairi",empty:"Hakuna matangazo",emptySubtitle:"Unda tangazo lako la kwanza kupokea wapangaji.",create:"Unda tangazo",newListing:"Mpya",count_one:"{{count}} mali",count_other:"{{count}} mali"},
  hostMessages:{title:"Ujumbe",all:"Yote",unread:"Hayajasomwa",archived:"Zilizohifadhiwa",search:"Tafuta...",empty:"Hakuna ujumbe",inputPlaceholder:"Andika ujumbe...",report:"Ripoti mazungumzo",reportAction:"Ripoti"},
  hostProfile:{title:"Wasifu",superhost:"SuperMwenyeji",actionRequired:"Kitendo kinahitajika",settings:"Mipangilio ya akaunti",training:"Kituo cha mafunzo",support:"Msaada",legal:"Kisheria & utiifu",referral:"Mwaliko wa mwenyeji",switchGuest:"Badilisha hadi mpangaji",logout:"Toka",logoutTitle:"Toka?",logoutBody:"Utaelekezwa kwenye skrini ya kuingia. Matangazo yako yanabaki amilifu."},
  hostCalendar:{title:"Kalenda",available:"Inapatikana",block:"Zuia",saved:"Mabadiliko yamehifadhiwa",selection:"UTEUZI"},
  hostOnboarding:{step1Title:"Karibu kama mwenyeji",step1Subtitle:"Tangaza nyumba yako Gisenyi na uanze kupokea wapangaji leo.",benefit1:"Pokea malipo kwa RWF, MTN au Airtel",benefit2:"Wapangaji waliothibitishwa na LocaMap",benefit3:"Msaada unapatikana siku 7/7",step2Title:"Utambulisho wako",step2Subtitle:"Maelezo haya yataonekana kwa wapangaji.",fullName:"Jina kamili *",phone:"Nambari ya simu *",step3Title:"Aina za mali",step3Subtitle:"Chagua aina zote za mali unazotoa kwa kukodisha.",step4Title:"Pokea malipo yako",step4Subtitle:"Chagua jinsi unavyotaka kupokea kodi. Unaweza kuchagua nyingi.",goToDashboard:"Nenda kwenye dashibodi",continue:"Endelea",finish:"Maliza",skip:"Ruka hatua hii"},
  createListing:{headerTitle:"Tangazo jipya",draftBtn:"Rasimu",publish:"Chapisha tangazo",save:"Hifadhi",continueStep:"Endelea — {{stepName}}",step0Title:"Unatoa aina gani ya mali?",step0Sub:"Chagua kinachofanana zaidi na mali yako.",step1Title:"Mali yako iko wapi?",locateBtn:"Tumia eneo langu la sasa",mapHint:"Gonga au buruta alama",step2Title:"Maelezo na bei",step2Sub:"Kukodisha kwa muda mrefu — kodi ni kwa RWF kwa mwezi.",step3Title:"Vifaa, sheria na picha",amenitiesHint:"Chagua angalau vifaa 5 kwa mwonekano bora"},
  hostSupport:{title:"Msaada",subtitle:"Tuko hapa kukusaidia",tabContact:"Wasiliana nasi",tabFaq:"Maswali ya Kawaida",tabTickets:"Tikiti zangu",createTicket:"Fungua tikiti",submitTicket:"Tuma tikiti"},
  hostLegal:{title:"Kisheria",subtitle:"Hati, ridhaa na majukumu ya kodi",tabDocuments:"Hati",tabTax:"Kodi",tabData:"Data yangu",downloadPdf:"Pakua PDF"}
};
for (const [k, v] of Object.entries(swOverrides)) {
  SW[k] = Object.assign({}, SW[k], v);
}

const LOCALES_DIR = path.join(__dirname, '..', 'src', 'locales');
const MAP = { 'fr.json': FR, 'en.json': EN, 'rw.json': RW, 'sw.json': SW };

for (const [file, newKeys] of Object.entries(MAP)) {
  const filePath = path.join(LOCALES_DIR, file);
  const existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  for (const [section, keys] of Object.entries(newKeys)) {
    if (!existing[section]) existing[section] = {};
    existing[section] = Object.assign({}, existing[section], keys);
  }
  fs.writeFileSync(filePath, JSON.stringify(existing, null, 2) + '\n', 'utf8');
  console.log('Updated', file);
}
console.log('All locales updated.');
