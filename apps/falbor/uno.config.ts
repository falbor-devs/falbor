import { globSync } from 'fast-glob';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { defineConfig, presetIcons, presetUno, transformerDirectives } from 'unocss';

const iconPaths = globSync('./public/icons/*.svg');

const collectionName = 'falbor';

const customIconCollection = iconPaths.reduce(
  (acc, iconPath) => {
    const [iconName] = basename(iconPath).split('.');
    try {
      const content = readFileSync(iconPath, 'utf8');
      if (content.trim().toLowerCase().startsWith('<svg')) {
        acc[collectionName] ??= {};
        acc[collectionName][iconName] = content;
      }
    } catch {}

    return acc;
  },
  {} as Record<string, Record<string, string>>,
);

const BASE_COLORS = {
  white: '#FFFFFF',
  gray: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0A0A0A',
  },
  accent: {
    50: '#FFF4ED',
    100: '#FEE6D6',
    200: '#FDC9B8',
    300: '#FB9A7A',
    400: '#F57A4A',
    500: '#E03602',
    600: '#C43206',
    700: '#B12B06',
    800: '#8C2206',
    900: '#701C05',
    950: '#3C0D02',
  },
  purple: {
    50: '#FFF4ED',
    100: '#FEE6D6',
    200: '#FDC9B8',
    300: '#FB9A7A',
    400: '#F57A4A',
    500: '#E03602',
    600: '#C43206',
    700: '#B12B06',
    800: '#8C2206',
    900: '#701C05',
    950: '#3C0D02',
  },
  green: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#22C55E',
    600: '#16A34A',
    700: '#15803D',
    800: '#166534',
    900: '#14532D',
    950: '#052E16',
  },
  orange: {
    50: '#FFFAEB',
    100: '#FEEFC7',
    200: '#FEDF89',
    300: '#FEC84B',
    400: '#FDB022',
    500: '#F79009',
    600: '#DC6803',
    700: '#B54708',
    800: '#93370D',
    900: '#792E0D',
  },
  red: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
    950: '#450A0A',
  },
};

const COLOR_PRIMITIVES = {
  ...BASE_COLORS,
  alpha: {
    white: generateAlphaPalette(BASE_COLORS.white),
    gray: generateAlphaPalette(BASE_COLORS.gray[900]),
    red: generateAlphaPalette(BASE_COLORS.red[500]),
    accent: generateAlphaPalette(BASE_COLORS.accent[500]),
  },
};
const SPACING = {
  '0': '0px',
  px: '1px',
  '0.5': '0.125rem',
  '1': '0.25rem',
  '1.5': '0.375rem',
  '2': '0.5rem',
  '2.5': '0.625rem',
  '3': '0.75rem',
  '3.5': '0.875rem',
  '4': '1rem',
  '5': '1.25rem',
  '6': '1.5rem',
  '7': '1.75rem',
  '8': '2rem',
  '9': '2.25rem',
  '10': '2.5rem',
  '11': '2.75rem',
  '12': '3rem',
  '14': '3.5rem',
  '16': '4rem',
  '20': '5rem',
  '24': '6rem',
  '28': '7rem',
  '32': '8rem',
  '36': '9rem',
  '40': '10rem',
  '44': '11rem',
  '48': '12rem',
  '52': '13rem',
  '56': '14rem',
  '60': '15rem',
  '64': '16rem',
  '72': '18rem',
  '80': '20rem',
  '96': '24rem',
};

