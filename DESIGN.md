---
name: Corridor
description: More sales performance. Not more sales effort.
colors:
  navy: "#1a2b5e"
  navy-mid: "#243875"
  navy-light: "#eef1fa"
  signal-sky: "#93A8D4"
  signal-sky-light: "#c8d5ea"
  bg: "#f8f9fb"
  surface: "#ffffff"
  border: "#e2e8f0"
  border-mid: "#c8d0e0"
  text: "#1e2a45"
  muted: "#6b7a99"
  dim: "#8896b3"
  signal-green: "#15803d"
  signal-green-bg: "#f0fdf4"
  signal-green-border: "#86efac"
  signal-amber: "#b45309"
  signal-amber-bg: "#fffbeb"
  signal-amber-border: "#fcd34d"
  signal-red: "#dc2626"
  signal-red-bg: "#fef2f2"
typography:
  display:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.5px"
  kpi:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1.0
    letterSpacing: "-1px"
  body:
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
  ui:
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.5
  label:
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
    fontSize: "10px"
    fontWeight: 600
    letterSpacing: "1.5px"
rounded:
  xs: "2px"
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "12px"
  2xl: "14px"
  pill: "20px"
  circle: "50%"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "48px"
  section: "52px"
components:
  button-primary:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "10px 22px"
    typography: "{typography.ui}"
  button-primary-hover:
    backgroundColor: "{colors.navy-mid}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "10px 22px"
  button-secondary:
    backgroundColor: "{colors.navy-light}"
    textColor: "{colors.navy}"
    rounded: "{rounded.md}"
    padding: "10px 22px"
  button-secondary-hover:
    backgroundColor: "{colors.signal-sky-light}"
    textColor: "{colors.navy}"
    rounded: "{rounded.md}"
    padding: "10px 22px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "{spacing.lg}"
  input-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
  chip-nav-badge:
    backgroundColor: "{colors.navy-light}"
    textColor: "{colors.navy}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
  chip-signal-positive:
    backgroundColor: "{colors.signal-green-bg}"
    textColor: "{colors.signal-green}"
    rounded: "{rounded.pill}"
    padding: "5px 12px"
  chip-signal-warning:
    backgroundColor: "{colors.signal-amber-bg}"
    textColor: "{colors.signal-amber}"
    rounded: "{rounded.pill}"
    padding: "5px 12px"
  chip-signal-urgent:
    backgroundColor: "{colors.signal-red-bg}"
    textColor: "{colors.signal-red}"
    rounded: "{rounded.pill}"
    padding: "5px 12px"
---

# Design System: Corridor

## Overview

**Creative North Star: "The Signal Room"**

Corridor's visual world is a command center for commercial intelligence. The interface receives signals in real-time, sorts them by urgency, and routes the operator toward action. Every module is a workstation — Scanner, Pipeline, Send Queue, CMO IA — and the visual system communicates that each one has a job to do. The tone is operational: dense but not cluttered, authoritative but not cold. The serif display type (Fraunces) gives weight to the numbers that matter; the sans-serif UI layer (Plus Jakarta Sans) keeps everything scannable.

