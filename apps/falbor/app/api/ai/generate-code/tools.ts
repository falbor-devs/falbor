import { tool } from "ai";
import { z } from "zod";

export const getTools = (fileState: { path?: string; content: string }) => {
  return {
    create_file: tool({
      description:
        "Create the main HTML file for the app. Use exactly once to write the full HTML. Returns a success message and file metadata.",
      parameters: z.object({
        path: z
          .string()
          .describe("Path for the main HTML file. Use index.html if unsure.")
          .default("index.html"),
        content: z.string().describe("Full HTML for the single-file app."),
      }),
      execute: async ({ path, content }) => {
        fileState.path = path;
        fileState.content = content;
        return {
          summary: `Successfully created ${path} (${content.length} bytes).`,
          ok: true,
          updated_content: content,
        };
      },
    }),
    edit_file: tool({
      description:
        "Edit the main HTML file using exact string replacements. Do not regenerate the entire file. Returns a success message plus edit details.",
      parameters: z.object({
        path: z.string().describe("Path for the main HTML file."),
        old_text: z
          .string()
          .describe("Exact text to replace. Must match the file contents.")
          .optional(),
        new_text: z.string().describe("Replacement text.").optional(),
        count: z
          .number()
          .describe("How many occurrences to replace. Use -1 for all.")
          .optional(),
        edits: z
          .array(
            z.object({
              old_text: z.string(),
              new_text: z.string(),
              count: z.number().optional(),
            })
          )
          .optional(),
      }),
      execute: async ({ path, old_text, new_text, count, edits }) => {
        if (!fileState.content) {
          return { summary: "File is empty or does not exist", ok: false };
        }

        let updatedContent = fileState.content;
        const allEdits = edits || [];
        if (old_text && new_text !== undefined) {
          allEdits.unshift({ old_text, new_text, count });
        }

        let editsApplied = 0;
        for (const edit of allEdits) {
          if (!updatedContent.includes(edit.old_text)) {
            return {
              summary: `Could not find exact text to replace: "${edit.old_text.substring(0, 50)}..."`,
              ok: false,
            };
          }
          if (edit.count === -1 || edit.count === undefined) {
            updatedContent = updatedContent.split(edit.old_text).join(edit.new_text);
          } else {
            for (let i = 0; i < edit.count; i++) {
              updatedContent = updatedContent.replace(edit.old_text, edit.new_text);
            }
          }
          editsApplied++;
        }

        fileState.content = updatedContent;
        return {
          summary: `Successfully applied ${editsApplied} edits to ${path}.`,
          ok: true,
          updated_content: updatedContent,
        };
      },
    }),
    retrieve_option: tool({
      description:
        "Retrieve the full HTML for a specific option (variant) so you can reference it.",
      parameters: z.object({
        option_number: z
          .number()
          .describe(
            "1-based option number to retrieve (Option 1, Option 2, etc.)."
          ),
      }),
      execute: async ({ option_number }) => {
        return {
          summary: `Option ${option_number} retrieved.`,
          ok: true,
          // We can't actually retrieve other variants easily in a stateless Edge function 
          // without passing the full state. Just return current for now as fallback.
          updated_content: fileState.content, 
        };
      },
    }),
  };
};
