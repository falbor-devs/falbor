import { NextRequest, NextResponse } from "next/server";
import { db } from "~/lib/db";
import { chats, deployments, projects } from "~/lib/db/schema";
import { getUserId } from "~/lib/auth";
import { eq, desc, or, isNotNull } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const userId = await getUserId(request);
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userChats = await db
      .select({
        id: chats.id,
        title: chats.title,
        description: chats.description,
        createdAt: chats.createdAt,
        deploymentUrl: deployments.url,
        projectConfig: projects.deploymentConfig,
      })
      .from(chats)
      .leftJoin(deployments, eq(chats.id, deployments.chatId))
      .leftJoin(projects, eq(chats.id, projects.chatId))
      .where(eq(chats.userId, userId))
      .orderBy(desc(chats.createdAt));

    const publishedChats = userChats
      .map(chat => {
        let url = chat.deploymentUrl;
        
        // Try to extract Vercel URL from project config if deployment URL is missing
        if (!url && chat.projectConfig) {
          const config = chat.projectConfig as any;
          if (config && config.url) {
            url = config.url.startsWith('http') ? config.url : `https://${config.url}`;
          }
        }
        
        return {
          id: chat.id,
          title: chat.title,
          description: chat.description,
          url: url,
          createdAt: chat.createdAt,
        };
      })
      .filter(chat => !!chat.url); // Only include chats that have a resolved URL

    return NextResponse.json({ apps: publishedChats });
  } catch (error) {
    console.error("Error fetching published apps:", error);
    return NextResponse.json({ error: "Failed to fetch published apps" }, { status: 500 });
  }
}