The palette runs on a single systemic logic: System Blue (#1a2b5e) holds authority, Signal Sky (#93A8D4) marks connection and interface scaffolding, and the semantic signal colors (green, amber, red) carry real operational meaning. They appear only when a prospect is moving, an alert fires, or a deadline is overdue — never decoratively. The background is cool parchment (#f8f9fb), not white: a surface that reads as a work environment, not a blank page.

The dual landing / app typography split is intentional. The public-facing landing (Geist) speaks as a product platform. The private app (Fraunces + Plus Jakarta Sans) speaks as an instrument. These worlds do not mix.

**Key Characteristics:**
- Signal-driven hierarchy: color carries urgency, not decoration
- Fraunces reserved strictly for KPIs and section titles — the numbers the operator needs to read at a glance
- Navy-tinted shadows throughout — no pure black anywhere
- Operational density: 6-column kanban, tabbed modules, compact cards — designed for daily working sessions, not demos
- Semantic color vocabulary with named states (signal-green, signal-amber, signal-red)

## Colors

A disciplined two-layer palette: one structural color (System Blue) + one accent (Signal Sky) + four tightly scoped semantic states. Everything else is neutral.

### Primary
- **System Blue** (#1a2b5e): The backbone of the interface. Navigation bar, primary buttons, active tab indicators, KPI values in their default state, drawer headers, and any element that conveys system authority. Never used for decoration.
- **System Blue Mid** (#243875): Hover state for System Blue elements. Used exclusively as a transition target — never as a resting state.
- **System Blue Light** (#eef1fa): The tinted neutral surface for secondary buttons, active row highlights, form backgrounds in dark contexts, and the kanban legend background. The lightest expression of System Blue — it reads as "selected" or "elevated attention."

### Secondary
- **Signal Sky** (#93A8D4): The accent color for badges, borders on active elements, the logo mark's alternating squares, spinner rings, AI module headers, and interactive scaffolding (tab underlines, focus-adjacent treatments). Desaturated enough to work as a border; distinctive enough to signal interactivity.
- **Signal Sky Light** (#c8d5ea): Border-weight expression of Signal Sky, used for mid-weight dividers and button borders.

### Neutral
- **Cool Parchment** (#f8f9fb): App body background. Distinguishes the working surface from card surfaces without using pure white. Never used on landing pages.
- **Surface White** (#ffffff): Card bodies, input fields, the navigation bar — any element that should feel elevated above the background.
- **Border Hairline** (#e2e8f0): Default border for all cards, inputs, and dividers. Barely visible at rest; structural, not decorative.
- **Border Mid** (#c8d0e0): Stronger divider for contexts that need more separation (column heads, focused inputs).
- **Ink** (#1e2a45): Primary text. Navy-tinted dark, never pure black.
- **Muted** (#6b7a99): Secondary text, placeholders, module descriptions. Readable but receding.
- **Dim** (#8896b3): Tertiary text — dates, metadata, labels that should disappear until needed.

### Signal (semantic — strictly functional)
- **Signal Green** (#15803d) + tint (#f0fdf4) + border (#86efac): Positive state. Prospect advancing, AI badge confirmed, sequence sent successfully.
- **Signal Amber** (#b45309) + tint (#fffbeb) + border (#fcd34d): Active / live / pending. "LIVE DEMO" badge, buying signals detected, J+5 touch pending. The "watch this" color.
- **Signal Red** (#dc2626) + tint (#fef2f2): Urgent. Overdue reminders, prospect at risk, system alert requiring immediate action.

### Named Rules
**The No Pure Black Rule.** No `#000000`, no `rgba(0,0,0,...)` anywhere. Shadows, overlays, and dark text all use navy-tinted values: `rgba(26,43,94, ...)` for shadows, `#1e2a45` for text. This keeps the palette from splitting into two incompatible visual registers.

**The Signal Color Contract.** Green, amber, and red appear only when they carry the meaning their name implies. A green background on a card means a positive prospect signal. An amber badge means a live or pending state. Red means action required. Using any of the three decoratively — for variety, branding, or visual interest — breaks the semantic contract and trains users to ignore real alerts.

## Typography

**Display Font:** Fraunces (italic-capable, variable-weight serif) — display and KPI use only
**Body Font:** Plus Jakarta Sans (geometric sans, weights 300–800) — all UI, labels, body copy in the app
**Landing Font:** Geist + Geist Mono — public-facing site only; does not appear in the app

**Character:** Fraunces brings editorial weight to numbers and headings — its optical personality reads as "this figure matters." Plus Jakarta Sans keeps the surrounding UI scannable and neutral. The pairing creates a deliberate hierarchy: serif = signal, sans = system.

### Hierarchy
- **KPI / Display Large** (Fraunces, 700, 28–32px, lh 1.0–1.2, ls -0.5 to -1px): ICP scores, pipeline counts, pipeline stage KPIs. Reserved exclusively for the numbers the operator reads at a glance.
- **Section Title** (Fraunces, 700, 28px, lh 1.2, ls -0.5px): Module headers (e.g. "Detect who's ready to buy, right now."). One per visible screen region.
- **Card Title** (Plus Jakarta Sans, 700, 13px, ls 0.2px): In-card headings, module sub-titles. Uppercase avoided here — sentence case only.
- **Body** (Plus Jakarta Sans, 400, 13–14px, lh 1.7–1.8): AI output text, descriptions, drawer notes. Weight 300 only in `font-weight:300` / `section-sub` — not in functional output.
- **Label / Eyebrow** (Plus Jakarta Sans, 600, 10px, ls 2px, uppercase): Section eyebrows ("Module 01 · Signal Intelligence"), badge text, column headers, score-kpi-label. Maximum 3-word phrases at this scale.

### Named Rules
**The Fraunces Gate.** Fraunces appears only in KPI values and section titles. It is not a general-purpose heading font. Any heading that is a label, a card title, a button, a badge, or a nav item uses Plus Jakarta Sans. When in doubt: is this a number or a section-opening statement? If neither, it's Plus Jakarta Sans.

**The Weight 300 Warning.** `font-weight:300` at 13px or smaller is fragile on non-Retina screens. Limit it to decorative sub-copy (section-sub, hint text). AI output, body copy, and any text the user reads to make a decision must be weight 400 or heavier.

## Layout

**Container:** max-width 1160px, centered, `margin: 0 auto`, padding 48px sides (desktop) → 20px (mobile ≤900px).

**App shell:** Fixed navigation (72px) + sticky tabs bar (~40px) + optional active company bar (~56px) = up to 168px of fixed chrome at the top. Content begins below `padding-top: 72px` on body; all sticky layers use explicit `top` values in the z-stack.

**Grid utilities:**
- `.two-col`: `grid-template-columns: 1fr 1fr; gap: 16px` — stacks at ≤900px
- `.three-col`: `grid-template-columns: 1fr 1fr 1fr; gap: 16px` — stacks at ≤900px
- `.score-grid`: `repeat(4, 1fr); gap: 12px` — KPI row for scanner module
- `.kpi-row`: `repeat(5, 1fr); gap: 12px` — pipeline KPIs
- `.system-grid`: `repeat(4, 1fr); gap: 16px` — system module cards; 2-col at ≤1100px, 1-col at ≤560px

**Kanban:** 6 fixed-width columns (252px each), horizontal scroll container, `align-items: start` so columns grow independently. Each column scrolls vertically up to `calc(100vh - 420px)`. On mobile (≤480px): scroll-snap horizontal carousel, columns 85vw wide.

**Responsive breakpoints:**
- 1100px: system grid stacks to 2 columns
- 900px: nav and main padding reduce; 2-col/3-col grids stack; kpi-row becomes 2-col
- 560px: system grid goes 1-col
- 480px: full mobile treatment — nav height extends to 108px (badge repositioned below logo row), kanban becomes snap carousel, toolbar goes vertical

**Section rhythm:** Module top padding 52px; card margin-bottom 16px; card internal padding 24px; input rows gap 10px.

## Elevation & Depth

The system uses **border-first elevation** with **state-triggered lift**. Surfaces are flat at rest; depth appears only as a response to interaction or hierarchy.

At rest, all cards use `border: 1px solid var(--border)` — no shadow. The only exception is the overlay stack (modals, drawers, toast) where shadows communicate z-layering structurally.

Shadows are **always navy-tinted** — `rgba(26,43,94, ...)` — never pure black.

### Shadow Vocabulary
- **Hover lift** (`box-shadow: 0 2px 8px rgba(26,43,94,0.08)`): k-cards and interactive rows on hover. Combined with `transform: translateY(-1px)`. Signals "this is draggable / clickable."
- **CTA lift** (`box-shadow: 0 4px 12px rgba(26,43,94,0.2)`): Primary button on hover. Stronger signal of primary action.
- **Drawer** (`box-shadow: -8px 0 30px rgba(26,43,94,0.18)`): Right-side slide panel. Communicates that this layer floats above the kanban.
- **Modal** (`box-shadow: 0 20px 60px rgba(0,0,0,0.3)`): Full overlays (call prep, add prospect). Only case where black-channel shadow is used — at modal scale, navy-tinted shadow loses structural contrast.
- **Toast** (`box-shadow: 0 8px 24px rgba(26,43,94,0.25)`): Bottom-center notification. Floats independently.

### Named Rules
**The Flat-by-Default Rule.** Every surface starts flat. A shadow is a response to state (hover, open, active), not a design choice. Adding shadows at rest inflates visual weight and trains the eye to ignore hierarchy.

**The Nav Glass Rule.** The navigation bar uses `backdrop-filter: blur(20px)` + `background: rgba(255,255,255,0.97)`. This is the only frosted-glass treatment in the system — it marks the nav as the topmost persistent layer. Do not apply backdrop-filter elsewhere.

## Shapes

Corridor uses a **graduated radius vocabulary** — tighter on small elements, softer on containers — creating a consistent visual logic: the larger the surface, the more relaxed the corner.

- **Logo mark squares** (2px): The brand's geometric primitive. The only element at this radius.
- **Small inline buttons / nav elements** (6px): nav-cta, sign-out button, small action buttons in inline contexts.
- **Primary UI elements** (8px): btn-primary, btn-secondary, input-field, input-select, tab buttons (rounded on top corners only), k-card, bulk-select.
- **Data surfaces** (10px): kanban-col, kpi-card, score-kpi, ai-box, drawer-score badge. The "dashboard shelf" radius.
- **Content cards** (12px): The main `.card` container — the standard radius for any card that holds structured content.
- **Overlay surfaces** (14px): Modals (call prep, add prospect, profile). The most relaxed corner — signals "this floats above the page."
- **Status indicators** (20px pill): card-badge, signal-tag, kanban-count, nav-badge, touch badges. Pill shape is reserved exclusively for badges and tags. Never on buttons, cards, or inputs.
- **Avatars** (50% circle): nav avatar, chat avatar, send avatar.

### Named Rules
**The Pill Boundary.** Border-radius 20px (pill) is exclusively for status chips: badges, signal tags, count bubbles. Buttons, cards, and inputs are never pill-shaped. The pill communicates "this is a label," not "this is an action."

**The Uniform Radius Warning.** Avoid giving every component the same radius. The graduated vocabulary — 2 / 6 / 8 / 10 / 12 / 14 / 20 — communicates surface hierarchy. A system where everything is 8px or everything is 12px has no shape language.

## Components

### Buttons
Functional, dense, low visual noise. No rounded pill shapes — buttons are actions, not labels.

- **Shape:** Gently curved (8px radius)
- **Primary** (btn-primary): System Blue (#1a2b5e) fill, white text, 10px 22px padding, Plus Jakarta Sans 12px/700. Hover: navy-mid fill + translateY(-1px) + navy-tinted shadow.
- **Active/pressed:** `scale(0.98)` or `translateY(1px)` — physical press simulation.
- **Disabled:** opacity 0.5, no hover treatment.
- **Secondary** (btn-secondary): navy-light fill (#eef1fa), navy text, 1.5px Signal Sky border. Hover: signal-sky-light fill.
- **Ghost / utility:** Transparent background, mid-gray border, muted text. For kanban-refresh and low-priority actions.

### Chips
Two distinct families — never mix their shapes or semantic roles.

- **Status badges** (card-badge, kanban-count): 20px pill. Three variants — AUTO (navy-light/navy/sky-border), AI/CLAUDE (green-bg/green/green-border), LIVE (amber-bg/amber/amber-border + pulse animation). Font: 9–10px/700/uppercase/1px tracking.
- **Signal tags** (signal-tag): 20px pill with leading 6px colored dot (glowing). Three semantic states: amber (warm signal), green (positive signal), navy (informational). Font: 11px/600.
- **Touch badges** (k-j5-badge, send-touch): 4px radius — a rare departure from pill shape, used for timeline/sequence markers (J+0, J+5, etc.).

### Cards / Containers
- **Corner Style:** 12px (xl)
- **Background:** Surface White (#ffffff)
- **Shadow Strategy:** None at rest. State-triggered hover lift on interactive cards.
- **Border:** 1px solid Border Hairline (#e2e8f0). No redundant shadow at rest.
- **Internal Padding:** 24px (lg) standard. Card header has a 14px bottom padding + 1px bottom border separating it from the body.
- **Card header:** Flex row, title (13px/700/navy) on left, badge on right. The structural unit for all module sub-panels.

### Inputs / Fields
- **Style:** 1.5px border (Border Hairline), Surface White background, 8px radius, 10px 14px padding, Plus Jakarta Sans 13px/500.
- **Focus:** border-color shifts to System Blue (#1a2b5e). No glow, no shadow — border change alone.
- **Placeholder:** Muted (#6b7a99).
- **Disabled:** Not explicitly styled — treat as opacity 0.6.
- **Textarea:** Same treatment, `resize: vertical`, min-height 52–80px.

### Navigation
- **Fixed bar** (72px height): backdrop-filter blur(20px) + rgba(255,255,255,0.97) — frosted glass only here.
- **Logo:** 2×2 grid of 2px-radius squares, navy + signal-sky alternating. Text: "CORRIDOR" in 13px/800/2.5px tracking, "GTM System" in 8px/dim below.
- **Tab nav:** Sticky at top:72px. Tabs use 8px radius on top corners only (border-radius:8px 8px 0 0), bottom border as active indicator (2px solid navy). Active tab: white fill, navy text, navy underline. Font: 12px/700.
- **Active Company Bar:** Sticky at top:120px. Navy fill (#1a2b5e) — the only persistent dark surface. Input field: rgba(255,255,255,0.08) fill, white text, 6px radius.

### Signature Components

**AI Box** — the output container for Claude-generated analysis.
A nested container: outer border (1.5px, Border Hairline), inner header (navy-light fill, 10px label in uppercase/700/1.5px tracking), body (min-height 80px, weight 300 before loaded / weight 400 after, 13px/1.8 lh). The spinner (14px ring, navy top-color) appears only while loading. The header announces the output type; the body is left white and open so the AI text has breathing room.

**Kanban Card (k-card)** — the atomic unit of the pipeline.
8px radius, Cool Parchment (#f8f9fb) fill (elevated one step above the column's white), 1px border, 10px 12px 10px 28px padding (left padding leaves room for a checkbox or momentum dot). Hover: border shifts to navy, translateY(-1px), navy-tinted shadow. Amber hot-state: amber-bg fill + amber border. Momentum dot: 8px circle, absolute position top-right, color-coded green/amber/gray/red.

## Do's and Don'ts

### Do:
- **Do** tint every shadow with the navy channel: `rgba(26,43,94, ...)`. Even modal overlays should prefer navy-tinted shadows at lower opacity over pure black.
- **Do** use Fraunces exclusively for KPI values and module-opening section titles. All other headings — card titles, drawer titles, modal headings — use Plus Jakarta Sans at 700.
- **Do** use `transform: translateY(-1px)` + shadow together on interactive elements. Lift and shadow appear as a pair — never one without the other.
- **Do** use `font-weight: 400` or higher for any text the user reads to make a decision. Reserve `font-weight: 300` for hint text and section subtitles only.
- **Do** use `scroll-behavior: smooth` and `cubic-bezier(0.4, 0, 0.2, 1)` for panel transitions (drawer, modal). The 0.3s duration is the house standard.
- **Do** add `tabular-nums` (`font-variant-numeric: tabular-nums`) on any numeric column that updates dynamically (ICP scores, pipeline counts).

### Don't:
- **Don't** use signal colors (green, amber, red) decoratively. They are reserved for their semantic state only — positive, active/live, urgent.
- **Don't** apply `border-radius: 20px` (pill shape) to buttons, cards, or input fields. Pill is the badge shape; it reads as "label," not "action."
- **Don't** use `font-weight: 300` for AI output body text or any text in `.ai-box-body.loaded`. The weight is fragile at 13px on non-Retina screens.
- **Don't** add a shadow to a card at rest. Borders define cards; shadows only respond to hover or elevation (drawer, modal, toast).
- **Don't** break the Navy Glass Rule — `backdrop-filter: blur()` belongs only on the fixed nav bar.
- **Don't** introduce a third font family. The system is Fraunces (display) + Plus Jakarta Sans (UI) in the app, Geist + Geist Mono on the landing. Any third family — even a Google Font in the same weight class — fractures the system.
- **Don't** use pure `#000000` or `rgba(0,0,0,1)` as text color. Primary text is Ink (#1e2a45).
