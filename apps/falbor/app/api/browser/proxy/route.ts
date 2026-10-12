import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const urlParam = req.nextUrl.searchParams.get('url');
  if (!urlParam) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  try {
    const targetUrl = new URL(urlParam);
    const res = await fetch(targetUrl.toString(), {
      headers: {
        'User-Agent': req.headers.get('user-agent') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });

    const contentType = res.headers.get('content-type') || 'text/html';
    let body = await res.text();

    if (contentType.includes('text/html')) {
      const baseTag = `<base href="${targetUrl.origin}/" />`;
      if (body.includes('<head>')) {
        body = body.replace('<head>', `<head>${baseTag}`);
      } else {
        body = `${baseTag}${body}`;
      }
    }

    return new NextResponse(body, {
      status: res.status,
      headers: {
        'Content-Type': contentType,
        'Cross-Origin-Resource-Policy': 'cross-origin',
      },
    });
  } catch (err: any) {
    return new NextResponse(`Proxy error: ${err.message}`, { status: 500 });
  }
}
