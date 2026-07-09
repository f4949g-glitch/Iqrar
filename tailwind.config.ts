import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: 'var(--color-ink)',
        ink2: 'var(--color-ink2)',
        paper: 'var(--color-paper)',
        card: 'var(--color-card)',
        slate: 'var(--color-slate)',
        seal: 'var(--color-seal)',
        sealLight: 'var(--color-seal-light)',
        sage: 'var(--color-sage)',
        sageLight: 'var(--color-sage-light)',
        clay: 'var(--color-clay)',
        clayLight: 'var(--color-clay-light)',
        line: 'var(--color-line)',
      },
      fontFamily: {
        display: ['Cairo', 'sans-serif'],
        sans: ['Tajawal', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
