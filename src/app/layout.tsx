import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'חפ"ק נציב כבאות',
  description: 'מערכת ניהול רכב מבצעי',
  manifest: '/manifest.json',
  icons: {
    icon: '/chapak-hero.jpg',
    apple: '/chapak-hero.jpg',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#C0392B',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="apple-touch-icon" href="/chapak-hero.jpg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content='חפ"ק נציב' />
      </head>
      <body>{children}</body>
    </html>
  )
}
