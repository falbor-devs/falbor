export interface StageContext {
  workspaceId: string;
  buildId: string;
}

export type StageHandler = (context: StageContext) => Promise<unknown>;
