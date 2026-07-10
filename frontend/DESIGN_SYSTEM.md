# EIDOS "Ink & Iris" Design System

Premium 2026 SaaS look. Neutral-dominant surfaces, one rich violet-indigo primary ("Iris"),
an always-dark ink sidebar, Sora display headings, generous whitespace, purposeful motion.

**Golden rule: restyle, never re-wire.** Keep every data fetch, handler, condition, route
and prop exactly as it is. Only change JSX structure/classes/copy where visual.

## Tokens (already defined in `app/globals.css` — USE THEM, never raw hex)

- Surfaces: `bg-background`, `bg-card`, `bg-muted`
- Text: `text-foreground`, `text-muted-foreground`
- Brand: `bg-primary text-primary-foreground`, `text-primary`, `ring-primary`
- Semantic: `text-success`/`bg-success/15`, `text-warning`/`bg-warning/15`, `text-destructive`/`bg-destructive/10`
- Charts: `var(--chart-1)` … `var(--chart-5)` (pass to recharts `fill`/`stroke` directly)
- Gradient: `bg-brand-gradient` (hero surfaces, avatars, logo chips), `text-brand-gradient`

## Utilities (already defined — prefer these)

- `elevation-1` (default card shadow), `elevation-2` (popovers/emphasis)
- `hover-lift` (cards that are links/clickable), `card-interactive`
- `animate-fade-in-up` + `stagger-1..4` (page-load entrance; use on the first 3-4 blocks only)
- `page-title`, `page-subtitle`, `eyebrow` (section label)
- `tabular-nums` on every numeric value that can change
- `font-display` for any heading rendered outside h1-h3 tags

## Page recipes

### Page header (every page starts with this)
```tsx
<div className="animate-fade-in-up">
  <p className="eyebrow">Section name</p>            {/* optional */}
  <h1 className="page-title">Page Title</h1>
  <p className="page-subtitle">One sentence that explains the page.</p>
</div>
```
Header actions (buttons) go in a `flex items-start justify-between gap-4` wrapper.
Page root is `<div className="space-y-8">` (was space-y-6 — more whitespace).

### Cards
Use the shadcn `Card` (already `rounded-2xl border-border/80 elevation-1`).
- Card headers: icon in a tinted chip + title:
```tsx
<CardHeader>
  <div className="flex items-center gap-2.5">
    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
      <Icon className="h-[18px] w-[18px]" />
    </div>
    <CardTitle className="font-display text-lg">Title</CardTitle>
  </div>
</CardHeader>
```
- Raw `<div className="rounded-2xl border ...">` cards → convert to the same look:
  `rounded-2xl border border-border/80 bg-card elevation-1 p-6`.

### KPI / stat tiles
Use `components/dashboard/StatsCard` where possible. Custom tiles follow:
icon chip (h-11 w-11 rounded-xl, `bg-<tone>/10 text-<tone>`), label `text-sm font-medium
text-muted-foreground`, value `text-3xl font-bold tracking-tight tabular-nums`.

### Tables
```tsx
<div className="overflow-x-auto">
  <table className="w-full text-sm">
    <thead>
      <tr className="border-b border-border text-left">
        <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Col</th>
```
Rows: `border-b border-border/50 hover:bg-muted/50 transition-colors`, cells `py-3.5 pr-4`.
Numbers right-aligned + `tabular-nums`. Row links get `cursor-pointer`.

### Badges (status)
Always tinted-outline style, never solid:
- positive/active: `bg-success/15 text-success border-success/25`
- pending/info:    `bg-primary/10 text-primary border-primary/20`
- warning/paused:  `bg-warning/15 text-warning border-warning/25`
- negative/failed: `bg-destructive/10 text-destructive border-destructive/20`
- neutral/archived: `variant="secondary"`

### Forms
- Wrap in a Card; fields grid `grid grid-cols-1 sm:grid-cols-2 gap-5`.
- Label above input (shadcn `Label`, `text-sm font-medium`), helper/error text below
  (`text-xs text-muted-foreground` / `text-destructive`).
- Inputs: keep shadcn `Input`; ensure `h-10 rounded-xl` (add classes if missing).
- Primary action bottom-right, secondary as `variant="outline"` at its left.

### Alerts / inline messages (success, error, info banners)
Replace ad-hoc `bg-green-50 text-green-800 ...` blocks with token style:
```tsx
<div className="flex items-center gap-3 rounded-xl border border-success/25 bg-success/10 p-4 text-sm font-medium text-success">
  <CheckCircle2 className="h-5 w-5 shrink-0" /> Message
</div>
```
(error → destructive tones, info → primary tones, warning → warning tones.)

### Empty states
Centered, motivating, with an action:
icon in `h-14 w-14 rounded-2xl bg-primary/10 text-primary` chip, bold one-liner,
muted explanation (max-w-sm mx-auto), primary Button.

### Loading
Keep existing skeleton components; spinners only inside buttons.

## Icons
Lucide only. Sizes: nav/list 18px (`h-[18px] w-[18px]`), card headers 18px in a chip,
KPI chips 20px (`h-5 w-5`), hero 24px. Never emoji as icons (emoji allowed only as
achievement/decorative glyphs with `aria-hidden`).

## Motion
Entrance: `animate-fade-in-up` + stagger on the top blocks. Interactions: colors/shadows
150-200ms; never animate width/height; respect the existing reduced-motion overrides.

## Copy tone
Short, confident, human. Subtitles explain value, not mechanics
("Earnings from your network's subscriptions" not "List of commission records").

## Do NOT
- No raw color hex/gray-*/blue-50 classes — tokens only (rose/emerald/amber/indigo tints
  in StatsCard's colorMap are grandfathered).
- No emoji icons, no `alert()`, no layout-shifting hovers, no new dependencies.
- Don't touch: `lib/**` (except nothing), route logic, api calls, hooks, guards.
