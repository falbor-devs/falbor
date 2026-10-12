---
name: ui-consistency
description: Workflow for creating or modifying UI elements to ensure strict visual and interaction consistency with Falbor design system, tokens, and sibling component patterns.
---

# UI Consistency Skill

Follow this process whenever creating or updating UI in Falbor:

1. **Inspect Existing UI & Tokens**:
   - Inspect sibling pages, parent layouts, and existing components in `apps/falbor/app/components/ui`.
   - Identify established patterns for typography, colors, borders, spacing, dialogs, buttons, and cards.

2. **Reuse Canonical Components**:
   - Prioritize extending existing primitives in `apps/falbor/app/components/ui`.
   - Avoid creating duplicate component variations or hardcoding static pixel styles when design tokens/Tailwind/UnoCSS variables exist.

3. **Responsive & Interaction Patterns**:
   - Preserve responsive behavior, hover states, dark mode themes (`ThemeHandler`), and smooth transition patterns.

4. **Visual Review**:
   - Verify the modified UI against surrounding layouts and sibling components to ensure seamless product cohesion.
