/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;
export default {
  content: { relative: true, files: ['./index.html', './src/**/*.{ts,tsx}'] },
  theme: {
    extend: {
      colors: {
        bg: v('bg'),
        card: v('card'),
        raised: v('raised'),
        line: 'rgb(255 255 255 / 0.07)',
        ink: v('ink'),
        muted: v('muted'),
        faint: v('faint'),
        accent: v('accent'),
        over: v('over'),
        protein: v('protein'),
        carbs: v('carbs'),
        fat: v('fat'),
      },
      boxShadow: {
        float: '0 1px 0 rgb(255 255 255 / 0.04) inset, 0 24px 60px -20px rgb(0 0 0 / 0.7)',
      },
    },
  },
  plugins: [],
};
