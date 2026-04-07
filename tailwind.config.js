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
        accent: '#D4ED31',
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
        // bump all border-radius defaults one step up
        sm:   '10px',
        DEFAULT: '14px',
        md:   '16px',
        lg:   '20px',
        xl:   '24px',
        '2xl':'28px',
        '3xl':'32px',
      },
      backgroundImage: {
        'accent-glow': 'radial-gradient(ellipse at 50% 0%, rgba(212,237,49,0.18) 0%, transparent 70%)',
      },
    },
  },
  plugins: [],
};
