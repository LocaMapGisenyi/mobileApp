# Guest & Host Account Screens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer l'unique `EditProfileScreen` par deux écrans distincts — `HostAccountScreen` (hôte) et `GuestAccountScreen` (client) — chacun avec des sections adaptées à son rôle.

**Architecture:** Les sous-composants partagés (`SectionHeader`, `RowItem`, `NotifRow`, `DeleteAccountModal`) sont extraits dans `src/components/account/`. `EditProfileScreen` devient `HostAccountScreen` avec son contenu actuel. `GuestAccountScreen` est créé from scratch avec ses propres sections. La navigation est mise à jour pour router chaque profil vers le bon écran.

**Tech Stack:** React Native, TypeScript, react-native-paper, @expo/vector-icons (MaterialIcons), react-i18next, react-native-reanimated, Zustand (useUserStore)

## Global Constraints

- Suivre les patterns de style existants : `StyleSheet.create`, couleurs depuis `../theme`, `colors.*`
- i18n obligatoire : toutes les chaînes via `t('...')`, jamais hardcodées
- Toutes les clés i18n ajoutées dans les 4 fichiers : `en.json`, `fr.json`, `rw.json`, `sw.json`
- Composants animés avec `react-native-reanimated` (`FadeInDown`) comme dans l'écran actuel
- `useSafeAreaInsets` pour le padding top/bottom
- Pas de KYC côté client
- Pas de comptes payout côté client (Mobile Money + Carte pour payer, pas recevoir)

---

## Fichiers créés / modifiés

| Action | Fichier | Rôle |
|--------|---------|------|
| Créer | `src/components/account/SectionHeader.tsx` | Label de section réutilisable |
| Créer | `src/components/account/RowItem.tsx` | Ligne de menu avec icône, valeur, badge |
| Créer | `src/components/account/NotifRow.tsx` | Ligne toggle notification |
| Créer | `src/components/account/DeleteAccountModal.tsx` | Modal confirmation suppression |
| Créer | `src/components/account/index.ts` | Barrel export |
| Modifier | `src/screens/EditProfileScreen.tsx` | Renommer en `HostAccountScreen.tsx`, importer composants partagés |
| Créer | `src/screens/HostAccountScreen.tsx` | Contenu hôte (KYC, payout, notifs hôte) |
| Créer | `src/screens/GuestAccountScreen.tsx` | Contenu client (paiement, notifs client, CTA hôte) |
| Modifier | `src/types/index.ts` | Ajouter `HostAccount` et `GuestAccount` à `RootStackParamList` |
| Modifier | `src/navigation/index.tsx` | Enregistrer les 2 nouvelles routes, supprimer `EditProfile` |
| Modifier | `src/screens/HostProfileScreen.tsx` | Pointer vers `HostAccount` |
| Modifier | `src/screens/ProfileScreen.tsx` | Pointer vers `GuestAccount` |
| Modifier | `src/locales/en.json` | Nouvelles clés i18n client |
| Modifier | `src/locales/fr.json` | Nouvelles clés i18n client |
| Modifier | `src/locales/rw.json` | Nouvelles clés i18n client |
| Modifier | `src/locales/sw.json` | Nouvelles clés i18n client |

---

### Task 1 : Extraire les composants partagés

**Files:**
- Create: `src/components/account/SectionHeader.tsx`
- Create: `src/components/account/RowItem.tsx`
- Create: `src/components/account/NotifRow.tsx`
- Create: `src/components/account/DeleteAccountModal.tsx`
- Create: `src/components/account/index.ts`

**Interfaces:**
- Produit : `SectionHeader`, `RowItem`, `NotifRow`, `DeleteAccountModal` exportés depuis `src/components/account/index.ts`

---

- [ ] **Step 1 : Créer `SectionHeader.tsx`**

```tsx
// src/components/account/SectionHeader.tsx
import React from 'react';
import { StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { colors } from '../../theme';

const SectionHeader = ({ title }: { title: string }) => (
  <Text style={s.txt}>{title}</Text>
);

const s = StyleSheet.create({
  txt: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.inkDisabled,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },
});

export default SectionHeader;
```

- [ ] **Step 2 : Créer `RowItem.tsx`**

```tsx
// src/components/account/RowItem.tsx
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme';

interface RowItemProps {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  value?: string;
  onPress?: () => void;
  badge?: string;
  badgeBg?: string;
  badgeColor?: string;
  last?: boolean;
}

const RowItem = ({
  icon, label, value, onPress, badge, badgeBg, badgeColor, last,
}: RowItemProps) => (
  <TouchableOpacity
    style={[s.row, !last && s.rowBorder]}
    onPress={onPress}
    activeOpacity={onPress ? 0.7 : 1}
  >
    <View style={s.iconWrap}>
      <MaterialIcons name={icon} size={18} color={colors.primary} />
    </View>
    <Text style={s.label}>{label}</Text>
    {badge && (
      <View style={[s.badge, { backgroundColor: badgeBg ?? colors.surfaceSunken }]}>
        <Text style={[s.badgeTxt, { color: badgeColor ?? colors.inkSubtle }]}>{badge}</Text>
      </View>
    )}
    {value && <Text style={s.value} numberOfLines={1}>{value}</Text>}
    {onPress && <MaterialIcons name="chevron-right" size={20} color={colors.inkDisabled} />}
  </TouchableOpacity>
);

const s = StyleSheet.create({
  row:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, gap: 14, backgroundColor: colors.surface },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  iconWrap:  { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  label:     { flex: 1, fontSize: 15, fontWeight: '500', color: colors.ink },
  value:     { fontSize: 13, color: colors.inkSubtle, maxWidth: 120 },
  badge:     { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  badgeTxt:  { fontSize: 11, fontWeight: '700' },
});

export default RowItem;
```

