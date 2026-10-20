/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        paper: v('paper'),
        card: v('card'),
        sunk: v('sunk'),
        line: v('line'),
        ink: v('ink'),
        muted: v('muted'),
        faint: v('faint'),
        blush: v('blush'),
        peach: v('peach'),
        powder: v('powder'),
        lavender: v('lavender'),
        sage: v('sage'),
        butter: v('butter'),
        coral: v('coral'),
        accent: v('accent'),
      },
      fontFamily: {
        serif: ['"Fraunces Variable"', 'ui-serif', 'Georgia', 'serif'],
        sans: ['"Inter Variable"', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        hand: ['"Caveat"', 'cursive'],
      },
      boxShadow: {
        soft: '0 1px 2px rgb(var(--shadow) / 0.06), 0 4px 14px -6px rgb(var(--shadow) / 0.12)',
        lift: '0 2px 6px rgb(var(--shadow) / 0.08), 0 16px 40px -12px rgb(var(--shadow) / 0.22)',
      },
      borderRadius: { xl2: '1.25rem' },
    },
  },
  plugins: [],
};
