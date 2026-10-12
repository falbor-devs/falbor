import { NextResponse } from "next/server";
import { db } from "~/lib/db";
import { falborSiteFiles } from "~/lib/db/schema";
import { eq } from "drizzle-orm";
import { withSecurity } from "~/lib/security";
import { requireChatAccess, handleAuthError } from "~/lib/auth/auth-helpers";

const json = NextResponse.json;

interface DeployRequestBody {
  files: Record<string, string>;
  chatId: string;
  subdomain?: string;
  isInitial?: boolean;
}

const deployPost = withSecurity(async ({ request }) => {
  try {
    const { files, chatId, subdomain: existingSubdomain, isInitial = true } = (await request.json()) as DeployRequestBody;

    if (!files) {
      return json({ error: 'No files provided' }, { status: 400 });
    }

    if (!chatId) {
      return json({ error: 'No chatId provided' }, { status: 400 });
    }

    // Enforce chat ownership
    await requireChatAccess(chatId);


    // Use existing subdomain if provided, otherwise generate a new one
    const subdomain = existingSubdomain || `site-${chatId.substring(0, 8)}-${Date.now().toString(36)}`;

    // Normalize file paths
    const normalizedFiles: Record<string, string> = {};

    for (const [filePath, content] of Object.entries(files)) {
      const normalizedPath = filePath.startsWith('/') ? filePath : '/' + filePath;
      normalizedFiles[normalizedPath] = content;
    }

    let mergedFiles = normalizedFiles;

    // If it's not the initial chunk, merge with existing files in the DB
    if (!isInitial) {
      const existing = await db.query.falborSiteFiles.findFirst({
        where: eq(falborSiteFiles.subdomain, subdomain),
      });

      if (existing && existing.chatId === chatId) {
        mergedFiles = { ...(existing.files as Record<string, string>), ...normalizedFiles };
      }
    }

    // Upsert site files into the database (no filesystem writes — works on Vercel)
    await db
      .insert(falborSiteFiles)
      .values({
        subdomain,
        chatId,
        files: mergedFiles as any,
      })
      .onConflictDoUpdate({
        target: falborSiteFiles.subdomain,
        set: {
          chatId,
          files: mergedFiles as any,
          updatedAt: new Date(),
        },
      });

    // Return the URL that points to our subdomain
    const host = request.headers.get("host") || "";
    let deployUrl = "";
    if (host.includes("localhost") || host.includes("127.0.0.1")) {
      const port = host.split(':')[1] ? `:${host.split(':')[1]}` : '';
      deployUrl = `http://${subdomain}.localhost${port}`;
    } else {
      const rootDomain = host.includes("falbor.xyz") ? "falbor.xyz" : host.replace(/^www\./, "");
      deployUrl = `https://${subdomain}.${rootDomain}`;
    }

    return json({
      success: true,
      url: deployUrl,
      subdomain,
    });
  } catch (error) {
    if ((error as any).status) return handleAuthError(error);
    console.error('Falbor deploy error:', error);
    return json({ error: 'Deployment failed' }, { status: 500 });
  }
});

export async function POST(request: Request) {
  return deployPost({ request, context: { env: process.env as any } });
}
