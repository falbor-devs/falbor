import type { CampaignDraftState, WizardStep } from './types';

export function validateStep(step: WizardStep, draft: CampaignDraftState): string | null {
  if (step === 1) {
    if (!draft.name.trim()) return 'Campaign name is required.';
    return null;
  }

  if (step === 2) {
    if (draft.countries.length === 0) return 'Select at least one country.';
    if (draft.ageMin < 18 || draft.ageMax > 65 || draft.ageMin > draft.ageMax) {
      return 'Age range must be between 18 and 65.';
    }
    return null;
  }

  if (step === 4) {
    const amount = parseFloat(draft.budgetAmount);
    if (!amount || amount <= 0) return 'A valid budget is required.';
    if (draft.budgetType === 'lifetime' && !draft.endDate) {
      return 'A lifetime budget requires an end date.';
    }
    if (draft.startDate && draft.endDate && new Date(draft.endDate) <= new Date(draft.startDate)) {
      return 'The end date must be after the start date.';
    }
    return null;
  }

  if (step === 5) {
    if (!draft.pageId) return 'Select a Facebook Page.';
    if (!draft.linkUrl.trim()) return 'Destination URL is required.';
    if (!draft.media) return 'Please choose an image or video.';
    return null;
  }

  return null;
}
