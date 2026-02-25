/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,jsx}'],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                // Extracted 1:1 from index.css CSS custom properties
                primary: {
                    DEFAULT: '#003366', // --primary (Ocean Blue)
                    dark: '#002244',    // --primary-dark
                    light: '#004488',   // --primary-light
                },
                accent: '#0055A4',    // --accent

                bg: {
                    white: '#ffffff',   // --bg-white
                    light: '#F0F4F8',   // --bg-light (subtle blue-grey)
                    dark: '#0F172A',    // --bg-dark
                },

                text: {
                    main: '#1A202C',    // --text-main
                    secondary: '#4A5568', // --text-secondary
                    light: '#64748B',   // --text-light
                    inverse: '#ffffff', // --text-inverse
                },

                border: {
                    light: '#E2E8F0',   // --border-light
                    medium: '#CBD5E0',  // --border-medium
                },

                // Status colors used in Header role badges
                role: {
                    admin: '#7C3AED',
                    member: '#003366',
                    user: '#64748B',
                },

                // Danger (logout, delete)
                danger: '#DC2626',
            },

            fontFamily: {
                sans: ['Inter', 'sans-serif'],        // --font-sans
                serif: ['Playfair Display', 'serif'], // --font-serif
            },

            borderRadius: {
                sm: '4px',  // --radius-sm
                md: '6px',  // --radius-md
                lg: '8px',  // --radius-lg
            },

            maxWidth: {
                site: '1500px', // matching header max-width
            },

            spacing: {
                xs: '0.25rem',   // --spacing-xs
                sm: '0.5rem',    // --spacing-sm
                md: '1rem',      // --spacing-md
                lg: '1.5rem',    // --spacing-lg
                xl: '2rem',      // --spacing-xl
                '2xl': '3rem',   // --spacing-2xl
                '3xl': '4rem',   // --spacing-3xl
            },

            keyframes: {
                // Skeleton loading shimmer
                'skeleton-pulse': {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.4' },
                },
                // Toast slide in from right
                'toast-slide-in': {
                    '0%': { transform: 'translateX(110%)', opacity: '0' },
                    '100%': { transform: 'translateX(0)', opacity: '1' },
                },
                // Modal fade + scale in
                'modal-fade-in': {
                    '0%': { opacity: '0', transform: 'scale(0.95) translateY(-8px)' },
                    '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
                },
                // Backdrop fade
                'backdrop-fade-in': {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                // Spinner
                spin: {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' },
                },
            },

            animation: {
                'skeleton-pulse': 'skeleton-pulse 1.5s ease-in-out infinite',
                'toast-slide-in': 'toast-slide-in 0.3s ease-out forwards',
                'modal-fade-in': 'modal-fade-in 0.2s ease-out forwards',
                'backdrop-fade-in': 'backdrop-fade-in 0.2s ease-out forwards',
                'spin-slow': 'spin 1s linear infinite',
            },

            boxShadow: {
                card: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
                dropdown: '0 8px 24px rgba(0,0,0,0.12)',
                modal: '0 20px 60px rgba(0,0,0,0.3)',
            },
        },
    },
    plugins: [],
};
