import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const key = "ta_ebdwd360fdhwjuauxwi0g12xt95ozzvwo0qqg";
  const secret = "ts_2c26ef35-1111-4a79-874a-5266893aa0cd";

  if (!key || !secret) {
    return NextResponse.json({ error: "Missing Tomba credentials" });
  }

  const results: any = {};
  const headers = {
    'X-Tomba-Key': key,
    'X-Tomba-Secret': secret
  };

  try {
    // 1. Domain Search
    const dsRes = await fetch('https://api.tomba.io/v1/domain-search?domain=stripe.com&department=sales&limit=2', { headers });
    results.domainSearch = {
      status: dsRes.status,
      data: await dsRes.json()
    };

    // 2. Email Finder
    const efRes = await fetch('https://api.tomba.io/v1/email-finder?domain=stripe.com&first_name=patrick&last_name=collison', { headers });
    results.emailFinder = {
      status: efRes.status,
      data: await efRes.json()
    };
    
    // 3. Email Verifier (we can use the email from Email Finder)
    if (results.emailFinder.data?.data?.email) {
      const evRes = await fetch(`https://api.tomba.io/v1/email-verifier?email=${results.emailFinder.data.data.email}`, { headers });
      results.emailVerifier = {
        status: evRes.status,
        data: await evRes.json()
      };
    }
  } catch (e: any) {
    results.error = e.message;
  }

  return NextResponse.json(results);
}
