export function buildDesignSystemPromptBlock(
  designSystem: string | null | undefined
): string {
  if (!designSystem || !designSystem.trim()) {
    return "";
  }

  return `
## Design system

If the design system conflicts with other instructions, prioritize the design system.

<design_system>
${designSystem.trim()}
</design_system>
`;
}
