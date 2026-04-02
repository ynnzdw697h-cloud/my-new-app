/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        hebrew: ['Heebo', 'Arial Hebrew', 'Arial', 'sans-serif'],
      },
      colors: {
        kitchen: {
          cold: '#3B82F6',
          hot: '#EF4444',
          checker: '#10B981',
          bg: '#0F172A',
          card: '#1E293B',
          border: '#334155',
        }
      }
    },
  },
  plugins: [],
}
