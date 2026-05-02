import type { Config } from 'tailwindcss'

const config: Config = {
    darkMode: 'class',

    content: [
        './app/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
    ],

    theme: {
        extend: {
            colors: {
                /* ===== BASE ===== */
                bg: 'var(--bg)',

                surface: {
                    DEFAULT: 'var(--surface)',
                    2: 'var(--surface2)',
                },

                line: {
                    DEFAULT: 'var(--line)',
                    strong: 'var(--lineStrong)',
                },

                /* ===== TEXT ===== */
                text: {
                    DEFAULT: 'var(--text)',
                    dim: 'var(--textDim)',
                    mute: 'var(--textMute)',
                },

                /* ===== ACCENT (PRIMARY ACTIONS) ===== */
                accent: {
                    DEFAULT: 'var(--accent)',
                    soft: 'var(--accentSoft)',
                },

                /* ===== SEMANTIC STATES ===== */
                warm: {
                    DEFAULT: 'var(--warm)',
                    soft: 'var(--warmSoft)',
                },

                good: {
                    DEFAULT: 'var(--good)',
                    soft: 'var(--goodSoft)',
                },

                warn: {
                    DEFAULT: 'var(--warn)',
                    soft: 'var(--warnSoft)',
                },

                danger: {
                    DEFAULT: 'var(--danger)',
                    soft: 'var(--dangerSoft)',
                },
            },

            /* ===== TYPOGRAPHY ===== */
            fontFamily: {
                sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
                serif: ['var(--font-fraunces)', 'Georgia', 'serif'],
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

            /* ===== RADIUS ===== */
            borderRadius: {
                sm: '4px',
                DEFAULT: '6px',
                md: '8px',
                lg: '12px',
                xl: '16px',
            },

            /* ===== SHADOWS ===== */
            boxShadow: {
                sm: '0 1px 4px rgba(0,0,0,0.12)',
                DEFAULT: '0 2px 8px rgba(0,0,0,0.18)',
                lg: '0 4px 16px rgba(0,0,0,0.25)',
            },
        },
    },

    plugins: [],
}

export default config