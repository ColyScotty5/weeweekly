---
name: material-design-3-frontend
description: Enforces Material Design 3 through React and @mui/material for every frontend page, component, interaction, and visual update. Use whenever creating, editing, reviewing, or planning UI, JSX, themes, responsive layouts, icons, or frontend styling in Wee Weekly.
---

# Material Design 3 Frontend

Apply this Skill to every frontend task. The repository's implementation library is `@mui/material`; use its public component and styling APIs rather than generated `.Mui-*` class names.

## Non-negotiable standard

No mixing custom styles with Material.

- Build UI from `@mui/material` components and `@mui/icons-material`.
- Prefer semantic components such as `Button`, `TextField`, `Card`, `Dialog`, `AppBar`, `Chip`, `Alert`, and `Typography` over styled native elements.
- Use MUI component props first, theme tokens second, and `sx` only for layout, responsive behavior, or a design requirement unavailable through props.
- Put reusable visual decisions in `src/theme.js` through palette, typography, shape, spacing, variants, default props, and component overrides.
- Use palette roles such as `primary`, `secondary`, `surface`/`background`, `error`, and `text`; do not introduce arbitrary component colors.
- Use theme spacing, typography variants, shape, elevation, breakpoints, motion, and state behavior consistently.
- Preserve visible hover, focus, pressed, selected, disabled, loading, empty, and error states.
- Use accessible labels, semantic structure, keyboard operation, sufficient contrast, touch targets, and reduced-motion behavior.

## Prohibited patterns

Do not add:

- visual CSS classes, CSS modules, Sass, utility-CSS frameworks, inline `style`, or component stylesheet imports;
- custom buttons, inputs, dialogs, cards, badges, menus, tabs, tooltips, or icons when MUI provides the pattern;
- hard-coded spacing, colors, shadows, typography, radii, or breakpoints when a theme token exists;
- selectors targeting generated `.Mui-*` class names;
- a second design system or a custom visual language beside Material.

`className` is allowed only for a non-visual integration that cannot use a ref or data attribute. Document the reason locally.

## Existing UI migration

Existing `src/app.css` class-based styling is legacy, not precedent. When touching a component that uses it:

1. Replace affected native visual elements with the closest MUI components.
2. Move reusable design decisions into `src/theme.js`.
3. Convert necessary local layout to token-based `sx`.
4. Remove obsolete `className` values and CSS rules.
5. Do not increase the legacy CSS surface.

Use MUI `Box` or SVG primitives with token-based `sx` for bespoke tournament-bracket geometry. Obtain user approval before introducing any other CSS exception.

## Review checklist

Before completing frontend work:

- confirm every visual control uses the appropriate MUI component;
- search changed JSX for `className=` and `style=`;
- check that no new stylesheet or non-MUI UI-library import was added;
- verify light and dark color schemes, responsive layout, keyboard focus, and common interaction states;
- run the relevant tests and `npm run build`;
- identify any legacy styling that remains in the touched area.

Report deviations as blockers unless the user explicitly approves a documented exception.
