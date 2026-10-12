import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('./apps/falbor/.env');
const envFile = fs.readFileSync(envPath, 'utf8');
const match = envFile.match(/^APOLLO_API_KEY=(.*)$/m);
if (!match) {
  console.error("APOLLO_API_KEY not found in .env");
  process.exit(1);
}
const apiKey = match[1].trim();

async function testAuth() {
  console.log("Testing Apollo Auth (auth/health endpoint)...");
  try {
    const res = await fetch('https://api.apollo.io/v1/auth/health', {
      headers: { 'x-api-key': apiKey }
    });
    console.log(`Auth HTTP Status: ${res.status}`);
    const data = await res.text();
    console.log(`Auth Response: ${data.substring(0, 100)}...`);
  } catch (err) {
    console.error("Auth Fetch Error:", err.message);
  }
}

async function testApiSearch() {
  console.log("\nTesting Apollo API Search (api/v1/mixed_people/api_search)...");
  const payload = {
    person_titles: ["Sales Manager"],
    person_locations: ["United States"],
    person_seniorities: ["manager"],
    per_page: 5
  };

  try {
    const res = await fetch('https://api.apollo.io/api/v1/mixed_people/api_search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(payload)
    });

    console.log(`Search HTTP Status: ${res.status}`);
    const data = await res.json();
    if (!res.ok) {
      console.log(`Search Error Code: ${data?.error_details?.code || 'N/A'}`);
      console.log(`Search Error Message: ${data?.error_details?.message || data?.error || JSON.stringify(data)}`);
    } else {
      console.log(`Search Success! Found ${data?.people?.length || 0} people.`);
    }
  } catch (err) {
    console.error("Search Fetch Error:", err.message);
  }
}

async function run() {
  await testAuth();
  await testApiSearch();
}
run();
