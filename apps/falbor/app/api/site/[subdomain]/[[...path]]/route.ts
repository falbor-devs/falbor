import { NextResponse } from "next/server";
import { db } from "~/lib/db";
import { falborSiteFiles } from "~/lib/db/schema";
import { eq } from "drizzle-orm";

// Map file extensions to MIME types
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

function getMimeType(filePath: string): string {
  const ext = filePath.match(/(\.[^.]+)$/)?.[1]?.toLowerCase() ?? '';
  return MIME_TYPES[ext] ?? 'application/octet-stream';
}

const BINARY_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.mp3', '.mp4', '.webm']);

function isBinary(filePath: string): boolean {
  const ext = filePath.match(/(\.[^.]+)$/)?.[1]?.toLowerCase() ?? '';
  return BINARY_EXTENSIONS.has(ext);
}

export async function GET(
  _request: Request,
  { params }: { params: { subdomain: string; path?: string[] } }
) {
  const { subdomain, path: pathSegments } = params;

  // Build the file path to look up
  let filePath = pathSegments && pathSegments.length > 0
    ? '/' + pathSegments.join('/')
    : '/index.html';

  try {
    const row = await db.query.falborSiteFiles.findFirst({
      where: eq(falborSiteFiles.subdomain, subdomain),
    });

    if (!row) {
      return new NextResponse('Site not found', { status: 404 });
    }

    const files = row.files as Record<string, string>;

    // Try the exact path, then with .html appended, then index.html fallback
    let content = files[filePath];
    let resolvedPath = filePath;

    if (content === undefined && !filePath.includes('.')) {
      // Try /path/index.html
      const withIndex = filePath.replace(/\/?$/, '/index.html');
      if (files[withIndex] !== undefined) {
        content = files[withIndex];
        resolvedPath = withIndex;
      } else if (files[filePath + '.html'] !== undefined) {
        content = files[filePath + '.html'];
        resolvedPath = filePath + '.html';
      }
    }

    // Final fallback to root index.html (SPA routing)
    if (content === undefined) {
      content = files['/index.html'];
      resolvedPath = '/index.html';
    }

    if (content === undefined) {
      return new NextResponse('File not found', { status: 404 });
    }

    const mimeType = getMimeType(resolvedPath);
    const headers = {
      'Content-Type': mimeType,
      'Cache-Control': 'public, max-age=3600',
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    };

    if (isBinary(resolvedPath)) {
      // Content is stored as base64 for binary files
      try {
        const buffer = Buffer.from(content, 'base64');
        return new NextResponse(buffer, { headers });
      } catch {
        return new NextResponse(content, { headers });
      }
    }

    return new NextResponse(content, { headers });
  } catch (error) {
    console.error('[site-serve] Error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
