import { META_OBJECTIVES } from '~/lib/services/metaAdsConstants';
import type { CampaignDraftState, WizardStep } from './types';

export const WIZARD_STEPS: Array<{ id: WizardStep; label: string; icon: string }> = [
  { id: 1, label: 'Goal', icon: 'i-ph:target-bold' },
  { id: 2, label: 'Audience', icon: 'i-ph:users-three-bold' },
  { id: 3, label: 'Placements', icon: 'i-ph:layout-bold' },
  { id: 4, label: 'Budget & Schedule', icon: 'i-ph:currency-dollar-bold' },
  { id: 5, label: 'Ad Creative', icon: 'i-ph:paint-brush-bold' },
  { id: 6, label: 'Review & Publish', icon: 'i-ph:clipboard-text-bold' },
];

export const DEFAULT_OBJECTIVE = META_OBJECTIVES.find((o) => o.id === 'OUTCOME_TRAFFIC') || META_OBJECTIVES[0];

export const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BR', name: 'Brazil' },
  { code: 'IN', name: 'India' },
  { code: 'IL', name: 'Israel' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'JP', name: 'Japan' },
  { code: 'SG', name: 'Singapore' },
];

export const SPECIAL_CATEGORIES = [
  { id: 'CREDIT', label: 'Credit' },
  { id: 'EMPLOYMENT', label: 'Employment' },
  { id: 'HOUSING', label: 'Housing' },
  { id: 'SOCIAL_ISSUES_ELECTIONS_POLITICS', label: 'Social issues, elections or politics' },
];

export const PUBLISHER_PLATFORMS = [
  { id: 'facebook', label: 'Facebook' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'audience_network', label: 'Audience Network' },
  { id: 'messenger', label: 'Messenger' },
];

export const GENDER_OPTIONS = ['all', 'male', 'female'] as const;

export function createEmptyDraft(): CampaignDraftState {
  return {
    name: '',
    objective: DEFAULT_OBJECTIVE.id,
    optimizationGoal: DEFAULT_OBJECTIVE.defaultOptimizationGoal,
    specialCategories: [],
    countries: ['US'],
    ageMin: 18,
    ageMax: 65,
    gender: 'all',
    interests: [],
    platforms: ['facebook', 'instagram'],
    budgetType: 'daily',
    budgetAmount: '20',
    startDate: '',
    endDate: '',
    pageId: '',
    instagramAccountId: null,
    primaryText: '',
    headline: '',
    description: '',
    linkUrl: '',
    callToAction: 'LEARN_MORE',
    media: null,
  };
}

export function clampStep(step: number): WizardStep {
  const n = Math.min(Math.max(Math.trunc(step) || 1, 1), 6);
  return n as WizardStep;
}
