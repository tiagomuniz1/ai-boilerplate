import type { Metadata } from 'next'
import { Inter, Fraunces } from 'next/font/google'
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="pt-BR" className={`${inter.variable} ${fraunces.variable}`}>
            <body>
                <Providers>{children}</Providers>
            </body>
        </html>
    )
}
