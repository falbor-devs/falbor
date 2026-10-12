import { OpenAI } from "openai";

export interface ProspectSearchInput {
  jobTitles?: string[];
  seniorities?: string[];
  locations?: string[];
  companyDomain?: string;
  perPage?: number;
  page?: number;
}

export interface EmailFinderInput {
  firstName: string;
  lastName: string;
  domain: string;
}

export interface EmailResult {
  email: string | null;
  status: string; // 'verified', 'unverified', 'not_found'
}

export interface ProspectProvider {
  searchProspects(input: ProspectSearchInput): Promise<any[]>;
  findEmail?(input: EmailFinderInput): Promise<EmailResult>;
}

// Simple in-memory cache for Tomba to prevent hammering the API
const tombaCache: Record<string, { data: any[], timestamp: number }> = {};

export class TombaProspectProvider implements ProspectProvider {
  private key: string;
  private secret: string;

  constructor() {
    this.key = process.env.TOMBA_API_KEY || '';
    this.secret = process.env.TOMBA_API_SECRET || '';
  }

  private get headers() {
    return {
      'Content-Type': 'application/json',
      'X-Tomba-Key': this.key,
      'X-Tomba-Secret': this.secret
    };
  }

  async searchProspects(input: ProspectSearchInput): Promise<any[]> {
    if (!this.key || !this.secret) {
      throw new Error("Missing TOMBA_API_KEY or TOMBA_API_SECRET in environment variables.");
    }

    if (!input.companyDomain) {
      // Tomba requires a domain to search people.
      throw new Error("Tomba requires a 'companyDomain' to search for prospects. Please provide a companyDomain.");
    }

    let department = '';
    const queryTitles = input.jobTitles?.map(t => t.toLowerCase()) || [];
    if (queryTitles.some(t => t.includes('sales'))) department = 'sales';
    else if (queryTitles.some(t => t.includes('marketing'))) department = 'marketing';
    else if (queryTitles.some(t => t.includes('engineering') || t.includes('developer'))) department = 'engineering';
    else if (queryTitles.some(t => t.includes('hr') || t.includes('human resources'))) department = 'hr';

    const cacheKey = `${input.companyDomain}_${department}`;
    const now = Date.now();
    if (tombaCache[cacheKey] && (now - tombaCache[cacheKey].timestamp < 600000)) {
       // Cache for 10 minutes
       return tombaCache[cacheKey].data;
    }

    const url = new URL('https://api.tomba.io/v1/domain-search');
    url.searchParams.append('domain', input.companyDomain);
    if (department) url.searchParams.append('department', department);
    url.searchParams.append('limit', (input.perPage || 5).toString());

    let res: Response | null = null;
    let retries = 0;
    while (retries < 3) {
      res = await fetch(url.toString(), { headers: this.headers });
      if (res.status === 429) {
        retries++;
        const backoff = Math.pow(2, retries) * 1000;
        console.warn(`Tomba Rate Limit Exceeded (429). Retrying in ${backoff}ms...`);
        await new Promise(r => setTimeout(r, backoff));
        continue;
      }
      break;
    }

    if (!res) throw new Error("Tomba API Error: Failed to fetch");
    if (res.status === 401) throw new Error("Tomba API Error: Invalid or missing credentials");
    if (res.status === 429) throw new Error("Tomba API Error: Rate limit exceeded after retries");
    if (!res.ok) throw new Error(`Tomba API Error: ${res.status} ${await res.text()}`);

    const data = await res.json();
    const emails = data.data?.emails || [];

    if (emails.length === 0) return [];

    const enrichedProspects = await Promise.all(emails.map(async (person: any) => {
      let finalEmail = person.email;
      let emailStatus = 'Found via Tomba';

      if (finalEmail) {
        try {
          const vRes = await fetch(`https://api.tomba.io/v1/email-verifier?email=${finalEmail}`, { headers: this.headers });
          if (vRes.ok) {
            const vData = await vRes.json();
            if (vData.data?.email?.status === 'valid') {
              emailStatus = 'Ready to Contact (Verified)';
            } else if (vData.data?.email?.status === 'invalid') {
              finalEmail = null;
              emailStatus = 'Invalid Email';
            } else {
              emailStatus = 'Found (Unverified)';
            }
          }
        } catch (e) {
          console.error("Tomba verification error:", e);
        }
      }

      return {
        id: person.email || person.id || Math.random().toString(),
        name: `${person.first_name || ''} ${person.last_name || ''}`.trim() || "Unknown Name",
        email: finalEmail || "No valid email available",
        company: data.data?.organization?.name || input.companyDomain,
        jobTitle: person.position || "Unknown Title",
        matchReason: `Targeting ${person.position || 'contact'} at ${data.data?.organization?.name || input.companyDomain}.`,
        status: finalEmail ? emailStatus : 'No Email Found',
        messagePreview: '-',
        sentAt: '-',
        reply: '-',
        lastActivity: 'Found via Tomba',
      };
    }));

    tombaCache[cacheKey] = { data: enrichedProspects, timestamp: Date.now() };

    return enrichedProspects;
  }
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function searchProspectsWithTomba(filters: any) {
  // We are using the new Provider architecture
  const provider = new TombaProspectProvider();
  return await provider.searchProspects(filters);
}



export async function generateOutreach(prospect: any, productContext: string) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are a professional sales assistant writing highly personalized cold outreach emails."
      },
      {
        role: "user",
        content: `Product: ${productContext}
Prospect: ${prospect.name}, ${prospect.jobTitle} at ${prospect.company}

Write a short, casual, and highly personalized cold email to this prospect. No subject line, just the body.`
      }
    ]
  });

  return completion.choices[0].message.content;
}
