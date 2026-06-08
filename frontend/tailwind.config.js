/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bgDark: '#0A0E1A',
        cardBg: '#111827',
        cyanAccent: '#00F5FF',
        purpleAccent: '#7B2FFF',
        pinkAccent: '#FF3CAC',
        greenAccent: '#00FF9D',
        goldAccent: '#FFD700',
        orangeAccent: '#FF6B35',
        mutedGray: '#9CA3AF',
      },
      fontFamily: {
        space: ['Space Grotesk', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'cyber-grid': 'linear-gradient(rgba(0, 245, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 245, 255, 0.03) 1px, transparent 1px)',
      },
      boxShadow: {
        'neon': '0 0 10px rgba(0, 245, 255, 0.2)',
        'neon-purple': '0 0 10px rgba(123, 47, 255, 0.2)',
      }
    },
  },
  plugins: [],
}
