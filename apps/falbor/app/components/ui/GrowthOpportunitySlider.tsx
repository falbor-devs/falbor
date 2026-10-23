'use client';

import { Slider } from './Slider';

export type GrowthOpportunityCategory = 'all' | 'search' | 'free_tool' | 'competitor_gap';

const options = {
  left: { value: 'all' as const, text: 'All' },
  middle: { value: 'search' as const, text: 'Search Opportunities' },
  right: { value: 'free_tool' as const, text: 'Free Tool Opportunities' },
  extra: { value: 'competitor_gap' as const, text: 'Competitor Gap Opportunities' },
};

export function GrowthOpportunitySlider({ selected, onChange }: { selected: GrowthOpportunityCategory; onChange: (value: GrowthOpportunityCategory) => void }) {
  return <Slider selected={selected} options={options} setSelected={onChange} showIcons={false} />;
}
