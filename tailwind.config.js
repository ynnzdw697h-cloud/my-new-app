/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  safelist: ['translate-x-0', 'translate-x-full'],
  theme: {
    extend: {
      fontFamily: {
        // Inter first (Latin/numbers), Heebo fallback (Hebrew)
        sans:   ['Inter', 'Heebo', 'Arial Hebrew', 'Arial', 'sans-serif'],
        hebrew: ['Heebo', 'Arial Hebrew', 'Arial', 'sans-serif'],
      },
      colors: {
        // ── Brand ──────────────────────────────────────────────
        accent: '#D4ED31',

        // ── Station identity ───────────────────────────────────
        station: {
          cold:    '#3B82F6',
          hot:     '#EF4444',
          checker: '#10B981',
        },

        // ── Semantic (kitchen alerts) ──────────────────────────
        sem: {
          success: '#34D399',
          warning: '#F59E0B',
          danger:  '#F87171',
          info:    '#60A5FA',
        },

        // ── Surface / background ───────────────────────────────
        bg: {
          base:     '#121212',   // canvas
          surface:  '#1e1e1e',   // raised card
          elevated: '#272727',   // modal / bottom sheet
          inset:    '#0d0d0d',   // inputs, empty wells
        },

        // ── Border ─────────────────────────────────────────────
        border: {
          subtle:  'rgba(255,255,255,0.06)',
          DEFAULT: 'rgba(255,255,255,0.10)',
          strong:  'rgba(255,255,255,0.18)',
        },

        // ── Text ───────────────────────────────────────────────
        text: {
          primary:   '#FFFFFF',
          secondary: 'rgba(255,255,255,0.62)',
          tertiary:  'rgba(255,255,255,0.38)',
          disabled:  'rgba(255,255,255,0.22)',
        },

        // ── Legacy aliases (kept for backward compat, do not use in new code) ──
        kitchen: {
          cold:    '#3B82F6',
          hot:     '#EF4444',
          checker: '#10B981',
          bg:      '#121212',
          card:    '#1e1e1e',
          card2:   '#272727',
          border:  'rgba(255,255,255,0.07)',
        },
      },

      borderRadius: {
        // all radii bumped one step for premium feel
        sm:      '10px',
        DEFAULT: '14px',
        md:      '16px',
        lg:      '20px',
        xl:      '24px',
        '2xl':   '28px',
        '3xl':   '32px',
      },

      fontSize: {
        // Kitchen typography scale (size / [lineHeight, fontWeight])
        'display': ['32px', { lineHeight: '38px', fontWeight: '800' }],
        'h1':      ['24px', { lineHeight: '30px', fontWeight: '800' }],
        'h2':      ['20px', { lineHeight: '26px', fontWeight: '700' }],
        'h3':      ['17px', { lineHeight: '24px', fontWeight: '600' }],
        'body':    ['15px', { lineHeight: '22px', fontWeight: '500' }],
        'label':   ['13px', { lineHeight: '18px', fontWeight: '600' }],
        'meta':    ['12px', { lineHeight: '16px', fontWeight: '500' }],
      },

      boxShadow: {
        sheet: '0 -8px 40px rgba(0,0,0,0.55)',
        modal: '0 20px 60px rgba(0,0,0,0.55)',
      },

      backgroundImage: {
        'accent-glow': 'radial-gradient(ellipse at 50% 0%, rgba(212,237,49,0.18) 0%, transparent 70%)',
      },
    },
  },
  plugins: [],
};
