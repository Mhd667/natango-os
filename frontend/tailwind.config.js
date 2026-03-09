import defaultTheme from 'tailwindcss/defaultTheme';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', ...defaultTheme.fontFamily.sans],
            },
            colors: {
                'brand': {
                    'user': '#DCEBFF',
                    'natango': '#EEF1F5',
                    'bg': '#F7F8FA',
                }
            }
        },
    },
    plugins: [],
}
