---
name: implement-feature
description: Repeatable workflow for implementing new features professionally while maintaining architecture, design system consistency, authorization checks, and test coverage.
---

# Implement Feature Skill

Follow this process when implementing new features in Falbor:

1. **Architecture & Scope Audit**:
   - Inspect existing page routes (`apps/falbor/app`), server actions (`apps/falbor/app/lib/actions`), utilities, and schemas (`apps/falbor/app/lib/db/schema.ts`).
   - Identify pre-existing components in `apps/falbor/app/components/ui` to avoid duplication.

2. **Server-Side Security & Permissions**:
   - Verify caller identity via session helpers.
   - Enforce workspace/resource permissions on the server (e.g., `getAccessibleWorkspace`).

3. **Minimal Targeted Implementation**:
   - Implement the smallest complete solution matching existing codebase patterns.
   - Reuse existing utilities, design tokens, and components.

4. **Testing & Verification**:
   - Add unit/integration regression tests in `tests/`.
   - Run relevant tests and verify runtime execution.
