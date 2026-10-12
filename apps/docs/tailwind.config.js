/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        falbor: {
          elements: {
            borderColor: 'var(--border, #333333)',
            borderColorActive: 'var(--border-active, #555555)',
            background: {
              depth: {
                1: '#121212',
                2: '#18181b',
                3: '#27272a',
                4: '#3f3f46',
              },
            },
            textPrimary: 'var(--text-primary, #ffffff)',
            textSecondary: 'var(--text-secondary, #a1a1aa)',
            textTertiary: 'var(--text-tertiary, #71717a)',
          },
        },
      },
    },
  },
  plugins: [],
}
