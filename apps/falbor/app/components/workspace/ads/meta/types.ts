export interface SelectedMedia {
  mediaId: string;
  previewUrl: string;
  kind: 'image' | 'video';
}

export interface PromotablePage {
  id: string;
  name: string;
  instagramAccountId: string | null;
  instagramUsername: string | null;
}

export interface MetaInterest {
  id: string;
  name: string;
}

export interface CampaignDraftState {
  name: string;
  objective: string;
  optimizationGoal: string;
  specialCategories: string[];
  countries: string[];
  ageMin: number;
  ageMax: number;
  gender: string;
  interests: MetaInterest[];
  platforms: string[];
  budgetType: 'daily' | 'lifetime';
  budgetAmount: string;
  startDate: string;
  endDate: string;
  pageId: string;
  instagramAccountId: string | null;
  primaryText: string;
  headline: string;
  description: string;
  linkUrl: string;
  callToAction: string;
  media: SelectedMedia | null;
}

export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

export interface StepProps {
  draft: CampaignDraftState;
  update: (patch: Partial<CampaignDraftState>) => void;
}
