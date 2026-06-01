# Write First Web Design

This file records the minimal design system for `apps/web`.

## Source

- reference style: https://styles.refero.design/style/4e3b4717-84c8-4599-baaf-a343c3d619b6
- adaptation target: `apps/web`

## Rule

Keep only the parts of the reference that help clarity:

- warm ivory background
- dark text
- orange outline action
- real product imagery
- almost no UI chrome

Everything else is stripped away.

## Page Structure

There are only two pages:

1. `index.html`
   - left: title, one short idea, one install button
   - right: demo gif
2. `install/index.html`
   - left: download button, install list
   - right: settings screenshot

## Hard Constraints

- no vertical scrollbar
- no extra sections
- no header nav
- no footer
- no decorative cards beyond the media frame
- no copy that sounds like an assistant writes for the user

## Tokens

- background: `#f7f7f4`
- text: `#262510`
- muted text: `#7a7974`
- border: `#cdcdc9`
- accent: `#f54e00`
- surface: `#ffffff`

## Type

- display: `system-ui`
- body: `system-ui`
- mono detail: `ui-monospace`

## Layout

- split screen on desktop
- stacked layout on narrow screens
- everything must fit inside `100svh`
- media uses `object-fit: contain`

## Files

- `apps/web/src/theme.css`
- `apps/web/src/styles.css`
- `apps/web/index.html`
- `apps/web/install/index.html`
- `apps/web/src/main.ts`
