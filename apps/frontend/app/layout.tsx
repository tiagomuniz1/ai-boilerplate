import type { Metadata } from 'next'
import { Inter, Fraunces } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
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
    title: 'Umi · Backoffice Clínico',
    description: 'Backoffice clínico Umi',
}

const themeInitScript = `(function(){try{var s=localStorage.getItem('theme-preference');if(s){var t=JSON.parse(s).state?.theme;if(t==='dark')document.documentElement.classList.add('dark');}else if(window.matchMedia('(prefers-color-scheme: dark)').matches){document.documentElement.classList.add('dark');}}catch(e){}})();(function(){try{var t=localStorage.getItem('clinic-theme-vars');if(!t)return;var v=JSON.parse(t);var r=document.documentElement;for(var k in v){r.style.setProperty(k,v[k]);}}catch(e){}})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="pt-BR" className={`${inter.variable} ${fraunces.variable}`} suppressHydrationWarning>
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
