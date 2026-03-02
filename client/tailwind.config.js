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
                    50: '#EEF6FD', 100: '#D6E8F8', 400: '#6EB2E8',
                    500: '#3B8ED4', 600: '#2E75B6', 700: '#1A5C9A',
                    800: '#1F4E79', 900: '#0D2137'
                },
                neutral: {
                    50: '#F9FAFB', 100: '#F3F4F6', 200: '#E5E7EB',
                    400: '#9CA3AF', 600: '#4B5563', 700: '#374151',
                    800: '#1F2937', 900: '#111827'
                },
                semantic: { success: '#16A34A', warning: '#D97706', error: '#DC2626', info: '#2E75B6' },
                dark: { bg: '#0F172A', surface: '#1E293B', card: '#273549' }
            },
            fontFamily: {
                sans: ['Inter', 'ui-sans-serif', 'system-ui']
            }
        },
    },
    plugins: [],
}
