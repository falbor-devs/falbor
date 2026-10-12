---
name: security-review
description: Workflow for reviewing and hardening security-sensitive code, server actions, API routes, authentication, workspace isolation, and IDOR/BOLA risks.
---

# Security Review Skill

Follow this procedure when reviewing or building security-sensitive features in Falbor:

1. **Authentication & Identity**:
   - Verify every protected route and server action validates session identity.
   - Never trust user-supplied parameters without server-side verification.

2. **Workspace & Resource Authorization (IDOR/BOLA)**:
   - Enforce resource ownership checks in database queries (e.g., `getAccessibleWorkspace` or `where(and(eq(workspaceId), eq(userId)))`).
   - Prevent cross-tenant data leakage and unauthorized ID manipulation.

3. **Secret Isolation & Input Validation**:
   - Ensure server secrets (`DATABASE_URL`, `JWT_SECRET`) remain protected by `server-only` imports.
   - Validate and sanitize untrusted input data.

4. **Security Testing**:
   - Add automated boundary/authorization regression tests in `tests/security/`.
   - Verify that unauthorized calls fail safely with appropriate status codes without leaking stack traces or sensitive environment variables.
