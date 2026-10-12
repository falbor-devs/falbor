import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

// Read key from .env securely
const envPath = path.resolve('./apps/falbor/.env');
const envFile = fs.readFileSync(envPath, 'utf8');
const match = envFile.match(/^APOLLO_API_KEY=(.*)$/m);
if (!match) {
  console.error("APOLLO_API_KEY not found in .env");
  process.exit(1);
}
const apiKey = match[1].trim();

async function test() {
  console.log("Testing Apollo API Endpoint: https://api.apollo.io/api/v1/mixed_people/api_search");
  
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

    console.log(`HTTP Status: ${res.status}`);
    
    const data = await res.json();
    if (!res.ok) {
      console.log(`Apollo Error Code: ${data?.error_details?.code || 'N/A'}`);
      console.log(`Apollo Error Message: ${data?.error_details?.message || data?.error || JSON.stringify(data)}`);
    } else {
      console.log(`Success! Found ${data?.people?.length || 0} people.`);
    }
    
  } catch (err) {
    console.error("Fetch Error:", err);
  }
}

test();
