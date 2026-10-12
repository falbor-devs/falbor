const repo = 'withastro/astro-template-minimal';
const baseUrl = 'https://api.github.com';

async function run() {
  const zipballUrl = `${baseUrl}/repos/${repo}/zipball`;
  console.log(`Fetching ${zipballUrl}`);
  const response = await fetch(zipballUrl, { redirect: 'follow', headers: { 'User-Agent': 'test' } });
  console.log(`Status: ${response.status}`);
  if (!response.ok) {
    const text = await response.text();
    console.log(`Error: ${text}`);
  }
}

run();
