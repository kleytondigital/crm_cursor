/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: '#060C1F',
          subtle: '#0B152F',
          muted: '#121F3B',
          card: '#18294A',
          soft: '#1F355C',
        },
        brand: {
          primary: '#4C6EF5',
          secondary: '#38BDF8',
          accent: '#22D3EE',
          success: '#34D399',
          warning: '#FBBF24',
          danger: '#F87171',
        },
        text: {
          primary: '#E2E8F0',
          muted: '#94A3B8',
          subtle: '#64748B',
        },
      },
      boxShadow: {
        glow: '0 15px 45px rgba(76, 110, 245, 0.25)',
        'inner-glow': 'inset 0 1px 0 rgba(255,255,255,0.08)',
      },
      backgroundImage: {
        'hero-grid':
          'radial-gradient(circle at 20% 20%, rgba(56, 189, 248, 0.08), transparent 40%), radial-gradient(circle at 80% 0%, rgba(76, 110, 245, 0.12), transparent 35%), radial-gradient(circle at 50% 105%, rgba(34, 211, 238, 0.10), transparent 45%)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

