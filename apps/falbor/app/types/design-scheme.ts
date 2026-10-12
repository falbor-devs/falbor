export interface DesignScheme {
  palette: { [key: string]: string }; // Changed from string[] to object
  features: string[];
  font: string[];
}

export const defaultDesignScheme: DesignScheme = {
  palette: {
    primary: '#E03602',
    secondary: '#38bdf8',
    accent: '#B12B06',
    background: '#171717',
    surface: '#262626',
    text: '#FFFFFF',
    textSecondary: '#A3A3A3',
    border: '#2F2F2F',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
  },
  features: ['rounded'],
  font: ['sans-serif'],
};

export const colorTemplates = [
  {
    key: 'default-dark',
    label: 'Default Dark',
    description: 'The standard Falbor dark theme with orange accents.',
    palette: {
      primary: '#E03602',
      secondary: '#38bdf8',
      accent: '#B12B06',
      background: '#171717',
      surface: '#262626',
      text: '#FFFFFF',
      textSecondary: '#A3A3A3',
      border: '#2F2F2F',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
    }
  },
  {
    key: 'clean-light',
    label: 'Clean Light',
    description: 'A crisp, white aesthetic with subtle gray borders and orange accents.',
    palette: {
      primary: '#D97A55',
      secondary: '#0ea5e9',
      accent: '#C5623D',
      background: '#ffffff',
      surface: '#f4f4f5',
      text: '#18181b',
      textSecondary: '#71717a',
      border: '#e4e4e7',
      success: '#059669',
      warning: '#d97706',
      error: '#dc2626',
    }
  },
  {
    key: 'ocean-breeze',
    label: 'Ocean Breeze',
    description: 'Calming blues and teals for a focused workspace.',
    palette: {
      primary: '#0284c7',
      secondary: '#0d9488',
      accent: '#0369a1',
      background: '#f0f9ff',
      surface: '#e0f2fe',
      text: '#0f172a',
      textSecondary: '#334155',
      border: '#bae6fd',
      success: '#059669',
      warning: '#ea580c',
      error: '#e11d48',
    }
  },
  {
    key: 'midnight-purple',
    label: 'Midnight Purple',
    description: 'Deep, rich purples for a modern dark mode experience.',
    palette: {
      primary: '#9333ea',
      secondary: '#d946ef',
      accent: '#7e22ce',
      background: '#0f0728',
      surface: '#1d0f41',
      text: '#f8fafc',
      textSecondary: '#cbd5e1',
      border: '#3b2075',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
    }
  },
  {
    key: 'cyberpunk',
    label: 'Cyberpunk',
    description: 'High contrast neon colors on a dark background.',
    palette: {
      primary: '#fbbf24',
      secondary: '#22d3ee',
      accent: '#f59e0b',
      background: '#09090b',
      surface: '#18181b',
      text: '#fef08a',
      textSecondary: '#a1a1aa',
      border: '#fde047',
      success: '#4ade80',
      warning: '#fb923c',
      error: '#f87171',
    }
  },
  {
    key: 'minimalist-mono',
    label: 'Minimalist Mono',
    description: 'A pure black and white experience.',
    palette: {
      primary: '#000000',
      secondary: '#52525b',
      accent: '#18181b',
      background: '#ffffff',
      surface: '#f4f4f5',
      text: '#000000',
      textSecondary: '#52525b',
      border: '#d4d4d8',
      success: '#000000',
      warning: '#52525b',
      error: '#000000',
    }
  }
];

export const paletteRoles = [
  {
    key: 'primary',
    label: 'Primary',
    description: 'Main brand color - use for primary buttons, active links, and key interactive elements',
  },
  {
    key: 'secondary',
    label: 'Secondary',
    description: 'Supporting brand color - use for secondary buttons, inactive states, and complementary elements',
  },
  {
    key: 'accent',
    label: 'Accent',
    description: 'Highlight color - use for badges, notifications, focus states, and call-to-action elements',
  },
  {
    key: 'background',
    label: 'Background',
    description: 'Page backdrop - use for the main application/website background behind all content',
  },
  {
    key: 'surface',
    label: 'Surface',
    description: 'Elevated content areas - use for cards, modals, dropdowns, and panels that sit above the background',
  },
  { key: 'text', label: 'Text', description: 'Primary text - use for headings, body text, and main readable content' },
  {
    key: 'textSecondary',
    label: 'Text Secondary',
    description: 'Muted text - use for captions, placeholders, timestamps, and less important information',
  },
  {
    key: 'border',
    label: 'Border',
    description: 'Separators - use for input borders, dividers, table lines, and element outlines',
  },
  {
    key: 'success',
    label: 'Success',
    description: 'Positive feedback - use for success messages, completed states, and positive indicators',
  },
  {
    key: 'warning',
    label: 'Warning',
    description: 'Caution alerts - use for warning messages, pending states, and attention-needed indicators',
  },
  {
    key: 'error',
    label: 'Error',
    description: 'Error states - use for error messages, failed states, and destructive action indicators',
  },
];

export const designFeatures = [
  { key: 'rounded', label: 'Rounded Corners' },
  { key: 'border', label: 'Subtle Border' },
  { key: 'gradient', label: 'Gradient Accent' },
  { key: 'shadow', label: 'Soft Shadow' },
  { key: 'frosted-glass', label: 'Frosted Glass' },
  { key: 'neumorphism', label: 'Neumorphism' },
  { key: 'flat', label: 'Flat Design' },
  { key: 'brutalism', label: 'Brutalism Edges' },
  { key: 'high-contrast', label: 'High Contrast' },
  { key: 'animations', label: 'Micro Animations' },
];

export const designFonts = [
  { key: 'sans-serif', label: 'System Default', preview: 'Aa' },
  { key: '"Inter", sans-serif', label: 'Inter', preview: 'Aa' },
  { key: '"Roboto", sans-serif', label: 'Roboto', preview: 'Aa' },
  { key: '"Playfair Display", serif', label: 'Playfair', preview: 'Aa' },
  { key: '"Outfit", sans-serif', label: 'Outfit', preview: 'Aa' },
  { key: '"Space Grotesk", sans-serif', label: 'Space Grotesk', preview: 'Aa' },
  { key: '"Fira Code", monospace', label: 'Fira Code', preview: 'Aa' },
  { key: 'serif', label: 'Classic Serif', preview: 'Aa' },
  { key: 'monospace', label: 'Monospace', preview: 'Aa' },
  { key: 'cursive', label: 'Cursive', preview: 'Aa' },
  { key: 'fantasy', label: 'Fantasy', preview: 'Aa' },
];
