/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'DM Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        // New Slate-based design system
        slate: {
          950: '#020617',
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155',
          600: '#475569',
          500: '#64748b',
          400: '#94a3b8',
          300: '#cbd5e1',
          200: '#e2e8f0',
          100: '#f1f5f9',
        },
        amber: {
          500: '#f59e0b',
          400: '#fbbf24',
          300: '#fcd34d',
        },
        orange: {
          600: '#ea580c',
          500: '#f59e0b',
          400: '#fbbf24',
        },
        teal: {
          600: '#14b8a6',
          500: '#1ee7d0',
          400: '#2dd4bf',
          300: '#5eead4',
        },
        red: {
          500: '#ef4444',
          400: '#f87171',
        },
        // Legacy colors (for backward compatibility during migration)
        night: {
          950: '#050810',
          900: '#0a0e1a',
          800: '#0f1526',
          700: '#161d35',
          600: '#1e2847',
          500: '#2a3660',
          400: '#3d4f80',
          300: '#6272a4',
          200: '#8b9cc4',
          100: '#c0c9e0',
        },
        glow: {
          purple: '#7c3aed',
          blue: '#2563eb',
          cyan: '#0891b2',
          pink: '#db2777',
          soft: '#a78bfa',
          amber: '#f59e0b',
        },
      },
      boxShadow: {
        glow: '0 0 20px rgba(124, 58, 237, 0.3)',
        'glow-sm': '0 0 10px rgba(124, 58, 237, 0.2)',
        'glow-blue': '0 0 20px rgba(37, 99, 235, 0.3)',
        'glow-amber': '0 0 20px rgba(245, 158, 11, 0.25)',
      },
      backgroundImage: {
        'gradient-night': 'linear-gradient(135deg, #050810 0%, #0a0e1a 50%, #0f1526 100%)',
        'gradient-card': 'linear-gradient(135deg, #0f1526 0%, #161d35 100%)',
        'gradient-sidebar': 'linear-gradient(180deg, #0a0e1a 0%, #050810 100%)',
        'gradient-glow': 'radial-gradient(ellipse at top, #1e2847 0%, #050810 70%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
