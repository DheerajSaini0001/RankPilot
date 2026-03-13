/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                brand: {
                    50: '#F0F7FF', 100: '#E0EFFF', 200: '#BADCFF', 300: '#8BC3FF', 400: '#5BA9FF',
                    500: '#3B82F6', 600: '#2563EB', 700: '#1D4ED8', 800: '#1E40AF', 900: '#1E3A8A'
                },
                accent: {
                    50: '#F5F3FF', 100: '#EDE9FE', 200: '#DDD6FE', 300: '#C4B5FD', 400: '#A78BFA',
                    500: '#8B5CF6', 600: '#7C3AED', 700: '#6D28D9', 800: '#5B21B6', 900: '#4C1D95'
                },
                neutral: {
                    50: '#F8FAFC', 100: '#F1F5F9', 200: '#E2E8F0', 300: '#CBD5E1', 400: '#94A3B8',
                    500: '#64748B', 600: '#475569', 700: '#334155', 800: '#1E293B', 900: '#0F172A'
                },
                semantic: {
                    success: '#10B981', warning: '#F59E0B', error: '#EF4444', info: '#3B82F6',
                    green: { 50: '#ECFDF5', 500: '#10B981', 600: '#059669' },
                    rose: { 50: '#FFF1F2', 500: '#F43F5E', 600: '#E11D48' }
                },
                dark: { bg: '#0B0F19', surface: '#111827', card: '#1F2937', border: '#374151' }
            },
            borderRadius: {
                'xl': '1rem',
                '2xl': '1.5rem',
                '3xl': '2rem',
            },
            fontFamily: {
                sans: ['Inter', 'ui-sans-serif', 'system-ui']
            }
        },
    },
    plugins: [],
}
