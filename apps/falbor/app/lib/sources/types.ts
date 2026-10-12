export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  engine: string;
}

export interface ScrapeResult {
  url: string;
  content: string;
  status: 'success' | 'timeout' | 'error' | 'skipped';
  error?: string;
}

export interface ProviderStatus {
  name: string;
  configured: boolean;
  optional?: boolean;
}

export type InvestigationPhase =
  | 'idle'
  | 'refining'
  | 'searching'
  | 'filtering'
  | 'scraping'
  | 'summarizing'
  | 'complete'
  | 'error';

export interface InvestigationState {
  phase: InvestigationPhase;
  statusMessage: string;
  refinedQuery: string;
  rawResultCount: number;
  filteredResultCount: number;
  filteredResults: SearchResult[];
  scrapedResults: ScrapeResult[];
  summary: string;
  sourceLinks: string[];
  pivots: string[];
  error: string;
  searchMode: 'osint' | 'websites';
}

export interface SearchRequest {
  query: string;
  model: string;
  engines: string[];
  scrapingThreads: number;
  searchMode: 'osint' | 'websites';
}

export const ALL_ENGINES = [
  { name: 'Ahmia',     url: 'http://juhanurmihxlp77nkq76byazcldy2hlmovfu2epvl5ankdibsot4csyd.onion/search/?q={query}' },
  { name: 'OnionLand', url: 'http://3bbad7fauom4d6sgppalyqddsqbf5u5p56b5k5uk2zxsy3d6ey2jobad.onion/search?q={query}' },
  { name: 'Torgle',    url: 'http://iy3544gmoeclh5de6gez2256v6pjh4omhpqdh2wpeeppjtvqmjhkfwad.onion/torgle/?query={query}' },
  { name: 'Amnesia',   url: 'http://amnesia7u5odx5xbwtpnqk3edybgud5bmiagu75bnqx2crntw5kry7ad.onion/search?query={query}' },
  { name: 'Kaizer',    url: 'http://kaizerwfvp5gxu6cppibp7jhcqptavq3iqef66wbxenh6a2fklibdvid.onion/search?q={query}' },
  { name: 'Anima',     url: 'http://anima4ffe27xmakwnseih3ic2y7y3l6e7fucwk4oerdn4odf7k74tbid.onion/search?q={query}' },
  { name: 'Tornado',   url: 'http://tornadoxn3viscgz647shlysdy7ea5zqzwda7hierekeuokh5eh5b3qd.onion/search?q={query}' },
] as const;