- [ ] **Step 3 : Créer `NotifRow.tsx`**

```tsx
// src/components/account/NotifRow.tsx
import React from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { Text } from 'react-native-paper';
import { colors } from '../../theme';

interface NotifRowProps {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  last?: boolean;
}

const NotifRow = ({ label, value, onChange, last }: NotifRowProps) => (
  <View style={[s.row, !last && s.rowBorder]}>
    <Text style={s.label}>{label}</Text>
    <Switch
      value={value}
      onValueChange={onChange}
      trackColor={{ false: colors.border, true: colors.primary }}
      thumbColor={colors.white}
      ios_backgroundColor={colors.border}
    />
  </View>
);

const s = StyleSheet.create({
  row:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 20, backgroundColor: colors.surface },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  label:     { flex: 1, fontSize: 15, fontWeight: '500', color: colors.ink },
});

export default NotifRow;
```

- [ ] **Step 4 : Créer `DeleteAccountModal.tsx`**

```tsx
// src/components/account/DeleteAccountModal.tsx
import React from 'react';
import { ActivityIndicator, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, borderRadius } from '../../theme';

interface DeleteAccountModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  deleting: boolean;
  labels: { title: string; body: string; cancel: string; confirm: string };
}

const DeleteAccountModal = ({ visible, onClose, onConfirm, deleting, labels }: DeleteAccountModalProps) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={s.overlay}>
      <Animated.View entering={FadeInDown.duration(220)} style={s.card}>
        <View style={s.iconWrap}>
          <MaterialIcons name="delete-forever" size={30} color={colors.error} />
        </View>
        <Text style={s.title}>{labels.title}</Text>
        <Text style={s.body}>{labels.body}</Text>
        <View style={s.actions}>
          <TouchableOpacity style={s.cancelBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={s.cancelTxt}>{labels.cancel}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.deleteBtn} onPress={onConfirm} disabled={deleting} activeOpacity={0.85}>
            {deleting
              ? <ActivityIndicator size="small" color={colors.white} />
              : <Text style={s.deleteTxt}>{labels.confirm}</Text>
            }
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  </Modal>
);

const s = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: 'rgba(15,31,31,0.5)', justifyContent: 'center', padding: 24 },
  card:      { backgroundColor: colors.surface, borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  iconWrap:  { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.error + '12', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title:     { fontSize: 18, fontWeight: '700', color: colors.ink, marginBottom: 8, textAlign: 'center' },
  body:      { fontSize: 14, color: colors.inkMid, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  actions:   { flexDirection: 'row', gap: 12, width: '100%' },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center' },
  cancelTxt: { fontSize: 14, fontWeight: '600', color: colors.inkMid },
  deleteBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, backgroundColor: colors.error, alignItems: 'center' },
  deleteTxt: { fontSize: 14, fontWeight: '700', color: colors.white },
});

export default DeleteAccountModal;
```

- [ ] **Step 5 : Créer `index.ts` (barrel export)**

```ts
// src/components/account/index.ts
export { default as SectionHeader } from './SectionHeader';
export { default as RowItem } from './RowItem';
export { default as NotifRow } from './NotifRow';
export { default as DeleteAccountModal } from './DeleteAccountModal';
```

- [ ] **Step 6 : Commit**

```bash
git add src/components/account/
git commit -m "feat: extract shared account screen components"
```

---

### Task 2 : Renommer EditProfileScreen → HostAccountScreen

