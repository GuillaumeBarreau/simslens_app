# Design System

A comprehensive design system built following **Atomic Design** principles for scalable and maintainable UI development.

## 📐 Architecture

This design system follows the **Atomic Design** methodology, organizing components into a clear hierarchy:

```
design-system/
├── tokens/          Design tokens (colors, spacing, typography, etc.)
├── atoms/           Basic building blocks (Select, Tooltip)
├── molecules/       Simple compositions (SearchInput, EmptyState, SEO)
├── organisms/       Complex compositions (Modal, Drawer, Header)
└── templates/       Page layouts (coming soon)
```

### Atomic Design Hierarchy

```
Tokens
  ↓
Atoms (indivisible components)
  ↓
Molecules (groups of atoms)
  ↓
Organisms (groups of molecules/atoms)
  ↓
Templates (page layouts)
  ↓
Pages (templates with real content)
```

---

## 🎨 Tokens

Design tokens are the foundational values that define the visual language of the application.

### Available Tokens

- **colors.ts** - Color palettes (WoW class colors, semantic colors, item quality colors)
- **spacing.ts** - Spacing scale
- **typography.ts** - Font families, sizes, and weights
- **shadows.ts** - Shadow definitions
- **breakpoints.ts** - Responsive breakpoints

### Usage

```typescript
import { classColors, spacing, fontSizes } from 'components/design-system/tokens';

// Use in styled components or inline styles
const buttonStyle = {
  backgroundColor: classColors.warrior,
  padding: spacing.md,
  fontSize: fontSizes.lg,
};
```

---

## ⚛️ Atoms

Atoms are the basic building blocks of the design system. They are indivisible UI components that cannot be broken down further.

### Available Atoms

| Component | Description           | Props                                               |
| --------- | --------------------- | --------------------------------------------------- |
| `Select`  | Dropdown selection    | `data`, `value`, `onChange`, `label`, `placeholder` |
| `Tooltip` | Informational tooltip | `label`, `children`, `position`, `withArrow`        |

### Usage

```typescript
import { Select, Tooltip } from 'components/design-system/atoms';

// Select
<Select
  data={['Option 1', 'Option 2']}
  value={value}
  onChange={setValue}
  label="Choose an option"
/>

// Tooltip
<Tooltip label="Helpful information">
  <button>Hover me</button>
</Tooltip>
```

---

## 🧬 Molecules

Molecules are simple compositions of atoms that form functional UI units.

### Available Molecules

| Component        | Description            | Composition                |
| ---------------- | ---------------------- | -------------------------- |
| `SearchInput`    | Search input with icon | Input + Icon               |
| `EmptyState`     | Empty state display    | Icon + Text + Action       |
| `Skeleton`       | Loading skeleton       | Multiple skeleton elements |
| `WorkInProgress` | WIP indicator          | Icon + Text                |
| `SEO`            | SEO meta tags          | Multiple meta tags         |
| `GameSwitcher`   | Logo + game selector   | Logo SVG + Menu            |

### Logo et sélecteur de jeu (`GameSwitcher`, SIMS-023)

En haut à gauche de `Header` : logo SimsLens (SVG inline) et jeu courant. Avec le flag
`forever`, un `Menu` « Retail / Forever » mène à la dernière guilde visitée dans le jeu
choisi (mémorisée par jeu dans `localStorage`, clé `simslens_last_guild_<jeu>`), sinon à
une guilde de l'utilisateur dans ce jeu, sinon à `/create-realm?game=<jeu>`. Sans le
flag, le logo seul ramène à l'accueil de la guilde courante. Accent : `brand` (Retail),
`orange` (Forever). Import direct : `components/design-system/molecules/GameSwitcher`.

### Usage

```typescript
import { SearchInput, EmptyState } from 'components/design-system/molecules';

// SearchInput
<SearchInput
  placeholder="Search..."
  value={searchQuery}
  onChange={setSearchQuery}
/>

// EmptyState
<EmptyState
  title="No results found"
  description="Try adjusting your search criteria"
  action={<button>Clear filters</button>}
/>
```

---

## 🏗️ Organisms

Organisms are complex compositions that form distinct sections of an interface.

### Available Organisms

| Component       | Description           | Use Case                              |
| --------------- | --------------------- | ------------------------------------- |
| `Modal`         | Modal dialog          | Forms, confirmations, content display |
| `Drawer`        | Side panel            | Navigation, filters, details          |
| `Header`        | Application header    | Main navigation and branding          |
| `PlayerHeader`  | Player info header    | Player profile display                |
| `BossesPanel`   | Boss selection panel  | Raid boss navigation                  |
| `NavbarBoss`    | Boss navigation bar   | Boss-specific navigation              |
| `SettingsGroup` | Grouped settings list | Settings pages, options panels        |

### Liste de réglages groupés (`SettingsGroup`, SIMS-247)

Pour toute **liste de réglages ou d'options binaires** (page Réglages, tiroir d'options) :
une section titrée, un seul conteneur arrondi à bordure fine, une ligne par réglage
séparée par un filet. Sobre : pas de dégradé ni d'effet de survol.

- `SettingsGroup` — `title`, `icon?`, `description?`, `children` (les lignes).
- `SettingsRow` — `icon?` (Tabler au trait, `size={20} stroke={1.5}`), `title`,
  `description?`, `control?` (n'importe quel contrôle à droite), `controlWidth?` (pour
  un champ : largeur à droite, pleine largeur sous le texte sur mobile), `labelFor?`
  (`id` du contrôle : le titre devient son `<label>`), `dimmed?`, `disabled?`.
