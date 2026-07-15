import type { Metadata } from 'next'
import localFont from 'next/font/local'
import Script from 'next/script'
import './globals.css'
import { Providers } from './providers'

const satoshi = localFont({
    src: [
        { path: '../public/fonts/satoshi/Satoshi-Light.otf', weight: '300', style: 'normal' },
        { path: '../public/fonts/satoshi/Satoshi-LightItalic.otf', weight: '300', style: 'italic' },
        { path: '../public/fonts/satoshi/Satoshi-Regular.otf', weight: '400', style: 'normal' },
        { path: '../public/fonts/satoshi/Satoshi-Italic.otf', weight: '400', style: 'italic' },
        { path: '../public/fonts/satoshi/Satoshi-Medium.otf', weight: '500', style: 'normal' },
        { path: '../public/fonts/satoshi/Satoshi-MediumItalic.otf', weight: '500', style: 'italic' },
        { path: '../public/fonts/satoshi/Satoshi-Bold.otf', weight: '700', style: 'normal' },
        { path: '../public/fonts/satoshi/Satoshi-BoldItalic.otf', weight: '700', style: 'italic' },
        { path: '../public/fonts/satoshi/Satoshi-Black.otf', weight: '900', style: 'normal' },
        { path: '../public/fonts/satoshi/Satoshi-BlackItalic.otf', weight: '900', style: 'italic' },
    ],
    variable: '--font-satoshi',
    display: 'swap',
})

export const metadata: Metadata = {
    title: 'Pulso — Gestão clínica com a confiança que a medicina exige',
    description:
        'Agenda, prontuário eletrônico, receitas e atestados em um só lugar — cada clínica com seu próprio espaço, sua marca e seus dados isolados.',
    openGraph: {
        title: 'Pulso — Gestão clínica com a confiança que a medicina exige',
        description:
            'Agenda, prontuário eletrônico, receitas e atestados em um só lugar — cada clínica com seu próprio espaço, sua marca e seus dados isolados.',
        type: 'website',
        locale: 'pt_BR',
        siteName: 'Pulso',
    },
}

// Applies the persisted theme before hydration to avoid a flash of the wrong palette.
const themeInitScript = `(function(){try{var s=localStorage.getItem('theme-preference');if(s){var t=JSON.parse(s).state&&JSON.parse(s).state.theme;if(t==='dark')document.documentElement.classList.add('dark');}else if(window.matchMedia('(prefers-color-scheme: dark)').matches){document.documentElement.classList.add('dark');}}catch(e){}})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="pt-BR" className={satoshi.variable} suppressHydrationWarning>
            <body>
                <Script
                    id="theme-init"
                    strategy="beforeInteractive"
                    dangerouslySetInnerHTML={{ __html: themeInitScript }}
                />
                <Providers>{children}</Providers>
            </body>
        </html>
    )
}
