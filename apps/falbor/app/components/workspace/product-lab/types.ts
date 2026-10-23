export interface ProductLabProjectData {
  id: string;
  name: string;
  websiteUrl: string | null;
  productDescription: string | null;
  targetAudience: string | null;
  features: unknown;
  pricing: string | null;
  competitorContext?: string | null;
}

export interface ProductLabSimulationRow {
  simulation: {
    id: string;
    name?: string | null;
    status: string;
    agentCount: number;
    totalRounds: number;
    currentRound: number;
    error?: string | null;
    createdAt: Date | string;
  };
  project: {
    name: string;
    websiteUrl: string | null;
  };
}

export interface ProductLabProjectForm {
  name: string;
  websiteUrl: string;
  productDescription: string;
  targetAudience: string;
  features: string;
  pricing: string;
}

export interface ProductLabReportData {
  overallAssessment?: string;
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: string[];
  likeCount?: number;
  dislikeCount?: number;
  purchaseIntentSummary?: string;
}

export interface ProductLabInteractionData {
  id: string;
  fromAgentId: string;
  toAgentId: string;
  round: number;
  topic: string;
  output: string | null;
  evidence: unknown;
  status: string;
  createdAt: Date | string;
}
