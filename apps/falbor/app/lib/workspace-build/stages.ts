export const BUILD_STAGES = [
  { key: 'scan_product', label: 'Scanning your product' },
  { key: 'understand_market', label: 'Understanding your market' },
  { key: 'generate_questions', label: 'Generating buyer questions' },
  { key: 'query_models', label: 'Querying AI models' },
  { key: 'compare_responses', label: 'Comparing AI responses' },
  { key: 'analyze_competitors', label: 'Analyzing competitors' },
  { key: 'analyze_sources', label: 'Analyzing sources' },
  { key: 'find_opportunities', label: 'Finding acquisition opportunities' },
  { key: 'build_growth_plan', label: 'Building your growth plan' },
  { key: 'update_workspace', label: 'Updating the workspace' },
] as const;

export type StageKey = (typeof BUILD_STAGES)[number]['key'];
export type StageStatus = 'pending' | 'running' | 'completed' | 'failed';
export type BuildStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface BuildStageState {
  key: StageKey;
  label: string;
  status: StageStatus;
  attempts: number;
  error: string | null;
}

export interface BuildState {
  workspaceId: string;
  status: BuildStatus;
  currentStage: StageKey | null;
  lastSuccessfulStage: StageKey | null;
  retryCount: number;
  error: string | null;
  completedAt: string | null;
  stages: BuildStageState[];
}

export const MAX_STAGE_ATTEMPTS = 3;
export const LEASE_DURATION_MS = 90_000;
