export interface SourceItem {
  domain: string;
  url: string | null;
  sourceType: string;
  isFirstParty: boolean;
  isCommunity: boolean;
}

export interface QuestionItem {
  runId: string;
  questionId: string;
  questionText: string;
  answerText: string;
  productMentioned: boolean;
  productRecommended: boolean;
  descriptionAccurate: boolean | null;
  misunderstandsProduct: boolean;
  sources: SourceItem[];
}

export interface EngineItem {
  key: string;
  displayName: string;
  icon: string;
  status: 'Recommends you' | 'Points to competitors' | 'Negative' | 'No signal';
  statusColor: 'green' | 'red' | 'amber' | 'gray';
  recommendPct: number;
  knowsPct: number;
  totalRuns: number;
  questions: QuestionItem[];
}

export interface AiAeoData {
  product: {
    name: string;
    domain: string | null;
    category: string;
  };
  overallRecommendPct: number;
  correctlyDescribedEnginesCount: number;
  totalEnginesCount: number;
  engines: EngineItem[];
}
