'use server'

import { db } from '~/lib/db';
import { workspaces } from '~/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getAuthUserDetails } from '~/lib/visual-editor/queries';
import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { intelligenceSchema } from '~/lib/db/schema';

async function getUserId() {
  const authUser = await getAuthUserDetails();
  if (!authUser) return null;
  const user = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.email, authUser.email),
  });
  return user?.id || null;
}

export async function getWorkspaceIntelligence(workspaceId: string) {
  const userId = await getUserId();
  if (!userId) return null;

  const workspace = await db.query.workspaces.findFirst({
    where: (workspaces, { eq }) => eq(workspaces.id, workspaceId),
  });

  if (!workspace) return null;

  if (workspace.userId !== userId) {
    const membership = await db.query.workspaceMembers.findFirst({
      where: (m, { eq, and }) => and(eq(m.workspaceId, workspaceId), eq(m.userId, userId)),
    });
    if (!membership) return null;
  }

  return workspace.intelligenceData || null;
}

export async function generateWorkspaceIntelligence(workspaceId: string) {
  const userId = await getUserId();
  if (!userId) throw new Error('Unauthorized');

  const workspace = await db.query.workspaces.findFirst({
    where: (workspaces, { eq }) => eq(workspaces.id, workspaceId),
  });

  if (!workspace) throw new Error('Workspace not found');

  if (workspace.userId !== userId) {
    const membership = await db.query.workspaceMembers.findFirst({
      where: (m, { eq, and }) => and(eq(m.workspaceId, workspaceId), eq(m.userId, userId)),
    });
    if (!membership) throw new Error('Unauthorized workspace member');
  }

  const openai = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    const { object } = await generateObject({
      model: openai('gpt-4o-mini'),
      mode: 'json',
      schema: intelligenceSchema,
      prompt: `You are an elite product strategist, skeptical investor, growth operator, and technical co-founder. Analyze the following workspace context and generate a deep product intelligence report.
      
IMPORTANT RULES:
1. Act like a serious product co-founder. Be direct, opinionated, practical, and willing to challenge weak assumptions instead of telling the user what they want to hear.
2. NO GENERIC STARTUP LANGUAGE. Do not use phrases like "Great idea!", "Exciting opportunity", or fake optimism.
3. NEVER invent or hallucinate data (competitors, traction, users, revenue, pricing). Every conclusion must be supported by evidence or clearly marked as an assumption.
4. Distinguish between “the product is well-defined” and “there is evidence that people actually want it.”
5. The final output must help the user answer: “What do we actually know?”, “What are we only assuming?”, “What is the biggest problem right now?”, and “What should I do next?”.
      
--- WORKSPACE CONTEXT ---
${workspace.contextPrompt || 'No initial context provided.'}
`,
    });

    // Save back to DB
    await db.update(workspaces)
      .set({ intelligenceData: object })
      .where(and(eq(workspaces.id, workspaceId), eq(workspaces.userId, userId)));

    return object;
  } catch (error) {
    console.error('Failed to generate intelligence:', error);
    throw new Error('Failed to generate intelligence');
  }
}

export async function answerMissingInfoQuestion(workspaceId: string, question: string, answer: string) {
  const userId = await getUserId();
  if (!userId) throw new Error('Unauthorized');

  const workspace = await db.query.workspaces.findFirst({
    where: (workspaces, { eq, and }) => and(eq(workspaces.id, workspaceId), eq(workspaces.userId, userId)),
  });

  if (!workspace) throw new Error('Workspace not found');

  const currentIntel = (workspace.intelligenceData as any) || {};
  const currentMissing = Array.isArray(currentIntel.missingInformation) ? currentIntel.missingInformation : [];
  const updatedMissing = currentMissing.filter((q: string) => q !== question);

  // Append new Q&A pair to the workspace context prompt (knowledge base)
  const newKnowledgeSnippet = `\n[User Answered Question]: "${question}" -> "${answer}"`;
  const updatedContextPrompt = (workspace.contextPrompt || '') + newKnowledgeSnippet;

  const updatedIntel = {
    ...currentIntel,
    missingInformation: updatedMissing,
  };

  await db.update(workspaces)
    .set({
      intelligenceData: updatedIntel,
      contextPrompt: updatedContextPrompt,
    })
    .where(and(eq(workspaces.id, workspaceId), eq(workspaces.userId, userId)));

  return updatedIntel;
}

export async function generateAutoAnswerMap(workspaceId: string): Promise<Record<string, string>> {
  const userId = await getUserId();
  if (!userId) throw new Error('Unauthorized');

  const workspace = await db.query.workspaces.findFirst({
    where: (workspaces, { eq, and }) => and(eq(workspaces.id, workspaceId), eq(workspaces.userId, userId)),
  });

  if (!workspace) throw new Error('Workspace not found');

  const currentIntel = (workspace.intelligenceData as any) || {};
  const currentMissing: string[] = Array.isArray(currentIntel.missingInformation) ? currentIntel.missingInformation : [];

  if (currentMissing.length === 0) return {};

  const openai = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const { object } = await generateObject({
    model: openai('gpt-4o-mini'),
    mode: 'json',
    schema: z.object({
      answers: z.array(z.object({
        question: z.string(),
        answer: z.string(),
      })),
    }),
    prompt: `You are an AI Product Strategist. Generate high-quality, professional, realistic answers for each of these missing information questions based on the workspace context:
Questions: ${JSON.stringify(currentMissing)}

Workspace Context:
${workspace.contextPrompt || ''}
Product Name: ${workspace.name || ''}`,
  });

  const map: Record<string, string> = {};
  object.answers.forEach((item) => {
    map[item.question] = item.answer;
  });

  return map;
}

export async function autoAnswerMissingInfo(workspaceId: string) {
  const userId = await getUserId();
  if (!userId) throw new Error('Unauthorized');

  const workspace = await db.query.workspaces.findFirst({
    where: (workspaces, { eq, and }) => and(eq(workspaces.id, workspaceId), eq(workspaces.userId, userId)),
  });

  if (!workspace) throw new Error('Workspace not found');

  const currentIntel = (workspace.intelligenceData as any) || {};
  const currentMissing = Array.isArray(currentIntel.missingInformation) ? currentIntel.missingInformation : [];

  if (currentMissing.length === 0) return currentIntel;

  const openai = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const { object } = await generateObject({
    model: openai('gpt-4o-mini'),
    mode: 'json',
    schema: intelligenceSchema,
    prompt: `You are an AI Product Strategist. The user requested AI auto-answer for all missing information questions:
${JSON.stringify(currentMissing)}

Context:
${workspace.contextPrompt || ''}

Provide reasonable, high-quality strategic assumptions to resolve these missing questions, clear the missingInformation list to [], and update the product intelligence data cleanly.`,
  });

  const updatedIntel = {
    ...object,
    missingInformation: [],
  };

  await db.update(workspaces)
    .set({ intelligenceData: updatedIntel })
    .where(and(eq(workspaces.id, workspaceId), eq(workspaces.userId, userId)));

  return updatedIntel;
}
