# EaseL Theming Guide

## Primary color control (single source for UI)

Edit `src/theme/easeLPalette.css`:

- All route/page/component colors that use CSS variables come from `:root`.
- Buttons, inputs, cards, links, focus rings, and navbar styles are already wired to these variables.

## Canvas + lesson color control

Edit `src/theme/uiTokens.js`:

- `UI_TOKENS.brush.palette`: brush/color picker swatches.
- `UI_TOKENS.brush.default`: default brush color.
- `UI_TOKENS.lesson.*`: lesson canvas colors (trace, start/end dots, ghost, reward gauge).

## Typography control (single source for fonts)

Edit `src/theme/easeLPalette.css`:

- `--easeL-font-heading`: heading font family
- `--easeL-font-body`: body/text font family
- `--easeL-font-size-base`: default body font size
- `--easeL-line-height-base`: default paragraph/body line height
- `--easeL-line-height-heading`: heading line height

Global typography rules and reusable classes are in `src/index.css`:

- Heading tags (`h1`..`h6`) are unified automatically.
- Body controls/text (`p`, `li`, `label`, `button`, `input`, `select`, `textarea`) use body font.
- Utility classes: `easeL-heading-1`, `easeL-heading-2`, `easeL-heading-3`, `easeL-body`.

## Motion and transition control

Edit `src/theme/easeLPalette.css`:

- Timing/easing tokens:
  - `--easeL-duration-fast`
  - `--easeL-duration-standard`
  - `--easeL-duration-slow`
  - `--easeL-ease-standard`
  - `--easeL-ease-snappy`

- Reusable interaction classes:
  - `easeL-transition-fast`
  - `easeL-transition-standard`
  - `easeL-interactive`
  - `easeL-card`

Reduced-motion behavior is centralized in `src/index.css` (`prefers-reduced-motion` blocks).

## If you are changing the brand palette

1. Update `src/theme/easeLPalette.css`.
2. Mirror JS-required colors in `src/theme/uiTokens.js`.
3. (Optional) Keep `src/theme/paletteTokens.js` aligned for JS modules that read palette values.
