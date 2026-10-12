import { z } from 'zod';
import { tool } from 'ai';
import { db } from '~/lib/db';
import { workspaces } from '~/lib/db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export const getCanvasTools = (workspaceId: string) => {
  return {
    addCanvasCard: tool({
      description: 'Add a new custom card/section to the workspace Canvas. Use this to permanently store and display important findings, metrics, or summaries for the user on their dashboard.',
      parameters: z.object({
        title: z.string().describe('The title of the card'),
        content: z.string().describe('The markdown content of the card'),
      }),
      execute: async ({ title, content }) => {
        const workspace = await db.query.workspaces.findFirst({
          where: eq(workspaces.id, workspaceId)
        });

        if (!workspace) return 'Workspace not found';

        const cards = (workspace.canvasCards as any[]) || [];
        const newCard = {
          id: uuidv4(),
          title,
          content,
          createdAt: new Date().toISOString()
        };

        await db
          .update(workspaces)
          .set({ canvasCards: [...cards, newCard] })
          .where(eq(workspaces.id, workspaceId));

        return `Successfully added card: ${title}`;
      },
    }),

    updateCanvasCard: tool({
      description: 'Update the content of an existing custom Canvas card.',
      parameters: z.object({
        cardId: z.string().describe('The ID of the card to update'),
        content: z.string().describe('The new markdown content of the card'),
      }),
      execute: async ({ cardId, content }) => {
        const workspace = await db.query.workspaces.findFirst({
          where: eq(workspaces.id, workspaceId)
        });

        if (!workspace) return 'Workspace not found';

        const cards = (workspace.canvasCards as any[]) || [];
        const cardIndex = cards.findIndex(c => c.id === cardId);
        
        if (cardIndex === -1) return 'Card not found';

        cards[cardIndex] = { ...cards[cardIndex], content, updatedAt: new Date().toISOString() };

        await db
          .update(workspaces)
          .set({ canvasCards: cards })
          .where(eq(workspaces.id, workspaceId));

        return `Successfully updated card.`;
      },
    }),

    removeCanvasCard: tool({
      description: 'Remove a custom Canvas card from the dashboard.',
      parameters: z.object({
        cardId: z.string().describe('The ID of the card to remove'),
      }),
      execute: async ({ cardId }) => {
        const workspace = await db.query.workspaces.findFirst({
          where: eq(workspaces.id, workspaceId)
        });

        if (!workspace) return 'Workspace not found';

        const cards = (workspace.canvasCards as any[]) || [];
        const filtered = cards.filter(c => c.id !== cardId);

        await db
          .update(workspaces)
          .set({ canvasCards: filtered })
          .where(eq(workspaces.id, workspaceId));

        return `Successfully removed card.`;
      },
    })
  };
};
