import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { Fraunces } from 'next/font/google'
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

const fraunces = Fraunces({
    subsets: ['latin'],
    variable: '--font-fraunces',
    display: 'swap',
    weight: ['400', '500'],
    style: ['normal', 'italic'],
})

export const metadata: Metadata = {
    title: 'Backoffice Clínico',
    description: 'Plataforma de gestão clínica',
}

const themeInitScript = `(function(){try{var s=localStorage.getItem('theme-preference');if(s){var t=JSON.parse(s).state?.theme;if(t==='dark')document.documentElement.classList.add('dark');}else if(window.matchMedia('(prefers-color-scheme: dark)').matches){document.documentElement.classList.add('dark');}}catch(e){}})();(function(){try{if(window.location.pathname.startsWith('/backoffice'))return;var t=localStorage.getItem('clinic-theme-vars');if(!t)return;var v=JSON.parse(t);var r=document.documentElement;for(var k in v){r.style.setProperty(k,v[k]);}}catch(e){}})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="pt-BR" className={`${satoshi.variable} ${fraunces.variable}`} suppressHydrationWarning>
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
