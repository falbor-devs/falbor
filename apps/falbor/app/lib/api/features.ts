export interface Feature {
  id: string;
  name: string;
  description: string;
  viewed: boolean;
  releaseDate: string;
}

export const getFeatureFlags = async (): Promise<Feature[]> => {
  return [
    {
      id: 'feature-1',
      name: 'Dark Mode',
      description: 'Enable dark mode for better night viewing',
      viewed: true,
      releaseDate: '2024-03-15',
    },
    {
      id: 'feature-2',
      name: 'Tab Management',
      description: 'Customize your tab layout',
      viewed: false,
      releaseDate: '2024-03-20',
    },
  ];
};

export const markFeatureViewed = async (featureId: string): Promise<void> => {
  console.log(`Marking feature ${featureId} as viewed`);
};
