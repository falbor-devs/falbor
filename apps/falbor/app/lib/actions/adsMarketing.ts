'use server'

import { db } from '~/lib/db';
import { workspaces } from '~/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { getAuthUserDetails } from '~/lib/visual-editor/queries';
import OpenAI from 'openai';

async function getUserId() {
  const authUser = await getAuthUserDetails();
  if (!authUser) return null;
  const user = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.email, authUser.email),
  });
  return user?.id || null;
}

async function getWorkspaceContext(workspaceId: string, userId: string) {
  const workspace = await db.query.workspaces.findFirst({
    where: (workspaces, { eq, and }) => and(eq(workspaces.id, workspaceId), eq(workspaces.userId, userId)),
  });
  return workspace;
}

export async function generateAdImage(workspaceId: string): Promise<{ url: string; prompt: string }> {
  const userId = await getUserId();
  if (!userId) throw new Error('Unauthorized');

  const workspace = await getWorkspaceContext(workspaceId, userId);
  if (!workspace) throw new Error('Workspace not found');

  const productContext = workspace.contextPrompt || workspace.name || 'a modern SaaS product';

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const promptResponse = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: `You are a professional marketing creative director. Based on this product context, write a concise, vivid image generation prompt (max 200 chars) for a marketing ad image. The image should be professional, modern, photorealistic, and product-specific. No text overlays. Product context: ${productContext}`,
      },
    ],
    max_tokens: 150,
  });

  const imagePrompt = promptResponse.choices[0].message.content?.trim() || `Professional marketing photo for ${workspace.name}`;

  const response = await client.images.generate({
    model: 'gpt-image-1',
    prompt: imagePrompt,
    n: 1,
    size: '1024x1024',
  });

  const imageData = response.data?.[0];
  if (!imageData) throw new Error('No image data returned');

  const imageUrl = imageData.url || (imageData.b64_json ? `data:image/png;base64,${imageData.b64_json}` : null);
  if (!imageUrl) throw new Error('No image URL returned');

  return { url: imageUrl, prompt: imagePrompt };
}

export async function generateAdVideo(workspaceId: string): Promise<{ url: string; prompt: string }> {
  const userId = await getUserId();
  if (!userId) throw new Error('Unauthorized');

  const workspace = await getWorkspaceContext(workspaceId, userId);
  if (!workspace) throw new Error('Workspace not found');

  const productContext = workspace.contextPrompt || workspace.name || 'a modern SaaS product';

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const promptResponse = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: `You are a professional video marketing creative director. Based on this product context, write a concise, vivid video generation prompt (max 200 chars) for a 5-second marketing ad video. Cinematic, modern, and product-specific. Product context: ${productContext}`,
      },
    ],
    max_tokens: 150,
  });

  const videoPrompt = promptResponse.choices[0].message.content?.trim() || `Cinematic marketing video for ${workspace.name}`;

  const videoResponse = await (client as any).videos.generate({
    model: 'sora-1',
    prompt: videoPrompt,
    duration: 5,
    resolution: '1080p',
  });

  const videoUrl = videoResponse?.data?.[0]?.url;
  if (!videoUrl) throw new Error('No video URL returned');

  return { url: videoUrl, prompt: videoPrompt };
}
