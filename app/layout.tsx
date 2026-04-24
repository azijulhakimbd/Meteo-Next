import './globals.css'
import type { Metadata } from 'next'
import { Hind_Siliguri } from 'next/font/google'
import { ThemeProvider } from 'next-themes'

const hindSiliguri = Hind_Siliguri({
  subsets: ['bengali', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-hind-siliguri',
})

export const metadata: Metadata = {
  title: 'Weather Pro | Smart Weather Dashboard',
  description:
    'Modern weather dashboard built with Next.js, Open-Meteo API, shadcn/ui, and beautiful 7-day forecasts.',
  keywords: [
    'weather app',
    'next.js weather app',
    'open-meteo',
    'weather dashboard',
    '7 day forecast',
    'bangladesh weather',
  ],
  authors: [{ name: 'Md Azijul Hakim' }],
  creator: 'Md Azijul Hakim',
  openGraph: {
    title: 'Weather Pro | Smart Weather Dashboard',
    description:
      'Live weather dashboard with location search, charts, dark mode, and 7-day forecast.',
    siteName: 'Weather Pro',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="bn"
      suppressHydrationWarning
      className={hindSiliguri.variable}
    >
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
