import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "APOLLO_API_KEY not found in .env" }, { status: 500 });
  }

  const results: any = {};

  try {
    // 1. Test Auth/Health
    const authRes = await fetch('https://api.apollo.io/v1/auth/health', {
      headers: { 'x-api-key': apiKey }
    });
    results.auth = {
      status: authRes.status,
      body: await authRes.text()
    };

    // 2. Test api_search
    const searchPayload = {
      person_titles: ["Sales Manager"],
      person_locations: ["United States"],
      person_seniorities: ["manager"],
      per_page: 5
    };

    const searchRes = await fetch('https://api.apollo.io/api/v1/mixed_people/api_search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(searchPayload)
    });

    results.search = {
      status: searchRes.status,
    };

    const data = await searchRes.json();
    if (!searchRes.ok) {
      results.search.errorCode = data?.error_details?.code || 'N/A';
      results.search.errorMessage = data?.error_details?.message || data?.error || data;
    } else {
      results.search.success = true;
      results.search.peopleCount = data?.people?.length || 0;
    }

  } catch (err: any) {
    results.error = err.message;
  }

  return NextResponse.json(results);
}
