export interface HeadToHeadMetric {
  area: string;
  ourValue: string | number;
  competitorValue: string | number;
  winner: 'us' | 'competitor' | 'tie';
  unit?: string;
}

export interface SourceNode {
  name: string;
  domain: string | null;
  type: 'review' | 'community' | 'first_party' | 'media' | 'search';
  authority: number;
  reasons: string[];
  influencesCompetitors: string[];
}

export interface PositioningPoint {
  category: string;
  targetAudience: string;
  primaryProblem: string;
  corePromise: string;
  differentiators: string[];
}

export interface Competitor {
  rank: number;
  name: string;
  domain: string | null;
  visibilityPct: number;
  sovPct: number;
  avgPosition: string;
  beatsYouIn: string;
  reasons: string[];
  isUserProduct: boolean;
  mentions: number;
  hasEvidence?: boolean;
  
  // 12 Visual Intelligence Dimensions
  whyRecommends: Array<{ factor: string; score: number; explanation: string }>;
  headToHead: {
    metrics: HeadToHeadMetric[];
    whyTheyWin: string;
    whatWeShouldImprove: string;
  };
  sources: SourceNode[];
  positioning: PositioningPoint;
  pricing: {
    startingPrice: string;
    plans: Array<{ name: string; price: string; limits: string }>;
    evidenceSource: string | null;
    lastChecked: string;
  };
  features: Array<{ name: string; available: boolean | 'unknown'; note?: string }>;
  audience: {
    icp: string;
    companySize: string;
    industry: string;
    overlapPct: number;
  };
  newContent: Array<{
    title: string;
    type: string;
    url: string;
    whatChanged: string;
    whyItMatters: string;
    ourOpportunity: string;
    date: string;
  }>;
  messagingChanges: Array<{
    area: string;
    previous: string;
    current: string;
    impact: string;
  }>;
  communityPresence: Array<{
    platform: string;
    mentionsCount: number;
    sentiment: 'positive' | 'neutral' | 'mixed';
    opportunity: string;
    link?: string;
  }>;
  ads: {
    activeAdsCount: number;
    platforms: string[];
    messagingTheme: string;
    topOffer: string;
  };
  timelineEvents: Array<{
    date: string;
    title: string;
    whatChanged: string;
    evidence: string;
    whyItMatters: string;
  }>;
}

export interface CompetitorsData {
  userProduct: {
    name: string;
    domain: string | null;
    rank: number;
    visibilityPct: number;
    sovPct: number;
    avgPosition: string;
  };
  competitors: Competitor[];
  totalQuestionsCount: number;
  totalAnalysesCount: number;
}

export const BRAND_COLORS = [
  { bg: 'bg-blue-600', text: 'text-white', border: 'border-blue-600', dot: '#2563eb', icon: 'C' },
  { bg: 'bg-red-600', text: 'text-white', border: 'border-red-600', dot: '#dc2626', icon: 'P' },
  { bg: 'bg-slate-900', text: 'text-white', border: 'border-slate-900', dot: '#0f172a', icon: 'P' },
  { bg: 'bg-red-500', text: 'text-white', border: 'border-red-500', dot: '#ef4444', icon: 'T' },
  { bg: 'bg-amber-400', text: 'text-slate-900', border: 'border-amber-400', dot: '#f59e0b', icon: 'W' },
  { bg: 'bg-emerald-600', text: 'text-white', border: 'border-emerald-600', dot: '#059669', icon: 'K' },
  { bg: 'bg-purple-600', text: 'text-white', border: 'border-purple-600', dot: '#9333ea', icon: 'G' },
];

