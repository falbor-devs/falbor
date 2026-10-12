'use server'

import { db } from '~/lib/db';
import { blogPosts, workspaces } from '~/lib/db/schema';
import { eq, and } from 'drizzle-orm';
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

export async function getWorkspaceBlog(workspaceId: string) {
  const userId = await getUserId();
  if (!userId) return null;

  let post = await db.query.blogPosts.findFirst({
    where: (posts, { eq }) => eq(posts.workspaceId, workspaceId),
  });

  if (!post) {
    post = await autoGenerateWorkspaceBlog(workspaceId);
  }

  return post;
}

export async function saveWorkspaceBlog(workspaceId: string, title: string, content: string) {
  const userId = await getUserId();
  if (!userId) throw new Error('Unauthorized');

  const existing = await db.query.blogPosts.findFirst({
    where: (posts, { eq }) => eq(posts.workspaceId, workspaceId),
  });

  if (existing) {
    const [updated] = await db
      .update(blogPosts)
      .set({
        title,
        content,
        updatedAt: new Date(),
      })
      .where(eq(blogPosts.id, existing.id))
      .returning();
    return updated;
  } else {
    const [created] = await db
      .insert(blogPosts)
      .values({
        workspaceId,
        title,
        content,
        isPublished: false,
      })
      .returning();
    return created;
  }
}

export async function publishWorkspaceBlog(workspaceId: string) {
  const userId = await getUserId();
  if (!userId) throw new Error('Unauthorized');

  const existing = await db.query.blogPosts.findFirst({
    where: (posts, { eq }) => eq(posts.workspaceId, workspaceId),
  });

  if (!existing) {
    throw new Error('No blog post found to publish.');
  }

  const [published] = await db
    .update(blogPosts)
    .set({
      isPublished: true,
      publishedSlug: existing.id,
      updatedAt: new Date(),
    })
    .where(eq(blogPosts.id, existing.id))
    .returning();

  return published;
}

export async function autoGenerateWorkspaceBlog(workspaceId: string) {
  const workspace = await db.query.workspaces.findFirst({
    where: (workspaces, { eq }) => eq(workspaces.id, workspaceId),
  });

  const productName = workspace?.name || 'Our Product';
  const productContext = workspace?.contextPrompt || 'a next-generation software product';

  let generatedTitle = `Introducing ${productName}: The Future of Product Intelligence`;
  let generatedContent = `<p>Welcome to the official blog for <strong>${productName}</strong>.</p><p>${productContext}</p><h2>Why We Built ${productName}</h2><p>In today's fast-paced market, businesses require real-time intelligence and automated AI tools to stay ahead. Our platform empowers users to streamline operations and unlock growth.</p><h2>Key Features</h2><ul><li>AI-Powered Intelligence & Research</li><li>Automated Campaign Optimization</li><li>Seamless Workspace Collaboration</li></ul><p>Stay tuned for more updates and insights!</p>`;

  if (process.env.OPENAI_API_KEY) {
    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const res = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert tech blog writer. Write a engaging, professional blog post in HTML format (<p>, <h2>, <ul>, <li>, <strong>) about the given product. Include an h1 title line as TITLE: <title> at the very beginning.',
          },
          {
            role: 'user',
            content: `Product Name: ${productName}\nContext: ${productContext}`,
          },
        ],
        max_tokens: 1000,
      });

      const fullOutput = res.choices[0].message.content || '';
      const titleMatch = fullOutput.match(/^TITLE:\s*(.+)$/m);
      if (titleMatch) {
        generatedTitle = titleMatch[1].replace(/<[^>]*>/g, '').trim();
        generatedContent = fullOutput.replace(/^TITLE:\s*.+$\n?/m, '').trim();
      } else {
        generatedContent = fullOutput;
      }
    } catch (e) {
      console.error('Error generating AI blog post:', e);
    }
  }

  const [created] = await db
    .insert(blogPosts)
    .values({
      workspaceId,
      title: generatedTitle,
      content: generatedContent,
      isPublished: false,
    })
    .returning();

  return created;
}

export async function getPublicBlogById(id: string) {
  const post = await db.query.blogPosts.findFirst({
    where: (posts, { eq, and }) => and(eq(posts.id, id), eq(posts.isPublished, true)),
  });
  return post;
}
