# Project Rules

Follow these rules whenever you read, create, or modify files in this codebase.

## Code Quality

Keep the codebase clean, concise, and human-readable.

* Do not add unnecessary comments.
* Never add decorative or explanatory comments such as `// #`, `// ---`, `// Section`, or similar separators.
* Do not explain obvious code with comments.
* Only add a comment when it provides important context that cannot be understood from the code itself.
* Avoid excessive blank lines. Keep related code close together and use spacing only when it improves readability.
* Do not add verbose documentation inside implementation files unless explicitly requested.
* Do not generate large blocks of boilerplate when a smaller implementation is enough.
* Prefer simple, readable code over overly abstract or over-engineered solutions.
* Match the existing coding style of the file you are editing.

### Bad

```tsx
// # User Profile Section

// Get the current user
const user = getUser();


// Check if the user exists
if (user) {
  // Display the user's name
  return <div>{user.name}</div>;
}
```

### Good

```tsx
const user = getUser();

if (user) {
  return <div>{user.name}</div>;
}
```

## UI and Design

When creating or modifying UI, always reuse the existing design system.

The main UI components are located at:

```text
apps/falbor/app/components/ui
```

Before creating a new component:

1. Check whether an existing component already solves the problem.
2. Reuse or extend the existing component whenever possible.
3. Modify existing components when appropriate instead of recreating the same design from scratch.
4. Create a completely new UI component only when there is no suitable existing component.

Keep new designs consistent with the existing Falbor UI, spacing, typography, components, and interaction patterns.

## Project Structure

The workspace follows this structure:

```text
apps/
└── falbor/
    └── app/
        ├── components/
        │   ├── ui/
        │   │   └── ...
        │   └── ...
        └── ...
```

Respect the existing folder structure. Do not create new folders or move files unless there is a clear reason.

## Tests

All test files must be created inside the appropriate `tests` folder.

Do not place test files next to production files unless the existing project structure explicitly does so.

## Environment Variables and Secrets

Never hardcode API keys, tokens, secrets, credentials, or private configuration values inside source files.

For Falbor, environment variables belong in:

```text
apps/falbor/.env
```

When adding an API integration:

```ts
const apiKey = process.env.EXAMPLE_API_KEY;
```

Never do this:

```ts
const apiKey = "sk-example-secret-key";
```

Do not commit secrets or API credentials to the repository.

If a new environment variable is required, reference it from the code and tell me which variable needs to be added to `.env`.

## Database Safety

Never execute commands that push, migrate, reset, seed, or otherwise modify the database unless I explicitly ask you to.

This includes commands such as:

```bash
npx prisma db push
npx prisma migrate dev
npx prisma migrate deploy
npx prisma db seed
```

Database migrations and database-changing commands are my responsibility.

You may update schemas or write migration-related code when requested, but do not execute database-changing commands yourself.

## Editing Existing Files

When modifying an existing file:

* Make the smallest change necessary to complete the task.
* Preserve existing functionality unless the task requires changing it.
* Do not rewrite an entire file when a small targeted change is enough.
* Do not rename unrelated variables, functions, files, or components.
* Do not reformat unrelated code.
* Do not remove existing functionality without a clear reason.
* Follow the patterns already used in nearby files.

Avoid turning a small request into a large refactor.

## Dependencies

Do not install a new package if the functionality can reasonably be implemented with dependencies already available in the project.

Before adding a dependency, check whether the project already contains a suitable library or utility.

Do not replace an existing library with another library unless explicitly requested.

## Agent Chat Style

Keep messages to me short and focused.

Do not write long explanations before or after making changes.

When working on a task, briefly tell me:

* what you changed;
* which important files were affected;
* whether there is anything I need to do manually.

Usually keep the response to only a few lines.

### Good

> Updated the settings modal to use the existing UI components and fixed the full-width layout.
>
> Changed:
>
> * `ChatSettingsModal.tsx`
>
> No manual steps required.

### Avoid

Long explanations of every line changed, detailed walkthroughs of obvious implementation choices, repeated summaries, or large sections describing what you are about to do.

## General Behavior

Prefer:

