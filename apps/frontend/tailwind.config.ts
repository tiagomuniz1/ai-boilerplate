import type { Config } from 'tailwindcss'

const config: Config = {
    content: [
        './app/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                background: '#0B1220',
                surface: {
                    DEFAULT: '#131C31',
                    elevated: '#1A2540',
                },
                border: {
                    DEFAULT: '#1F2B47',
                    subtle: '#263554',
                },
                primary: {
                    DEFAULT: '#F2B8B5',
                    hover: '#F0A5A1',
                    foreground: '#0B1220',
                },
                secondary: {
                    DEFAULT: '#7FB0FF',
                    hover: '#6B9FEE',
                    foreground: '#0B1220',
                },
                text: {
                    primary: '#E8EEFA',
                    secondary: '#6B7A9E',
                    disabled: '#3D4F72',
                },
                success: {
                    DEFAULT: '#6FCF97',
                    foreground: '#0B1220',
                },
                warning: {
                    DEFAULT: '#F2C94C',
                    foreground: '#0B1220',
                },
                error: {
                    DEFAULT: '#FF8A80',
                    foreground: '#0B1220',
                },
                info: {
                    DEFAULT: '#7FB0FF',
                    foreground: '#0B1220',
                },
            },
            fontFamily: {
                sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
            },
            borderRadius: {
                sm: '4px',
                DEFAULT: '6px',
                md: '8px',
                lg: '12px',
                xl: '16px',
            },
            boxShadow: {
                sm: '0 1px 4px rgba(0,0,0,0.24)',
                DEFAULT: '0 2px 8px rgba(0,0,0,0.32)',
                lg: '0 4px 16px rgba(0,0,0,0.40)',
            },
            fontSize: {
                xs: ['11px', { lineHeight: '16px' }],
                sm: ['13px', { lineHeight: '20px' }],
                base: ['14px', { lineHeight: '22px' }],
                md: ['16px', { lineHeight: '24px' }],
                lg: ['18px', { lineHeight: '28px' }],
                xl: ['20px', { lineHeight: '30px' }],
                '2xl': ['24px', { lineHeight: '34px' }],
                '3xl': ['30px', { lineHeight: '40px' }],
            },
        },
    },
    plugins: [],
}

export default config
