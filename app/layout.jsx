import './globals.css'
import Script from 'next/script'

export const metadata = {
  metadataBase: new URL('https://calabi.us'),
  title: {
    default: 'calabi',
    template: '%s · calabi',
  },
  description: 'calabi — watch clips, pics, and live streams from creators.',
  applicationName: 'calabi',
  openGraph: {
    type: 'website',
    siteName: 'calabi',
    title: 'calabi',
    description: 'Watch clips, pics, and live streams.',
    url: 'https://calabi.us',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'calabi',
    description: 'Watch clips, pics, and live streams.',
  },
  icons: {
    icon: [{ url: '/logo.png', type: 'image/png' }, { url: '/favicon.svg', type: 'image/svg+xml' }],
    apple: '/apple-touch-icon.png',
  },
  other: {
    '6a97888e-site-verification': '1d873aa2131ea8d9ba1950a936ce2035',
  },
}

export const viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
}

function adsenseClientId() {
  const raw = (
    process.env.NEXT_PUBLIC_ADSENSE_CLIENT
    || process.env.VITE_ADSENSE_CLIENT
    || ''
  ).trim()
  if (/^ca-pub-\d{10,20}$/.test(raw)) return raw
  return ''
}

export default function RootLayout({ children }) {
  const adsense = adsenseClientId()
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Plus+Jakarta+Sans:wght@700;800&display=swap"
          rel="stylesheet"
        />
        {adsense ? (
          <Script
            id="adsense-client"
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsense}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        ) : null}
      </head>
      <body className="bg-[#000000] text-zinc-100 antialiased selection:bg-white/30 selection:text-white">
        {children}
      </body>
    </html>
  )
}