```text
Understand → Inspect existing code → Make the smallest correct change → Verify
```

Do not:

```text
Understand → Rebuild everything → Add unnecessary abstractions → Explain every line
```

The goal is to keep the Falbor codebase clean, consistent, maintainable, and written like a real production codebase rather than AI-generated code.


## Design Consistency Across the Product

Every UI change must preserve the existing design language and
remain visually consistent with the rest of the product.

Before creating or modifying UI:

- Inspect the existing page, its parent layout, sibling pages,
  shared components, design tokens, and related styles.
- Identify the established patterns for spacing, typography,
  colors, borders, navigation, page layouts, loading states,
  empty states, dialogs, and interactions.
- Reuse existing components and patterns instead of inventing
  new ones.
- When working inside a feature area such as a workspace,
  follow the conventions shared by the other pages in that area.
- Preserve existing relationships between layouts, components,
  styles, and navigation.
- Do not introduce a new visual style when an existing pattern
  already solves the problem.
- Do not duplicate shared UI or styling logic unnecessarily.
- If a reusable component needs improvement, consider updating
  the existing component instead of creating a competing version.
- Do not make unrelated visual changes while implementing a
  feature or fixing a bug.

A page must feel like part of Falbor, not like a separate product.

Before finishing, review the changed UI against related pages
and verify that the implementation follows their existing patterns.



## Security and Authorization

Treat security as a requirement for every feature, not as an
optional review at the end.

- Never trust user-supplied IDs, URL parameters, request bodies,
  query parameters, headers, or client-side permission checks.
- Every protected server-side operation must independently verify
  authentication and authorization.
- Verify that the authenticated user has permission to access
  the specific resource and perform the requested action.
- For multi-tenant data, enforce workspace ownership or membership
  in server-side database queries and mutations.
- Never assume that access to a page grants permission to access
  its underlying data or APIs.
- Apply authorization checks to server actions, API routes,
  route handlers, file operations, background jobs, and other
  relevant entry points.
- Validate untrusted input on the server using existing project
  validation patterns.
- Prevent unauthorized access to other users' data, workspaces,
  files, conversations, integrations, and API resources.
- Keep secrets and privileged operations on the server.
- Do not expose sensitive data, internal errors, credentials,
  or private configuration in client responses or logs.
- Follow existing rate-limiting and abuse-prevention patterns
  for sensitive or expensive operations.
- Use the least privilege necessary for database access,
  integrations, and external API calls.
- Preserve existing security controls when refactoring code.
- Never weaken authentication or authorization to make a feature
  easier to implement.

For every change involving authentication, authorization, user
data, workspaces, files, or APIs:

1. Identify the relevant trust boundaries and resources.
2. Inspect existing authorization helpers and security patterns.
3. Verify permissions on the server for every relevant operation.
4. Check whether changing an ID or manipulating a request could
   expose another user's data or trigger an unauthorized action.
5. Add or update automated tests for relevant security boundaries.
6. Verify that unauthorized requests fail without exposing data.

Never claim that a feature is secure merely because the UI hides
unauthorized actions. Authorization must be enforced server-side.

## Professional Implementation Workflow

For every task, follow this process:

1. Understand the requested outcome and identify its scope.
2. Inspect the relevant files, architecture, existing patterns,
   shared components, and dependencies before making changes.
3. Identify potential effects on related pages, APIs, data,
   permissions, and existing functionality.
4. Implement the smallest complete solution that fits the
   existing architecture.
5. Reuse existing utilities, components, and abstractions.
6. Add or update tests when functionality, authorization, or
   important behavior changes.
7. Run the relevant available checks, such as tests, linting,
   type checking, and builds when appropriate.
8. Review the final changes for regressions, duplicated logic,
   inconsistent UI, security issues, and unnecessary complexity.

Never claim that a check passed unless it was actually executed
and its result was verified.

If a check cannot be run, explain briefly why.
If a requirement is ambiguous and guessing could cause significant
architectural, security, or product problems, ask before proceeding.

Do not modify unrelated files or introduce unnecessary refactors.
Keep code clean and avoid unnecessary comments and documentation.