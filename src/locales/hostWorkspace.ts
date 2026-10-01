// French, English, Kinyarwanda and Swahili share the same workspace keys.
const copy: Record<string, [string, string, string, string]> = {
  'calendar.previousMonth': ['Mois précédent', 'Previous month', 'Ukwezi gushize', 'Mwezi uliopita'],
  'calendar.nextMonth': ['Mois suivant', 'Next month', 'Ukwezi gutaha', 'Mwezi ujao'],
  'calendar.selected': ['{{count}} date(s) sélectionnée(s)', '{{count}} selected date(s)', 'Amatariki {{count}} yatoranyijwe', 'Tarehe {{count}} zimechaguliwa'],
  'calendar.nights': ['{{count}} nuit(s)', '{{count}} night(s)', 'Amajoro {{count}}', 'Usiku {{count}}'],
  'calendar.available': ['Disponible', 'Available', 'Irahari', 'Inapatikana'],
  'calendar.booked': ['Réservé', 'Booked', 'Yarakodeshejwe', 'Imehifadhiwa'],
  'calendar.blocked': ['Bloqué', 'Blocked', 'Yafunzwe', 'Imezuiwa'],
  'calendar.unspecifiedType': ['Type non précisé', 'Type not specified', 'Ubwoko ntiburatoranywa', 'Aina haijabainishwa'],
  'calendar.bookedDays_one': ['{{count}} date réservée', '{{count}} booked day', 'Umunsi {{count}} wakodeshejwe', 'Siku {{count}} imehifadhiwa'],
  'calendar.bookedDays_other': ['{{count}} dates réservées', '{{count}} booked days', 'Iminsi {{count}} yakodeshejwe', 'Siku {{count}} zimehifadhiwa'],
  'calendar.blockedDays_one': ['{{count}} date bloquée', '{{count}} blocked day', 'Umunsi {{count}} wafunzwe', 'Siku {{count}} imezuiwa'],
  'calendar.blockedDays_other': ['{{count}} dates bloquées', '{{count}} blocked days', 'Iminsi {{count}} yafunzwe', 'Siku {{count}} zimezuiwa'],
  'calendar.availableDays_one': ['{{count}} date libre', '{{count}} available day', 'Umunsi {{count}} uhari', 'Siku {{count}} inapatikana'],
  'calendar.availableDays_other': ['{{count}} dates libres', '{{count}} available days', 'Iminsi {{count}} ihari', 'Siku {{count}} zinapatikana'],
  'calendar.decreaseStay': ['Réduire le séjour minimum', 'Decrease minimum stay', 'Gabanya iminsi mike yo gucumbika', 'Punguza muda wa chini wa kukaa'],
  'calendar.increaseStay': ['Augmenter le séjour minimum', 'Increase minimum stay', 'Ongera iminsi mike yo gucumbika', 'Ongeza muda wa chini wa kukaa'],
  'messages.subtitle': ['Vos échanges, classés par logement.', 'Your conversations, with each property in view.', 'Ubutumwa bwanyu kuri buri nzu.', 'Mazungumzo yako kwa kila nyumba.'],
  'messages.loadError': ['Impossible de charger les messages.', 'Messages could not be loaded.', 'Ubutumwa ntibwabonetse.', 'Ujumbe haukupakiwa.'],
  'messages.connectionError': ['Connexion interrompue. Actualisez pour récupérer les derniers messages.', 'Connection interrupted. Refresh to get the latest messages.', 'Umurongo wahagaze. Ongera ushake ubutumwa bushya.', 'Muunganisho umekatika. Onyesha upya kupata ujumbe mpya.'],
  'messages.clearSearch': ['Effacer la recherche', 'Clear search', 'Siba ishakisha', 'Futa utafutaji'],
  'messages.noResults': ['Aucun échange ne correspond', 'No matching conversations', 'Nta butumwa buhuye', 'Hakuna mazungumzo yanayolingana'],
  'messages.searchHint': ['Essayez un autre nom ou un autre logement.', 'Try another name or property.', 'Gerageza irindi zina cyangwa indi nzu.', 'Jaribu jina au nyumba nyingine.'],
  'messages.unreadCount': ['{{count}} message(s) non lu(s)', '{{count}} unread message(s)', 'Ubutumwa {{count}} butarasomwa', 'Ujumbe {{count}} haujasomwa'],
  'messages.you': ['Vous', 'You', 'Wowe', 'Wewe'],
  'messages.notFound': ['Conversation introuvable ou accès indisponible.', 'Conversation not found or access unavailable.', 'Ikiganiro ntikibonetse cyangwa nticyemerewe.', 'Mazungumzo hayapatikani au huna ruhusa.'],
  'messages.templatesError': ['Vos réponses enregistrées sont indisponibles. Les exemples restent utilisables.', 'Saved replies are unavailable. You can still use the examples.', 'Ibisubizo byabitswe ntibibonetse. Ingero ziracyakoreshwa.', 'Majibu yaliyohifadhiwa hayapatikani. Mifano bado inatumika.'],
  'messages.actionError': ['Action impossible. Réessayez.', 'Action failed. Please try again.', 'Ntibyashobotse. Ongera ugerageze.', 'Hatua imeshindikana. Jaribu tena.'],
  'messages.archive': ['Archiver', 'Archive', 'Bika', 'Hifadhi'],
  'messages.savedReplies': ['Réponses enregistrées', 'Saved replies', 'Ibisubizo byabitswe', 'Majibu yaliyohifadhiwa'],
  'messages.send': ['Envoyer le message', 'Send message', 'Ohereza ubutumwa', 'Tuma ujumbe'],
  'messages.frozen': ['Cette conversation est suspendue. Vous pouvez consulter les messages.', 'This conversation is frozen. You can still read the messages.', 'Iki kiganiro cyahagaritswe. Ushobora gusoma ubutumwa.', 'Mazungumzo haya yamesimamishwa. Unaweza kusoma ujumbe.'],
  'messages.template.welcome': ['Bienvenue', 'Welcome', 'Murakaza neza', 'Karibu'],
  'messages.template.welcomeText': ['Bonjour {guest_name}, merci pour votre intérêt pour {listing_name}. Comment puis-je vous aider ?', 'Hello {guest_name}, thank you for your interest in {listing_name}. How can I help?', 'Muraho {guest_name}, murakoze kwifuza {listing_name}. Nabafasha iki?', 'Habari {guest_name}, asante kwa kupenda {listing_name}. Ninaweza kukusaidiaje?'],
  'messages.template.arrival': ['Arrivée', 'Arrival', 'Kuhagera', 'Kuwasili'],
  'messages.template.arrivalText': ['Bonjour {guest_name}, à quelle heure prévoyez-vous d’arriver à {listing_name} ?', 'Hello {guest_name}, what time do you plan to arrive at {listing_name}?', 'Muraho {guest_name}, muteganya kugera kuri {listing_name} saa zingahe?', 'Habari {guest_name}, unapanga kufika {listing_name} saa ngapi?'],
  'messages.template.review': ['Avis', 'Review', 'Igitekerezo', 'Maoni'],
  'messages.template.reviewText': ['Merci {guest_name} pour votre séjour à {listing_name}. Votre avis nous aide à améliorer l’accueil.', 'Thank you {guest_name} for staying at {listing_name}. Your feedback helps us improve.', 'Murakoze {guest_name} kuba kuri {listing_name}. Ibitekerezo byanyu bidufasha kunoza serivisi.', 'Asante {guest_name} kwa kukaa {listing_name}. Maoni yako yanatusaidia kuboresha huduma.'],
  'workspace.checking': ['Vérification de votre accès hôte…', 'Checking your hosting access…', 'Turagenzura uburenganzira bwa nyir’inzu…', 'Tunakagua ruhusa yako ya mwenyeji…'],
  'workspace.statusError': ['Impossible de vérifier votre dossier. Réessayez avant de poursuivre.', 'We could not check your application. Try again before continuing.', 'Dosiye yawe ntishoboye kugenzurwa. Ongera ugerageze.', 'Hatukuweza kukagua ombi lako. Jaribu tena kabla ya kuendelea.'],
  'workspace.pendingTitle': ['Votre dossier est en cours d’examen', 'Your application is being reviewed', 'Dosiye yawe iragenzurwa', 'Ombi lako linakaguliwa'],
  'workspace.pendingBody': ['Votre dossier a bien été reçu. Vous pouvez ouvrir votre espace hôte et contacter l’assistance pendant sa vérification.', 'Your application has been received. You can open your hosting space and contact support while it is reviewed.', 'Dosiye yawe yarakiriwe. Ushobora gufungura ahagenewe nyir’inzu no kuvugana n’ubufasha.', 'Ombi lako limepokelewa. Unaweza kufungua sehemu ya mwenyeji na kuwasiliana na usaidizi wakati wa ukaguzi.'],
  'workspace.rejectedTitle': ['Votre dossier nécessite une correction', 'Your application needs a correction', 'Dosiye yawe ikeneye gukosorwa', 'Ombi lako linahitaji marekebisho'],
  'workspace.rejectedBody': ['Vérifiez votre identité et vos justificatifs avant de renvoyer le dossier. L’assistance peut vous accompagner.', 'Review your identity and documents before submitting again. Support can help you.', 'Suzuma umwirondoro n’ibyangombwa mbere yo kongera kohereza. Ubufasha burahari.', 'Kagua utambulisho na nyaraka kabla ya kutuma tena. Usaidizi unaweza kukusaidia.'],
  'workspace.correct': ['Corriger mon dossier', 'Correct my application', 'Kosora dosiye yanjye', 'Rekebisha ombi langu'],
  'workspace.dashboard': ['Ouvrir mon espace hôte', 'Open my hosting space', 'Fungura ahagenewe nyir’inzu', 'Fungua sehemu yangu ya mwenyeji'],
  'workspace.support': ['Contacter l’assistance', 'Contact support', 'Vugana n’ubufasha', 'Wasiliana na usaidizi'],
  'workspace.newTicket': ['Nouveau ticket', 'New support ticket', 'Ubusabe bushya bw’ubufasha', 'Ombi jipya la usaidizi'],
  'workspace.profile': ['Modifier mon profil', 'Edit my profile', 'Hindura umwirondoro', 'Hariri wasifu wangu'],
  'workspace.payoutUnavailable': ['Les versements ne sont pas encore disponibles dans LocaMap. Ces coordonnées ne déclenchent aucun paiement.', 'Payouts are not yet available in LocaMap. These account details do not trigger a payment.', 'Kwishyurwa muri LocaMap ntibiraboneka. Aya makuru ya konti ntatangiza ubwishyu.', 'Malipo ya mwenyeji bado hayapatikani katika LocaMap. Maelezo haya ya akaunti hayaanzishi malipo.'],
};
type CopyTree = { [key: string]: string | CopyTree };
export default Object.fromEntries(['fr', 'en', 'rw', 'sw'].map((language, index) => {
  const tree: CopyTree = { calendar: {}, messages: {}, workspace: {} };
  Object.entries(copy).forEach(([path, translations]) => {
    const keys = path.split('.');
    let branch = tree;
    keys.slice(0, -1).forEach(key => { branch[key] ??= {}; branch = branch[key] as CopyTree; });
    branch[keys[keys.length - 1]] = translations[index];
  });
  return [language, tree];
})) as Record<'fr' | 'en' | 'rw' | 'sw', CopyTree>;
