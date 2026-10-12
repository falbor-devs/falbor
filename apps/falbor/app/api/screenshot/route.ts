import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { url, apiKey } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const effectiveApiKey = apiKey || process.env.SCREENSHOTONE_API_KEY;

    if (!effectiveApiKey) {
      return NextResponse.json({ error: "ScreenshotOne API key is required" }, { status: 400 });
    }

    // Call ScreenshotOne API
    const params = new URLSearchParams({
      access_key: effectiveApiKey,
      url: url,
      full_page: "true",
      device_scale_factor: "1",
      format: "jpg",
      block_ads: "true",
      block_cookie_banners: "true",
      block_trackers: "true",
      delay: "2",
    });

    const apiUrl = `https://api.screenshotone.com/take?${params.toString()}`;

    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      const errText = await response.text();
      console.error("ScreenshotOne Error:", errText);
      return NextResponse.json({ error: "Failed to capture screenshot" }, { status: response.status });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");
    const dataUrl = `data:image/jpeg;base64,${base64}`;

    return NextResponse.json({ url: dataUrl });

  } catch (err: any) {
    console.error("Screenshot Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