**Files:**
- Create: `src/screens/HostAccountScreen.tsx` (contenu de EditProfileScreen, imports mis à jour)
- Modify: `src/screens/EditProfileScreen.tsx` (supprimer — ou vider pour éviter les erreurs d'import en attente)

**Interfaces:**
- Consomme : `SectionHeader`, `RowItem`, `NotifRow`, `DeleteAccountModal` depuis `../components/account`
- Consomme : `hostAccountService`, `PayoutAccount`, `PayoutType`, `NotificationPrefs`, `KycStatus` depuis `../services/api`
- Produit : `HostAccountScreen` default export

---

- [ ] **Step 1 : Créer `HostAccountScreen.tsx`**

Copier intégralement le contenu de `EditProfileScreen.tsx`, puis :

1. Changer le nom du composant de `EditProfileScreen` → `HostAccountScreen`
2. Remplacer les imports inline des sous-composants par :
```tsx
import { SectionHeader, RowItem, NotifRow, DeleteAccountModal } from '../components/account';
```
3. Supprimer les définitions inline de `SectionHeader`, `RowItem`, `NotifRow`, `DeleteAccountModal` et leurs StyleSheets associés (`sh`, `ri`, `nr`, `da`, `pm`)
4. Changer le type de navigation :
```tsx
type Nav = NativeStackNavigationProp<RootStackParamList, 'HostAccount'>;
```
5. Export default : `export default HostAccountScreen;`

- [ ] **Step 2 : Vider `EditProfileScreen.tsx` avec re-export temporaire**

Pour ne pas casser les imports existants avant la mise à jour navigation (Task 4) :

```tsx
// src/screens/EditProfileScreen.tsx
export { default } from './HostAccountScreen';
```

- [ ] **Step 3 : Commit**

```bash
git add src/screens/HostAccountScreen.tsx src/screens/EditProfileScreen.tsx
git commit -m "feat: rename EditProfileScreen to HostAccountScreen, extract shared components"
```

---

### Task 3 : Ajouter les clés i18n pour GuestAccountScreen

**Files:**
- Modify: `src/locales/en.json`
- Modify: `src/locales/fr.json`
- Modify: `src/locales/rw.json`
- Modify: `src/locales/sw.json`

**Interfaces:**
- Produit : clés `guestAccount.*` disponibles dans les 4 langues

---

- [ ] **Step 1 : Ajouter dans `en.json`**

Ajouter avant la fermeture `}` du fichier :

```json
"guestAccount": {
  "title": "Account Settings",
  "sectionProfile": "My Profile",
  "sectionSecurity": "Security",
  "sectionPayments": "Payment Methods",
  "sectionNotifications": "Notifications",
  "sectionDelivery": "Delivery Channel",
  "sectionPrivacy": "Privacy",
  "personalInfo": "Personal Information",
  "profilePhoto": "Profile Photo",
  "bio": "Personal Description",
  "languages": "Spoken Languages",
  "changePassword": "Change Password",
  "twoFactor": "2-Factor Authentication",
  "twoFactorBadge": "Inactive",
  "connectedDevices": "Connected Devices",
  "addPaymentTitle": "Add a Payment Method",
  "paymentMethod": "Method",
  "paymentHolder": "Account Holder Name",
  "paymentNumber": "Number",
  "paymentAdd": "Add",
  "noPayment": "No payment method configured",
  "addPayment": "Add a payment method",
  "defaultLabel": "Default",
  "notifReservations": "My Reservations",
  "notifMessages": "Messages from Hosts",
  "notifAlerts": "Property Alerts",
  "notifPush": "Push Notifications",
  "notifEmail": "Email",
  "notifSms": "SMS",
  "exportData": "Export My Data",
  "exportRequested": "Requested",
  "deleteAccount": "Delete My Account",
  "deleteTitle": "Delete My Account",
  "deleteBody": "This action is irreversible. Your data will be retained for 5 years for legal compliance.",
  "cancel": "Cancel",
  "confirm": "Delete",
  "becomeHostTitle": "Become a Host",
  "becomeHostSubtitle": "List your property and start earning",
  "becomeHostCta": "Get started"
}
```

- [ ] **Step 2 : Ajouter dans `fr.json`**

```json
"guestAccount": {
  "title": "Paramètres du compte",
  "sectionProfile": "Mon Profil",
  "sectionSecurity": "Sécurité",
  "sectionPayments": "Méthodes de paiement",
  "sectionNotifications": "Notifications",
  "sectionDelivery": "Canal de livraison",
  "sectionPrivacy": "Confidentialité",
  "personalInfo": "Informations personnelles",
  "profilePhoto": "Photo de profil",
  "bio": "Description personnelle",
  "languages": "Langues parlées",
  "changePassword": "Changer le mot de passe",
  "twoFactor": "Authentification 2 facteurs",
  "twoFactorBadge": "Inactif",
  "connectedDevices": "Appareils connectés",
  "addPaymentTitle": "Ajouter une méthode de paiement",
  "paymentMethod": "Méthode",
  "paymentHolder": "Nom du titulaire",
  "paymentNumber": "Numéro",
  "paymentAdd": "Ajouter",
  "noPayment": "Aucune méthode configurée",
  "addPayment": "Ajouter une méthode de paiement",
  "defaultLabel": "Par défaut",
  "notifReservations": "Mes réservations",
  "notifMessages": "Messages des hôtes",
  "notifAlerts": "Alertes propriétés",
  "notifPush": "Notifications push",
  "notifEmail": "Email",
  "notifSms": "SMS",
  "exportData": "Exporter mes données",
  "exportRequested": "Demandé",
  "deleteAccount": "Supprimer mon compte",
  "deleteTitle": "Supprimer mon compte",
  "deleteBody": "Cette action est irréversible. Vos données seront conservées 5 ans pour conformité légale.",
  "cancel": "Annuler",
  "confirm": "Supprimer",
  "becomeHostTitle": "Devenir hôte",
  "becomeHostSubtitle": "Publiez votre logement et commencez à gagner",
  "becomeHostCta": "Commencer"
}
```

- [ ] **Step 3 : Ajouter dans `rw.json`**

```json
"guestAccount": {
  "title": "Igenamiterere ry'konti",
  "sectionProfile": "Umwirondoro wanjye",
  "sectionSecurity": "Umutekano",
  "sectionPayments": "Uburyo bwo kwishyura",
  "sectionNotifications": "Amatangazo",
  "sectionDelivery": "Inzira y'itangazo",
  "sectionPrivacy": "Ibanga",
  "personalInfo": "Amakuru bwite",
  "profilePhoto": "Ifoto y'umwirondoro",
  "bio": "Ibisobanuro by'umuntu",
  "languages": "Indimi zivugwa",
  "changePassword": "Hindura ijambo ry'ibanga",
  "twoFactor": "Kwemeza inshuro ebyiri",
  "twoFactorBadge": "Ntabwo irakora",
  "connectedDevices": "Ibikoresho byunganye",
  "addPaymentTitle": "Ongeraho uburyo bwo kwishyura",
  "paymentMethod": "Uburyo",
  "paymentHolder": "Izina ry'nyir'konti",
  "paymentNumber": "Numero",
  "paymentAdd": "Ongeraho",
  "noPayment": "Nta buryo bwagenewe",
  "addPayment": "Ongeraho uburyo bwo kwishyura",
  "defaultLabel": "Bwa mbere",
  "notifReservations": "Inyandiko zanjye",
  "notifMessages": "Ubutumwa bw'abahigi",
  "notifAlerts": "Amatangazo y'inzu",
  "notifPush": "Amatangazo push",
  "notifEmail": "Imeli",
  "notifSms": "SMS",
  "exportData": "Sohora amakuru yanjye",
  "exportRequested": "Bisabwe",
  "deleteAccount": "Siba konti yanjye",
  "deleteTitle": "Siba konti yanjye",
  "deleteBody": "Iyi ntereko ntishobora gusubizwa inyuma. Amakuru yawe azabikwa imyaka 5.",
  "cancel": "Reka",
  "confirm": "Siba",
  "becomeHostTitle": "Baho umwanditsi",
  "becomeHostSubtitle": "Tangaza inzu yawe utangire kwinjiza amafaranga",
  "becomeHostCta": "Tangira"
}
```

- [ ] **Step 4 : Ajouter dans `sw.json`**

```json
"guestAccount": {
  "title": "Mipangilio ya akaunti",
  "sectionProfile": "Wasifu wangu",
  "sectionSecurity": "Usalama",
  "sectionPayments": "Njia za malipo",
  "sectionNotifications": "Arifa",
  "sectionDelivery": "Njia ya utoaji",
  "sectionPrivacy": "Faragha",
  "personalInfo": "Taarifa za kibinafsi",
  "profilePhoto": "Picha ya wasifu",
  "bio": "Maelezo ya kibinafsi",
  "languages": "Lugha zinazozungumzwa",
  "changePassword": "Badilisha nenosiri",
  "twoFactor": "Uthibitishaji wa hatua 2",
  "twoFactorBadge": "Haifanyi kazi",
  "connectedDevices": "Vifaa vilivyounganishwa",
  "addPaymentTitle": "Ongeza njia ya malipo",
  "paymentMethod": "Njia",
  "paymentHolder": "Jina la mmiliki wa akaunti",
  "paymentNumber": "Nambari",
  "paymentAdd": "Ongeza",
  "noPayment": "Hakuna njia iliyosanidiwa",
  "addPayment": "Ongeza njia ya malipo",
  "defaultLabel": "Chaguo-msingi",
  "notifReservations": "Uhifadhi wangu",
  "notifMessages": "Ujumbe kutoka kwa wenyeji",
  "notifAlerts": "Arifa za mali",
  "notifPush": "Arifa za push",
  "notifEmail": "Barua pepe",
  "notifSms": "SMS",
  "exportData": "Hamisha data zangu",
  "exportRequested": "Imeombwa",
  "deleteAccount": "Futa akaunti yangu",
  "deleteTitle": "Futa akaunti yangu",
  "deleteBody": "Hatua hii haiwezi kurudishwa. Data yako itahifadhiwa kwa miaka 5.",
  "cancel": "Ghairi",
  "confirm": "Futa",
  "becomeHostTitle": "Kuwa mwenyeji",
  "becomeHostSubtitle": "Orodhesha nyumba yako na uanze kupata pesa",
  "becomeHostCta": "Anza"
}
```

- [ ] **Step 5 : Commit**

```bash
git add src/locales/
git commit -m "feat: add guestAccount i18n keys (EN/FR/RW/SW)"
```

---

### Task 4 : Créer `GuestAccountScreen.tsx`

**Files:**
- Create: `src/screens/GuestAccountScreen.tsx`

**Interfaces:**
- Consomme : `SectionHeader`, `RowItem`, `NotifRow`, `DeleteAccountModal` depuis `../components/account`
- Consomme : `useUserStore` depuis `../store/user`
- Consomme : `userService` depuis `../services/api`
- Consomme : clés `guestAccount.*` via `useTranslation`
- Produit : `GuestAccountScreen` default export

---

- [ ] **Step 1 : Créer le fichier**

```tsx
// src/screens/GuestAccountScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, ActivityIndicator, StatusBar,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme';
import { RootStackParamList } from '../types';
import { useUserStore } from '../store/user';
import { SectionHeader, RowItem, NotifRow, DeleteAccountModal } from '../components/account';

type Nav = NativeStackNavigationProp<RootStackParamList, 'GuestAccount'>;

// ─── Types ────────────────────────────────────────────────────────────────────
type PaymentMethod = 'MTN_MOMO' | 'AIRTEL_MONEY' | 'VISA' | 'MASTERCARD';

interface PaymentAccount {
  id: string;
  type: PaymentMethod;
  accountName: string;
  accountNumber: string;
  isDefault: boolean;
}

interface GuestNotifPrefs {
  reservations: boolean;
  messages: boolean;
  alerts: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
}

const PAYMENT_TYPES: { type: PaymentMethod; label: string; color: string }[] = [
  { type: 'MTN_MOMO',     label: 'MTN MoMo',    color: '#FFCC00' },
  { type: 'AIRTEL_MONEY', label: 'Airtel Money', color: '#E4002B' },
  { type: 'VISA',         label: 'Visa',         color: '#1A1F71' },
  { type: 'MASTERCARD',   label: 'Mastercard',   color: '#EB001B' },
];

// ─── Add payment modal ────────────────────────────────────────────────────────
const AddPaymentModal = ({
  visible, onClose, onAdd, labels,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (data: Omit<PaymentAccount, 'id' | 'isDefault'>) => void;
  labels: { title: string; method: string; holder: string; number: string; add: string; cancel: string };
}) => {
  const [type, setType] = useState<PaymentMethod>('MTN_MOMO');
  const [number, setNumber] = useState('');
  const [name, setName] = useState('');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={pm.overlay}>
        <View style={pm.card}>
          <Text style={pm.title}>{labels.title}</Text>

          <Text style={pm.label}>{labels.method}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {PAYMENT_TYPES.map(p => (
                <TouchableOpacity
                  key={p.type}
                  style={[pm.typeChip, type === p.type && { borderColor: p.color, backgroundColor: p.color + '18' }]}
                  onPress={() => setType(p.type)}
                  activeOpacity={0.8}
                >
                  <Text style={[pm.typeChipTxt, type === p.type && { color: p.color, fontWeight: '700' }]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Text style={pm.label}>{labels.holder}</Text>
          <View style={pm.inputWrap}>
            <TextInput
              style={pm.input}
              value={name}
              onChangeText={setName}
              placeholder="Jean Bosco Hakizimana"
              placeholderTextColor={colors.inkDisabled}
            />
          </View>

          <Text style={pm.label}>{labels.number}</Text>
          <View style={pm.inputWrap}>
            <TextInput
              style={pm.input}
              value={number}
              onChangeText={setNumber}
              placeholder={type === 'VISA' || type === 'MASTERCARD' ? '•••• •••• •••• ••••' : '078 XXX XXX'}
              placeholderTextColor={colors.inkDisabled}
              keyboardType={type === 'VISA' || type === 'MASTERCARD' ? 'number-pad' : 'phone-pad'}
            />
          </View>

          <View style={pm.actions}>
            <TouchableOpacity style={pm.cancelBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={pm.cancelTxt}>{labels.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[pm.addBtn, (!name.trim() || !number.trim()) && pm.addBtnDisabled]}
              onPress={() => {
                onAdd({ type, accountNumber: number, accountName: name });
                setNumber(''); setName('');
              }}
              disabled={!name.trim() || !number.trim()}
              activeOpacity={0.85}
            >
              <Text style={pm.addTxt}>{labels.add}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const pm = StyleSheet.create({
  overlay:      { flex: 1, backgroundColor: 'rgba(15,31,31,0.5)', justifyContent: 'flex-end' },
  card:         { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 36, borderTopWidth: 1, borderColor: colors.border },
  title:        { fontSize: 17, fontWeight: '700', color: colors.ink, marginBottom: 20 },
  label:        { fontSize: 11, fontWeight: '700', color: colors.inkSubtle, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  typeChip:     { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border },
  typeChipTxt:  { fontSize: 12, fontWeight: '500', color: colors.inkMid },
  inputWrap:    { backgroundColor: colors.surfaceSunken, borderRadius: 8, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 12, marginBottom: 16 },
  input:        { fontSize: 15, color: colors.ink, paddingVertical: 11 },
  actions:      { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn:    { flex: 1, paddingVertical: 13, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center' },
  cancelTxt:    { fontSize: 14, fontWeight: '600', color: colors.inkMid },
  addBtn:       { flex: 1, paddingVertical: 13, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center' },
  addBtnDisabled: { opacity: 0.4 },
  addTxt:       { fontSize: 14, fontWeight: '700', color: colors.white },
});

// ─── Screen ───────────────────────────────────────────────────────────────────
const GuestAccountScreen = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { user, actions } = useUserStore();

  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([]);
  const [notifPrefs, setNotifPrefs] = useState<GuestNotifPrefs>({
    reservations: true,
    messages: true,
    alerts: true,
    pushEnabled: true,
    emailEnabled: true,
    smsEnabled: false,
  });
  const [addPaymentVisible, setAddPaymentVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exportRequested, setExportRequested] = useState(false);
  const [savingNotifs, setSavingNotifs] = useState(false);

  const handleNotifToggle = useCallback(async (key: keyof GuestNotifPrefs, value: boolean) => {
    const prev = notifPrefs;
    setNotifPrefs(p => ({ ...p, [key]: value }));
    setSavingNotifs(true);
    try {
      // API stub — brancher sur userService quand disponible
    } catch {
      setNotifPrefs(prev);
    } finally {
      setSavingNotifs(false);
    }
  }, [notifPrefs]);

  const handleAddPayment = (data: Omit<PaymentAccount, 'id' | 'isDefault'>) => {
    setAddPaymentVisible(false);
    const optimistic: PaymentAccount = { ...data, id: `opt_${Date.now()}`, isDefault: paymentAccounts.length === 0 };
    setPaymentAccounts(prev => [...prev, optimistic]);
  };

  const handleDeletePayment = (id: string) => {
    setPaymentAccounts(prev => prev.filter(p => p.id !== id));
  };

  const handleExport = () => {
    setExportRequested(true);
    // API stub
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await actions.logout();
    } catch {/* silent */} finally {
      setDeleting(false);
      setDeleteVisible(false);
    }
  };

  const initials = user.fullName
    ? user.fullName.trim().split(' ').map(p => p.charAt(0)).slice(0, 2).join('').toUpperCase()
    : 'G';

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={22} color={colors.ink} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('guestAccount.title')}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 24, 40) }}
      >
        {/* Avatar */}
        <Animated.View entering={FadeInDown.duration(320)} style={s.avatarSection}>
          <View style={s.avatar}>
            <Text style={s.avatarTxt}>{initials}</Text>
          </View>
          <Text style={s.profileName}>{user.fullName ?? '—'}</Text>
          <Text style={s.profileEmail}>{user.email ?? ''}</Text>
        </Animated.View>

        {/* MON PROFIL */}
        <Animated.View entering={FadeInDown.delay(50).duration(300)}>
          <SectionHeader title={t('guestAccount.sectionProfile')} />
          <View style={s.card}>
            <RowItem icon="person-outline" label={t('guestAccount.personalInfo')} value={user.fullName ?? undefined} onPress={() => {}} />
            <RowItem icon="add-a-photo"    label={t('guestAccount.profilePhoto')}                                     onPress={() => {}} />
            <RowItem icon="edit-note"      label={t('guestAccount.bio')}                                              onPress={() => {}} />
            <RowItem icon="translate"      label={t('guestAccount.languages')}     value="Kinyarwanda, FR"            onPress={() => {}} last />
          </View>
        </Animated.View>

        {/* SÉCURITÉ */}
        <Animated.View entering={FadeInDown.delay(80).duration(300)}>
          <SectionHeader title={t('guestAccount.sectionSecurity')} />
          <View style={s.card}>
            <RowItem icon="lock-outline" label={t('guestAccount.changePassword')}                                                                                      onPress={() => {}} />
            <RowItem icon="phone-iphone" label={t('guestAccount.twoFactor')} badge={t('guestAccount.twoFactorBadge')} badgeBg={colors.error + '12'} badgeColor={colors.error} onPress={() => {}} />
            <RowItem icon="devices"      label={t('guestAccount.connectedDevices')}                                                                                    onPress={() => {}} last />
          </View>
        </Animated.View>

        {/* MÉTHODES DE PAIEMENT */}
        <Animated.View entering={FadeInDown.delay(110).duration(300)}>
          <SectionHeader title={t('guestAccount.sectionPayments')} />
          <View style={s.card}>
            {paymentAccounts.length === 0 ? (
              <View style={s.emptyPayment}>
                <MaterialIcons name="credit-card" size={28} color={colors.inkDisabled} />
                <Text style={s.emptyPaymentTxt}>{t('guestAccount.noPayment')}</Text>
              </View>
            ) : (
              paymentAccounts.map((acc, i) => {
                const cfg = PAYMENT_TYPES.find(p => p.type === acc.type)!;
                return (
                  <View key={acc.id} style={[s.paymentRow, i < paymentAccounts.length - 1 && s.paymentRowBorder]}>
                    <View style={[s.paymentDot, { backgroundColor: cfg.color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.paymentLabel}>{cfg.label}</Text>
                      <Text style={s.paymentNumber}>{acc.accountNumber}</Text>
                    </View>
                    {acc.isDefault && (
                      <View style={s.defaultChip}>
                        <Text style={s.defaultChipTxt}>{t('guestAccount.defaultLabel')}</Text>
                      </View>
                    )}
                    <TouchableOpacity onPress={() => handleDeletePayment(acc.id)} activeOpacity={0.7}>
                      <MaterialIcons name="delete-outline" size={18} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
            <TouchableOpacity style={s.addBtn} onPress={() => setAddPaymentVisible(true)} activeOpacity={0.8}>
              <MaterialIcons name="add" size={16} color={colors.primary} />
              <Text style={s.addBtnTxt}>{t('guestAccount.addPayment')}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* NOTIFICATIONS */}
        <Animated.View entering={FadeInDown.delay(140).duration(300)}>
          <View style={s.sectionLabelRow}>
            <SectionHeader title={t('guestAccount.sectionNotifications')} />
            {savingNotifs && <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 20, marginRight: 20 }} />}
          </View>
          <View style={s.card}>
            <NotifRow label={t('guestAccount.notifReservations')} value={notifPrefs.reservations} onChange={v => handleNotifToggle('reservations', v)} />
            <NotifRow label={t('guestAccount.notifMessages')}     value={notifPrefs.messages}     onChange={v => handleNotifToggle('messages', v)} />
            <NotifRow label={t('guestAccount.notifAlerts')}       value={notifPrefs.alerts}        onChange={v => handleNotifToggle('alerts', v)} last />
          </View>

          <SectionHeader title={t('guestAccount.sectionDelivery')} />
          <View style={s.card}>
            <NotifRow label={t('guestAccount.notifPush')}  value={notifPrefs.pushEnabled}  onChange={v => handleNotifToggle('pushEnabled', v)} />
            <NotifRow label={t('guestAccount.notifEmail')} value={notifPrefs.emailEnabled} onChange={v => handleNotifToggle('emailEnabled', v)} />
            <NotifRow label={t('guestAccount.notifSms')}   value={notifPrefs.smsEnabled}   onChange={v => handleNotifToggle('smsEnabled', v)} last />
          </View>
        </Animated.View>

        {/* CONFIDENTIALITÉ */}
        <Animated.View entering={FadeInDown.delay(170).duration(300)}>
          <SectionHeader title={t('guestAccount.sectionPrivacy')} />
          <View style={s.card}>
            <RowItem
              icon="download"
              label={t('guestAccount.exportData')}
              badge={exportRequested ? t('guestAccount.exportRequested') : undefined}
              badgeBg={colors.success + '14'} badgeColor={colors.success}
              onPress={handleExport}
            />
            <RowItem
              icon="delete-forever"
              label={t('guestAccount.deleteAccount')}
              onPress={() => setDeleteVisible(true)}
              last
            />
          </View>
        </Animated.View>

        {/* DEVENIR HÔTE */}
        <Animated.View entering={FadeInDown.delay(200).duration(300)} style={s.becomeHostBanner}>
          <View style={s.becomeHostLeft}>
            <MaterialIcons name="home" size={28} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={s.becomeHostTitle}>{t('guestAccount.becomeHostTitle')}</Text>
              <Text style={s.becomeHostSubtitle}>{t('guestAccount.becomeHostSubtitle')}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={s.becomeHostCta}
            onPress={() => navigation.navigate('HostOnboarding')}
            activeOpacity={0.85}
          >
            <Text style={s.becomeHostCtaTxt}>{t('guestAccount.becomeHostCta')}</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      <AddPaymentModal
        visible={addPaymentVisible}
        onClose={() => setAddPaymentVisible(false)}
        onAdd={handleAddPayment}
        labels={{
          title:  t('guestAccount.addPaymentTitle'),
          method: t('guestAccount.paymentMethod'),
          holder: t('guestAccount.paymentHolder'),
          number: t('guestAccount.paymentNumber'),
          add:    t('guestAccount.paymentAdd'),
          cancel: t('guestAccount.cancel'),
        }}
      />
      <DeleteAccountModal
        visible={deleteVisible}
        onClose={() => setDeleteVisible(false)}
        onConfirm={handleDeleteAccount}
        deleting={deleting}
        labels={{
          title:   t('guestAccount.deleteTitle'),
          body:    t('guestAccount.deleteBody'),
          cancel:  t('guestAccount.cancel'),
          confirm: t('guestAccount.confirm'),
        }}
      />
    </View>
  );
};

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: colors.background },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  backBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
  headerTitle:  { fontSize: 17, fontWeight: '700', color: colors.ink },
  avatarSection:{ alignItems: 'center', paddingVertical: 28, gap: 6 },
  avatar:       { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primaryLight, borderWidth: 2.5, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarTxt:    { fontSize: 26, fontWeight: '800', color: colors.primary },
  profileName:  { fontSize: 18, fontWeight: '700', color: colors.ink },
  profileEmail: { fontSize: 13, color: colors.inkSubtle },
  card:         { backgroundColor: colors.surface, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  paymentRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 20, gap: 12, backgroundColor: colors.surface },
  paymentRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  paymentDot:       { width: 10, height: 10, borderRadius: 5 },
  paymentLabel:     { fontSize: 13, fontWeight: '600', color: colors.ink },
  paymentNumber:    { fontSize: 12, color: colors.inkSubtle, marginTop: 1 },
  defaultChip:      { backgroundColor: colors.primaryLight, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  defaultChipTxt:   { fontSize: 10, fontWeight: '700', color: colors.primary },
  emptyPayment:     { alignItems: 'center', paddingVertical: 20, gap: 6 },
  emptyPaymentTxt:  { fontSize: 13, color: colors.inkSubtle },
  addBtn:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderTopWidth: 1, borderTopColor: colors.border },
  addBtnTxt:        { fontSize: 14, fontWeight: '600', color: colors.primary },
  becomeHostBanner: { margin: 16, borderRadius: 16, borderWidth: 1.5, borderColor: colors.primary + '40', backgroundColor: colors.primaryLight, padding: 16, gap: 12 },
  becomeHostLeft:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  becomeHostTitle:  { fontSize: 15, fontWeight: '700', color: colors.ink },
  becomeHostSubtitle: { fontSize: 12, color: colors.inkSubtle, marginTop: 2 },
  becomeHostCta:    { alignSelf: 'flex-end', backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 18, paddingVertical: 10 },
  becomeHostCtaTxt: { fontSize: 13, fontWeight: '700', color: colors.white },
});

export default GuestAccountScreen;
```

- [ ] **Step 2 : Commit**

```bash
git add src/screens/GuestAccountScreen.tsx
git commit -m "feat: add GuestAccountScreen with payment methods, notifications, become-host CTA"
```

---

### Task 5 : Mettre à jour la navigation

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/navigation/index.tsx`
- Modify: `src/screens/ProfileScreen.tsx`
- Modify: `src/screens/HostProfileScreen.tsx`

**Interfaces:**
- Consomme : `HostAccountScreen` et `GuestAccountScreen`
- Produit : routes `HostAccount` et `GuestAccount` disponibles dans `RootStackParamList`

---

- [ ] **Step 1 : Ajouter les routes dans `src/types/index.ts`**

Remplacer :
```ts
EditProfile: undefined;
```
Par :
```ts
HostAccount: undefined;
GuestAccount: undefined;
```

- [ ] **Step 2 : Mettre à jour `src/navigation/index.tsx`**

Ajouter les imports :
```tsx
import HostAccountScreen from '../screens/HostAccountScreen';
import GuestAccountScreen from '../screens/GuestAccountScreen';
```

Remplacer le bloc `EditProfile` :
```tsx
<Stack.Screen
  name="EditProfile"
  component={EditProfileScreen}
  options={{ headerShown: false, animation: 'slide_from_right' }}
/>
```
Par :
```tsx
<Stack.Screen
  name="HostAccount"
  component={HostAccountScreen}
  options={{ headerShown: false, animation: 'slide_from_right' }}
/>
<Stack.Screen
  name="GuestAccount"
  component={GuestAccountScreen}
  options={{ headerShown: false, animation: 'slide_from_right' }}
/>
```

Supprimer l'import `EditProfileScreen` si plus aucun screen l'utilise directement.

- [ ] **Step 3 : Mettre à jour `ProfileScreen.tsx`**

Remplacer :
```tsx
navigation.navigate('EditProfile');
```
Par :
```tsx
navigation.navigate('GuestAccount');
```

- [ ] **Step 4 : Mettre à jour `HostProfileScreen.tsx`**

Remplacer les deux occurrences :
```tsx
navigation.navigate('EditProfile')
```
Par :
```tsx
navigation.navigate('HostAccount')
```

- [ ] **Step 5 : Supprimer le re-export temporaire de `EditProfileScreen.tsx`**

Maintenant qu'aucun fichier ne navigue plus vers `EditProfile`, supprimer `src/screens/EditProfileScreen.tsx` entièrement (ou le remplacer par un fichier vide si des imports statiques persistent) :

```bash
# Vérifier qu'aucun import ne pointe encore vers EditProfileScreen
grep -r "EditProfile" src/
```

Si aucun résultat → supprimer le fichier.

- [ ] **Step 6 : Commit**

```bash
git add src/types/index.ts src/navigation/index.tsx src/screens/ProfileScreen.tsx src/screens/HostProfileScreen.tsx
git commit -m "feat: wire HostAccount and GuestAccount routes, remove EditProfile"
```

---

## Récapitulatif des commits

1. `feat: extract shared account screen components`
2. `feat: rename EditProfileScreen to HostAccountScreen, extract shared components`
3. `feat: add guestAccount i18n keys (EN/FR/RW/SW)`
4. `feat: add GuestAccountScreen with payment methods, notifications, become-host CTA`
5. `feat: wire HostAccount and GuestAccount routes, remove EditProfile`
