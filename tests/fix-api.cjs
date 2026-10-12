const fs = require('fs');
const path = require('path');

function fixAPI(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      fixAPI(fullPath);
    } else if (file === 'route.ts') {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Fix imports
      content = content.replace(/import.*?from '@remix-run\/cloudflare';?\n?/g, 'import { NextResponse } from "next/server";\nconst json = NextResponse.json;\n');
      
      // Fix signatures: export async function POST({ request, params, context }: ActionFunctionArgs)
      // to: export async function POST(request: Request, { params }: any)
      content = content.replace(/export async function (POST|GET)\s*\(\s*\{\s*request\s*([^}]*)\}\s*(:\s*[A-Za-z]+)?\s*\)/g, 'export async function $1(request: Request, { params }: any)');
      
      // Sometimes it's just ({ request })
      content = content.replace(/export async function (POST|GET)\s*\(\s*\{\s*request\s*\}\s*(:\s*[A-Za-z]+)?\s*\)/g, 'export async function $1(request: Request)');
      
      fs.writeFileSync(fullPath, content);
    }
  }
}

fixAPI(path.join(__dirname, 'app', 'api'));
console.log('Fixed API routes for Next.js signatures.');
