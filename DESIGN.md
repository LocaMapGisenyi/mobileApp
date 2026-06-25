# Design System — LocaMap · Direction Lac Kivu

## Identité visuelle

**Concept** : La couleur du lac Kivu à l'aube — sarcelle profonde, eau calme, air frais.
Pas une palette de voyage générique. Une palette qui sait où elle est.

## Couleurs

### Primaire
| Token | Valeur | Usage |
|---|---|---|
| `colors.primary` | `#0D6E6E` | Boutons, icônes actives, accents |
| `colors.primaryLight` | `#E8F4F4` | Fond de chips, tags, inputs focus |
| `colors.primaryMid` | `#1A9494` | Hover, icône active légère |
| `colors.primaryDark` | `#084F4F` | Pressed, profondeur |

### Fond & Surface
| Token | Valeur | Usage |
|---|---|---|
| `colors.background` | `#FAFAFA` | Fond d'écran principal |
| `colors.surface` | `#FFFFFF` | Cards, modals, inputs |
| `colors.surfaceSunken` | `#F3F8F8` | Sections secondaires, fond de catégories |

### Texte — teinté sarcelle, pas le gris générique
| Token | Valeur | Usage |
|---|---|---|
| `colors.ink` | `#0F1F1F` | Titres, labels principaux |
| `colors.inkMid` | `#2E4A4A` | Corps de texte |
| `colors.inkSubtle` | `#5A7878` | Métadonnées, labels secondaires |
| `colors.inkDisabled` | `#9BB5B5` | Désactivé, inactif |

### Bordures
| Token | Valeur | Usage |
|---|---|---|
| `colors.border` | `#D0E8E8` | Bordure légère (cards, inputs) |
| `colors.borderMid` | `#9BB5B5` | Bordure visible |

### États
| Token | Valeur | Usage |
|---|---|---|
| `colors.success` | `#1A8A6E` | Confirmation |
| `colors.warning` | `#C47C00` | Alerte |
| `colors.error` | `#C1440E` | Erreur — latérite, contraste fort |
| `colors.info` | `#0D6E6E` | Info |

## Typographie

Scale compacte (ratio 1.15) — pas les titres géants d'Airbnb.

| Token | Taille | Usage |
|---|---|---|
| `xs` | 11px | Micro-labels, badges |
| `sm` | 13px | Métadonnées, captions |
| `base` | 15px | Corps de texte, boutons |
| `md` | 17px | Sous-titres importants |
| `lg` | 20px | Titres de section |
| `xl` | 24px | Titres d'écran |
| `2xl` | 28px | Grands titres |
| `3xl` | 32px | Display |

## Rayons de bordure

Plus serrés qu'Airbnb — différenciation par contexte :

| Token | Valeur | Usage |
|---|---|---|
| `borderRadius.md` / `button` / `input` | 6px | Inputs, boutons |
| `borderRadius.card` / `lg` | 12px | Cards de logement |
| `borderRadius.xl` | 16px | Modals, bottom sheets |
| `borderRadius.searchBar` | 28px | Barre de recherche |
| `borderRadius.full` | 9999px | Pills, badges, dots |

## Ombres

Teintées sarcelle — pas le noir générique :
- Cards : `shadowColor: #0D6E6E`, opacité 0.08
- Navbar pill : `shadowColor: #0D6E6E`, opacité 0.12
- Modal : `shadowColor: #0D6E6E`, opacité 0.14

## Composants — règles visuelles

### Cards de logement
- **Pas de shadow Airbnb** → bordure `1px solid colors.border`
- `borderRadius.card` (12px) — pas le `borderRadius: 8` générique
- Prix affiché avec `colors.primary` (sarcelle), pas noir

### Navbar (pill flottant)
- Fond `colors.surface` + bordure `colors.border`
- Ombre teintée sarcelle
- Tab active : icône `colors.primary` + dot 4px sarcelle
- Tab inactive : icône `colors.inkDisabled`

### Boutons primaires
- Fond `colors.primary`, texte blanc
- `borderRadius.button` (6px) — pas le 8 générique

### Chips / tags actifs
- Fond `colors.primary`, texte blanc
- Chips inactifs : bordure `colors.border`, fond `colors.surface`

### Filter Modal
- Bottom sheet, fond blanc, `borderRadius.xl` en haut
- Handle pill gris clair
- Bouton "Voir les résultats" : fond `colors.primary`

### Filtre hôte (HostDashboard)
- Bouton actif : fond `colors.primary` (sarcelle), pas noir
