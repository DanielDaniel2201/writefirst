# Write First Web Design

This file records the active web design system for `apps/web`.

## Purpose

The website should present Write First as a focused product, not a quick landing page.
It needs enough polish for evaluation, but it should still feel restrained, practical, and product-bound.

The current web scope is two responsive pages:

1. `apps/web/index.html`
2. `apps/web/install/index.html`

They must read as one coherent product site.

## Product Posture

Write First is not an AI assistant brand site, a consumer growth page, or a playful language app.
It is a quiet product for learning through real writing moments.

The web presentation should therefore feel:

- calm
- precise
- technical
- credible
- intentionally understated

It should not feel:

- warm lifestyle editorial
- cheerful learning app
- startup marketing fluff
- abstract AI futurism
- empty chrome with no product substance

## Visual Direction

Use a mature technology / utility posture:

- cool neutral background with crisp white surfaces
- dark foreground with muted secondary copy
- cobalt accent for actions, links, and a small number of emphasis moments
- strong spacing rhythm instead of decorative effects
- product UI framing as the main visual proof

The site should look closer to a serious software product launch page than a generic template landing page.

## Core Page Rhythm

### Home

The homepage structure is:

1. hero
2. product mechanism / philosophy
3. usage scenarios
4. FAQ
5. installation CTA

The hero should establish the product value quickly:

- what Write First does
- what it does not do
- why that distinction matters
- a real product visual as proof

The middle sections should explain the learning model and usage contexts without drifting into essay-like copy.

The FAQ should resolve likely evaluation concerns:

- whether it rewrites user text
- whether it changes input behavior
- what data is sent
- when the card appears

### Install

The installation page structure is:

1. download entry
2. Chrome install steps
3. provider configuration
4. privacy / behavioral boundaries

It should feel operational and trustworthy, not promotional.
The user should be able to move from reading to installation immediately.

## Hard Constraints

- Keep the site responsive and clean from phone to desktop.
- Do not force everything into a single-screen composition.
- Do not remove real navigation cues when they improve orientation.
- Do not add ornamental sections that are not serving the product story.
- Do not introduce speculative features such as history, rewrite actions, assistant chat, accounts, or analytics.
- Do not use copy that implies the extension writes for the user.
- Do not make the product look like a generic AI copilot.

## Content Rules

- Keep copy specific to Write First's product philosophy.
- Prefer concrete language over slogans.
- Explain the boundary between viewing a translation and replacing user input.
- Keep claims modest and defensible.
- Avoid invented metrics, fake testimonials, or fake logos.
- If a proof point is unavailable, use product explanation instead of marketing filler.

## Color Tokens

Use the shared theme tokens in `apps/web/src/theme.css`.

The intended roles are:

- background: cool light neutral
- surface: white
- text: deep neutral ink
- muted text: lower-contrast neutral
- border: subtle cool grey
- accent: cobalt blue
- accent soft: pale blue field for small emphasis areas
- success: reserved for completion / ready states

Accent usage should stay restrained:

- one primary CTA zone per section at most
- links and FAQ affordances can use accent
- avoid flooding the page with blue panels or large gradient areas

## Typography

- display: `var(--font-display)`
- body: `var(--font-body)`
- mono detail: `var(--font-mono)`

Typography should support a product evaluation context:

- large display headlines with tight tracking
- compact but readable body copy
- muted supporting text for explanations
- mono only for labels, UI metadata, or short technical details

Do not make the type feel editorial, whimsical, or luxury-branded.

## Layout Rules

- desktop shell width stays controlled rather than full-bleed
- hero uses a two-column composition when space allows
- sections stack with generous vertical spacing
- cards should create structure, not decoration
- responsive collapse should preserve hierarchy, not just shrink boxes

The install page can use sticky product imagery on larger screens, but it must degrade cleanly on tablet and phone.

## Component Rules

### Navigation

- simple top navigation
- minimal links
- no heavy header chrome

### Buttons

- primary button uses accent fill
- secondary / ghost actions stay quiet
- hover and focus feedback should feel crisp, not flashy

### Cards

- white surfaces
- subtle border
- medium radius
- no soft marketing shadows

### Frames

- product media should appear inside stable framed containers
- frames are part of the credibility of the page
- screenshots and demo visuals should feel like proof, not decoration

### FAQ

- interactive disclosure is acceptable
- default closed state should remain compact
- interaction affordance must be obvious but subtle

## Motion

Motion should be minimal:

- quick hover lift on buttons
- focus ring for keyboard clarity
- FAQ open / close can be immediate

Avoid dramatic entrance animation, parallax, glow, or floating effects.

## Responsive Behavior

The primary target is responsive web.

Required behavior:

- desktop: clear two-column hero and balanced section grids
- tablet: reduce columns before crowding
- mobile: single-column reading flow with preserved spacing and readable line lengths

On smaller screens:

- navigation can simplify
- sticky visuals must fall back to normal document flow
- CTA groups can wrap
- cards must remain comfortable to scan and tap

## Anti-Patterns

Do not use:

- warm ivory or beige product backgrounds
- orange brand accents
- oversized gradient washes
- decorative floating blobs
- fake enterprise logos
- generic AI icon grids
- overly rounded toy-like UI
- thin one-line product explanations with no information depth
- layouts whose only idea is "text left, screenshot right"

## Source Files

- `apps/web/index.html`
- `apps/web/install/index.html`
- `apps/web/src/styles.css`
- `apps/web/src/theme.css`
- `apps/web/src/main.ts`

Any future edits to the marketing site should follow this document unless the product direction changes again.
