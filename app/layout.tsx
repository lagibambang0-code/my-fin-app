import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'
import { DbInitializer } from '@/components/db-initializer'
import { LanguageProvider } from '@/components/language-provider'
import { CurrencyProvider } from '@/components/currency-provider'
import { PwaRegister } from '@/components/pwa-register'
import { OnboardingModal } from '@/components/onboarding-modal'

const jakarta = Plus_Jakarta_Sans({
  variable: '--font-jakarta',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Dompetku — Money Manager',
  description:
    'Record transactions, track statistics, and manage your financial accounts with ease.',
  generator: 'v0.app',
  applicationName: 'Dompetku',
  appleWebApp: { capable: true, title: 'Dompetku', statusBarStyle: 'default' },
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f3f8f6' },
    { media: '(prefers-color-scheme: dark)', color: '#121a1b' },
  ],
}

/**
 * Runs before first paint so the saved mode + palette are applied without a
 * flash of the wrong colours. Keeps in sync with `MODE_STORAGE_KEY`,
 * `PALETTE_STORAGE_KEY`, and `LEGACY_THEME_STORAGE_KEY` in
 * `components/theme-settings.tsx` (also migrates the old single-value key).
 */
const themeBootstrap = `(function(){try{var r=document.documentElement;var m=localStorage.getItem('dompetku:mode');var p=localStorage.getItem('dompetku:palette');var l=localStorage.getItem('dompetku:theme');var g=localStorage.getItem('dompetku:language')||'en';r.lang=g;if(!m&&l){m=l==='dark'?'dark':'light';if(!p&&(l==='ocean'||l==='lavender')){p=l}localStorage.setItem('dompetku:mode',m);localStorage.setItem('dompetku:palette',p||'teal');localStorage.removeItem('dompetku:theme');}if(m!=='dark'){m='light'}if(p!=='ocean'&&p!=='lavender'){p='teal'}r.dataset.mode=m;r.dataset.palette=p;r.classList.toggle('dark',m==='dark');r.classList.toggle('light',m!=='dark');var c=m==='dark'?'#121a1b':'#f3f8f6';var t=document.querySelectorAll('meta[name=theme-color]');for(var i=0;i<t.length;i++){t[i].setAttribute('content',c)}}catch(e){}})();`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={jakarta.variable} suppressHydrationWarning>
      <body className="antialiased">
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
        <LanguageProvider>
          <CurrencyProvider>
            {children}
            <OnboardingModal />
          </CurrencyProvider>
        </LanguageProvider>
        <DbInitializer />
        <PwaRegister />
        <Toaster position="top-center" richColors closeButton />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
