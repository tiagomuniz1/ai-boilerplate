import type { Config } from 'tailwindcss'

/**
 * Design tokens for the Pulso institutional landing.
 *
 * Two token families:
 *  - FIXED BRAND tokens (wine, terracotta, midnight, dark-fg, …) never flip with the
 *    theme toggle. They dress the sections that are always dark/wine by brand identity
 *    (navbar, hero, security, final CTA, footer).
 *  - CONTENT tokens (`content-*`) resolve from CSS custom properties defined in
 *    globals.css and flip between light/dark when the `.dark` class is toggled on <html>.
 *    They dress the content sections (features, dashboard, white-label, how-it-works,
 *    social-proof, faq).
 */
const config: Config = {
    darkMode: 'class',

    content: [
        './app/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
    ],

    theme: {
        extend: {
            colors: {
                /* ===== FIXED BRAND ===== */
                wine: {
                    DEFAULT: '#5B1027',
                    hover: '#450D1F',
                    soft: '#E9C9D0',
                    faint: '#D19AA8',
                },
                terracotta: {
                    DEFAULT: '#C76D4D',
                    hover: '#B85F40',
                    light: '#E3A98F',
                },
                midnight: {
                    DEFAULT: '#0B1120',
                    2: '#141B2E',
                },
                'warm-white': '#FAF7F4',
                'soft-gray': '#E6E6E9',
                'soft-accent': '#F5D8DF',
                ink: '#181114',

                /* ===== TEXT ON DARK / WINE SECTIONS ===== */
                'dark-fg': {
                    DEFAULT: '#FAF7F4',
                    muted: '#C9C3C0',
                    dim: '#E9E5E2',
                    subtle: '#8F8985',
                    faint: '#A9A3A0',
                    tagline: '#7E786F',
                    copyright: '#6B655F',
                    placeholder: '#7E879C',
                },

                /* ===== TEXT ON LIGHT (trust bar, placeholders) ===== */
                'light-fg': {
                    muted: '#463A3F',
                    placeholder: '#8A817C',
                    'placeholder-2': '#9A8F8A',
                },
                'dashed-line': '#D8CFC9',

                /* ===== CONTENT (theme-flipping) ===== */
                content: {
                    bg: 'var(--content-bg)',
                    alt: 'var(--content-bg-alt)',
                    card: 'var(--content-card)',
                    line: 'var(--content-line)',
                    text: 'var(--content-text)',
                    mute: 'var(--content-mute)',
                },
            },

            /* ===== TYPOGRAPHY ===== */
            fontFamily: {
                sans: ['var(--font-satoshi)', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
            },

            fontSize: {
                '2xs': ['12px', { lineHeight: '1.4' }],
                xs: ['13px', { lineHeight: '1.5' }],
                sm: ['14px', { lineHeight: '1.5' }],
                'sm-plus': ['14.5px', { lineHeight: '1.6' }],
                base: ['15px', { lineHeight: '1.6' }],
                md: ['16px', { lineHeight: '1.5' }],
                lg: ['17px', { lineHeight: '1.6' }],
                xl: ['18px', { lineHeight: '1.5' }],
                '2xl': ['19px', { lineHeight: '1.6' }],
                '3xl': ['20px', { lineHeight: '1.3' }],
                '4xl': ['22px', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
                '5xl': ['30px', { lineHeight: '1.1', letterSpacing: '-0.01em' }],
                '6xl': ['34px', { lineHeight: '1.1', letterSpacing: '-0.01em' }],
                '7xl': ['36px', { lineHeight: '1.1', letterSpacing: '-0.01em' }],
                '8xl': ['38px', { lineHeight: '1.1', letterSpacing: '-0.01em' }],
                '9xl': ['52px', { lineHeight: '1.08', letterSpacing: '-0.02em' }],
            },

            /* ===== SPACING (faithful to the prototype grids) ===== */
            spacing: {
                '9.5': '2.375rem', // 38px — numbered feature badge
                '15': '3.75rem', // 60px — grid gaps
                '18': '4.5rem', // 72px
                '22': '5.5rem', // 88px
                '26': '6.5rem', // 104px
                section: '96px', // vertical section padding
                'hero-t': '88px', // hero top padding — slightly tighter than `section`
                'hero-b': '110px', // hero bottom padding
            },

            maxWidth: {
                content: '1180px',
                narrow: '800px',
                prose: '640px',
                'prose-lg': '680px',
            },

            /* ===== RADIUS ===== */
            borderRadius: {
                md: '10px',
                lg: '12px',
                xl: '14px',
                '2xl': '16px',
                '3xl': '18px',
                pill: '999px',
            },

            /* ===== SHADOWS ===== */
            boxShadow: {
                hero: '0 30px 70px rgba(0,0,0,0.45)',
                float: '0 18px 40px rgba(0,0,0,0.35)',
            },

            /* ===== DECORATIVE BACKGROUNDS ===== */
            backgroundImage: {
                'hero-texture':
                    'repeating-linear-gradient(115deg, rgba(199,109,77,0.25) 0px, rgba(199,109,77,0.25) 1px, transparent 1px, transparent 26px)',
                'placeholder-dark':
                    'repeating-linear-gradient(135deg,#141b2e,#141b2e 12px,#171f34 12px,#171f34 24px)',
                'placeholder-light':
                    'repeating-linear-gradient(135deg,#f1ece9,#f1ece9 12px,#eae3df 12px,#eae3df 24px)',
            },
        },
    },

    plugins: [],
}

export default config
