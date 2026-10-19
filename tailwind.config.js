/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Apple-inspired neutral scale
                ink: {
                    50: '#F6F6F7',
                    100: '#ECECEE',
                    200: '#D1D1D6',
                    300: '#B0B0B5',
                    400: '#8E8E93',
                    500: '#6E6E73',
                    600: '#48484A',
                    700: '#2C2C2E',
                    800: '#1C1C1E',
                    900: '#000000',
                },
                surface: {
                    page: '#F5F5F7',
                    card: '#FFFFFF',
                    elevated: '#FFFFFF',
                },
                accent: {
                    DEFAULT: '#0066CC',
                    hover: '#0055A3',
                    soft: '#E8F0FE',
                },
                success: {
                    DEFAULT: '#30D158',
                    soft: '#E5F9EC',
                    ink: '#0A8A3A',
                },
                warning: {
                    DEFAULT: '#FF9F0A',
                    soft: '#FFF3DC',
                    ink: '#A96400',
                },
                danger: {
                    DEFAULT: '#FF453A',
                    soft: '#FDEAEA',
                    ink: '#B00020',
                },
            },
            fontFamily: {
                sans: ['"Plus Jakarta Sans"', 'sans-serif'],
                heading: ['"Outfit"', 'sans-serif'],
                mono: ['"SF Mono"', '"Menlo"', 'monospace'],
            },
            spacing: {
                '18': '4.5rem',
                '22': '5.5rem',
                '26': '6.5rem',
                '30': '7.5rem',
            },
            borderWidth: {
                '3': '3px',
            },
            boxShadow: {
                'apple-sm': '0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06)',
                'apple': '0 2px 8px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
                'apple-lg': '0 12px 40px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)',
            },
            animation: {
                'fade-in': 'fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                'marquee': 'marquee var(--duration, 30s) linear infinite',
                'marquee-reverse': 'marquee-reverse var(--duration, 30s) linear infinite',
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0', transform: 'translateY(8px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                marquee: {
                    to: { transform: 'translateX(-50%)' },
                },
                'marquee-reverse': {
                    from: { transform: 'translateX(-50%)' },
                    to: { transform: 'translateX(0)' },
                },
            },
        },
    },
    plugins: [],
}