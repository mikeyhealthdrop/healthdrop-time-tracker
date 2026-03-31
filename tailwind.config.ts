import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#f5f5f0',
        surface: '#ffffff',
        'surface-alt': '#fafaf7',
        border: '#e2e0d8',
        'border-light': '#eeece6',
        'text-primary': '#1a1a18',
        'text-secondary': '#6b6960',
        'text-muted': '#9e9a8f',
        accent: '#2563eb',
        'accent-light': '#eff4ff',
        'accent-hover': '#1d4ed8',
        green: { DEFAULT: '#16a34a', 50: '#f0fdf4', 100: '#dcfce7', 600: '#16a34a', 700: '#15803d' },
                'green-light': '#f0fdf4',
                'green-bg': '#dcfce7',
                red: { DEFAULT: '#dc2626', 50: '#fef2f2', 200: '#fecaca', 600: '#dc2626', 700: '#b91c1c', 800: '#991b1b' },
                'red-light': '#fef2f2',
                orange: { DEFAULT: '#ea580c', 100: '#fff7ed', 700: '#c2410c' },
                'orange-light': '#fff7ed',
                purple: { DEFAULT: '#7c3aed', 100: '#f5f3ff', 700: '#6d28d9' },
                'purple-light': '#f5f3ff',
      },
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'DM Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'sm': '0 1px 2px rgba(0,0,0,0.04)',
        'md': '0 2px 8px rgba(0,0,0,0.06)',
        'lg': '0 4px 16px rgba(0,0,0,0.08)',
      },
      borderRadius: {
        DEFAULT: '10px',
        'sm': '6px',
      },
    },
  },
  plugins: [],
}
export default config
