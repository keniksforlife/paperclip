# Module Switcher — Technical Documentation

> **Status:** Live
> **Last Updated:** 2026-03-01
> **Component:** Glass Command Center UI
> **Stack:** Next.js 16, MUI 7, TypeScript

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [File Map](#file-map)
4. [Module Registry](#module-registry)
5. [Component Breakdown](#component-breakdown)
6. [Design System](#design-system)
7. [Animation Catalog](#animation-catalog)
8. [Responsive Behavior](#responsive-behavior)
9. [Accessibility](#accessibility)
10. [Adding a New Module](#adding-a-new-module)
11. [Customization Reference](#customization-reference)

---

## Overview

The Module Switcher is a premium navigation component that allows users to switch between different application modules (Member Dashboard, TWC Coaches, Finance Center, etc.). It appears in the top navigation bar and adapts its presentation based on device size.

**Key characteristics:**
- Frosted-glass (glass-morphic) popover panel with noise texture
- Icon-centric vertical tile layout with ambient radial glow effects
- Spring-physics entrance animations with staggered timing
- Full dark/light mode support
- Permission-based module visibility
- Keyboard-accessible (Tab, Enter, Space, Escape)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        TopBar.tsx                            │
│                                                             │
│  ┌─────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │  Cart   │  │ Notification │  │    ModuleSwitcher      │  │
│  │  Button │  │    Button    │  │  (trigger + popover)   │  │
│  └─────────┘  └──────────────┘  └───────────────────────┘  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                     MobileDrawer.tsx                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Module Pills (horizontal scroll)                   │    │
│  │  [Member] [Coaches] [Cyra] [Logistics] [Finance]... │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘

Data Flow:
  moduleRegistry.ts  →  useModuleSwitcher.ts  →  ModuleSwitcher.tsx
  (config)              (state + logic)           (UI render)
                                               →  MobileDrawer.tsx
                                                  (mobile pills)
```

---

## File Map

| File | Purpose | Lines |
|------|---------|-------|
| `src/config/moduleRegistry.ts` | Module definitions (IDs, names, routes, icons, colors, access rules) | ~102 |
| `src/hooks/useModuleSwitcher.ts` | State management hook (active detection, popover control, navigation) | ~76 |
| `src/components/navbar/ModuleSwitcher.tsx` | Desktop popover UI (trigger button + glass panel + tile grid) | ~320 |
| `src/components/navbar/components/MobileDrawer.tsx` | Mobile drawer module pills (lines 192-270) | ~80 |
| `src/components/navbar/components/TopBar.tsx` | Integration point — renders `<ModuleSwitcher />` (line 179) | — |

---

## Module Registry

Defined in `src/config/moduleRegistry.ts`. Each module has these properties:

```typescript
type ModuleDefinition = {
  id: string;            // Unique key (e.g. "finance")
  name: string;          // Display name (e.g. "Finance Center")
  description: string;   // Subtitle (e.g. "Budgets, reports & audit")
  href: string;          // Navigation target (e.g. "/finance-monitoring")
  pathPrefix: string;    // URL prefix for active detection (e.g. "/finance")
  icon: string;          // Icon key from ICON_MAP (e.g. "AccountBalance")
  gradient: string;      // CSS gradient for icon orb
  accentColor: string;   // Primary hex color (e.g. "#2e7d32")
  accessCheck: (user) => boolean;  // Permission gate function
  order: number;         // Sort order in the grid
};
```

### Registered Modules

| # | ID | Name | Icon | Color | Access Rule |
|---|-----|------|------|-------|-------------|
| 1 | `member` | Member Dashboard | Dashboard | `#1a237e` Navy | `is_affiliate` OR `is_distributor` |
| 2 | `coaches` | TWC Coaches | Diamond | `#7b1fa2` Purple | `is_diamond` |
| 3 | `cyra` | Cyra Payments | Payment | `#00897b` Teal | `is_cyra` |
| 4 | `logistics` | Logistics Hub | LocalShipping | `#f57c00` Orange | `is_logistic` |
| 5 | `finance` | Finance Center | AccountBalance | `#2e7d32` Green | `is_finance` OR `is_founder` OR `is_admin` OR `is_staff` |
| 6 | `founder` | Founder Suite | Shield | `#c62828` Red | `is_founder` |
| 7 | `live4more` | Live4More Ops | Celebration | `#1565c0` Blue | `is_live4more` |

### Icon Map

```typescript
const ICON_MAP = {
  Dashboard:      DashboardOutlinedIcon,
  Diamond:        DiamondOutlinedIcon,
  Payment:        PaymentOutlinedIcon,
  LocalShipping:  LocalShippingOutlinedIcon,
  AccountBalance: AccountBalanceOutlinedIcon,
  Shield:         ShieldOutlinedIcon,
  Celebration:    CelebrationOutlinedIcon,
};
```

---

## Component Breakdown

### `useModuleSwitcher` Hook

```
Input:  UserData (from context), pathname (from Next.js router)
Output: accessibleModules, activeModuleId, activeModule,
        isOpen, anchorEl, open, close, switchTo, hasMultipleModules
```

**Active module detection** uses longest-prefix-first matching:
```
pathname = "/finance-monitoring/reports"
  → matches "/finance" (prefix length 8)
  → matches "/finance-monitoring" would need its own pathPrefix
  → winner: longest match
```

**Visibility rule:** The switcher only renders when `accessibleModules.length >= 2`. If a user has access to only one module, the switcher is hidden entirely.

### `ModuleSwitcher` (Desktop Popover)

Three-layer structure:

```
┌─────────────────────────────────────────┐
│ HEADER                                  │
│  "MODULES" [count]    [● Active Name]   │
├─────────── gradient separator ──────────┤
│ GRID (2-col desktop, 1-col mobile)      │
│                                         │
│  ┌─────────────┐  ┌─────────────┐       │
│  │  ╭───────╮  │  │  ╭───────╮  │       │
│  │  │ icon  │  │  │  │ icon  │  │       │
│  │  ╰───────╯  │  │  ╰───────╯  │       │
│  │  Module Name │  │  Module Name │      │
│  │  description │  │  description │      │
│  └─────────────┘  └─────────────┘       │
│                                         │
│  ┌─────────────┐  ┌─────────────┐       │
│  │     ...     │  │     ...     │       │
│  └─────────────┘  └─────────────┘       │
│                                         │
│       Click to switch · Esc to close    │
└─────────────────────────────────────────┘
```

### `MobileDrawer` Module Pills

Horizontal scrollable pill bar at the top of the mobile navigation drawer:

```
[ 🏠 Member ] [ 💎 Coaches ] [ 💳 Cyra ] [ 🚚 Logistics ] →
```

Each pill features:
- Mini gradient icon square (24px, 7px radius) — filled gradient for active, transparent for inactive
- Module first name as label
- Staggered slide-in entrance animation

---

## Design System

### Glass Morphism

The popover panel uses a frosted-glass effect:

```css
/* Dark mode */
background: rgba(16, 16, 22, 0.88);

/* Light mode */
background: rgba(252, 252, 255, 0.82);

/* Shared */
backdrop-filter: blur(24px) saturate(180%);
-webkit-backdrop-filter: blur(24px) saturate(180%);
border: 1px solid rgba(255,255,255,0.07);  /* dark */
border: 1px solid rgba(0,0,0,0.05);        /* light */
border-radius: 20px;
```

### Noise Texture

A subtle SVG fractal-noise overlay adds materiality:

```css
&::before {
  content: "";
  position: absolute;
  inset: 0;
  opacity: 0.035;  /* dark */ | 0.02;  /* light */
  background-image: url("data:image/svg+xml,...feTurbulence...");
  background-size: 100px 100px;
  pointer-events: none;
}
```

### Shadow System

Multi-layer shadows for realistic depth:

```css
/* Dark mode panel */
box-shadow:
  0 24px 80px rgba(0,0,0,0.55),       /* ambient */
  0 8px 24px rgba(0,0,0,0.35),        /* medium */
  inset 0 1px 0 rgba(255,255,255,0.03); /* top edge highlight */

/* Light mode panel */
box-shadow:
  0 24px 80px rgba(0,0,0,0.1),
  0 8px 24px rgba(0,0,0,0.05),
  inset 0 1px 0 rgba(255,255,255,0.9);
```

### Color Usage

Each module's `accentColor` is used dynamically via MUI's `alpha()` utility:

| Context | Opacity | Purpose |
|---------|---------|---------|
| Tile border (active) | 45% | Clear active boundary |
| Tile background (active, dark) | 8% | Subtle tint |
| Tile background (active, light) | 3% | Subtle tint |
| Orb glow (ambient) | 8–15% | Radial gradient behind icon |
| Orb shadow (active) | 30% | Box-shadow on icon orb |
| Hover border | 50% | Intensified boundary |
| Hover glow | 45% | Enhanced radial glow |
| Hover tile shadow | 15% | Elevated shadow |
| Active dot indicator | 60% | Header dot glow |
| Check badge filter | 40% | Drop shadow behind checkmark |

### Gradient Separator

Instead of a solid `<Divider>`, uses a fading linear gradient:

```css
background: linear-gradient(
  90deg,
  transparent,
  rgba(255,255,255,0.06) 50%,  /* dark */
  transparent
);
height: 1px;
```

---

## Animation Catalog

All animations use CSS `@keyframes` — no JavaScript animation libraries required.

### 1. Panel Entrance (`panelSlide`)
```
Duration: 300ms
Easing:   cubic-bezier(0.16, 1, 0.3, 1)  — spring overshoot
From:     opacity: 0, scale(0.96), translateY(-8px)
To:       opacity: 1, scale(1), translateY(0)
```

### 2. Tile Reveal (`tileReveal`)
```
Duration: 450ms
Easing:   cubic-bezier(0.16, 1, 0.3, 1)
Stagger:  55ms per tile (index × 55ms)
From:     opacity: 0, scale(0.9), translateY(10px)
To:       opacity: 1, scale(1), translateY(0)
```

### 3. Active Check Badge (`popIn`)
```
Duration: 350ms
Easing:   cubic-bezier(0.16, 1, 0.3, 1)
Delay:    (index × 55) + 250ms (appears after tile settles)
From:     opacity: 0, scale(0)
To:       opacity: 1, scale(1)
```

### 4. Icon Orb Breathing (`orbBreath`) — Active Only
```
Duration: 3000ms (infinite loop)
Easing:   ease-in-out
Cycle:    boxShadow 30% opacity ↔ 45% opacity
```

### 5. Active Dot Pulse (`activeDot`) — Header
```
Duration: 2000ms (infinite loop)
Easing:   ease-in-out
Cycle:    opacity 1 ↔ 0.35
```

### 6. Mobile Pill Entrance (`pillIn`)
```
Duration: 300ms
Easing:   cubic-bezier(0.16, 1, 0.3, 1)
Stagger:  40ms per pill
From:     opacity: 0, translateX(-6px)
To:       opacity: 1, translateX(0)
```

### Hover Micro-Interactions

| Element | Effect | Duration |
|---------|--------|----------|
| Trigger button | `scale(1.08)` + glow shadow | 250ms |
| Trigger button press | `scale(0.94)` | instant |
| Module tile | `translateY(-3px)` + enhanced border/shadow | 250ms |
| Module tile press | `scale(0.97)` | instant |
| Icon orb (on tile hover) | `scale(1.08)` + brighter shadow | 300ms |
| Ambient glow (on tile hover) | `opacity: 0.2`, `scale(1.15)` | 350ms |
| Mobile pill press | `scale(0.96)` | instant |

---

## Responsive Behavior

| Breakpoint | Panel Width | Grid Columns | Trigger Size |
|------------|-------------|--------------|--------------|
| `xs` (0–599px) | `calc(100vw - 24px)` | 1 | 32×32 |
| `sm` (600–899px) | `calc(100vw - 24px)` | 1 | 38×38 |
| `md+` (900px+) | 440px fixed | 2 | 40×40 |

On mobile (`< md`), the module switcher popover still works but the primary navigation experience shifts to the **MobileDrawer** component, which displays module pills in a horizontal scrollable bar.

---

## Accessibility

| Feature | Implementation |
|---------|---------------|
| Keyboard navigation | `tabIndex={0}` on all interactive tiles |
| Activation keys | `Enter` and `Space` trigger click |
| Dismiss | `Escape` closes popover (MUI Popover default) |
| Focus indicator | `2px solid {accentColor}` outline with 2px offset |
| ARIA label | `aria-label="Switch module"` on trigger |
| Role | `role="button"` on module tiles |
| Screen reader | Tooltip "Switch Module" on trigger |
| Contrast | Module names use `text.primary`, descriptions use `text.secondary` |

---

## Adding a New Module

### Step 1: Add to Registry

Edit `src/config/moduleRegistry.ts`:

```typescript
{
  id: "new-module",
  name: "New Module",
  description: "What this module does",
  href: "/new-module/home",
  pathPrefix: "/new-module",
  icon: "IconName",          // Must exist in ICON_MAP
  gradient: "linear-gradient(135deg, #hex1 0%, #hex2 100%)",
  accentColor: "#hex1",
  accessCheck: (u) => Boolean(u.is_new_module),
  order: 8,                  // Next sequential order
},
```

### Step 2: Add Icon to ICON_MAP

Edit `src/components/navbar/ModuleSwitcher.tsx`:

```typescript
import NewIconOutlinedIcon from "@mui/icons-material/NewIconOutlined";

const ICON_MAP = {
  // ... existing entries
  NewIcon: NewIconOutlinedIcon,
};
```

Also add the same icon import + mapping in `MobileDrawer.tsx` under `MODULE_ICON_MAP`.

### Step 3: Add User Permission Flag

Ensure the `UserData` type (in `src/types/user.ts`) includes the new permission boolean (e.g., `is_new_module`), and the Django backend returns it in the user profile API response.

### Step 4: Create the Module Pages

Create the route pages under `src/app/(dashboards)/new-module/` matching the `href` and `pathPrefix`.

**That's it.** The switcher auto-detects accessible modules and renders them. No changes needed to the switcher components themselves.

---

## Customization Reference

### Changing Panel Width

In `ModuleSwitcher.tsx`, modify the Popover paper `sx`:
```typescript
width: mdUp ? 440 : "calc(100vw - 24px)",
maxWidth: 440,
```

### Changing Grid Columns

```typescript
gridTemplateColumns: mdUp ? "repeat(2, 1fr)" : "1fr",
// For 3 columns: "repeat(3, 1fr)" (reduce tile padding accordingly)
```

### Changing Animation Speed

All stagger delays are computed as `index * 55ms`. Adjust the multiplier:
- Faster: `index * 35`
- Slower: `index * 80`

### Changing Glass Intensity

```css
backdrop-filter: blur(24px) saturate(180%);
/*                    ↑              ↑           */
/*            blur radius    color saturation    */
/*            8-32px range   100-200% range      */
```

### Disabling Noise Texture

Remove or set `opacity: 0` on the `&::before` pseudo-element in the Popover paper `sx`.

### Changing Icon Orb Shape

```typescript
// Current: squircle
borderRadius: "14px",

// Circle
borderRadius: "50%",

// Sharper square
borderRadius: "8px",
```