- `SettingsSwitchRow` — `SettingsRow` + `Switch` : `checked`, `onChange?(checked)`.
  Option éteinte ou désactivée → titre et icône atténués. Sans `onChange`, l'interrupteur
  est en **lecture seule** (montre l'état sans permettre de le changer).

```tsx
import {
  SettingsGroup,
  SettingsRow,
  SettingsSwitchRow,
} from 'components/design-system/organisms/SettingsGroup';

<SettingsGroup title={t('raid_buffs.title')}>
  <SettingsSwitchRow
    icon={<IconFlame size={20} stroke={1.5} />}
    title={t('raid_buffs.bloodlust')}
    description={t('raid_buffs.providers.bloodlust')}
    checked={buffs.bloodlust}
    onChange={(checked) => setBuff('bloodlust', checked)}
  />
  <SettingsRow
    icon={<IconStopwatch size={20} stroke={1.5} />}
    title={t('fight_length.label')}
    labelFor="fight-length"
    controlWidth={140}
    control={<NumberInput id="fight-length" value={length} onChange={setLength} />}
  />
</SettingsGroup>;
```

À ne pas utiliser pour les filtres d'une barre d'outils ni pour un formulaire classique
(création d'événement, modale) : ce motif est réservé aux réglages.

### Usage

```typescript
import { Modal, Drawer, Header } from 'components/design-system/organisms';

// Modal
<Modal
  opened={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirmation"
>
  <p>Are you sure?</p>
</Modal>

// Drawer
<Drawer
  opened={isOpen}
  onClose={() => setIsOpen(false)}
  title="Filters"
  position="right"
>
  <FilterForm />
</Drawer>

// Header
<Header />
```

---

## 📦 Import Patterns

### Individual Imports (Recommended)

```typescript
// Tokens
import { classColors, spacing } from 'components/design-system/tokens';

// Atoms
import { Select } from 'components/design-system/atoms/Select';
import { Tooltip } from 'components/design-system/atoms/Tooltip';

// Molecules
import { EmptyState } from 'components/design-system/molecules/EmptyState';
import { SearchInput } from 'components/design-system/molecules/SearchInput';

// Organisms
import { Modal } from 'components/design-system/organisms/Modal';
import { Drawer } from 'components/design-system/organisms/Drawer';
```

### Barrel Imports

```typescript
// Import from level barrels
import { Select, Tooltip } from 'components/design-system/atoms';
import { EmptyState, SearchInput } from 'components/design-system/molecules';
import { Modal, Drawer } from 'components/design-system/organisms';

// Or from main barrel
import { classColors, Select, EmptyState, Modal } from 'components/design-system';
```

---

## 🎯 Design Principles

### 1. Separation of Concerns

- **Design System** (`design-system/`) - Generic, reusable components
- **Features** (`features/`) - Business logic and domain-specific components

### 2. Composition Over Configuration

Build complex UIs by composing simple components rather than creating monolithic components with many configuration options.

### 3. Consistency

All components follow the same patterns:

- TypeScript for type safety
- Mantine UI as the base library
- Consistent prop naming conventions
- Comprehensive Storybook documentation

### 4. Accessibility

Components are built with accessibility in mind:

- Semantic HTML
- ARIA attributes where needed
- Keyboard navigation support
- Screen reader friendly

---

## 📚 Storybook

All components are documented in Storybook with interactive examples.

```bash
npm run storybook
```

Stories are organized by Atomic Design levels:

- `Design System/Atoms/*`
- `Design System/Molecules/*`
- `Design System/Organisms/*`

---

## 🚀 Adding New Components

### When to Create an Atom

Create an atom when:

- The component is a basic UI element
- It cannot be meaningfully broken down further
- It will be reused across multiple molecules/organisms
- Examples: Button, Input, Badge, Icon

### When to Create a Molecule

Create a molecule when:

- The component is a simple composition of atoms
- It serves a single, focused purpose
- It's reusable across different contexts
- Examples: FormField (Label + Input + Error), ButtonGroup

### When to Create an Organism

Create an organism when:

- The component is a complex composition
- It represents a distinct section of the interface
- It may contain molecules and atoms
- Examples: Header, Card, Table, Navigation

### When to Create a Feature Component

Create a feature component when:

- The component contains business logic
- It's specific to a domain (roster, tracking, loot, etc.)
- It's not meant to be reused outside its domain
- Examples: RosterDrawer, BossImageCard, ContactUs

---

## 🔄 Migration from Legacy Structure

This design system was recently migrated from a legacy structure to pure Atomic Design:

**Before:**

```
design-system/
├── primitives/    (mixed atoms + business logic)
├── feedback/      (mixed molecules + business logic)
├── data-display/  (business logic)
├── layout/        (organisms)
└── navigation/    (organisms)
```

**After:**

```
design-system/
├── tokens/        (design tokens)
├── atoms/         (basic components)
├── molecules/     (simple compositions)
└── organisms/     (complex compositions)

features/
├── roster/        (roster-specific components)
├── tracking/      (tracking-specific components)
└── loot/          (loot-specific components)
```

All imports have been updated to reflect the new structure.

---

## 📖 Further Reading

- [Atomic Design Methodology](https://atomicdesign.bradfrost.com/)
- [Mantine UI Documentation](https://mantine.dev/)
- [Design Systems Handbook](https://www.designbetter.co/design-systems-handbook)

---

## 🤝 Contributing

When adding new components:

1. **Determine the correct level** (atom, molecule, or organism)
2. **Create the component** with TypeScript
3. **Add Storybook stories** with examples
4. **Update the barrel export** in the level's `index.ts`
5. **Document in this README** if it's a major component

For business logic components, create them in `features/` instead of `design-system/`.
