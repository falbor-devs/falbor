import { NextResponse } from 'next/server';
import { db } from '~/lib/db';
import { deployments, falborSiteFiles } from '~/lib/db/schema';
import { eq } from 'drizzle-orm';
import { withSecurity } from '~/lib/security';
import { requireChatAccess, handleAuthError } from '~/lib/auth/auth-helpers';

function updateHtmlSeo(html: string, title?: string, description?: string, image?: string): string {
  let updatedHtml = html;

  if (title !== undefined) {
    if (/<title>/i.test(updatedHtml)) {
      updatedHtml = updatedHtml.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`);
    } else {
      if (/<head>/i.test(updatedHtml)) {
        updatedHtml = updatedHtml.replace(/<head>/i, `<head>\n  <title>${title}</title>`);
      }
    }
    if (/<meta[^>]*property=["']og:title["']/i.test(updatedHtml)) {
      updatedHtml = updatedHtml.replace(/<meta[^>]*property=["']og:title["'][^>]*content=["'][\s\S]*?["'][^>]*>/i, `<meta property="og:title" content="${title}">`);
      updatedHtml = updatedHtml.replace(/<meta[^>]*content=["'][\s\S]*?["'][^>]*property=["']og:title["'][^>]*>/i, `<meta property="og:title" content="${title}">`);
    } else if (/<head>/i.test(updatedHtml)) {
      updatedHtml = updatedHtml.replace(/<head>/i, `<head>\n  <meta property="og:title" content="${title}">`);
    }
  }

  if (description !== undefined) {
    const hasDesc = /<meta[^>]*name=["']description["']/i.test(updatedHtml);
    if (hasDesc) {
      updatedHtml = updatedHtml.replace(/<meta[^>]*name=["']description["'][^>]*content=["'][\s\S]*?["'][^>]*>/i, `<meta name="description" content="${description}">`);
      updatedHtml = updatedHtml.replace(/<meta[^>]*content=["'][\s\S]*?["'][^>]*name=["']description["'][^>]*>/i, `<meta name="description" content="${description}">`);
    } else {
      if (/<head>/i.test(updatedHtml)) {
        updatedHtml = updatedHtml.replace(/<head>/i, `<head>\n  <meta name="description" content="${description}">`);
      }
    }
    if (/<meta[^>]*property=["']og:description["']/i.test(updatedHtml)) {
      updatedHtml = updatedHtml.replace(/<meta[^>]*property=["']og:description["'][^>]*content=["'][\s\S]*?["'][^>]*>/i, `<meta property="og:description" content="${description}">`);
      updatedHtml = updatedHtml.replace(/<meta[^>]*content=["'][\s\S]*?["'][^>]*property=["']og:description["'][^>]*>/i, `<meta property="og:description" content="${description}">`);
    } else if (/<head>/i.test(updatedHtml)) {
      updatedHtml = updatedHtml.replace(/<head>/i, `<head>\n  <meta property="og:description" content="${description}">`);
    }
  }

  if (image !== undefined) {
    if (/<meta[^>]*property=["']og:image["']/i.test(updatedHtml)) {
      updatedHtml = updatedHtml.replace(/<meta[^>]*property=["']og:image["'][^>]*content=["'][\s\S]*?["'][^>]*>/i, `<meta property="og:image" content="${image}">`);
      updatedHtml = updatedHtml.replace(/<meta[^>]*content=["'][\s\S]*?["'][^>]*property=["']og:image["'][^>]*>/i, `<meta property="og:image" content="${image}">`);
    } else if (/<head>/i.test(updatedHtml)) {
      updatedHtml = updatedHtml.replace(/<head>/i, `<head>\n  <meta property="og:image" content="${image}">\n  <meta name="twitter:card" content="summary_large_image">`);
    }
  }

  return updatedHtml;
}

const deploymentsGet = withSecurity(async ({ request }) => {
  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get('chatId');

  if (!chatId) {
    return NextResponse.json({ error: 'Missing chatId' }, { status: 400 });
  }

  try {
    // Check chat ownership
    await requireChatAccess(chatId);

    const deployment = await db.query.deployments.findFirst({
      where: eq(deployments.chatId, chatId),
    });

    if (deployment && deployment.provider === 'falbor' && deployment.subdomain) {
      const siteRow = await db.query.falborSiteFiles.findFirst({
        where: eq(falborSiteFiles.subdomain, deployment.subdomain),
      });
      if (siteRow) {
        const files = siteRow.files as Record<string, string>;
        const seo = files['/seo.json'] ? JSON.parse(files['/seo.json']) : {};
        return NextResponse.json({
          ...deployment,
          seoTitle: deployment.seoTitle || seo.title || '',
          seoDescription: deployment.seoDescription || seo.description || '',
          seoImage: deployment.seoImage || seo.image || '',
        });
      }
    }

    return NextResponse.json(deployment || null);
  } catch (error) {
    if ((error as any).status) return handleAuthError(error);
    console.error('Error fetching deployment:', error);
    return NextResponse.json({ error: 'Failed to fetch deployment' }, { status: 500 });
  }
});

const deploymentsPost = withSecurity(async ({ request }) => {
  try {
    const data = await request.json();
    const { chatId, url, provider, subdomain } = data;

    if (!chatId || !url || !provider) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check chat ownership
    await requireChatAccess(chatId);

    // Insert or update deployment
    const [deployment] = await db
      .insert(deployments)
      .values({
        chatId,
        url,
        provider,
        subdomain,
      })
      .onConflictDoUpdate({
        target: deployments.chatId,
        set: {
          url,
          provider,
          subdomain,
          updatedAt: new Date(),
        },
      })
      .returning();

    return NextResponse.json(deployment);
  } catch (error) {
    if ((error as any).status) return handleAuthError(error);
    console.error('Error saving deployment:', error);
    return NextResponse.json({ error: 'Failed to save deployment' }, { status: 500 });
  }
});

const deploymentsDelete = withSecurity(async ({ request }) => {
  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get('chatId');

  if (!chatId) {
    return NextResponse.json({ error: 'Missing chatId' }, { status: 400 });
  }

  try {
    // Check chat ownership
    await requireChatAccess(chatId);
    
    await db.delete(deployments).where(eq(deployments.chatId, chatId));

    return NextResponse.json({ success: true });
  } catch (error) {
    if ((error as any).status) return handleAuthError(error);
    console.error('Error deleting deployment:', error);
    return NextResponse.json({ error: 'Failed to delete deployment' }, { status: 500 });
  }
});

const deploymentsPatch = withSecurity(async ({ request }) => {
  try {
    const data = await request.json();
    const { chatId, newSubdomain, seoTitle, seoDescription, seoImage } = data;

    if (!chatId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check chat ownership
    await requireChatAccess(chatId);

    const deployment = await db.query.deployments.findFirst({
      where: eq(deployments.chatId, chatId),
    });

    if (!deployment || deployment.provider !== 'falbor') {
      return NextResponse.json({ error: 'Only falbor deployments can be updated this way' }, { status: 400 });
    }

    const oldSubdomain = deployment.subdomain;
    if (!oldSubdomain) {
      return NextResponse.json({ error: 'Invalid deployment state' }, { status: 400 });
    }

    let activeSubdomain = oldSubdomain;

    if (newSubdomain && newSubdomain !== oldSubdomain) {
      // Check if new subdomain is already taken in the DB
      const existingRow = await db.query.falborSiteFiles.findFirst({
        where: eq(falborSiteFiles.subdomain, newSubdomain),
      });
      if (existingRow && existingRow.chatId !== chatId) {
        return NextResponse.json({ error: 'Subdomain already taken' }, { status: 400 });
      }
      activeSubdomain = newSubdomain;
    }

    // Rename the subdomain and/or update SEO metadata in falborSiteFiles
    const siteRow = await db.query.falborSiteFiles.findFirst({
      where: eq(falborSiteFiles.subdomain, oldSubdomain),
    });

    if (siteRow) {
      const files = siteRow.files as Record<string, string>;
      
      if (newSubdomain && newSubdomain !== oldSubdomain && files['/index.html']) {
        files['/index.html'] = files['/index.html'].replace(
          new RegExp(`/api/site/${oldSubdomain}/`, 'g'),
          `/api/site/${newSubdomain}/`,
        );
      }

      if (seoTitle !== undefined || seoDescription !== undefined || seoImage !== undefined) {
        const currentSeo = files['/seo.json'] ? JSON.parse(files['/seo.json']) : {};
        if (seoTitle !== undefined) currentSeo.title = seoTitle;
        if (seoDescription !== undefined) currentSeo.description = seoDescription;
        if (seoImage !== undefined) currentSeo.image = seoImage;
        files['/seo.json'] = JSON.stringify(currentSeo);

        if (files['/index.html']) {
          files['/index.html'] = updateHtmlSeo(files['/index.html'], seoTitle, seoDescription, seoImage);
        }
      }

      await db
        .update(falborSiteFiles)
        .set({ subdomain: activeSubdomain, files: files as any, updatedAt: new Date() })
        .where(eq(falborSiteFiles.subdomain, oldSubdomain));
    }

    const host = request.headers.get("host") || "";
    let newUrl = deployment.url;
    if (newSubdomain && newSubdomain !== oldSubdomain) {
      if (host.includes("localhost") || host.includes("127.0.0.1")) {
        const port = host.split(':')[1] ? `:${host.split(':')[1]}` : '';
        newUrl = `http://${newSubdomain}.localhost${port}`;
      } else {
        const rootDomain = host.includes("falbor.xyz") ? "falbor.xyz" : host.replace(/^www\./, "");
        newUrl = `https://${newSubdomain}.${rootDomain}`;
      }
    }

    // Update the deployments table
    const updateData: any = {
      subdomain: activeSubdomain,
      url: newUrl,
      updatedAt: new Date(),
    };
    if (seoTitle !== undefined) updateData.seoTitle = seoTitle;
    if (seoDescription !== undefined) updateData.seoDescription = seoDescription;
    if (seoImage !== undefined) updateData.seoImage = seoImage;

    const [updated] = await db
      .update(deployments)
      .set(updateData)
      .where(eq(deployments.chatId, chatId))
      .returning();

    const responseData = {
      ...updated,
      seoTitle: seoTitle !== undefined ? seoTitle : (siteRow ? (JSON.parse((siteRow.files as Record<string, string>)['/seo.json'] || '{}').title || '') : ''),
      seoDescription: seoDescription !== undefined ? seoDescription : (siteRow ? (JSON.parse((siteRow.files as Record<string, string>)['/seo.json'] || '{}').description || '') : ''),
      seoImage: seoImage !== undefined ? seoImage : (siteRow ? (JSON.parse((siteRow.files as Record<string, string>)['/seo.json'] || '{}').image || '') : ''),
    };

    return NextResponse.json(responseData);
  } catch (error) {
    if ((error as any).status) return handleAuthError(error);
    console.error('Error updating deployment:', error);
    return NextResponse.json({ error: 'Failed to update deployment' }, { status: 500 });
  }
});

export async function GET(request: Request) {
  return deploymentsGet({ request, context: { env: process.env as any } });
}

export async function POST(request: Request) {
  return deploymentsPost({ request, context: { env: process.env as any } });
}

export async function DELETE(request: Request) {
  return deploymentsDelete({ request, context: { env: process.env as any } });
}

export async function PATCH(request: Request) {
  return deploymentsPatch({ request, context: { env: process.env as any } });
}

