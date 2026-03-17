/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'], // Enable dark mode class strategy
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './components.json', // Include shadcn/ui config file if it exists
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      // Define dark theme colors and other extensions here
      colors: {
        // Example dark theme colors
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'var(--radius)',
        sm: 'var(--radius)',
      },
      // Extend for Bento Grid - this is more about component structure,
      // but we can add some base utilities if needed.
      // For example, a gap utility or specific grid column helpers.
      // For now, we'll rely on component structure and standard grid utilities.
    },
  },
  plugins: [
    require('tailwindcss-animate'), // For animations like fade-in, slide-up etc.
    require('@tailwindcss/typography'), // For markdown styling, useful for content
    // Add other Tailwind plugins if needed
  ],
}