export default defineConfig({
  content: {
    filesystem: [
      'app/**/*.{js,ts,jsx,tsx}',
    ],
    pipeline: {
      include: [
        'app/**/*.{js,ts,jsx,tsx}',
      ],
      exclude: [
        /public[\\/]site/,
        /node_modules/,
        /\.next/
      ]
    }
  },
  safelist: [...Object.keys(customIconCollection[collectionName] || {}).map((x) => `i-falbor:${x}`)],
  shortcuts: {
    'falbor-ease-cubic-bezier': 'ease-[cubic-bezier(0.4,0,0.2,1)]',
    'transition-theme': 'transition-[background-color,border-color,color] duration-150 falbor-ease-cubic-bezier',
    kdb: 'bg-falbor-elements-code-background text-falbor-elements-code-text py-1 px-1.5 rounded-md',
    'max-w-chat': 'max-w-[var(--chat-max-width)]',
  },
  rules: [
    ['b', {}],
  ],
  theme: {
    spacing: SPACING,
    fontFamily: {
      sans: ['var(--font-season)', 'var(--font-inter)', 'var(--font-montserrat)', 'sans-serif'],
      season: ['var(--font-season)', 'sans-serif'],
      inter: ['var(--font-inter)', 'sans-serif'],
    },
    colors: {
      ...COLOR_PRIMITIVES,
      background: 'hsl(var(--background))',
      foreground: 'hsl(var(--foreground))',
      card: {
        DEFAULT: 'hsl(var(--card))',
        foreground: 'hsl(var(--card-foreground))',
      },
      popover: {
        DEFAULT: 'hsl(var(--popover))',
        foreground: 'hsl(var(--popover-foreground))',
      },
      primary: {
        DEFAULT: 'hsl(var(--primary))',
        foreground: 'hsl(var(--primary-foreground))',
      },
      secondary: {
        DEFAULT: 'hsl(var(--secondary))',
        foreground: 'hsl(var(--secondary-foreground))',
      },
      muted: {
        DEFAULT: 'hsl(var(--muted))',
        foreground: 'hsl(var(--muted-foreground))',
      },
      accent: {
        ...COLOR_PRIMITIVES.accent,
        DEFAULT: 'hsl(var(--accent))',
        foreground: 'hsl(var(--accent-foreground))',
      },
      destructive: {
        DEFAULT: 'hsl(var(--destructive))',
        foreground: 'hsl(var(--destructive-foreground))',
      },
      border: 'hsl(var(--border))',
      input: 'hsl(var(--input))',
      ring: 'hsl(var(--ring))',
      falbor: {
        elements: {
          borderColor: 'var(--falbor-elements-borderColor)',
          borderColorActive: 'var(--falbor-elements-borderColorActive)',
          background: {
            depth: {
              1: 'var(--falbor-elements-bg-depth-1)',
              2: 'var(--falbor-elements-bg-depth-2)',
              3: 'var(--falbor-elements-bg-depth-3)',
              4: 'var(--falbor-elements-bg-depth-4)',
            },
          },
          textPrimary: 'var(--falbor-elements-textPrimary)',
          textSecondary: 'var(--falbor-elements-textSecondary)',
          textTertiary: 'var(--falbor-elements-textTertiary)',
          code: {
            background: 'var(--falbor-elements-code-background)',
            text: 'var(--falbor-elements-code-text)',
          },
          button: {
            primary: {
              background: 'var(--falbor-elements-button-primary-background)',
              backgroundHover: 'var(--falbor-elements-button-primary-backgroundHover)',
              text: 'var(--falbor-elements-button-primary-text)',
            },
            secondary: {
              background: 'var(--falbor-elements-button-secondary-background)',
              backgroundHover: 'var(--falbor-elements-button-secondary-backgroundHover)',
              text: 'var(--falbor-elements-button-secondary-text)',
            },
            danger: {
              background: 'var(--falbor-elements-button-danger-background)',
              backgroundHover: 'var(--falbor-elements-button-danger-backgroundHover)',
              text: 'var(--falbor-elements-button-danger-text)',
            },
          },
          item: {
            contentDefault: 'var(--falbor-elements-item-contentDefault)',
            contentActive: 'var(--falbor-elements-item-contentActive)',
            contentAccent: 'var(--falbor-elements-item-contentAccent)',
            contentDanger: 'var(--falbor-elements-item-contentDanger)',
            backgroundDefault: 'var(--falbor-elements-item-backgroundDefault)',
            backgroundActive: 'var(--falbor-elements-item-backgroundActive)',
            backgroundAccent: 'var(--falbor-elements-item-backgroundAccent)',
            backgroundDanger: 'var(--falbor-elements-item-backgroundDanger)',
          },
          actions: {
            background: 'var(--falbor-elements-actions-background)',
            code: {
              background: 'var(--falbor-elements-actions-code-background)',
            },
          },
          artifacts: {
            background: 'var(--falbor-elements-artifacts-background)',
            backgroundHover: 'var(--falbor-elements-artifacts-backgroundHover)',
            borderColor: 'var(--falbor-elements-artifacts-borderColor)',
            inlineCode: {
              background: 'var(--falbor-elements-artifacts-inlineCode-background)',
              text: 'var(--falbor-elements-artifacts-inlineCode-text)',
            },
          },
          messages: {
            background: 'var(--falbor-elements-messages-background)',
            linkColor: 'var(--falbor-elements-messages-linkColor)',
            code: {
              background: 'var(--falbor-elements-messages-code-background)',
            },
            inlineCode: {
              background: 'var(--falbor-elements-messages-inlineCode-background)',
              text: 'var(--falbor-elements-messages-inlineCode-text)',
            },
          },
          icon: {
            success: 'var(--falbor-elements-icon-success)',
            error: 'var(--falbor-elements-icon-error)',
            primary: 'var(--falbor-elements-icon-primary)',
            secondary: 'var(--falbor-elements-icon-secondary)',
            tertiary: 'var(--falbor-elements-icon-tertiary)',
          },
          preview: {
            addressBar: {
              background: 'var(--falbor-elements-preview-addressBar-background)',
              backgroundHover: 'var(--falbor-elements-preview-addressBar-backgroundHover)',
              backgroundActive: 'var(--falbor-elements-preview-addressBar-backgroundActive)',
              text: 'var(--falbor-elements-preview-addressBar-text)',
              textActive: 'var(--falbor-elements-preview-addressBar-textActive)',
            },
          },
          terminals: {
            background: 'var(--falbor-elements-terminals-background)',
            buttonBackground: 'var(--falbor-elements-terminals-buttonBackground)',
          },
          dividerColor: 'var(--falbor-elements-dividerColor)',
          loader: {
            background: 'var(--falbor-elements-loader-background)',
            progress: 'var(--falbor-elements-loader-progress)',
          },
          prompt: {
            background: 'var(--falbor-elements-prompt-background)',
          },
          sidebar: {
            dropdownShadow: 'var(--falbor-elements-sidebar-dropdownShadow)',
            buttonBackgroundDefault: 'var(--falbor-elements-sidebar-buttonBackgroundDefault)',
            buttonBackgroundHover: 'var(--falbor-elements-sidebar-buttonBackgroundHover)',
            buttonText: 'var(--falbor-elements-sidebar-buttonText)',
          },
          cta: {
            background: 'var(--falbor-elements-cta-background)',
            text: 'var(--falbor-elements-cta-text)',
          },
        },
      },
    },
  },
  transformers: [transformerDirectives()],
  presets: [
    presetUno({
      dark: {
        light: '[data-theme="light"]',
        dark: '[data-theme="dark"]',
      },
    }),
    presetIcons({
      warn: false,
      collections: {
        ...customIconCollection,
        ph: () => require('@iconify-json/ph/icons.json'),
        'svg-spinners': () => require('@iconify-json/svg-spinners/icons.json'),
      },
      unit: 'em',
    }),
  ],
});
function generateAlphaPalette(hex: string) {
  return [1, 2, 3, 4, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].reduce(
    (acc, opacity) => {
      const alpha = Math.round((opacity / 100) * 255)
        .toString(16)
        .padStart(2, '0');

      acc[opacity] = `${hex}${alpha}`;

      return acc;
    },
    {} as Record<number, string>,
  );
}